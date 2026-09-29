#!/bin/sh
# Run on the Linux VPS from cron. BACKUP_DIR must be outside database volume.
set -eu
cd "$(dirname "$0")/.."
: "${BACKUP_DIR:?Informe BACKUP_DIR em armazenamento independente}"
umask 077
mkdir -p "$BACKUP_DIR"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dump="$BACKUP_DIR/frotagest-$stamp.dump"
docker compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$dump.partial"
test -s "$dump.partial"
mv "$dump.partial" "$dump"
docker compose exec -T backend tar -C /app/uploads -czf - . > "$BACKUP_DIR/uploads-$stamp.tar.gz"
echo "Backup gerado em $BACKUP_DIR. Valide restaurando em ambiente separado."
