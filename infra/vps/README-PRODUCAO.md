# FrotaGest — operação de produção

URL: https://frotasguest.duckdns.org. VPS srv1569990, 72.60.61.34. Projeto exclusivamente em `/opt/frotasguest`, código em `app/`. O SHA implantado está em `.env` (`APP_VERSION`) e `git -C app rev-parse HEAD`.

## Isolamento

As empresas do FrotaGest usam isolamento lógico: **ID 3** para a operação existente e **ID 1** para testes. Login, usuários, relatórios e anexos são restritos à empresa. Consulte [multiempresa](../../docs/MULTI-TENANT.md), inclusive a restrição de rollback após a migração `a72b1130c901`.

Compose `frotasguest`; containers `frotasguest-frontend`, `frotasguest-api`, `frotasguest-postgres`; rede `frotasguest-network`. Frontend publica somente `127.0.0.1:8060`. API 8000 e PostgreSQL 5432 são internos. Banco e usuário próprios: `frotasguest`. Bind mounts exclusivos: `data/postgres` e `data/uploads`; não há volume compartilhado com outros projetos. Não executar prune, apagar volumes, parar outros containers ou reiniciar a VPS.

O Nginx preexistente permanece em 80/443. Apenas `/etc/nginx/sites-enabled/frotasguest.duckdns.org` foi adicionado, apontando para `infra/nginx-active.conf`. Backup anterior: `backups/config/nginx-before.tgz`. Certificados Let's Encrypt exclusivos em `certificates/`, renovados pelo script próprio; nenhuma configuração de outro site deve ser substituída. Valide `nginx -t` antes e depois de qualquer alteração e use somente reload, nunca restart desnecessário.

## Comandos

Execute na VPS como root, exclusivamente nesta pasta:

```bash
cd /opt/frotasguest
docker compose -p frotasguest -f docker-compose.prod.yml ps
docker compose -p frotasguest -f docker-compose.prod.yml up -d --wait
docker compose -p frotasguest -f docker-compose.prod.yml stop
docker compose -p frotasguest -f docker-compose.prod.yml restart
docker compose -p frotasguest -f docker-compose.prod.yml logs --tail=100 -f
docker compose -p frotasguest -f docker-compose.prod.yml exec frotasguest-api alembic current
docker compose -p frotasguest -f docker-compose.prod.yml exec frotasguest-api alembic check
curl -fsS https://frotasguest.duckdns.org/api/health
```

`restart` afeta apenas este Compose. Para migrar, use `run --rm --no-deps frotasguest-api alembic upgrade head`. As imagens também executam upgrade na inicialização. Todos os serviços usam `unless-stopped`; Docker já inicia com a VPS. Não reiniciar a VPS para testar.

## ADMIN e secrets

ADMIN inicial: `admin@frotasguest.local`, senha aleatória privada em `/opt/frotasguest/admin-access.json` (0600). Não versionar ou publicar este arquivo, `.env`, certificados ou credenciais de validação. Não existe senha padrão. A autenticação usa tokens aleatórios por sessão e hashes no banco; não requer chave JWT global. Cookies Secure, HttpOnly, SameSite strict; CORS apenas do domínio oficial.

Criar um ADMIN pessoal com senha escolhida interativamente:

```bash
cd /opt/frotasguest
docker compose -p frotasguest -f docker-compose.prod.yml exec frotasguest-api python -m app.cli create-admin --email seu-email@empresa.com.br --name "Administrador"
```

Usuários de consulta podem ser criados na interface por um ADMIN. A conta temporária de validação deve ser desativada após os testes. Não usar seed de desenvolvimento.

## Backup e logs

`scripts/backup.sh` executa diariamente às **03:17 UTC**, via `/etc/cron.d/frotasguest` (link exclusivo). Mantém **35 dias de backups diários**, dump custom PostgreSQL, uploads, configuração privada e SHA do código. Pausa brevemente **somente a API FrotaGest** para obter dump e uploads consistentes; o trap retoma a API em caso de erro. Não executa operações nos outros projetos. Backup inválido não recebe manifesto de conclusão.

