#!/usr/bin/env bash
set -Eeuo pipefail

DEPLOY_PUBLIC_KEY="${DEPLOY_PUBLIC_KEY:-}"
[[ "$(id -u)" -eq 0 ]] || { echo 'Запустите от root.' >&2; exit 1; }
[[ "$DEPLOY_PUBLIC_KEY" == ssh-*\ * || "$DEPLOY_PUBLIC_KEY" == ecdsa-*\ * ]] || { echo 'Задайте DEPLOY_PUBLIC_KEY.' >&2; exit 1; }
command -v docker >/dev/null && docker compose version >/dev/null || { echo 'Нужен Ubuntu VPS с установленными Docker и Compose (образ Docker в Beget).' >&2; exit 1; }
[[ "$(uname -m)" == x86_64 ]] || { echo 'Скрипт сборки рассчитан на VPS x86_64.' >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx rsync curl ufw snapd apache2-utils
systemctl enable --now snapd.socket
if ! snap list certbot >/dev/null 2>&1; then snap install --classic certbot; fi
ln -sfn /snap/bin/certbot /usr/local/bin/certbot

if ! id deploy >/dev/null 2>&1; then useradd --create-home --user-group --shell /bin/bash deploy; fi
usermod -aG docker deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
grep -qxF "$DEPLOY_PUBLIC_KEY" /home/deploy/.ssh/authorized_keys || printf '%s\n' "$DEPLOY_PUBLIC_KEY" >> /home/deploy/.ssh/authorized_keys
chown deploy:deploy /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys

install -d -m 750 -o deploy -g deploy /srv/nikass
install -d -m 755 -o deploy -g deploy /var/www/nikass /var/www/nikass/releases
install -d -m 755 -o 1000 -g 1000 /srv/nikass/storage
install -d -m 755 /var/www/html

ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
systemctl enable --now nginx
echo 'Сервер подготовлен. Проверьте вход ssh deploy@IP в новом окне, затем заполните /srv/nikass/.env и запустите setup-site.sh.'
