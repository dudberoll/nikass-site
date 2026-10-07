#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-}"
SITE_URL="${SITE_URL:-}"
TUNNEL_PORT="${TUNNEL_PORT:-18080}"
TARGET="deploy@$DEPLOY_HOST"

fail() { echo "Ошибка: $*" >&2; exit 1; }
usage() {
  echo 'DEPLOY_HOST=IP SITE_URL=https://IP PUBLIC_PRIVACY_URL=https://... ./deploy/deploy.sh publish'
  echo 'DEPLOY_HOST=IP ./deploy/deploy.sh list'
  echo 'DEPLOY_HOST=IP ./deploy/deploy.sh rollback RELEASE'
}
validate() {
  [[ "$DEPLOY_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || fail 'Задайте DEPLOY_HOST.'
  [[ "$TUNNEL_PORT" =~ ^[0-9]+$ ]] || fail 'Некорректный TUNNEL_PORT.'
  command -v ssh >/dev/null && command -v rsync >/dev/null || fail 'Нужны ssh и rsync.'
}
remote_restore() {
  local previous="$1"
  local candidate="${2:-}"
  local previous_arg="${previous:-none}"
  local candidate_arg="${candidate:-none}"
  ssh "$TARGET" bash -s -- "$previous_arg" "$candidate_arg" <<'REMOTE'
set -Eeuo pipefail
previous="$1"
candidate="$2"
if [[ "$previous" == none ]]; then previous=""; fi
if [[ "$candidate" == none ]]; then candidate=""; fi
cd /srv/nikass
if [[ -n "$previous" ]]; then
  printf 'APP_IMAGE_TAG=%s\n' "$previous" > release.env.tmp
  mv release.env.tmp release.env
  APP_IMAGE_TAG="$previous" docker compose --env-file .env -f compose.yml up -d --force-recreate api scheduler
  for attempt in {1..30}; do
    if curl --fail --silent http://127.0.0.1:8080/health/ready >/dev/null; then break; fi
    sleep 2
  done
  curl --fail --silent http://127.0.0.1:8080/health/ready >/dev/null
  ln -sfn "releases/$previous" /var/www/nikass/current.next
  mv -Tf /var/www/nikass/current.next /var/www/nikass/current
else
  tag="$candidate"
  if [[ -f release.env ]]; then tag="$(cut -d= -f2 release.env)"; fi
  if [[ -n "$tag" ]]; then APP_IMAGE_TAG="$tag" docker compose --env-file .env -f compose.yml stop api scheduler || true; fi
  rm -f release.env
  rm -f /var/www/nikass/current
fi
REMOTE
}
publish() {
  [[ "$SITE_URL" == "https://$DEPLOY_HOST" ]] || fail 'SITE_URL должен быть HTTPS-адресом этого VPS без пути.'
  [[ "${PUBLIC_PRIVACY_URL:-}" == https://* ]] || fail 'Для checkout нужен опубликованный HTTPS-адрес PUBLIC_PRIVACY_URL.'
  for command in git bun docker curl gzip; do command -v "$command" >/dev/null || fail "Не найдена команда $command."; done
  docker buildx version >/dev/null || fail 'Нужен Docker Buildx.'

  cd "$ROOT"
  [[ -z "$(git status --porcelain)" ]] || fail 'Рабочая папка Git не чистая.'
  [[ "$(git branch --show-current)" == main ]] || fail 'Публикация разрешена из main.'
  git fetch --quiet origin main
  local commit release previous tunnel_pid= activated=0
  commit="$(git rev-parse HEAD)"
  [[ "$commit" == "$(git rev-parse origin/main)" ]] || fail 'HEAD не совпадает с origin/main.'
  release="$(date -u +%Y%m%d%H%M%S)-${commit:0:12}"

  ssh "$TARGET" 'test -s /srv/nikass/.env && test -s /srv/nikass/runtime.env && test -f /srv/nikass/compose.yml && test -f /etc/nginx/nikass.htpasswd' || fail 'Сначала подготовьте VPS, env-файлы и HTTPS.'
  previous="$(ssh "$TARGET" 'test -f /srv/nikass/release.env && cut -d= -f2 /srv/nikass/release.env || true')"
  [[ -z "$previous" || "$previous" =~ ^[0-9]{14}-[0-9a-f]{12}$ ]] || fail 'На VPS некорректный release.env.'
  previous_arg="${previous:-none}"
  ssh "$TARGET" bash -s -- "$previous_arg" <<'REMOTE' || fail 'На VPS не заполнены обязательные переменные конфигурации.'
set -Eeuo pipefail
cd /srv/nikass
for key in POSTGRES_PASSWORD POSTGRES_APP_PASSWORD MIGRATION_DATABASE_URL; do
  grep -Eq "^${key}=[^[:space:]]+" .env
done
for key in DATABASE_URL JWT_SECRET CORS_ORIGINS WOOCOMMERCE_PRODUCTS_ENDPOINT WOOCOMMERCE_STORE_ENDPOINT WOOCOMMERCE_CONSUMER_KEY WOOCOMMERCE_CONSUMER_SECRET YOO_KASSA_SHOP_ID YOO_KASSA_SECRET_KEY YOO_KASSA_RETURN_URL ORDER_TELEGRAM_BOT_TOKEN ORDER_TELEGRAM_CHAT_ID; do
  grep -Eq "^${key}=[^[:space:]]+" runtime.env || { echo "На VPS не задана $key." >&2; exit 1; }
done
! grep -Eq 'YOUR_DOMAIN|YOUR_WOO_SITE|:APP_PASSWORD@|:POSTGRES_PASSWORD@' .env runtime.env
if [[ "$1" == none ]]; then
  grep -Eq '^ADMIN_SEED_EMAIL=[^[:space:]]+' .env
  grep -Eq '^ADMIN_SEED_PASSWORD=[^[:space:]]+' .env
fi
REMOTE
  cleanup() {
    local status=$?
    trap - EXIT
    [[ -z "$tunnel_pid" ]] || { kill "$tunnel_pid" 2>/dev/null || true; wait "$tunnel_pid" 2>/dev/null || true; }
    if (( status != 0 && activated == 1 )); then
      echo 'Публикация прервана, возвращаю предыдущую версию.' >&2
      remote_restore "$previous" "$release" || echo 'Автоматический откат не удался; проверьте VPS.' >&2
    fi
    exit "$status"
  }
  trap cleanup EXIT

  bun install --frozen-lockfile
  bun run typecheck:backend
  bun run typecheck:website
  docker buildx build --platform linux/amd64 --load -f backend/Dockerfile -t "nikass-api:$release" .
  local image_fingerprint remote_candidates remote_image= candidate_id candidate_fingerprint
  image_fingerprint="$(docker image inspect "nikass-api:$release" --format '{{.Os}}/{{.Architecture}} {{json .Config}} {{json .RootFS.Layers}}')"
  remote_candidates="$(ssh "$TARGET" "docker image ls --filter 'reference=nikass-api:*' --quiet --no-trunc | sort -u | xargs --no-run-if-empty docker image inspect --format '{{.Id}} {{.Os}}/{{.Architecture}} {{json .Config}} {{json .RootFS.Layers}}'" 2>/dev/null || true)"
  while read -r candidate_id candidate_fingerprint; do
    if [[ "$candidate_fingerprint" == "$image_fingerprint" ]]; then remote_image="$candidate_id"; break; fi
  done <<< "$remote_candidates"
  if [[ -n "$remote_image" ]]; then
    ssh "$TARGET" docker tag "$remote_image" "nikass-api:$release"
  else
    docker save "nikass-api:$release" | gzip -1 | ssh "$TARGET" docker load
  fi

  activated=1
  previous_arg="${previous:-none}"
  ssh "$TARGET" bash -s -- "$release" "$previous_arg" <<'REMOTE'
set -Eeuo pipefail
release="$1"
previous="$2"
if [[ "$previous" == none ]]; then previous=""; fi
cd /srv/nikass
dc() { APP_IMAGE_TAG="$release" docker compose --env-file .env -f compose.yml "$@"; }
dc config --quiet
dc up -d --wait db
if [[ -z "$previous" ]]; then
  dc run --rm --no-deps --interactive=false migrate bun scripts/deploy-database.ts
else
  dc run --rm --no-deps --interactive=false -e ADMIN_SEED_EMAIL= -e ADMIN_SEED_PASSWORD= migrate bun scripts/deploy-database.ts
fi
dc up -d --force-recreate api scheduler
for attempt in {1..30}; do
  if curl --fail --silent http://127.0.0.1:8080/health/ready >/dev/null; then exit 0; fi
  sleep 2
done
echo 'API не стал готовым.' >&2
exit 1
REMOTE
  ssh -o ExitOnForwardFailure=yes -N -L "127.0.0.1:$TUNNEL_PORT:127.0.0.1:8080" "$TARGET" &
  tunnel_pid=$!
  for attempt in {1..15}; do
    if curl --fail --silent "http://127.0.0.1:$TUNNEL_PORT/health/ready" >/dev/null; then break; fi
    sleep 1
  done
  curl --fail --silent "http://127.0.0.1:$TUNNEL_PORT/health/ready" >/dev/null || fail 'SSH-туннель до API не работает.'
  PUBLIC_API_URL="$SITE_URL" \
  CATALOG_BUILD_API_URL="http://127.0.0.1:$TUNNEL_PORT" \
  PUBLIC_PRIVACY_URL="$PUBLIC_PRIVACY_URL" \
  bun run build:website
  [[ -f website/dist/index.html && -f website/dist/checkout/index.html ]] || fail 'Сборка сайта неполная.'

  ssh "$TARGET" "mkdir -p '/var/www/nikass/releases/$release'"
  local link_dest="${previous:+--link-dest=/var/www/nikass/releases/$previous}"
  rsync -rlptz --delete ${link_dest:+"$link_dest"} website/dist/ "$TARGET:/var/www/nikass/releases/$release/"
  ssh "$TARGET" bash -s -- "$release" <<'REMOTE'
set -Eeuo pipefail
release="$1"
test -f "/var/www/nikass/releases/$release/index.html"
find "/var/www/nikass/releases/$release" -type d -exec chmod 755 {} +
find "/var/www/nikass/releases/$release" -type f -exec chmod 644 {} +
ln -sfn "releases/$release" /var/www/nikass/current.next
mv -Tf /var/www/nikass/current.next /var/www/nikass/current
printf 'APP_IMAGE_TAG=%s\n' "$release" > /srv/nikass/release.env.tmp
mv /srv/nikass/release.env.tmp /srv/nikass/release.env
REMOTE
  [[ "$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' "$SITE_URL/")" == 401 ]] || fail 'Публичный сайт не отвечает ожидаемым запросом пароля.'
  [[ "$(ssh "$TARGET" 'curl --silent --output /dev/null --write-out "%{http_code}" http://127.0.0.1:8080/health/ready')" == 200 ]] || fail 'API не готов после публикации.'
  activated=0
  kill "$tunnel_pid" 2>/dev/null || true
  wait "$tunnel_pid" 2>/dev/null || true
  trap - EXIT
  echo "Опубликован $release на $SITE_URL. Оформление заказа доступно после входа tester."
}
list() { ssh "$TARGET" 'find /var/www/nikass/releases -mindepth 1 -maxdepth 1 -type d -printf "%f\n" | sort -r'; }
rollback() {
  local release="${1:-}"
  [[ "$release" =~ ^[0-9]{14}-[0-9a-f]{12}$ ]] || fail 'Укажите RELEASE из list.'
  ssh "$TARGET" "test -f '/var/www/nikass/releases/$release/index.html'" || fail 'Версия не найдена.'
  remote_restore "$release"
  echo "Восстановлена версия $release."
}

case "${1:-}" in
  help|-h|--help) usage ;;
  publish) validate; publish ;;
  list) validate; list ;;
  rollback) validate; rollback "${2:-}" ;;
  *) usage; exit 1 ;;
esac
