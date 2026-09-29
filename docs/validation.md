# Certificação local do MVP

## Conclusão da revisão — 29/09/2026

README revisado com operação, exclusão por inativação, máscara monetária e acesso local. Nenhuma funcionalidade adicional, migration, deploy, commit ou push nesta conclusão.

- Frontend: 22 testes aprovados; inclui regressões de associação dos rótulos e carregamento de valores numéricos da API na edição.
- Build TypeScript/Vite e imagem Docker frontend aprovados; assets PWA gerados.
- Navegador: 4 casos finais aprovados em desktop/mobile para digitação por centavos, KM exato, oficina digitada, total, salvamento, exclusão com confirmação e fluxo preventivo completo, incluindo edição, anexos e persistência.
- Permissões e Swagger: 4 casos aprovados em desktop/mobile no lote anterior desta revisão. USUARIO não recebe botão de excluir/editar caminhão; exclusão e criação via API retornam 403. Esses módulos não foram alterados pela correção posterior do campo monetário.
- Banco: `d0460406f62d (head)` e `alembic check` sem operações pendentes. Dados operacionais preservados; testes de navegador em containers separados na porta 8089.
- Backend: mantidas as evidências anteriores de 26 testes aprovados e do teste posterior específico de exclusão, filtros e permissões aprovado. Backend não alterado nesta conclusão.
- Integridade: configuração e credenciais locais ignoradas pelo Git; sem TODO/FIXME nos módulos de negócio.
- Ambiente final: Compose normal com frontend, backend e PostgreSQL saudáveis em `http://localhost:8088`; frontend HTTP 200 e `/api/health` HTTP 200, `status: ok`. Containers de teste encerrados, sem remover volumes.

Duas falhas encontradas na primeira execução da máscara monetária foram corrigidas: rótulos sem vínculo com os inputs e erro ao abrir valores numéricos retornados pela API. A repetição dos fluxos afetados passou. Sem bloqueio funcional conhecido nos fluxos validados. As verificações anteriores de PWA, backup e dependências estão registradas abaixo e não foram repetidas sem necessidade.

## Ajustes posteriores: quilometragem, oficina e total

Validação da revisão dos formulários: 26 testes backend, 20 testes frontend e 4 testes de navegador (desktop/mobile) aprovados, sem falhas; build de produção aprovado. Os testes de navegador cobriram a digitação de `200000`, apresentação `200.000`, ausência de decremento por setas/rolagem, persistência exata após salvar/recarregar, oficina digitada e total atualizado antes de salvar. O fluxo preventivo completo também foi repetido e aprovado. Os testes rodaram em containers separados da base local do usuário. Nenhuma migration adicional foi necessária.

## Resultado

MVP concluído e validado localmente. Sem erro conhecido que impeça os fluxos principais. Nenhum deploy, commit ou push realizado.

## Evidências da certificação inicial — 28/09/2026

| Verificação | Resultado |
|---|---|
| Backend, PostgreSQL real e esquema isolado | 23 testes aprovados, 0 falhos |
| Frontend, componentes/API/validações/estados | 15 testes aprovados, 0 falhos |
| Chromium desktop e mobile, fluxos e PWA | 4 testes aprovados, 0 falhos |
| Chromium desktop e mobile, permissões e Swagger | 4 testes aprovados, 0 falhos |
| Total de casos validados | 46 aprovados, 0 falhos |
| TypeScript + Vite produção | Aprovado localmente e no Docker |
| Imagens backend e frontend | Construídas com sucesso |
| Compilação Python | `python -m compileall -q app` aprovado |
| Migration | `d0460406f62d (head)` aplicada |
| Alembic check | Nenhuma operação pendente |
| npm audit | 0 vulnerabilidades conhecidas |
| pip-audit | Nenhuma vulnerabilidade conhecida |
| Backup PostgreSQL | Dump restaurado em banco temporário e contagens conferidas |
| Compose produção | Sintaxe validada com domínio de exemplo; nenhum serviço publicado |
| Ambiente normal | Frontend, backend e PostgreSQL saudáveis em localhost:8088 |

Os testes de navegador foram executados em dois lotes: primeiro os fluxos e PWA, depois as verificações pendentes de permissões e documentação. Não se repetiram os fluxos já aprovados sem alteração correspondente.

## Fluxo preventivo validado na API e na interface

1. Caminhão cadastrado com 325.000 km.
2. Atualização para 330.000 km com histórico preservado.
3. Troca de óleo concluída em 330.000 km, total R$ 1.200,00.
4. Plano de 15.000 km vinculado à troca: próxima em 345.000 km.
5. Atualização para 343.500 km: AMARELO, faltam 1.500 km.
6. Atualização para 345.500 km: VERMELHO, vencida em 500 km.
7. Nova troca vinculada ao plano, em 345.500 km.
8. Próxima em 360.500 km, estado VERDE.
9. Ambas as manutenções e todas as atualizações de KM preservadas após recarregar a página.

Também foram verificados edição de caminhão, oficina, serviços, peças, conclusão, custos, upload e persistência de anexos, busca vazia, mensagens de validação e navegação inferior. Largura mobile testada: 390 px. Não houve overflow horizontal no dashboard nem erros JavaScript no fluxo principal.

## Permissões e integridade

ADMIN cria e altera. USUARIO consulta; formulários administrativos exibem acesso restrito e escritas à API retornam 403. Rotas de negócio sem sessão retornam 401. Logout revoga a sessão. Cookies são HttpOnly e SameSite; o override HTTPS habilita Secure.

O banco operacional foi mantido separado dos dados E2E. A instalação local já possui ADMIN e deve preservar os cadastros do usuário. O esquema `e2e` mantém somente dados de validação; o Compose normal usa `public`. Credenciais locais e temporárias ficam em `.validation/`, ignorada pelo Git, assim como `.env`, dependências e builds. Não foram encontrados TODOs/FIXMEs nos módulos de negócio e documentos revisados.

## PWA

Manifest com nome FrotaGest, modo standalone e ícones 192/512 verificados. Service worker registrado e controlando o build de produção. Cache inspecionado sem URLs `/api/`. A instalação em Android físico não foi executada; depende da disponibilização por HTTPS e da ação de instalar no aparelho. Não há modo offline para dados da frota.

## Limites e preparação para deploy

Aplicação pronta para a etapa de deploy. Restam configurações do ambiente real: domínio/DNS, acesso à VPS, HTTPS, ADMIN definitivo e rotina de backup externo com restauração de anexos. Nenhuma dessas ações foi executada na VPS.

Sem bloqueio funcional conhecido. Há um aviso de depreciação da biblioteca de testes Starlette relacionado ao uso de httpx; os 23 testes passaram. Relatório PDF, notificações push, gravação offline e app nativo continuam fora do escopo do MVP.

Evidências locais: `.validation/*-dashboard.png`, `.validation/*-overdue.png` e `.validation/local-login.png`. O arquivo `frontend/test-results/e2e-results.json` contém o último lote de testes de navegador; relatórios temporários podem ser substituídos em novas execuções.
