#!/bin/sh
# Execute INSIDE the PostgreSQL container. Restores into a new disposable DB.
set -eu
test_db="frotagest_restore_check_$(date +%s)_$$"
case "$test_db" in frotagest_restore_check_*) ;; *) exit 1;; esac
archive=$(mktemp /tmp/frotagest-backup-check.XXXXXX)
created=0
cleanup() {
    if [ "$created" = 1 ]; then dropdb -U "$POSTGRES_USER" "$test_db"; fi
    rm -f "$archive"
}
trap cleanup EXIT
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$archive"
createdb -U "$POSTGRES_USER" "$test_db"
created=1
pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$test_db" "$archive"
for table in trucks maintenance mileage_history maintenance_plans attachments users; do
    expected=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM public.$table")
    actual=$(psql -U "$POSTGRES_USER" -d "$test_db" -Atc "SELECT count(*) FROM public.$table")
    test "$expected" = "$actual"
    echo "$table: contagem restaurada confere ($actual)"
done
if [ "$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM information_schema.schemata WHERE schema_name='e2e'")" = 1 ]; then
    for table in trucks maintenance mileage_history; do
        expected=$(psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "SELECT count(*) FROM e2e.$table")
        actual=$(psql -U "$POSTGRES_USER" -d "$test_db" -Atc "SELECT count(*) FROM e2e.$table")
        test "$expected" = "$actual"
        echo "e2e.$table: contagem restaurada confere ($actual)"
    done
fi
echo 'Backup e restauração PostgreSQL validados em banco temporário. Banco original preservado.'
