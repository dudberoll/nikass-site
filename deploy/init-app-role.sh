#!/bin/sh
set -eu

# Runs once, on a fresh PostgreSQL volume. The migration owner remains postgres;
# the API connects as a separate role granted access by db:deploy.
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  --set=app_password="$POSTGRES_APP_PASSWORD" <<'SQL'
CREATE ROLE nikass_app LOGIN PASSWORD :'app_password';
SQL
