#!/usr/bin/env bash
set -Eeuo pipefail

SITE_DOMAIN="${SITE_DOMAIN:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
[[ "$(id -u)" -eq 0 ]] || { echo 'Запустите от root.' >&2; exit 1; }
[[ "$SITE_DOMAIN" =~ ^[a-zA-Z0-9.-]+$ && "$SITE_DOMAIN" == *.* ]] || { echo 'Задайте SITE_DOMAIN.' >&2; exit 1; }
[[ "$ACME_EMAIL" == *@*.* ]] || { echo 'Задайте ACME_EMAIL.' >&2; exit 1; }
[[ -f /srv/nikass/nginx-site.conf.example ]] || { echo 'Сначала скопируйте nginx-site.conf.example в /srv/nikass.' >&2; exit 1; }

# Serve only ACME challenges until the certificate is ready; never ask for a password on HTTP.
cat > /etc/nginx/sites-available/nikass <<EOF
server {
    listen 80;
    server_name $SITE_DOMAIN;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 404; }
}
EOF
ln -sfn /etc/nginx/sites-available/nikass /etc/nginx/sites-enabled/nikass
nginx -t
systemctl reload nginx
certbot certonly --webroot -w /var/www/html --non-interactive --agree-tos -m "$ACME_EMAIL" -d "$SITE_DOMAIN"
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/nikass-nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/nikass-nginx.sh

echo 'Задайте пароль для входа на тестовый сайт:'
htpasswd -c /etc/nginx/nikass.htpasswd tester
chmod 640 /etc/nginx/nikass.htpasswd
chown root:www-data /etc/nginx/nikass.htpasswd
sed "s/__DOMAIN__/$SITE_DOMAIN/g" /srv/nikass/nginx-site.conf.example > /etc/nginx/sites-available/nikass
nginx -t
systemctl reload nginx
echo "HTTPS готов: https://$SITE_DOMAIN (логин tester)."
