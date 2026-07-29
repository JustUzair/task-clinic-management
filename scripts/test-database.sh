#!/bin/sh
set -eu

test_database_url="postgresql://clinic_test:clinic_test@127.0.0.1:55432/clinic_test"
test_compose_project="atomicia-test"

cleanup() {
  docker compose -p "$test_compose_project" -f docker-compose.test.yaml \
    down --volumes
}

trap cleanup EXIT INT TERM

docker compose -p "$test_compose_project" -f docker-compose.test.yaml \
  up -d --wait
DATABASE_URL="$test_database_url" DIRECT_URL="$test_database_url" \
  pnpm --filter @clinic/api db:migrate
DATABASE_URL="$test_database_url" DIRECT_URL="$test_database_url" \
  RUN_DATABASE_TESTS=true pnpm --filter @clinic/api test
