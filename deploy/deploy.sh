#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEPLOY_HOST="${DEPLOY_HOST:-}"
SITE_URL="${SITE_URL:-}"
TUNNEL_PORT="${TUNNEL_PORT:-18080}"
TARGET="deploy@$DEPLOY_HOST"

fail() { echo "Ошибка: $*" >&2; exit 1; }
usage() {
  echo 'DEPLOY_HOST=IP SITE_URL=https://domain PUBLIC_PRIVACY_URL=https://... PUBLIC_TERMS_URL=https://... ./deploy/deploy.sh publish'
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
  ssh "$TARGET" bash -s -- "$previous" "$candidate" <<'REMOTE'
set -Eeuo pipefail
previous="$1"
candidate="$2"
cd /srv/nikass
if [[ -n "$previous" ]]; then
  printf 'APP_IMAGE_TAG=%s\n' "$previous" > release.env.tmp
  mv release.env.tmp release.env
  APP_IMAGE_TAG="$previous" docker compose --env-file .env -f compose.yml up -d api scheduler
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
  [[ "$SITE_URL" =~ ^https://[a-zA-Z0-9.-]+$ ]] || fail 'SITE_URL должен быть HTTPS-доменом без пути.'
  [[ "${PUBLIC_PRIVACY_URL:-}" == https://* && "${PUBLIC_TERMS_URL:-}" == https://* ]] || fail 'Для checkout нужны опубликованные HTTPS-адреса PUBLIC_PRIVACY_URL и PUBLIC_TERMS_URL.'
  for command in git bun docker curl; do command -v "$command" >/dev/null || fail "Не найдена команда $command."; done
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
  ssh "$TARGET" bash -s -- "$previous" <<'REMOTE' || fail 'На VPS не заполнены обязательные переменные конфигурации.'
set -Eeuo pipefail
cd /srv/nikass
for key in POSTGRES_PASSWORD POSTGRES_APP_PASSWORD MIGRATION_DATABASE_URL; do
  grep -Eq "^${key}=[^[:space:]]+" .env
done
for key in DATABASE_URL JWT_SECRET CORS_ORIGINS WOOCOMMERCE_PRODUCTS_ENDPOINT WOOCOMMERCE_STORE_ENDPOINT WOOCOMMERCE_CONSUMER_KEY WOOCOMMERCE_CONSUMER_SECRET YOO_KASSA_SHOP_ID YOO_KASSA_SECRET_KEY YOO_KASSA_RETURN_URL; do
  grep -Eq "^${key}=[^[:space:]]+" runtime.env
done
! grep -Eq 'YOUR_DOMAIN|YOUR_WOO_SITE|:APP_PASSWORD@|:POSTGRES_PASSWORD@' .env runtime.env
if [[ -z "$1" ]]; then
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
  docker save "nikass-api:$release" | ssh "$TARGET" docker load

  activated=1
  ssh "$TARGET" bash -s -- "$release" "$previous" <<'REMOTE'
set -Eeuo pipefail
release="$1"
previous="$2"
cd /srv/nikass
dc() { APP_IMAGE_TAG="$release" docker compose --env-file .env -f compose.yml "$@"; }
dc config --quiet
dc up -d --wait db
if [[ -z "$previous" ]]; then
  dc run --rm --no-deps migrate bun scripts/deploy-database.ts
else
  dc run --rm --no-deps -e ADMIN_SEED_EMAIL= -e ADMIN_SEED_PASSWORD= migrate bun scripts/deploy-database.ts
fi
dc up -d api scheduler
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
  PUBLIC_TEST_MODE=true \
  CATALOG_BUILD_API_URL="http://127.0.0.1:$TUNNEL_PORT" \
  PUBLIC_PRIVACY_URL="$PUBLIC_PRIVACY_URL" \
  PUBLIC_TERMS_URL="$PUBLIC_TERMS_URL" \
  bun run build:website
  [[ -f website/dist/index.html && -f website/dist/checkout/index.html ]] || fail 'Сборка сайта неполная.'

  ssh "$TARGET" "mkdir -p '/var/www/nikass/releases/$release'"
  rsync -rlptz --delete --chmod=Du=rwx,Dgo=rx,Fu=rw,Fgo=r website/dist/ "$TARGET:/var/www/nikass/releases/$release/"
  ssh "$TARGET" bash -s -- "$release" <<'REMOTE'
set -Eeuo pipefail
release="$1"
test -f "/var/www/nikass/releases/$release/index.html"
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
  echo "Опубликован $release на $SITE_URL. Тестовый checkout доступен после входа tester."
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
