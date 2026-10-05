# FrotaGest

MVP para manutenção de caminhões: React/TypeScript mobile-first, FastAPI e PostgreSQL. Inclui login, frota, KM, oficinas, manutenção com peças/serviços, preventivas, alertas, custos, XLSX, documentos, auditoria e PWA.

Produção: **https://frotasguest.duckdns.org**. Operação da VPS compartilhada em [README de produção](infra/vps/README-PRODUCAO.md), usando o Nginx existente e o Compose exclusivo em `/opt/frotasguest`. O override Caddy abaixo é somente uma alternativa para servidores novos; não deve ser usado nesta VPS.

## Iniciar com Docker — Windows

Requisitos: Docker Desktop iniciado (containers Linux), Docker Compose 2.24.4+ e porta 8088 disponível. Execute na raiz do repositório:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/init-env.ps1
docker compose up -d --build
docker compose exec backend alembic current
docker compose exec backend python -m app.cli create-admin --email seu-email@empresa.com.br --name "Administrador"
```

A senha é solicitada de forma interativa, sem aparecer no terminal; mínimo de 8 caracteres. Não há senha padrão. O script preserva `.env` existente e gera senha aleatória para PostgreSQL quando ainda não existe. `.env` não deve ser versionado.

Acesse **http://localhost:8088**. API/Swagger: **http://localhost:8088/api/docs**. Saúde: `/api/health`.

No Linux/macOS, substitua o primeiro comando por `sh scripts/init-env.sh`; os comandos Docker são iguais.

## Operação

**Multiempresa:** no login, use **ID 3** para a operação atual e **ID 1** para testes, com as credenciais próprias de cada empresa. Usuários, frota, manutenção, anexos e relatórios são separados. Consulte [isolamento e administração das empresas](docs/MULTI-TENANT.md). “Lembrar de mim” também mantém o ID da empresa.

No login, **Lembrar de mim neste aparelho** mantém o e-mail após entrar com sucesso. Aceite salvar a senha no gerenciador do navegador para preencher os campos nos próximos acessos. Quando suportado e autorizado pelo navegador, o app também recupera a credencial salva; a senha nunca é persistida no localStorage. Desmarcar remove o e-mail lembrado pelo app, mas senhas já salvas devem ser gerenciadas no navegador. O preenchimento pode exigir seleção da conta ou desbloqueio do aparelho. A opção não altera a duração da sessão.

Para excluir um caminhão: abra **Frota → caminhão → Excluir caminhão** e confirme. Disponível para ADMIN. O veículo é inativado, sai da lista principal e mantém todo o histórico. Marque **Mostrar também caminhões excluídos/inativos** para consultá-lo ou abra **Editar caminhão** e altere o status para reativá-lo.

```sh
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend frontend postgres
docker compose logs -f backend
docker compose stop
docker compose start
docker compose down
```

`down` preserva os volumes nomeados. **Não use `down -v`** em ambientes com dados que precisam ser mantidos.

## Migrations

O backend executa `alembic upgrade head` antes de iniciar. Execução manual:

```sh
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
docker compose exec backend alembic check
```

Para criar uma nova migration durante desenvolvimento, com o código montado:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml run --rm backend alembic revision --autogenerate -m descricao_da_alteracao
```

Revise a migration antes de aplicá-la. Não execute downgrade em produção sem revisão e backup validado.

## Desenvolvimento frontend + backend

Requisitos adicionais: Node.js 22.20+ e npm. Backend/PostgreSQL em Docker, com reload e API em localhost:8000:

```sh
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build postgres backend
cd frontend
npm ci
npm run dev
```

No PowerShell com restrição a scripts, use `npm.cmd` em vez de `npm`. Frontend em http://localhost:5173; Vite encaminha `/api` a localhost:8000. O arquivo Compose de desenvolvimento publica PostgreSQL **somente em localhost:5433**. O Compose padrão e produção não publicam a porta do banco.

Backend sem container (Python 3.12+, opcional): crie um venv, instale `backend/requirements.txt`, defina `DATABASE_URL=postgresql+psycopg://USUARIO:SENHA@localhost:5433/frotagest`, `UPLOAD_DIR` em um diretório local e `ALLOWED_ORIGINS=http://localhost:5173`. Em `backend/`, execute:

