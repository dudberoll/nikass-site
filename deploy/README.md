# NIKASS: закрытый сайт на Beget VPS

Этот вариант публикует Astro storefront, Bun API, PostgreSQL 18 и планировщик на одном VPS. С 2026-10-07 включён боевой магазин YooKassa и создание оплаченных заказов в WooCommerce. Сайт остаётся закрытым паролем до контрольной покупки; YooKassa webhook доступен без пароля и проверяется backend через API YooKassa.

Нужны VPS Beget с Ubuntu и установленными Docker/Compose (образ Docker), 2 ГБ RAM как минимум, публичный IPv4, SSH-ключ, WooCommerce REST/Store API, Shop ID и ключ YooKassa выбранного магазина. Certbot устанавливается из Snap, поскольку сертификаты Let's Encrypt для IP требуют версии 5.4+ и профиля `shortlived`; сертификат действует около шести дней и обновляется автоматически. Для оформления нужны реальные опубликованные HTTPS-адреса политики конфиденциальности и условий покупки. Без этих документов форма специально не отправляет персональные данные.

## SSH-доступ к текущему VPS

Подключение к Beget-серверу `93.188.186.9` с Mac:

```bash
ssh -i ~/.ssh/id_ed25519 root@93.188.186.9
```

Приватный ключ остаётся на Mac и в репозиторий не копируется. До запуска `server-setup.sh` подключайтесь как `root`; после него для обычной работы используйте `deploy@93.188.186.9`.

### Если VPN мешает подключению на Mac

7 октября 2026 года SSH зависал с `Connection timed out during banner exchange`, а HTTPS — с таймаутом TLS. Соединение шло через VPN-интерфейс `utun4`; напрямую через Wi-Fi `en0` оба подключения работали. В этом случае проверка SSH-ключа ещё не началась. Прежняя ошибка `Permission denied` была связана со склеившимися строками ключей в `authorized_keys` и исправлялась отдельно.

Проверьте прямое подключение, оставив VPN включённым:

```bash
ssh -i ~/.ssh/id_ed25519 \
  -o 'ProxyCommand=/usr/bin/nc -b en0 -G 8 %h %p' \
  -o BatchMode=yes -o ConnectTimeout=10 \
  deploy@93.188.186.9 'printf "SSH OK\n"'

curl --interface en0 --silent --show-error --output /dev/null \
  --write-out 'HTTPS=%{http_code}\n' --connect-timeout 5 --max-time 10 \
  https://93.188.186.9/
```

Ожидаемые результаты: `SSH OK` и `HTTPS=401` — сайт требует пароль. `en0` — активный Wi-Fi-интерфейс этого Mac; при другом подключении найдите имя интерфейса через `networksetup -listallhardwareports` и замените `en0` в командах. SSH остаётся зашифрованным, используется существующий ключ. Настройки VPN и сервера не меняются.

Для **полного деплоя** нужны прямые подключения SSH, `rsync` и финальной HTTPS-проверки. Из корня проекта вместо обычной команды публикации выполните блок ниже. Требования чистой, синхронизированной с GitHub ветки `main` сохраняются; временные обёртки удаляются при завершении. Проверки локального API через SSH-туннель идут обычным способом.

```bash
bash <<'DIRECT_DEPLOY'
set -Eeuo pipefail
deploy_net_tmp=$(mktemp -d /tmp/nikass-deploy-net.XXXXXX)
trap 'rm -f "$deploy_net_tmp/ssh" "$deploy_net_tmp/curl"; rmdir "$deploy_net_tmp"' EXIT

cat > "$deploy_net_tmp/ssh" <<'SSH_WRAPPER'
#!/bin/bash
exec /usr/bin/ssh -i "$HOME/.ssh/id_ed25519" \
  -o 'ProxyCommand=/usr/bin/nc -b en0 -G 8 %h %p' "$@"
SSH_WRAPPER

cat > "$deploy_net_tmp/curl" <<'CURL_WRAPPER'
#!/bin/bash
for arg in "$@"; do
  case "$arg" in
    https://93.188.186.9|https://93.188.186.9/*)
      exec /usr/bin/curl --interface en0 "$@" ;;
  esac
done
exec /usr/bin/curl "$@"
CURL_WRAPPER

chmod 700 "$deploy_net_tmp/ssh" "$deploy_net_tmp/curl"
export PATH="$deploy_net_tmp:/opt/homebrew/bin:$HOME/.bun/bin:$PATH"
export RSYNC_RSH="$deploy_net_tmp/ssh"
DEPLOY_HOST=93.188.186.9 \
SITE_URL=https://93.188.186.9 \
PUBLIC_PRIVACY_URL=https://nikass.ru/privacy-policy \
./deploy/deploy.sh publish
DIRECT_DEPLOY
```

