#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if [ -f .env ]; then echo '.env existente preservado.'; exit 0; fi
umask 077
password=$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')
cat > .env <<EOF
POSTGRES_DB=frotagest
POSTGRES_USER=frotagest
POSTGRES_PASSWORD=$password
APP_PORT=8088
COOKIE_SECURE=false
ALLOWED_ORIGINS=http://localhost:8088,http://127.0.0.1:8088,http://localhost:5173
EOF
echo '.env criado com senha aleatória.'
