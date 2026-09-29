# FrotaGest — arquitetura e regras

Monorepo com React/TypeScript/Vite/Tailwind/React Router, API REST FastAPI, SQLAlchemy, Alembic e PostgreSQL 16. Nginx entrega os arquivos compilados e encaminha `/api` ao backend; apenas o frontend está publicado em localhost. Caddy é o proxy HTTPS previsto para VPS.

## Dados

- `users`, `sessions`: perfis ADMIN/USUARIO, Argon2, sessão opaca com hash no banco, expiração de 12 horas e cookie HttpOnly/SameSite. Em HTTPS, Secure.
- `trucks`, `mileage_history`: identificação única e histórico append-only. Atualizações de KM usam bloqueio de linha na transação; nunca diminuem o valor. Correção retroativa administrativa ainda não é oferecida no MVP.
- `workshops`: cadastro e inativação, sem apagar os serviços anteriores.
- `maintenance`, `maintenance_services`, `maintenance_parts`: serviços e peças são filhos da manutenção. Valores Numeric/Decimal. Peças = soma de quantidade × valor unitário, arredondado por item em centavos; mão de obra = soma dos serviços; total = peças + mão de obra + outros.
- `maintenance_plans`: intervalos em KM e/ou meses; qualquer limite atingido vence o plano. Meses usam calendário, não uma aproximação de 30 dias.
- `attachments`: metadados no banco, conteúdo em volume separado, nomes internos aleatórios; somente download autenticado. Imagens são decodificadas e regravadas. PDF é validado e servido como download.
- `audit_logs`: usuário, instante UTC, ação e entidade; alterações relevantes guardam dados anteriores.

## Histórico e preventivas

A última manutenção CONCLUÍDA vinculada ao plano, ordenada por data, KM e ID, é a base do próximo vencimento. Se não existe, usa-se a base informada ao criar o plano. Não há atualização destrutiva do histórico. Cancelar uma manutenção exclui seu valor dos custos e sua realização do cálculo preventivo, preservando o registro.

Uma manutenção concluída é imutável. Correções são feitas por cancelamento e novo registro, com auditoria. Aberta/agendada/em andamento podem ser editadas. O status operacional do caminhão é definido explicitamente pelo administrador, pois nem toda manutenção indisponibiliza o veículo.

Novas realizações precisam ser vinculadas ao plano correspondente. A interface oferece “Registrar realização” na ficha do plano e um seletor no formulário. A criação do plano permite vincular uma manutenção já concluída.

KM de manutenção histórica pode ser menor que o atual; isso não reduz o hodômetro. Uma conclusão com KM superior registra também uma atualização de KM. Dados de manutenção e quilometragem são persistidos na mesma transação.

## Segurança e limites do MVP

USUARIO consulta; ADMIN escreve. Todos os endpoints de negócio validam autorização no backend. Escritas exigem cabeçalho próprio e origem autorizada; não se armazena token em localStorage. Limite de tentativas de login em memória, adequado a uma instância/worker. Ao ampliar para múltiplas instâncias, mover o limitador a armazenamento compartilhado.

PWA armazena somente arquivos estáticos; APIs e anexos não entram no cache offline. Sem gravação offline. Sem cadastro público, senha padrão ou seed automático. Logs técnicos ficam no servidor, sem stack traces nas respostas.

Relatórios consideram somente manutenções concluídas para custos. XLSX exporta até 10.000 manutenções por consulta; use filtros por período para bases maiores. PDF, push, Capacitor e módulos de combustível/viagem/estoque estão fora do MVP.

API documentada em `/api/docs`. Listas de caminhões, oficinas, manutenções, KM e auditoria são paginadas (`page`, `size`, máximo 100). Alertas e planos retornam a lista da pequena frota; uma futura expansão deve paginá-los.