```sh
python -m pip install -r requirements.txt
python -m alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Não cole credenciais em arquivos versionados. `.env.example` lista a configuração do Compose; o backend usa variáveis de ambiente reais.

## Testes e build

```sh
docker compose run --rm backend python -m pytest -q
docker compose run --rm backend python -m compileall -q app
cd frontend
npm ci
npm test
npm run build
npm audit
```

Os testes Python usam PostgreSQL real e migrations reais, em esquema aleatório temporário. Cada teste é revertido por transação; o esquema temporário é removido no final. Os dados operacionais não são alterados. Os testes precisam de permissão para criar esquema no banco de desenvolvimento.

## Validação E2E em navegador

Os testes usam uma instância temporária na porta 8089, o esquema PostgreSQL `e2e` e credenciais aleatórias em `.validation/` (ignorado pelo Git). O Compose de teste substitui temporariamente a configuração dos containers deste projeto; retorne ao Compose padrão ao terminar. Não execute esse procedimento em produção.

PowerShell, na raiz:

```powershell
New-Item -ItemType Directory -Force .validation | Out-Null
docker compose run --rm -v "${PWD}/scripts:/scripts:ro" -v "${PWD}/.validation:/validation" backend python /scripts/prepare_e2e.py
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d
cd frontend
npx.cmd playwright install chromium
$env:E2E_BASE_URL = 'http://localhost:8089'
npx.cmd playwright test
cd ..
docker compose up -d
```

Relatório em `frontend/test-results/e2e-results.json`; screenshots de desktop/mobile em `.validation/`. Os testes deixam seus dados no esquema isolado para inspeção e não criam usuários na base operacional.

## Demonstração opcional

Após criar seu ADMIN:

```sh
docker compose exec backend python -m app.cli seed
```

Cria um Scania R450, oficina, troca de óleo e plano preventivo fictícios. Não executa automaticamente. Se a placa de demonstração já existe, nenhum dado é substituído.

## Fluxo preventivo

Os campos de quilometragem exibem pontos de milhar durante a digitação (`200000` → `200.000`) e enviam o inteiro exato à API. Na manutenção, digite o nome da oficina: nomes existentes são reutilizados e novas oficinas são cadastradas na mesma transação. O resumo ao final do formulário atualiza peças, mão de obra, outros custos e total antes de salvar.

Mão de obra e outros custos usam digitação por centavos: `1` → `0,01`, `12` → `0,12`, `123` → `1,23`; para R$ 500,00, digite `50000`. A vírgula e os pontos de milhar aparecem automaticamente.

1. Cadastre o caminhão com 325.000 km.
2. Atualize para 330.000 km e registre a troca concluída por R$ 1.200.
3. Crie plano com 15.000 km e vincule a troca já registrada (base 330.000 km).
4. A próxima será 345.000 km; aviso padrão a 2.000 km.
5. Em 343.500 km: amarelo, faltam 1.500 km. Em 345.500 km: vermelho, vencida em 500 km.
6. No plano, use **Registrar realização** para a nova troca a 345.500 km.
7. A próxima passa a 360.500 km e ambas as trocas permanecem no histórico.

## PWA / Android

Manifest, ícones PNG 192/512, service worker e modo standalone fazem parte do build de produção. O service worker armazena somente arquivos estáticos; dados autenticados e anexos não são armazenados em cache. O aplicativo depende de conexão para ler/gravar a frota.

No Android, acesse por HTTPS e use “Instalar aplicativo” / “Adicionar à tela inicial” no Chrome. `http://localhost` permite testes neste computador; um IP de rede via HTTP não oferece a mesma condição de instalação. A instalação em um aparelho físico precisa ser verificada após disponibilizar HTTPS.

## Preparação para VPS (não publicado)

1. Configure seu domínio/DuckDNS apontando para a VPS e libere 80/443.
2. Copie o projeto, gere `.env` com senha exclusiva e acrescente `DOMAIN=seu-host.duckdns.org`.
3. Configure armazenamento, política e ensaio de backup conforme [backup/restauração](docs/backup-restore.md).
4. Na VPS, quando autorizar o deploy:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose exec backend python -m app.cli create-admin --email seu-email@empresa.com.br
```

O Caddy gerencia HTTPS; `/api` usa o mesmo domínio. O override de produção habilita cookie Secure e restringe a origem ao domínio. Não utilize o override dev/e2e em produção. Preserve volumes de banco, uploads e certificados. Teste login, envio/download de anexos e instalação Android após configurar o domínio.

## Estrutura

```text
backend/app/          API, modelos, validações, autenticação e regras
backend/migrations/  migrations Alembic
backend/tests/       integração com PostgreSQL e regras
frontend/src/        componentes, páginas, formulários e estilos
frontend/e2e/        fluxos reais no Chromium desktop/mobile
frontend/public/     ícones PWA
infra/               configuração HTTPS
scripts/             ambiente, ícones, backup e preparação E2E
docs/                arquitetura, regras, backup e validação
```

Regras e limites: [arquitetura](docs/architecture.md). PDF de relatórios, notificações push, uso offline de dados, aplicativo nativo e módulos externos à manutenção estão fora deste MVP.

## Validação local concluída

Confira o [relatório de certificação](docs/validation.md) para os resultados por etapa e as verificações da revisão atual. A instalação local já possui um ADMIN; as credenciais locais estão em `.validation/acesso-local.txt`, arquivo privado ignorado pelo Git. Em uma instalação nova, crie o primeiro ADMIN pelo comando acima. Não há senha padrão.

O código está preparado para a etapa de deploy. A instalação em Android físico e a configuração de domínio/HTTPS/backup externo precisam ser verificadas no ambiente definitivo.
