# Empresas e isolamento

O FrotaGest usa um banco compartilhado com `tenant_id` obrigatório nas tabelas de usuários, frota, oficinas, KM, manutenções, serviços, peças, planos, anexos e auditoria.

- **ID 3 — Operação principal:** recebe todos os dados e usuários anteriores à migração, mantendo IDs, senhas, sessões e arquivos.
- **ID 1 — Teste:** empresa separada, com administrador próprio. Cadastros nesta empresa não aparecem na operação principal.

No login, informe ID da empresa, e-mail e senha. O cabeçalho identifica a empresa da sessão. Para mudar de empresa, saia e faça outro login. “Lembrar de mim” conserva o ID e e-mail; senhas permanecem sob controle do gerenciador do navegador. Uma sessão do navegador atende uma empresa por vez, inclusive entre abas.

Administradores gerenciam apenas sua empresa. Não existe administrador global na interface nem endpoint público para criar empresas. O mesmo e-mail pode existir em empresas diferentes; suas senhas e permissões são independentes. Placa, chassi e RENAVAM são únicos dentro de cada empresa.

## Garantias e limites

O servidor obtém a empresa pela sessão autenticada. Parâmetros e cabeçalhos enviados pelo cliente não alteram esse contexto. Consultas, totais, exportações, downloads e auditoria usam o filtro da empresa. IDs de outra empresa retornam 404. Chaves estrangeiras compostas impedem relacionamentos entre empresas também no PostgreSQL.

A interface envia a empresa esperada em `X-FrotaGest-Tenant`. Se outra aba trocar a sessão, o servidor rejeita operações da aba antiga e exige novo login, evitando gravar na empresa errada. Esse cabeçalho somente verifica o contexto; nunca concede acesso a outra empresa.

Sessões referenciam usuários de ID global único; não aceitam troca de empresa. Empresa inativa bloqueia login e sessões existentes. Anexos mantêm nomes aleatórios no armazenamento privado e só são entregues pela API autenticada; não há cache offline de dados da API.

O isolamento é lógico, na aplicação e nas restrições do banco: não são bancos/containers separados por empresa nem PostgreSQL RLS. Operadores com acesso administrativo ao banco e backups têm acesso ao conjunto das empresas. Backups e restauração cobrem todas as empresas; nunca restaure o backup completo para apagar apenas dados de teste.

## Administrador de uma empresa

Após as migrations, execute, escolhendo o ID correto:

```sh
docker compose exec backend python -m app.cli create-admin --tenant-id 1 --email teste@empresa.com.br --name "Administrador de teste"
```

Na VPS, use o Compose exclusivo do projeto:

```sh
cd /opt/frotasguest
docker compose -p frotasguest -f docker-compose.prod.yml exec frotasguest-api python -m app.cli create-admin --tenant-id 1 --email teste@empresa.com.br --name "Administrador de teste"
```

A senha é solicitada sem exibição, com mínimo de 8 caracteres. Não há senha padrão. O comando não altera contas existentes. O seed aceita `--tenant-id` e só deve ser executado em uma empresa de demonstração. Para compatibilidade, CLI e login sem ID explícito usam 3; a interface sempre envia o ID escolhido.

## Migração e reversão

`a72b1130c901` cria as empresas 1 e 3 e atribui registros existentes à 3 em uma transação. Não cria credenciais. Faça backup validado antes e suspenda escritas da API antiga durante a atualização. O schema anterior não suporta múltiplas empresas; **não execute o código antigo contra o banco migrado**, pois suas consultas não têm os filtros necessários.

Não há downgrade automático que misture empresas. Reversão exige janela de manutenção, restauração do backup anterior e respectivo código; dados gravados após esse backup precisam ser reconciliados antes. Depois da publicação, faça novo backup.

Os testes exercitam acesso cruzado nos dois sentidos, filtros e totais, exportação XLSX, anexos, vínculos inválidos, login por empresa, restrições do banco e preservação dos registros na migração.
