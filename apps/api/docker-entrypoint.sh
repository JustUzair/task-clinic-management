#!/bin/sh
set -eu

if [ "${RUN_MIGRATIONS_ON_START:-true}" = "true" ]; then
  pnpm --filter @clinic/api db:migrate
fi

exec "$@"
