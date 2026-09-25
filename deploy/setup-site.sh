#!/usr/bin/env bash
set -Eeuo pipefail

SITE_IP="${SITE_IP:-}"
ACME_EMAIL="${ACME_EMAIL:-}"
[[ "$(id -u)" -eq 0 ]] || { echo 'Запустите от root.' >&2; exit 1; }
[[ "$SITE_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || { echo 'Задайте публичный IPv4 в SITE_IP.' >&2; exit 1; }
IFS=. read -r -a octets <<< "$SITE_IP"
for octet in "${octets[@]}"; do
    (( 10#$octet <= 255 )) || { echo 'Некорректный IPv4 в SITE_IP.' >&2; exit 1; }
done
if [[ -n "$ACME_EMAIL" ]]; then
    [[ "$ACME_EMAIL" == *@*.* ]] || { echo 'Некорректный ACME_EMAIL.' >&2; exit 1; }
    email_args=(-m "$ACME_EMAIL")
else
    email_args=(--register-unsafely-without-email)
fi
[[ -f /srv/nikass/nginx-site.conf.example ]] || { echo 'Сначала скопируйте nginx-site.conf.example в /srv/nikass.' >&2; exit 1; }
version="$(certbot --version | awk '{print $2}')"
dpkg --compare-versions "$version" ge 5.4 || { echo 'Для сертификата на IP нужен Certbot 5.4 или новее.' >&2; exit 1; }

# Serve only ACME challenges until the certificate is ready; never ask for a password on HTTP.
cat > /etc/nginx/sites-available/nikass <<EOF
server {
    listen 80;
    server_name $SITE_IP;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 404; }
}
EOF
ln -sfn /etc/nginx/sites-available/nikass /etc/nginx/sites-enabled/nikass
nginx -t
systemctl reload nginx
install -d -m 755 /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nsystemctl reload nginx\n' > /etc/letsencrypt/renewal-hooks/deploy/nikass-nginx.sh
chmod 755 /etc/letsencrypt/renewal-hooks/deploy/nikass-nginx.sh
certbot certonly --webroot -w /var/www/html --non-interactive --agree-tos \
    "${email_args[@]}" --preferred-profile shortlived --ip-address "$SITE_IP" \
    --deploy-hook /etc/letsencrypt/renewal-hooks/deploy/nikass-nginx.sh

echo 'Задайте пароль для входа на тестовый сайт:'
htpasswd -c /etc/nginx/nikass.htpasswd tester
chmod 640 /etc/nginx/nikass.htpasswd
chown root:www-data /etc/nginx/nikass.htpasswd
sed "s/__SITE_IP__/$SITE_IP/g" /srv/nikass/nginx-site.conf.example > /etc/nginx/sites-available/nikass
nginx -t
systemctl reload nginx
echo "HTTPS готов: https://$SITE_IP (логин tester)."
