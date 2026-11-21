#!/usr/bin/env bash

set -euo pipefail
umask 077 # every file this script creates is private (600) from the moment it exists

for f in .env .env.test; do
  if [[ -e "$f" ]]; then echo "$f already exists. Delete .env and .env.test to regenerate."; exit 1; fi
done

secret() { openssl rand -hex 24; } # hex: nothing that needs URL-encoding in connection strings
PG=$(secret); MONGO_ROOT=$(secret); MONGO_APP=$(secret); SEED=$(secret); JWT=$(openssl rand -hex 48)
render() { # render <template> <output>
  sed -e "s|__POSTGRES_PASSWORD__|$PG|g" \
      -e "s|__MONGO_ROOT_PASSWORD__|$MONGO_ROOT|g" \
      -e "s|__MONGO_APP_PASSWORD__|$MONGO_APP|g" \
      -e "s|__JWT_ACCESS_SECRET__|$JWT|g" "$1" > "$2"
  chmod 600 "$2" # belt and braces: readable by you only, even if umask was overridden
  echo "created: $2"
}

render .env.example .env
render .env.test.example .env.test