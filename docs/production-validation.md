# Validação de produção — 29/09/2026

URL: https://frotasguest.duckdns.org. VPS srv1569990 (72.60.61.34), Ubuntu 24.04.4. Aplicação inicial publicada pelo commit `de8f3e636bdde51d1c7581b428c2ba6104e5eb43`. A revisão de infraestrutura/testes/documentação não altera código funcional da aplicação. O SHA exato em execução é registrado em `/opt/frotasguest/.env`, campo APP_VERSION, e no checkout `app/`.

## Evidências

- DNS A confirmado para a VPS, HTTPS válido Let's Encrypt até 28/12/2026, HTTP redireciona 301 para HTTPS. Renovação simulada aprovada no diretório exclusivo de certificados.
- Nginx preexistente mantido. Novo link exclusivo para o site, com backup prévio e testes de configuração antes/depois; apenas reload.
- Containers frontend/API/PostgreSQL saudáveis; rede própria, PostgreSQL sem publicação de porta; somente frontend em 127.0.0.1:8060. Persistência em bind mounts exclusivos sob `/opt/frotasguest/data`.
- Migration `d0460406f62d (head)`; Alembic check sem operações pendentes.
- 12 casos de navegador aprovados em lotes no Chromium desktop/mobile: cadastro, edição, KM exato, histórico, oficina digitada, manutenção, serviços, peças, custos, preventiva/alertas, anexos, relatórios XLSX, logout, reload, permissões, documentação API e PWA.
- Cookies Secure/HttpOnly/SameSite strict, CORS e proteção de escrita, anexos protegidos por sessão, CSP e HSTS verificados. Cache do service worker sem URLs da API, inclusive após downloads autenticados.
- No primeiro lote, o teste de troca de usuário preenchia o formulário anterior antes da conclusão do logout em rede real. Corrigida a espera no teste, sem alteração funcional. O teste adicional de anexos teve sua rota corrigida e foi repetido com sucesso.
- Registros criados pelo ADMIN temporário identificados via auditoria: 8 caminhões inativados, manutenções canceladas (não entram nos custos operacionais), planos/oficinas e contas de teste desativados. Histórico e anexos de teste preservados; nenhum dado real usado.
- Backup diário às 03:17 UTC, retenção 35 dias, dump/arquivos/configuração com checksums. Primeiro conjunto `20260929T202721Z`: restauração real em container exclusivo sem rede; 12 tabelas com contagens iguais e 2 uploads com hashes iguais. Container temporário encerrado; nenhum volume existente removido.
- Docker inicia automaticamente; serviços com `unless-stopped`. Sem reboot para validar. Logs Docker limitados, rotação exclusiva dos logs do projeto e renovação própria de certificado agendadas.
- Todos os containers anteriores preservaram IDs, horários de início e contagens de reinício. Nove sites apresentaram os mesmos códigos HTTP do diagnóstico (incluindo 401/404 que já existiam em suas raízes). Serviços Nginx, aplicação systemd, Docker e cron ativos. Todos os arquivos preexistentes do Nginx preservaram SHA256.

Credenciais não constam neste documento nem no Git. ADMIN inicial em arquivo privado `admin-access.json` na raiz exclusiva da VPS. Documentação operacional: [README de produção](../infra/vps/README-PRODUCAO.md).

## Limites

Instalação e abertura standalone em Android físico exigem confirmação do usuário. Não há APK nem dados de frota offline. Backup externo ainda depende de destino; backups locais não cobrem perda total da VPS. Nenhum erro funcional bloqueante conhecido nos fluxos validados. Não houve parada/recriação de containers alheios, modificação de firewall, remoção de volumes ou reboot da VPS.
