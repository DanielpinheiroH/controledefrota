# Backup e restauração

Banco e anexos precisam de cópias independentes dos volumes da aplicação. Na VPS, agende `scripts/backup.sh` com `BACKUP_DIR` em disco/montagem de backup, replique os arquivos para outro servidor e defina retenção. Nunca use `docker compose down -v` na operação normal.

Exemplo de cron diário (ajuste caminhos):

```cron
0 2 * * * BACKUP_DIR=/mnt/backup/frotagest /bin/sh /opt/frotagest/scripts/backup.sh >> /var/log/frotagest-backup.log 2>&1
```

O script não apaga backups antigos e não considera uma restauração validada apenas pela existência do arquivo. Banco e anexos são copiados sequencialmente; para um ponto consistente em produção, suspenda novas gravações durante a janela de backup ou utilize snapshots coordenados.

## Ensaio de restauração sem afetar produção

Ensaio automatizado no ambiente local, sem substituir o banco existente:

```sh
docker compose cp scripts/check-backup.sh postgres:/tmp/check-backup.sh
docker compose exec postgres sh /tmp/check-backup.sh
```

O teste gera um dump, cria um banco temporário com prefixo exclusivo, restaura e compara contagens. Somente esse banco temporário é removido. Esse ensaio valida o banco; para um backup de produção completo, também verifique os anexos e execute as conferências de negócio abaixo.

1. Prepare outro projeto Compose com outro nome, outro volume PostgreSQL, outra porta e `.env` de teste.
2. Suba somente o PostgreSQL vazio.
3. Copie o dump para o container com `docker compose cp`.
4. Restaure exclusivamente no banco de teste vazio:

```sh
docker compose -p frotagest-restore exec postgres sh -c 'pg_restore --exit-on-error --no-owner -U "$POSTGRES_USER" -d "$POSTGRES_DB" /tmp/backup.dump'
```

5. Restaure o arquivo de anexos no volume de uploads do projeto de teste, preservando o dono do diretório.
6. Suba backend e frontend no projeto de teste. Confira `alembic current`, quantidade de caminhões/manutenções, somas de custos e download de anexos.
7. Execute login, consulta de histórico e verifique planos preventivos. Registre data, arquivo usado e resultado em relatório de restauração.

Para restauração real, pare as gravações, preserve uma cópia do estado anterior e aprove explicitamente a substituição do banco. Não há script automático de exclusão do banco de produção neste repositório.
