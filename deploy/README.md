# NIKASS: тестовый сайт на Beget VPS

Этот вариант публикует **рабочую тестовую версию**: Astro storefront, Bun API, PostgreSQL 18 и планировщик на одном VPS. YooKassa использует тестовый магазин. После успешной оплаты сайт сверяет платёж, но не создаёт реальный WooCommerce order. Публичная страница закрыта паролем; YooKassa webhook доступен без него и проверяется backend через API YooKassa.

Нужны VPS Beget с Ubuntu и установленными Docker/Compose (образ Docker), 2 ГБ RAM как минимум, домен с A-записью на VPS, SSH-ключ, WooCommerce REST/Store API, тестовый Shop ID и ключ YooKassa. Для оформления также нужны опубликованные HTTPS-адреса политики конфиденциальности и условий покупки. Без этих двух документов форма специально не отправляет персональные данные. Адреса и ключи пока неизвестны, поэтому скрипты подготовлены, но публикация не выполнена.

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

На VPS заполните `/srv/nikass/.env` и `/srv/nikass/runtime.env`. Для `POSTGRES_PASSWORD` и `POSTGRES_APP_PASSWORD` создайте **разные** значения командой `openssl rand -hex 24`. Подставьте первое в `MIGRATION_DATABASE_URL`, второе — в `DATABASE_URL`; `JWT_SECRET` создайте командой `openssl rand -hex 32`. Замените `YOUR_DOMAIN` и `YOUR_WOO_SITE`, укажите WooCommerce ключи, тестовые YooKassa Shop ID/secret и одноразовые `ADMIN_SEED_EMAIL`/`ADMIN_SEED_PASSWORD` для первого запуска БД. Пароль администратора не короче 12 символов. Не сохраняйте заполненные файлы в Git и не присылайте их в чат. API и scheduler получают только `runtime.env`, пароль владельца БД им недоступен.

WooCommerce Store API должен быть доступен извне, иметь российскую зону доставки и `free_shipping` с названием «СДЭК»; остальные требования описаны в [docs/ORDERS.md](../docs/ORDERS.md). Тестовый YooKassa webhook задайте как `https://ДОМЕН/api/orders/payment/webhook`.

AI-чат включается в `runtime.env` только при наличии ключа провайдера (`AI_PROVIDER=chat-completions`, `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`). Подсказки адресов включаются публичным `PUBLIC_YANDEX_SUGGEST_API_KEY` при запуске сборки; без него адрес можно ввести вручную. Отправка email в этом тестовом профиле отключена.

## 2. HTTPS и пароль

После того как DNS указывает на VPS, запустите от root:

```bash
sudo SITE_DOMAIN=example.ru ACME_EMAIL=you@example.ru bash /srv/nikass/setup-site.sh
```

Certbot выпустит сертификат, затем `htpasswd` попросит придумать пароль для пользователя `tester`. HTTP переводится на HTTPS, пароль запрашивается только по HTTPS. Продление сертификата обеспечивает системный таймер Certbot; проверьте `sudo certbot renew --dry-run`.

## 3. Публикация

Публикуйте только после commit/push в `main`: скрипт требует чистый Git и точное совпадение с `origin/main`. Команда запускается на компьютере из корня проекта:

```bash
DEPLOY_HOST=VPS_IP \
SITE_URL=https://example.ru \
PUBLIC_PRIVACY_URL=https://example.ru/privacy \
PUBLIC_TERMS_URL=https://example.ru/terms \
./deploy/deploy.sh publish
```

Укажите **реальные опубликованные** юридические URL. В примере `/privacy` и `/terms` условные. Сборка backend выполняется локальным Docker для Linux amd64, образ передаётся по SSH, миграция проходит до переключения API, Astro собирается через SSH-туннель к API на VPS, статика переключается на новый каталог. При ошибке скрипт пытается восстановить предыдущую версию. Первое включение требует `ADMIN_SEED_*`; последующие публикации игнорируют эти значения при миграции. После первого успешного запуска удалите `ADMIN_SEED_EMAIL` и `ADMIN_SEED_PASSWORD` из `/srv/nikass/.env`.

```bash
DEPLOY_HOST=VPS_IP ./deploy/deploy.sh list
DEPLOY_HOST=VPS_IP ./deploy/deploy.sh rollback ИМЯ_ВЕРСИИ_ИЗ_LIST
```

Откат переключает API и статику, но **не откатывает миграции PostgreSQL**. Перед публикацией несовместимой миграции нужна отдельная резервная копия и план. Данные БД находятся в Docker volume `nikass_postgres_data`, загрузки — в `/srv/nikass/storage`; оба места требуют внешних резервных копий. Сервер также нуждается в обновлениях Ubuntu, Docker и мониторинге диска. Старые образы и релизы не удаляются автоматически.

После публикации проверьте руками вход по паролю, каталог, корзину, quote, переход на страницу тестовой YooKassa, возврат и статус «Тестовая оплата подтверждена». Если форма сообщает об отсутствующих документах, проверьте `PUBLIC_PRIVACY_URL` и `PUBLIC_TERMS_URL` при сборке.
