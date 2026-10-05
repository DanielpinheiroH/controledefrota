#!/bin/bash
set -Eeuo pipefail
umask 077
cd /opt/frotasguest
stamp=${1:?Informe o timestamp do backup}
[[ "$stamp" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || exit 2
sha256sum -c "backups/$stamp.sha256"
test -z "$(docker ps -aq --filter name=^/frotasguest-restore-check$)"
docker run -d --rm --name frotasguest-restore-check --network none --memory 512m --cpus 0.5 --tmpfs /var/lib/postgresql/data --env-file /opt/frotasguest/.env -e POSTGRES_USER=frotasguest -e POSTGRES_DB=restore_check postgres:16-alpine >/dev/null
trap 'docker stop frotasguest-restore-check >/dev/null' EXIT
ready=false
for i in $(seq 1 30); do
  if docker exec frotasguest-restore-check pg_isready -h 127.0.0.1 -U frotasguest -d restore_check >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
$ready
docker exec -i frotasguest-restore-check pg_restore --exit-on-error --no-owner -U frotasguest -d restore_check < "backups/postgres/$stamp.dump"
python3 - "$stamp" <<'PY'
import subprocess,sys,tarfile,hashlib,pathlib
def query(container,db,sql):
    return subprocess.check_output(['docker','exec',container,'psql','-U','frotasguest','-d',db,'-At','-c',sql],text=True).strip()
tables=query('frotasguest-postgres','frotasguest',"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename").splitlines()
for table in tables:
    assert table.replace('_','').isalnum()
    sql=f'SELECT count(*) FROM "{table}"'
    assert query('frotasguest-postgres','frotasguest',sql)==query('frotasguest-restore-check','restore_check',sql),table
with tarfile.open(f'backups/uploads/{sys.argv[1]}.tgz','r:gz') as archive:
    files=0
    for member in archive:
        if member.isfile():
            target=(pathlib.Path('data')/member.name).resolve()
            assert target.is_relative_to(pathlib.Path('data/uploads').resolve())
            assert hashlib.sha256(archive.extractfile(member).read()).digest()==hashlib.sha256(target.read_bytes()).digest()
            files+=1
print(f'Restore real aprovado: {len(tables)} tabelas com contagens iguais; {files} uploads com SHA256 iguais.')
PY