Этот способ проверен успешным деплоем релиза `01fe3f4`. Если прямое подключение тоже не работает, проверьте состояние VPS в Beget и доступность SSH/HTTPS; таймаут сам по себе не доказывает проблему с ключом.

## 1. Подготовка VPS

Из корня репозитория скопируйте скрипты на сервер и выполните подготовку. `DEPLOY_PUBLIC_KEY` — **публичный** SSH-ключ компьютера, с которого будете выкладывать сайт.

```bash
scp deploy/server-setup.sh root@VPS_IP:/root/nikass-server-setup.sh
ssh root@VPS_IP "DEPLOY_PUBLIC_KEY='ssh-ed25519 ВАШ_ПУБЛИЧНЫЙ_КЛЮЧ' bash /root/nikass-server-setup.sh"
ssh deploy@VPS_IP
```

Скрипт создаёт пользователя `deploy`, открывает только SSH/HTTP/HTTPS и сохраняет существующий вход root. `deploy` входит в группу `docker`, что даёт ему фактически права администратора VPS; используйте отдельный SSH-ключ и не передавайте его другим.

Скопируйте файлы конфигурации:

```bash
scp deploy/compose.yml deploy/init-app-role.sh deploy/nginx-site.conf.example deploy/setup-site.sh deploy/.env.example deploy/runtime.env.example deploy@VPS_IP:/srv/nikass/
ssh deploy@VPS_IP 'cp /srv/nikass/.env.example /srv/nikass/.env && cp /srv/nikass/runtime.env.example /srv/nikass/runtime.env && chmod 600 /srv/nikass/.env /srv/nikass/runtime.env'
```

На VPS заполните `/srv/nikass/.env` и `/srv/nikass/runtime.env`. Для `POSTGRES_PASSWORD` и `POSTGRES_APP_PASSWORD` создайте **разные** значения командой `openssl rand -hex 24`. Подставьте первое в `MIGRATION_DATABASE_URL`, второе — в `DATABASE_URL`; `JWT_SECRET` создайте командой `openssl rand -hex 32`. В runtime-конфигурации уже указаны IP VPS и WooCommerce API для `nikass.ru`; задайте WooCommerce ключи и YooKassa Shop ID/secret выбранного магазина и одноразовые `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` для первого запуска БД. Пароль администратора не короче 12 символов. Не сохраняйте заполненные файлы в Git и не присылайте их в чат. API и scheduler получают только `runtime.env`, пароль владельца БД им недоступен.

WooCommerce Store API должен быть доступен извне, иметь российскую зону доставки и `free_shipping` с названием «СДЭК»; остальные требования описаны в [docs/ORDERS.md](../docs/ORDERS.md). YooKassa webhook задайте как `https://ДОМЕН/api/orders/payment/webhook`.

AI-чат включается в `runtime.env` только при наличии ключа провайдера (`AI_PROVIDER=chat-completions`, `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`). Подсказки адресов включаются публичным `PUBLIC_YANDEX_SUGGEST_API_KEY` при запуске сборки; без него адрес можно ввести вручную. Отправка email в этом тестовом профиле отключена.

Telegram-уведомления о заказах и заявках на поступление отправляются только в чат
из `ORDER_TELEGRAM_CHAT_ID`. Для общей группы добавьте туда `@nikass_orders_bot`,
затем задайте **оба** значения `ORDER_TELEGRAM_BOT_TOKEN` и `ORDER_TELEGRAM_CHAT_ID`
в серверном `/srv/nikass/runtime.env`, используя уже настроенную группу из локального
`backend/.env`. При отсутствии любого значения API отвечает «Заявки пока недоступны».
`deploy.sh publish` проверяет оба значения до сборки и переключения релиза;
при отсутствии настройки сообщает её имя, не раскрывая значение.
Заявка содержит товар, вариант, SKU и контакт покупателя; менеджеры связываются с ним сами.
На VPS примените изменение к API и scheduler с текущим образом; обычный `restart`
не перечитывает `env_file`:

```bash
cd /srv/nikass
docker compose --env-file .env --env-file release.env -f compose.yml up -d --force-recreate api scheduler
```

Все участники выбранной группы видят уведомления, включая контакты из заявок на поступление.
Витрина использует обычные тексты оформления и подтверждения оплаты. Платёжный режим
задаётся отдельно на backend. Внутренние Telegram-уведомления о тестовых платежах
сохраняют пометку для менеджеров.

### Закрытая проверка боевого магазина по IP

Владелец активировал этот этап 2026-10-07: сначала проверить реальную оплату на
`https://93.188.186.9`, затем подключить домен и открыть сайт покупателям.
На VPS применены боевые Shop ID/ключ, проверенные через `/v3/me`, и настройки:

```env
YOO_KASSA_TEST_MODE=false
YOO_KASSA_FULFILLMENT_MODE=woocommerce
YOO_KASSA_TEST_FULFILLMENT_ENABLED=false
YOO_KASSA_RETURN_URL=https://93.188.186.9/checkout
```

