#!/bin/sh
set -eu

: "${DB_HOST:?DB_HOST must be set}"
: "${POSTGRES_USER:?POSTGRES_USER must be set}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}"
: "${POSTGRES_DB:?POSTGRES_DB must be set}"

export PGPASSWORD="$POSTGRES_PASSWORD"

until pg_isready -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; do
  sleep 1
done

psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /sql/schema.sql
for migration in /sql/[0-9][0-9]-*.sql; do
  [ -f "$migration" ] || continue
  psql -v ON_ERROR_STOP=1 -h "$DB_HOST" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$migration"
done
