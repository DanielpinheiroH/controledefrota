#!/bin/bash
set -Eeuo pipefail
umask 077
cd /opt/frotasguest
exec 9> /opt/frotasguest/logs/backup.lock
flock -n 9 || exit 0
stamp=$(date -u +%Y%m%dT%H%M%SZ)
dc=(docker compose -p frotasguest -f /opt/frotasguest/docker-compose.prod.yml)
paused=false
cleanup() { if $paused; then docker unpause frotasguest-api >/dev/null; fi; }
trap cleanup EXIT
docker pause frotasguest-api >/dev/null
paused=true
"${dc[@]}" exec -T frotasguest-postgres pg_dump -U frotasguest -d frotasguest -Fc > "backups/postgres/$stamp.dump.partial"
tar -czf "backups/uploads/$stamp.tgz.partial" -C data uploads
docker unpause frotasguest-api >/dev/null
paused=false
"${dc[@]}" exec -T frotasguest-postgres pg_restore --list < "backups/postgres/$stamp.dump.partial" > "logs/backup-$stamp.list"
tar -tzf "backups/uploads/$stamp.tgz.partial" >/dev/null
mv "backups/postgres/$stamp.dump.partial" "backups/postgres/$stamp.dump"
mv "backups/uploads/$stamp.tgz.partial" "backups/uploads/$stamp.tgz"
tar -czf "backups/config/$stamp.tgz" .env docker-compose.prod.yml infra scripts
git -C app rev-parse HEAD > "backups/$stamp.commit"
sha256sum "backups/postgres/$stamp.dump" "backups/uploads/$stamp.tgz" "backups/config/$stamp.tgz" > "backups/$stamp.sha256"
for folder in /opt/frotasguest/backups/postgres /opt/frotasguest/backups/uploads /opt/frotasguest/backups/config; do
  find "$folder" -maxdepth 1 -type f -name '20*T*Z.*' -mtime +35 -delete
done
find /opt/frotasguest/backups -maxdepth 1 -type f -name '20*T*Z.*' -mtime +35 -delete
find /opt/frotasguest/logs -maxdepth 1 -type f -name 'backup-20*T*Z.list' -mtime +35 -delete
echo "$(date -u +%FT%TZ) Backup validado: $stamp (retenção: 35 dias)"