В боевом кабинете HTTP-уведомления направлены на
`https://93.188.186.9/api/orders/payment/webhook`; включены `payment.succeeded`,
`payment.waiting_for_capture` и `payment.canceled`. API и scheduler пересозданы
на существующем релизе `20261007011019-01fe3f471f76`; оба получают Telegram-настройки
группы менеджеров. `NODE_ENV=staging` и пароль на сайте сохранены: это закрытая
проверка с реальными списаниями, а не публичный production-релиз.

Проверено: API готов, `/v3/me` сообщает `enabled` и `test=false`, группа Telegram
доступна серверу, сайт отвечает 401 без пароля, webhook принимает запрос без пароля
и отклоняет некорректное тело с 400. Реальная покупка и создание оплаченного заказа
ещё не подтверждены. Контрольную оплату завершает владелец со своими данными;
после неё проверить заказ в WooCommerce и сообщение в Telegram.
Когда сайт переедет на домен, обновить `YOO_KASSA_RETURN_URL`, HTTP-уведомления,
`PUBLIC_API_URL`, CORS и HTTPS вместе. Адрес возврата должен совпадать с origin
оформления, чтобы браузер восстановил оплату.

## 2. HTTPS и пароль

После подготовки VPS запустите от root:

```bash
sudo SITE_IP=93.188.186.9 bash /srv/nikass/setup-site.sh
```

Certbot выпустит короткоживущий сертификат на IP, затем `htpasswd` попросит придумать пароль для пользователя `tester`. HTTP переводится на HTTPS, пароль запрашивается только по HTTPS. Автоматическое обновление обеспечивает таймер Certbot; проверьте `sudo certbot renew --dry-run`.

## 3. Публикация

Публикуйте только после commit/push в `main`: скрипт требует чистый Git и точное совпадение с `origin/main`. Команда запускается на компьютере из корня проекта:

```bash
DEPLOY_HOST=93.188.186.9 \
SITE_URL=https://93.188.186.9 \
PUBLIC_PRIVACY_URL=https://nikass.ru/privacy-policy \
./deploy/deploy.sh publish
```

Для закрытого теста ссылка на опубликованную страницу оплаты и доставки; перед открытием магазина покупателям замените её на утверждённую оферту/условия покупки. Текущая страница публичной оферты на `nikass.ru` пока является заглушкой. Сборка backend выполняется локальным Docker для Linux amd64, образ передаётся по SSH, миграция проходит до переключения API, Astro собирается через SSH-туннель к API на VPS, статика переключается на новый каталог. При ошибке скрипт пытается восстановить предыдущую версию. Первое включение требует `ADMIN_SEED_*`; последующие публикации игнорируют эти значения при миграции. После первого успешного запуска удалите `ADMIN_SEED_EMAIL` и `ADMIN_SEED_PASSWORD` из `/srv/nikass/.env`.

Обычная публикация сохраняет серверные `.env`, `runtime.env`, HTTPS и пароль сайта.
Если платформа, конфигурация и слои собранного API-образа совпадают с текущим,
скрипт использует существующий образ под новым тегом; изменённый образ передаёт
через gzip. Неизменённые файлы витрины связываются с предыдущим релизом через
`rsync --link-dest`, поэтому по сети передаются только изменения. Предыдущий
каталог остаётся доступным для отката.

```bash
DEPLOY_HOST=VPS_IP ./deploy/deploy.sh list
DEPLOY_HOST=VPS_IP ./deploy/deploy.sh rollback ИМЯ_ВЕРСИИ_ИЗ_LIST
```

Перед переключением статики скрипт выставляет на VPS права `755` для каталогов и `644` для публичных файлов. Это позволяет Nginx читать изображения даже после передачи с Mac: встроенный `openrsync` может игнорировать `--chmod`.

Миграция запускается без интерактивного stdin, чтобы Docker Compose не забирал следующие команды SSH-скрипта и обновление API/планировщика выполнялось после миграции.

Откат переключает API и статику, но **не откатывает миграции PostgreSQL**. Перед публикацией несовместимой миграции нужна отдельная резервная копия и план. Данные БД находятся в Docker volume `nikass_postgres_data`, загрузки — в `/srv/nikass/storage`; оба места требуют внешних резервных копий. Сервер также нуждается в обновлениях Ubuntu, Docker и мониторинге диска. Старые образы и релизы не удаляются автоматически.

После публикации проверьте руками вход по паролю, каталог, корзину, quote, переход на страницу YooKassa, возврат и отображение статуса платежа. Если форма сообщает об отсутствующих документах, проверьте `PUBLIC_PRIVACY_URL` при сборке. «Условия покупки» открывают страницу `/payment-and-delivery` на текущем сайте и не требуют отдельной настройки.