```bash
cd /opt/frotasguest
./scripts/backup.sh
./scripts/verify-backup.sh TIMESTAMP_DO_BACKUP
tail -n 100 logs/backup.log
```

A verificação restaura em container efêmero próprio, sem rede, banco em tmpfs, compara contagens de todas as tabelas e hashes dos uploads. Execute durante janela sem gravações para comparar com o banco atual. Não restaura sobre produção. Docker limita logs a 3 arquivos de 10 MB por container. `/etc/logrotate.d/frotasguest` rotaciona somente logs deste projeto por 14 dias. Renovação do certificado às 04:41 e 16:41 UTC, com reload do Nginx somente após renovação e validação. Esses dois links globais são exclusivos e apontam para scripts dentro do projeto.

Os backups locais não protegem contra perda completa da VPS. Configure cópia externa criptografada antes de depender deles como única proteção.

## Restauração controlada

Não executar automaticamente. Escolha dump, uploads, configuração e SHA do **mesmo timestamp**; confira `sha256sum -c backups/TIMESTAMP.sha256` e ensaie com `verify-backup.sh`. Faça um backup do estado atual. Pare somente frontend/API do FrotaGest.

Prefira criar um novo banco exclusivo, por exemplo `frotasguest_restore_YYYYMMDD`, no PostgreSQL deste projeto. Restaure com `pg_restore --exit-on-error --no-owner -U frotasguest -d BANCO_NOVO`, via `docker exec -i frotasguest-postgres`, recebendo o dump por stdin. Extraia os uploads em uma nova pasta dentro de `/opt/frotasguest/data`, confira conteúdo e permissões (UID/GID 1000) e ajuste **somente** o Compose FrotaGest para o banco e diretório restaurados. Guarde os dados anteriores para rollback. Não use `--clean` nem exclua bancos ou volumes sem autorização específica.

Selecione o SHA compatível com a migration do backup, configure `APP_VERSION`, inicie somente este projeto e valide login, anexos, custos, preventivas e saúde. Não restaure `.env` de outro ambiente nem aplique downgrade Alembic indiscriminadamente.

## Atualização e rollback

1. Confirmar workspace limpo (`git -C app status --short`), registrar SHA, imagens e migration atuais; executar backup e validar.
2. `git -C app fetch origin main`; revisar o diff e migrations antes de `git -C app merge --ff-only origin/main`.
3. Atualizar `APP_VERSION` em `.env` para o novo SHA, preservando secrets. Revisar alterações de infraestrutura antes de copiá-las de `app/infra/vps`.
4. Compilar sequencialmente: `COMPOSE_PARALLEL_LIMIT=1 docker compose -p frotasguest -f docker-compose.prod.yml build`. Não remover imagens anteriores.
5. Em janela de manutenção, parar somente frontend/API deste projeto, aplicar migration com `run --rm --no-deps frotasguest-api alembic upgrade head` e executar `up -d --wait`.
6. Validar HTTPS, login, API, gravação, anexos e comparar status dos demais serviços. Registrar SHA implantado.

Rollback sem mudança de schema: selecionar SHA/imagens anteriores, atualizar APP_VERSION e executar `up -d --no-build --wait` apenas neste projeto. Não usar uma imagem antiga sobre schema incompatível. Se migrations/dados mudaram, seguir restauração controlada do conjunto completo (banco, uploads, configuração, código), guardando o estado atual. Nunca executar reset, downgrade, exclusão de volumes ou restauração sobre outros projetos para tentar recuperar o FrotaGest.

## PWA Android

No Chrome Android, abra a URL HTTPS, entre e escolha **Instalar aplicativo / Adicionar à tela inicial**. Abra pelo ícone e confirme o modo standalone. Quando houver atualização, aceite o aviso; se necessário, feche e abra o aplicativo. O service worker mantém somente assets estáticos, sem API/anexos autenticados; dados de frota exigem conexão. Não há APK. A confirmação física de instalação depende do usuário.
