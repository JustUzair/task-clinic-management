#!/bin/sh
set -eu

cd /app/apps/api

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  ./node_modules/.bin/prisma migrate deploy
fi

exec node dist/server.cjs
