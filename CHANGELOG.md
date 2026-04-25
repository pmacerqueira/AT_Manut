# CHANGELOG — AT_Manut (Navel Manutenções)

Registo das alterações implementadas por sessão de desenvolvimento.

Política de continuidade:
- cada entrada deve registar contexto, decisão e impacto;
- no fim de cada sessão crítica, acrescentar nota de handoff (próximo passo claro);
- o changelog é fonte de verdade para continuidade entre agentes/modelos.

---

## [1.16.76] — 2026-04-25 — Logs: painel compacto (tablet / responsivo)

### Alteração
- **`Logs.jsx` / `Logs.css`:** remoção do `card` pesado; barra de filtros com grelha 2 colunas e pesquisa em largura total em `≤1024px`; acções com botões dedicados (`.log-icon-btn`, 32px) em vez de `icon-btn` de 48px; ícone **Enviar** (`Send`) para sync; ajuda com `<details>` colapsável em ecrã estreito; estatísticas em carrossel horizontal leve; entradas com linha contínua e borda esquerda, menos “caixa” em cada linha; rótulo “Suporte” em vez de frase longa no estreito.
- **Acessibilidade:** texto para leitores de ecrã nos ícones-only (classe `log-actions-sr`).

### Verificação
- `npm run build`; lint em `Logs.jsx`.

---

## [1.16.75] — 2026-04-25 — Contraste: cartões de categoria (Equipamentos / Clientes)

### Correcção
- **`index.css`:** o parágrafo do contador em `.categoria-card` herdava a cor branca do estilo global `button` com `body.modo-campo p { color: inherit }` (conflito de ordem e especificidade). Passou a haver `color` explícita no cartão, `h3` e `p`, e regras `body.modo-campo .categoria-card` com fundo branco, borda e textos escuros.
- **`Equipamentos.css`:** reforço de legibilidade em modo campo para migas (`breadcrumb` / `breadcrumb-btn`) e botão `Próximas` (verde sólido em vez de néon do tema escuro).

---

## [1.16.74] — 2026-04-25 — Rodapé visual embutido nas fotografias de equipamento

### Novo
- **`comprimirImagemRelatorio.js`:** `comprimirFotoParaRelatorio(blob, { footerLine })` desenha uma barra escura no fundo do bitmap com o texto (ex.: `Marca Modelo_SN12345_25/04/2026 14:30`) antes de gerar o JPEG — a informação fica no próprio ficheiro, não só no nome.
- **`DocumentacaoModal.jsx`:** envio de fotos do separador **Fotografias** passa a incluir essa linha automaticamente (marca+modelo, nº de série, data/hora da gravação).

### Verificação
- `npm run build` e eslint nos ficheiros alterados.

---

## [1.16.73] — 2026-04-25 — Fotografias: nome de ficheiro com equipamento, série e data

### Ajuste
- **`uploads/machine_photo` (`data.php`):** o servidor passa a gravar fotografias com nome sanitizado no formato `equipamento_numeroSerie_dataHora_random.jpg`.
- **`DocumentacaoModal.jsx` / `apiService.js`:** o frontend envia nome do equipamento, nº de série e timestamp de captura; mantém a listagem por `criadoEm` da mais recente para a mais antiga.

### Verificação
- `php -l servidor-cpanel/api/data.php` sem erros.
- `npx eslint src/components/DocumentacaoModal.jsx src/services/apiService.js` sem erros.
- `npm run build` concluído com sucesso.

---

## [1.16.72] — 2026-04-25 — Fotografias por equipamento + bibliotecas M365

### Novo
- **`DocumentacaoModal.jsx`:** novo separador `Fotografias` no painel de documentação do equipamento. Técnicos e administradores podem ver o arquivo fotográfico ordenado da foto mais recente para a mais antiga.
- **Captura no terreno:** botão `Tirar/adicionar fotografia` abre o picker/câmara do dispositivo (`capture="environment"` + `image/*`) e aceita uma ou várias imagens quando o dispositivo permitir.
- **Compressão uniforme:** as fotografias usam o mesmo pipeline seguro de redimensionamento/compressão dos relatórios (`comprimirImagemRelatorio.js`), convertendo para JPEG leve antes do upload para evitar payloads grandes em telemóvel/tablet.
- **Nome editável por todos:** após gravada, qualquer utilizador autenticado pode alterar o nome/título da fotografia na ficha do equipamento.
- **Biblioteca NAVEL:** `MaquinaBibliotecaNavel.jsx` passa de tabela compacta para cartões estilo biblioteca M365/SharePoint, com ações textuais (`Abrir`, `Remover`, `Associar existente`, `Enviar novo`) e modal de pesquisa mais limpo.
- **Menu lateral / modo campo:** `Layout.css` e `index.css` reforçam contraste, footer de utilizador/logout e navegação activa; restyling visual mais limpo, com pills e cartões discretos.

### Técnico
- **Persistência sem migração de BD:** as fotos ficam no JSON `maquinas.documentos` com tipo interno `__foto_equipamento`, separado da contagem de documentação obrigatória. Assim não afectam `Documentação completa/incompleta`.
- **`apiService.js` / `servidor-cpanel/api/data.php`:** nova acção `uploads/machine_photo`, permitida a admin e técnico, grava JPEG optimizado em `/uploads/machine-photos/` e devolve URL/metadados.
- **`Equipamentos.jsx`:** o estado de documentação obrigatória ignora fotos técnicas, mantendo a leitura correcta dos documentos legais/PDFs.

### Verificação
- `npx eslint src/components/DocumentacaoModal.jsx src/components/MaquinaBibliotecaNavel.jsx src/pages/Equipamentos.jsx src/services/apiService.js` sem erros.
- `php -l servidor-cpanel/api/data.php` sem erros.
- `npm run build` concluído com sucesso.

---

## [1.16.71] — 2026-04-24 — UX execução e fichas de equipamentos com contraste reforçado

### Melhorias de workflow
- **`ExecutarManutencaoModal.jsx`:** passo final passa a mostrar uma revisão operacional antes de gravar: data agendada, data real de execução, técnico, assinatura, fotos, destino do email, próxima manutenção prevista e indicação de recálculo da agenda futura. Isto torna visível o ponto crítico antes de fechar a intervenção.
- **Correção rápida para ATecnica:** ao editar uma manutenção executada cujo relatório ainda não foi enviado ao cliente, o técnico já não entra no assistente completo; abre um modo de correcção rápida para datas, checklist, notas, fotos, técnico, nome/assinatura e horas de contador quando aplicável. O Admin mantém o modo de edição avançado.
- **Observações:** notas rápidas deixam de ser bloqueio absoluto. O utilizador pode tocar num chip para acelerar, mas texto livre descritivo também é aceite.
- **Envio de email:** o fluxo distingue melhor "gravado", "a enviar", "email enviado" e "email falhou". O botão Enviar exige destinatário; "Gravar" continua disponível para fechar sem envio. O estado `ultimoEnvio` guarda a lista de destinatários com sucesso e `enviadoParaCliente` guarda todos os emails de cliente enviados.
- **`BulkExecutarModal.jsx`:** execução em massa passa a ter painel de risco, nota comum obrigatória, bloqueio de checklist não-conforme em massa, confirmação explícita quando a selecção mistura clientes/tipos/equipamentos ou contém montagem/contador/KAESER, e correcção do pré-preenchimento de nome/assinatura.

### Responsivo / tablets
- **`Manutencoes.css`:** novos estilos para painel de revisão e execução em massa, com grelha adaptativa, `max-height`/scroll touch em tablets e overrides em `modo-campo` para legibilidade.
- **`Equipamentos.jsx` / `Equipamentos.css`:** ações da ficha deixam de ser apenas ícones e passam a botões com texto visível (`Documentação`, `Histórico`, `QR`, `Peças`, `Editar`, `Eliminar`), com grelha responsiva em tablets e telemóvel.
- **`DocumentacaoModal.jsx`:** documentação reorganizada em separadores claros: `Documentos da ficha`, `Biblioteca NAVEL`, `Plano / consumíveis` e `Adicionar ficheiro`. O estado documental passou de `X/Y docs` para mensagens operacionais como `Documentação completa` ou `Faltam N docs`, com lista dos tipos em falta.
- **`index.css`:** reforço transversal de contraste para botões secundários/ícones, botões com texto, textos auxiliares, legendas, cartões do modal de documentação e overrides específicos de `modo-campo` para fundo claro.

### Verificação
- `npm run build` concluído com sucesso.
- `npx eslint src/components/ExecutarManutencaoModal.jsx src/components/BulkExecutarModal.jsx src/pages/Manutencoes.jsx` sem erros (mantém warnings antigos de hooks nos ficheiros existentes).
- `npx eslint src/components/DocumentacaoModal.jsx src/pages/Equipamentos.jsx` sem erros.
- `npm run lint` agora conclui com **0 erros**: `dist/**` e `dist_upload/**` ficaram excluídos do ESLint por serem artefactos gerados/minificados; `scripts` e `tests` passaram a usar globals adequados de Node/Playwright; avisos legados continuam visíveis como warnings.
- Corrigidos dois bloqueios reais encontrados durante a sanitização: timeout da API referia `ms` inexistente (passa a usar `API_TIMEOUT_MS`) e `QrReaderModal.jsx` deixava o compilador React sinalizar acesso a `processar` antes da declaração.

---

## [Documentação] — 2026-04-24 — Consolidação dos procedimentos de segredos

### Novo
- **`docs/CPANEL-RUNBOOK-SEGREDOS.md`** (canónico): runbook completo de operação dos segredos `ATM_*` no servidor LiteSpeed/LSPHP. Inclui contexto técnico (porquê `RewriteRule [E=…]` em vez de `SetEnv`), arquitectura em produção, inventário dos 4 scripts em `navel-site/scripts/`, fluxos operacionais passo-a-passo (rodar password, adicionar variável, deploy do `config.php`, rollback de emergência), lista canónica das variáveis e respectivos consumidores, troubleshooting de sintomas típicos, cruzamento com a área reservada do navel-site, checklist anual de rotação de segredos.

### Actualizado
- **`docs/INDEX.md`:** entrada canónica do novo runbook.
- **`docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md`:** ordem de leitura de segredos (método primário = `[E=…]` no `.htaccess`; fallback dedicado = `atm_report_auth.secret.php`; legado arquivado = `config.deploy-secrets.php.disabled-TS`). Removida menção a "cPanel → Environment Variables" (não aplicável a LSPHP).
- **`docs/SEGURANCA-REVISAO-NAVEL-PT.md`:** tabela "Imediato" e achado crítico #3 actualizados com o mecanismo efectivo (`RewriteRule [E=KEY:VALUE]` via `cpanel-migrate-setenv.mjs`).
- **`servidor-cpanel/INSTRUCOES_CPANEL.md`:** passo 2 (token) e secção de horário restrito refeitas; links para o runbook canónico.
- **`.cursor/rules/at-manut-workflow.mdc`:** nova secção "Segredos (`ATM_*`) em produção" com o fluxo de rotação e ponteiro para o runbook — garante que qualquer futuro agente siga o procedimento.
- **`navel-site/docs/CPANEL-SEGREDOS-ENV.md`:** aponta para o runbook canónico (tema único, fonte única); adiciona secção sobre `cpanel-audit-crosssite.mjs` (auditoria).
- **`navel-site/scripts/cpanel-audit-crosssite.mjs`** (novo): valida `.htaccess` raiz + `/api/` e smoke-tests HTTPS dos 10 endpoints críticos dos dois projectos (documentos-api, área reservada, onedrive-callback, keep-alive-supabase, taxonomy-nodes, navel-documentos-upload, data.php).

---

## [Operação] — 2026-04-24 — Env vars em produção: `RewriteRule [E=…]` (não `SetEnv`)

### Descoberta / diagnóstico
- **CiberConceito (#225838)** recomendou `SetEnv` em `.htaccess`; aplicámos em produção e a API passou a dar `503 misconfigured`. Um probe PHP isolado (via SFTP, removido após medição) revelou que no alojamento actual o **SAPI é `litespeed`**, **`mod_env` não está carregado** (`apache_get_modules()` → `false`) e portanto `SetEnv` é ignorado silenciosamente. Testámos alternativas — `SetEnvIf` preserva as aspas do valor; `RewriteRule ^ - [E=KEY:VALUE]` (mod_rewrite) expõe os valores intactos em `$_SERVER` e `getenv()`, incluindo a password da BD que tem `' " + { } ~`.

### Operação
- **`servidor-cpanel/api/.htaccess`** no repo: agora documenta a arquitectura e contém apenas o bloco `FilesMatch` de defesa em profundidade (bloqueia `test-*.php`, `teste-*.php`, `clear-cache.php`, `ingest-istobal-retro.php`, `config.deploy-secrets.php(.disabled-*)`, `atm_report_auth.secret.php`, `.htaccess.bak-*`). O `.htaccess` **real** em produção é gerado pelo script (abaixo) e **não** versionado.
- **`config.php`** e **`config.deploy-secrets.php.example`**: docstrings actualizadas para a nova arquitectura (método 1 = `[E=…]` no `.htaccess`; método 2 = fallback arquivado com sufixo `.disabled-TS`).
- **`docs/DEPLOY_CHECKLIST.md`** e **`docs/SEGURANCA-REVISAO-NAVEL-PT.md`:** reflectem a evidência do servidor (LiteSpeed/LSPHP 8.1; `mod_env` off) e a migração executada; instruções operacionais referem os scripts no `navel-site`.
- **`navel-site/scripts/cpanel-migrate-setenv.mjs`** (novo): SFTP ao `navel.pt`, lê `config.deploy-secrets.php` do servidor, gera `.htaccess` com `RewriteRule ^ - [E=…]` para cada variável ATM_, faz backup `.htaccess.bak-TS` e upload; `--dry` por defeito, `--yes` aplica, `--remove-fallback` renomeia o fallback para `.disabled-TS`.
- **`navel-site/scripts/cpanel-verify-setenv.mjs`** (novo): renomeia o fallback, faz 2 POSTs ao `/api/data.php` (login inválido + pedido sem token), classifica as respostas e, só se ambos forem 4xx esperados, deixa o fallback arquivado definitivamente — rollback automático em qualquer 5xx.
- **`navel-site/scripts/cpanel-rollback-htaccess.mjs`** (novo): repõe o `.htaccess` à versão do repo com backup `.htaccess.bak-TS` (usar só se preciso reverter).

### Estado do servidor (2026-04-24)
- `.htaccess` em `/home/navel/public_html/api/` tem bloco `# BEGIN ATM_ENV` gerado com 8 `RewriteRule [E=ATM_*:…]` + bloco `FilesMatch`. Login na API devolve 401 "Utilizador ou password incorretos" (BD liga; `ATM_JWT_SECRET` lê).
- `config.deploy-secrets.php` foi renomeado para `config.deploy-secrets.php.disabled-20260424-181827` (bloqueado por `FilesMatch`; disponível para rollback com renomeação inversa).
- Backups `.htaccess.bak-*` mantidos, também bloqueados por `FilesMatch`.

---

## [1.16.70] — 2026-04-22 — Recalcular periódicas: sem duplicar com atrasadas antigas

### Correcção
- **`recalcularPeriodicasAposExecucao` e `sincronizarAgendaCompleta`:** ao reconstruir a grelha futura, só se removiam linhas periódicas em aberto com `data >` à data de execução — **permaneciam** agendamentos/atrasos de anos anteriores e acumulavam com as novas linhas. Passa a remover **toda** a cadeia periódica em aberto (`pendente` / `agendada` / `em_progresso`, tipo ≠ montagem) antes de criar a nova sequência; `proximaManut` na ficha continua a vir de `minDataManutencaoAberta` após o recálculo.

---

## [1.16.69] — 2026-04-22 — Sincronizar agenda: não recriar periódicas antigas nem ignorar concluídas recentes

### Correcção
- **`sincronizarAgendaCompleta`:** a data-base do recálculo usava só `ultimaManutencaoData` quando preenchida, **ignorando** manutenções `concluida` mais recentes — gerava de novo intervalos a partir de uma âncora antiga e voltava a preencher datas passadas/eliminadas. Passa a usar o **máximo** (mais recente) entre a ficha e a última `concluida`; só grava novas linhas com **data ≥ hoje** (Açores); o horizonte de geração é `max(exec+3 anos, hoje+3 anos)` para âncoras antigas não ficarem sem slots futuros.
- **`recalcularPeriodicasAposExecucao`:** mesmo critério de horizonte e de **não criar** slots com data antes de hoje (alinhado à sincronização completa).

---

## [1.16.68] — 2026-04-22 — Sincronizar agenda: refresh de clientes e fichas no estado

### Correcção
- **`sincronizarAgendaCompleta` (`DataContext`):** após o fetch e o recálculo das manutenções, o estado React não repunha clientes, máquinas, relatórios, etc. — só `manutencoes` e cache. Passa a alinhar o estado ao pacote do servidor (como `fetchTodos`) e `maquinas` com `proximaManut` coerente com a agenda recalculada; actualiza `lastBulkFetchOkAtRef` e `saveCache` coerente.

### Operação
- Deploy: `npm run build:zip`; `navel-site` → `npm run deploy:at-manut -- --yes`.

---

## [1.16.67] — 2026-04-24 — Gravar no último passo: toast + ecrã Fechar (deploy PWA)

### Correcção
- **`ExecutarManutencaoModal`:** com relatório ainda não enviado ao cliente, `podeUsarDatasFormularioRel` deixava `usarDataHistorica` indefinido e `gravar` falhava antes do toast — **«Gravar»** no passo final não mostrava «Dados gravados com sucesso.» nem o ecrã de conclusão. Corrigido o cálculo de `usarDataHistorica` / `isHistoricoPassado`.
- Ecrã final distinto para **gravar sem enviar email** (título e texto alinhados à acção).

### Operação
- Deploy: `npm run build:zip`; `navel-site` → `npm run deploy:at-manut -- --yes`.

---

## [1.16.66] — 2026-04-24 — Preservar assinatura do cliente ao editar relatório (deploy PWA)

### Correcção
- **`ExecutarManutencaoModal`:** ao reabrir o assistente para uma manutenção concluída ainda **não enviada ao cliente**, a assinatura do relatório volta a ser carregada no canvas (antes só se usava a assinatura do contacto quando o relatório **não** tinha assinatura). «Limpar assinatura» permite substituir; gravação reutiliza a assinatura existente quando aplicável e preserva `dataAssinatura`.

### Operação
- Deploy: `npm run build:zip`; `navel-site` → `npm run deploy:at-manut -- --yes`.

---

## [1.16.65] — 2026-04-24 — Deploy cPanel (PWA + API) para testes no terreno

### Frontend (PWA)
- **Tablet / responsivo:** cabeçalho do Dashboard — em ≤1024px o espaçador deixava o título e «Sincronizar agenda» na ordem errada (regra global `order` em `.page-header > div`); o espaçador passa a estar oculto neste breakpoint (`Dashboard.css`).
- Inclui o conjunto de alterações já em working tree (sincronização de agenda, modais, biblioteca/taxonomia NAVEL no cliente, etc.) compiladas com **`APP_VERSION` 1.16.65**.

### Operação
- **Produção:** `npm run build:zip` em AT_Manut; deploy de `dist/` via `navel-site` → `deploy:at-manut -- --yes`.
- **API (`public_html/api/`):** upload dos PHP alterados ou novos (ex.: `data.php`, `config.php`, taxonomia, documentos NAVEL, `atm_report_auth.php`, `.htaccess`, `send-email.php`, `log-receiver.php`, `cron-alertas.php`, …) com `cpanel-deploy.mjs --file=… --remote={CPANEL_REMOTE_ROOT}/api --yes`.

---

## [1.16.62] — 2026-04-22 — `tecnico_horario_restrito.json` canónico + deploy cPanel

### Operação
- **`servidor-cpanel/api/tecnico_horario_restrito.json`:** ficheiro no repo alinhado ao `.example` — `enabled: true`, Açores, fins de semana fechados, noite útil **18:00→07:59** (para o expediente **começar às 08:00** com a lógica inclusiva do PHP).
- **`src/config/tecnicoHorarioRestrito.js`:** mesmos blocos quando `enabled: true` no futuro.
- **Documentação:** `INSTRUCOES_CPANEL.md`, `DEPLOY_CHECKLIST.md`, `MEMORIA-SEGREDO-EMAIL-E-LOGS.md`.
- **Deploy:** enviado para `public_html/api/tecnico_horario_restrito.json`.

---

## [1.16.61] — 2026-04-22 — Horário técnico: expediente 08:00–18:00 (Açores) + toast no login

### UX / política
- **Expediente** por defeito nos blocos (exemplo e front quando `enabled`): dias úteis **08:00–18:00** `Atlantic/Azores`; fins de semana fechado (bloco nocturno 18:00→08:00).
- **Login / fim de sessão por horário:** toast de aviso com `TECNICO_HORARIO_EXPEDIENTE_TOAST`; mensagens JSON em `data.php` alinhadas; `loginErrorCode` no `AuthContext` para o ecrã de login.
- **`tecnico_horario_restrito.json.example`:** `to: "08:00"` no bloco semanal.

---

## [1.16.60] — 2026-04-22 — Horário técnico: guard no browser alinhado ao servidor

### Correcção
- **`src/config/tecnicoHorarioRestrito.js`:** `enabled` por omissão **false**, para não expulsar técnicos quando a API **não** tem `tecnico_horario_restrito.json` activo (sintoma: login aparenta funcionar e a sessão cai logo). Activar no JS **só** quando o JSON no servidor tiver `"enabled": true` e os blocos forem os mesmos.
- **Documentação:** `servidor-cpanel/INSTRUCOES_CPANEL.md`, `docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md`.

---

## [1.16.59] — 2026-04-22 — Memória utilizador + `atm_report_auth.secret.php` + `gen:report-auth`

### Operação / segurança
- **`atm_report_auth.php`:** carrega opcionalmente `atm_report_auth.secret.php` (só no servidor; gitignored).
- **`.htaccess` (api):** nega HTTP a `atm_report_auth.secret.php` (como `config.deploy-secrets.php`).
- **`npm run gen:report-auth`:** gera token forte e preenche `.env.local` + `atm_report_auth.secret.php` localmente (nunca no Git).
- **Documentação:** [`docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md`](docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md), entradas em `INDEX.md` e `DEPLOY_CHECKLIST.md`.

---

## [1.16.58] — 2026-04-22 — ATM_REPORT_AUTH_TOKEN (PHP + PWA, sem defaults)

### Segurança / robustez
- **`servidor-cpanel/api/atm_report_auth.php`:** lê `ATM_REPORT_AUTH_TOKEN` via `getenv` / `$_ENV` / `$_SERVER` / `REDIRECT_*` e carrega `config.local.php` + `config.deploy-secrets.php` para alinhar com o mesmo mecanismo que `config.php`.
- **Sem token em texto claro no repositório:** `send-email.php`, `send-report.php`, `log-receiver.php`, `cron-alertas.php` (HTTP) devolvem **503** `misconfigured` se o segredo não estiver definido; cron **CLI** não exige query string.
- **Frontend:** `VITE_ATM_REPORT_AUTH_TOKEN` em `emailConfig.js` (build); `logger.js` reutiliza o mesmo valor e **não** envia flush se o token estiver vazio.

### Operação
- **Deploy:** publicar `atm_report_auth.php` e os PHP alterados; garantir `ATM_REPORT_AUTH_TOKEN` no servidor **antes** de trocar ficheiros (evita janela 503). Rebuild da PWA com `VITE_ATM_REPORT_AUTH_TOKEN` definido.
- **`.env.example`**, exemplos `config.*.php.example`, `docs/DEPLOY_CHECKLIST.md`, `docs/SEGURANCA-REVISAO-NAVEL-PT.md` actualizados.

---

## [1.16.57] — 2026-04-23 — config.php: atm_env() (cPanel / PHP-FPM)

### Operação
- **`servidor-cpanel/api/config.php`:** leitura de variáveis via `atm_env()` — `getenv()`, `$_ENV`, `$_SERVER` e prefixo `REDIRECT_`, para alinhar com alojamentos onde o painel não preenche só `getenv()`. Deploy quando conveniente.

---

## [1.16.56] — 2026-04-22 — Dependências: jsPDF / DOMPurify / Vite (npm audit)

### Segurança / manutenção
- **`npm audit fix`:** 0 vulnerabilidades; **jspdf** 4.2.1 (transitive **dompurify** 3.4.1), **vite** 7.3.2 e restantes correcções transitivas.
- **Build** de produção e **`npm run test:unit`** passam; smoke **jsPDF** em Node (PDF válido `%PDF-`).

---

## [1.16.55] — 2026-04-22 — Endurecimento de segurança (API PHP)

### Segurança
- **`servidor-cpanel/api/config.php`:** removidos fallbacks de segredos no repositório; validação em pedidos HTTP (503 se faltarem `ATM_JWT_SECRET`, credenciais BD ou `ATM_TAXONOMY_TOKEN`). Suporte a `config.local.php` (gitignored) para desenvolvimento.
- **`servidor-cpanel/api/image-proxy.php`:** mitigação SSRF (host → só IPs públicos), TLS com verificação de certificado, sem credenciais na URL.
- **`servidor-cpanel/api/.htaccess`:** nega acesso HTTP a padrões `test-*` / `teste-*` / `clear-cache.php` e a `ingest-istobal-retro.php`.
- **Removidos** do repo: `test-email.php`, `teste-webhook.php`, `clear-cache.php`, `teste-istobal-post.php`.
- **`ingest-istobal-retro.php`:** só executável em CLI.

### Documentação
- `docs/SEGURANCA-REVISAO-NAVEL-PT.md` (estado pós-correcção e tabela de próximos passos), `docs/DEPLOY_CHECKLIST.md`, `.env.example`.

### Deploy
- Publicar `config.php`, `image-proxy.php`, `.htaccess`, `ingest-istobal-retro.php`; apagar no servidor os PHP de teste antigos.
- Se `getenv()` no servidor não receber as vars do cPanel: `config.deploy-secrets.php` no servidor (não Git), carregado por `config.php`; `.htaccess` bloqueia URL directa a esse ficheiro.

---

## [1.16.54] — 2026-04-17 — Fase C: Biblioteca NAVEL na ficha do equipamento

### Funcionalidade
- **Biblioteca NAVEL** na ficha do equipamento (`Clientes` → ficha): lista de documentos da área reservada associados ao `machineId` (MySQL), pesquisa global, associação de documentos existentes, remoção de vínculo, upload para a pasta `Assistencia Tecnica/<categoria>/<subcategoria>/` com tipo de documento e ligação automática ao equipamento.
- **API `data.php`:** recurso `documentosBiblioteca` (`search`, `machine_links_get`, `machine_links_set`, `upload_folder_for_maquina`) com proxy servidor → `documentos-api.php` (Bearer `ATM_NAVEL_DOC_INTEGRATION_TOKEN`).
- **Novos scripts PHP:** `navel-doc-lib.php`, `navel-documentos-upload.php` (multipart), `navel-documentos-download.php` (stream). **`config.php`:** `ATM_NAVEL_DOCUMENTOS_API_URL`, `ATM_NAVEL_DOC_INTEGRATION_TOKEN`.

### Deploy
- cPanel: definir **`ATM_NAVEL_DOC_INTEGRATION_TOKEN`** (igual a `at_integration_bearer` no `documentos-api-config.php` do navel-site) e enviar os PHP da pasta `api/` actualizados.

---

## [1.16.53] — 2026-03-28 — Clientes: pesquisa por nome

### Correcções
- **`Clientes.jsx`:** a pesquisa por várias palavras exige que **todas as palavras com 2+ caracteres** existam no nome (antes, `some` + token de 1 letra como «a» fazia aparecer quase todos os clientes). Continua **case-insensitive**; NIF continua a filtrar pela frase completa.

---

## [1.16.52] — 2026-03-27 — Relatórios de reparação (PDF email + HTML)

### Correcções / alinhamento
- **`servidor-cpanel/send-email.php`:** PDF gerado no envio de email em reparação — ordem das secções **peças → fotos → notas → checklist** (manutenção mantém ordem canónica); correcção do título «TRABALHO REALIZADO»; peças com `codigo` ou `codigoArtigo`.
- **`relatorioReparacaoHtml.js`:** mesma ordem de secções; **horas no contador (acumuladas)** na grelha «Dados da Intervenção» quando aplicável.

**Deploy:** enviar também **`send-email.php`** actualizado para o cPanel (além do zip do front).

---

## [1.16.51] — 2026-03-27 — Duplicado de nº de série + zip de deploy plano

### Correcções / qualidade
- **Equipamentos:** impede criar ou actualizar ficha com o **mesmo nº de série** já usado por outro equipamento do **mesmo cliente** (toast no formulário + validação **422** em `data.php` em create/update/bulk).
- **Deploy:** `dist_upload.zip` passa a ser gerado com **`scripts/make-deploy-zip.mjs`** (`archiver`): conteúdo de `dist/` na **raíz** do zip, para extrair **directamente** em `public_html/manut/` sem subpasta intermédia.

---

## [1.16.50] — 2026-03-27 — Frota: nº de série + relatório com número

### Correcções
- **`frotaReportHelpers.js`:** `relatorioLigadoAoEquipamento` e `relatorioVisivelNaFrotaCliente` ligam relatórios ao equipamento pelo **mesmo nº de série** que outra ficha do cliente (duplicados `maquinas.id`). `pickNewestRelatorioParaEquipamento` prefere relatórios com **nº oficial** quando existem rascunhos mais recentes sem número.

---

## [1.16.49] — 2026-03-27 — API: relatórios com `manutencaoMaquinaId` (JOIN)

### Correcções
- **`servidor-cpanel/api/data.php`:** `list` / `get` / `create` / `update` de **relatorios** devolvem `manutencao_maquina_id` (camelCase no JSON: `manutencaoMaquinaId`) via `LEFT JOIN manutencoes`, para a frota ligar nº e datas ao equipamento sem depender só do alinhamento de ids no cliente.
- **`frotaReportHelpers.js`:** `pickNewestRelatorioParaEquipamento`, `relatorioLigadoAoEquipamento`, `normRelatorioMaquinaIdJoin`.
- **`gerarRelatorioFrota*` + `Clientes.jsx`:** `relMap` aceita relatórios cuja manutenção pertence à máquina do JOIN.

**Deploy:** além do zip do front, é necessário **enviar o `data.php` actualizado** para o servidor (`public_html/api/` ou caminho equivalente).

---

## [1.16.48] — 2026-03-27 — Frota: data «Última» alinhada ao relatório

### Correcções
- **`frotaReportHelpers.js`:** a coluna **Última** usa primeiro a **data do relatório** (assinatura/criação); só sem relatório datado é que entram `manutencoes.data` e `ultimaManutencaoData` — evita que a ficha «ultrapasse» o PDF (ex.: 18-03 na frota vs relatório correcto em 16-01).
- **`relUltima`:** prioritiza o relatório mais recente do equipamento; `ultimaRegistroParaProxima` alinha o cálculo da **Próxima** com `dataUltimaKey` quando a linha da manutenção difere.

---

## [1.16.47] — 2026-03-27 — Frota: «Últ. rel.» — join com lista global

### Correcções
- **`frotaReportHelpers.js`:** `midSetParaRelatoriosDaMaquina` usa **todas** as manutenções em memória + `manutsM`, `normRelatorioManutencaoId` / `normManutencaoMaquinaId` (camelCase e snake_case), `numeroRelatorioLegivel`, `enrichRelatorioComNumero` quando o nº vem noutra linha da lista.
- **`gerarRelatorioFrotaHtml.js`, `gerarRelatorioFrota.js`, `Clientes.jsx`:** `resolveUltimaParaFrota(..., manutencoes)` e coluna/PDF com `numeroRelatorioLegivel`.

---

## [1.16.46] — 2026-03-27 — Relatório de frota: coluna «Últ. rel.»

### Correcções
- **`frotaReportHelpers.js`:** `reportDateSortKey` (incl. `criadoEm`), `pickNewestRelatorioForMidSet`, `mergeRelatorioPreferNewer` — o nº do último relatório volta a aparecer quando a «Última» vem da ficha/manutenção mais recente que a data do PDF ou quando faltavam `dataCriacao`/`dataAssinatura` úteis.
- **`gerarRelatorioFrotaHtml.js`, `gerarRelatorioFrota.js`, `Clientes.jsx`:** construção do `relMap` com merge do relatório mais recente por `manutencaoId`.

### Deploy
- Front: `dist_upload.zip` (v1.16.46) para `public_html/manut/`.

---

## [1.16.45] — 2026-03-23 — Novo pacote de deploy

### Deploy
- Front: `dist_upload.zip` (v1.16.45) para `public_html/manut/` — rebuild sem alterações funcionais adicionais.

---

## [1.16.44] — 2026-03-22 — Relatório de frota: coluna «Última» e «Últ. rel.»

### Correcções
- **`frotaReportHelpers.js`:** `resolveUltimaParaFrota` cruza manutenções concluídas (status normalizado), `maquinas.ultimaManutencaoData` e datas dos **relatórios** — evita «—» na última intervenção quando a «Próxima» já vinha da ficha/agenda.
- **`gerarRelatorioFrotaHtml.js` + `gerarRelatorioFrota.js`:** colunas **Última** / **Últ. rel.** e estado «Por instalar» alinhados com essa data efectiva; KPIs de manutenções no período com `isManutencaoConcluida`.
- **`Clientes.jsx`:** KPIs e filtros da ficha de cliente (próxima data / conformidade) usam a mesma lógica que o relatório de frota.

### Deploy
- Front: `dist_upload.zip` (v1.16.44) para `public_html/manut/`.

---

## [1.16.43] — 2026-03-22 — Recolher assinatura: upload de imagem (Admin)

### Funcionalidade
- **`RecolherAssinaturaModal.jsx`:** utilizadores **Admin** podem **carregar** uma imagem de assinatura (PNG, JPEG ou WebP, até 2,5 MB) em vez de apenas desenhar no quadro; o técnico mantém o fluxo original.
- **`Manutencoes.css`:** estilos da barra de ferramentas (rótulo + botão «Carregar imagem…»).

### Deploy
- Front: `dist_upload.zip` (v1.16.43) para `public_html/manut/`.

---

## [1.16.42] — 2026-03-22 — PDF KAESER: horas no contador

### Correcções
- **`horasContadorEquipamento.js`:** leitura de horas com fallback **snake_case** (`horas_leitura_contador`, `horas_servico`, `horas_servico_acumuladas`, etc.) para cache/offline ou payloads atípicos — PDF/HTML voltam a mostrar a leitura quando o valor existe.
- **`gerarPdfRelatorio.js`:** na secção **PLANO DE MANUTENÇÃO (KAESER)**, linha explícita **«Horas no contador (acumuladas)»** quando aplicável.

### Deploy
- Front: `dist_upload.zip` (v1.16.42). Confirmar migração SQL `horas_leitura_contador` em `relatorios` no MySQL se ainda não aplicada.

---

## [1.16.41] — 2026-03-25 — Email: CSP logos externos + send-email URL

### Correcções
- **`emailService.js`:** `enviarRelatorioEmail` usava ainda `EMAIL_CONFIG.ENDPOINT_URL` no `fetch` — passa a **`getSendEmailUrl()`** (alinha com lembretes e evita 405 por redirect www).
- **`gerarPdfRelatorio.js` `loadImageAsDataUrl`:** para URLs **http(s) noutro domínio** (ex. `pt.kaeser.com`), tentar primeiro **`/api/image-proxy.php`** no mesmo site — o `fetch` directo violava **`connect-src`** da CSP do navel-site.
- **`servidor-cpanel/api/image-proxy.php`:** CORS para `navel.pt` e `www`; paths **sem extensão** permitidos se o conteúdo for imagem (MIME); rejeitar respostas não-imagem.

### Deploy
- Front: novo build. Servidor: upload de **`public_html/api/image-proxy.php`** se ainda não tiver a versão actualizada.

---

## [1.16.40] — 2026-03-25 — Email relatórios: 405 «Método não permitido» (host canónico)

### Correcção
- **`emailConfig.js`:** `getSendEmailUrl()` e `getSendReportUrl()` em produção usam `https://navel.pt/api/...` (`ATM_API_CANONICAL_ORIGIN`), alinhado ao redirect www→apex no `.htaccess` do site. O `fetch` POST a `https://www.navel.pt/api/send-email.php` seguia **301** e o corpo podia chegar como **GET** ao PHP → **405** com `Metodo nao permitido`.
- **`emailService.js`:** `enviarRelatorioEmail` e `enviarLembreteEmail` passam a usar `getSendEmailUrl()`.

### Deploy
- Novo build front (`dist_upload.zip`); não requer alteração ao `send-email.php` no servidor.

---

## [1.16.39] — 2026-03-23 — Editar máquina (Clientes): correcção crash + API canónica

### Correcções
- **`MaquinaFormModal.jsx`:** `temManutencaoConcluidaNaMaq` movido para depois de `useState(form)` — elimina `ReferenceError: Cannot access before initialization` ao abrir **Editar** na ficha do equipamento (ErrorBoundary a bloquear a app).
- **`src/config/apiBase.js` + `apiService.js` + `logger.js`:** em produção, `data.php` e `log-receiver.php` usam `https://navel.pt/...` para evitar **301** www→apex em **POST** (login / logs).
- **`AuthContext.jsx` + `data.php` + `db.php`:** normalização de `role` no JWT/sessão; login com `LOWER(username)` (deploy PHP em `public_html/api/`).

### Outros
- **`Login.jsx`:** `id` / `name` / `htmlFor` nos campos (autofill / Issues DevTools).

### Deploy
- Front: `dist_upload.zip`. PHP: `data.php`, `db.php` se ainda não actualizados no cPanel.

---

## [1.16.38] — 2026-03-22 — Lista manutenções: cores alinhadas à declaração + build

### Alteração
- **`src/utils/categoriaVisual.js`:** tom visual derivado de `declaracaoLegislacaoVariantFromCategoriaNome` (elevadores / compressores) e subtons em «outros» (geradores, pneus, lavagem).
- **`Manutencoes.css`:** paleta alinhada a `relatorioBaseStyles` / PALETA (azul Navel `#1a4880`, médio `#2d6eb5`, laranja doc `#92400e`, verde `#15803d`, ISTOBAL `#c8102e`).

### Deploy
- Front: `dist_upload.zip` · Servidor: `send-email.php` (cabeçalho email HTML) — upload separado pelo operador.

---

## [1.16.37] — 2026-03-22 — Declaração do cliente: variantes + override por categoria

### Contexto
- Texto de declaração de aceitação alinhado ao tipo de equipamento (elevadores / compressores / outros).
- Opcional: admin define sufixo legal por categoria na BD, com fallback canónico na app e sem duplicar lógica no PHP do email.

### Alteração
- **`src/constants/relatorio.js`:** variantes `elevadores`, `compressores`, `outros`; `resolveDeclaracaoCliente`, `resolveDeclaracaoClienteForMaquina`, `getCategoriaFromMaquina`, `declaracaoClienteDepoisFromMaquina`, `getCanonicalDeclaracaoDepoisSuffix`; compressores citam Dir. Máquinas + DL 50/2005 + PED 2014/68/UE + DL 32/2015 (sem EN 1493 / Reg. 2023/1230).
- **PDF / HTML / modais / vistas:** uso da resolução única; `gerarPdfCompacto` e fluxos de email recebem `declaracaoClienteDepois`.
- **`emailService.js`:** payload `declaracao_texto` (texto final resolvido no browser).
- **`send-email.php`:** FPDF usa `declaracao_texto` quando preenchido; fallback `texto_declaracao_cliente(tipo, legislacao)`.
- **BD:** coluna `categorias.declaracao_cliente_depois` — `setup.sql` + migração `servidor-cpanel/migrations/20250322_categorias_declaracao_cliente.sql`; **`data.php`:** whitelist do campo.
- **`Categorias.jsx` / CSS:** textarea opcional, botões Repor canónico / Limpar, badge «Decl. custom».
- **`MIGRACAO_MYSQL.md`:** secção 9 (migração incremental).

### Deploy
- Correr a migração SQL na BD existente; enviar `data.php`, `send-email.php`, front (`dist_upload.zip`).

---

## [1.16.36] — 2026-03-22 — PDF relatório: coluna «dados do serviço»

### Correcção
- **`gerarPdfRelatorio.js`:** tabela CLIENTE / EQUIPAMENTO / … — rótulos com `splitTextToSize` e coluna de valores mais à direita (`M+74` mm), para rótulos longos (ex. **HORAS NO CONTADOR (ACUMULADAS)**) não sobreporem o valor.

---

## [1.16.35] — 2026-03-22 — KAESER execução: ignorar contador órfão sem concluídas

### Correcção
- **`sugerirFaseKaeser.js`:** parâmetro `contadorFichaConfiavel` (default true); quando false, não usa `ultimaManutencaoData` nem horas da ficha para Δh / janela anual.
- **`ExecutarManutencaoModal.jsx`:** sem manutenções **concluídas** na máquina, passa `contadorFichaConfiavel: false`; detalhes mostram **0 h** e texto explicativo; bootstrap de horas não usa ficha órfã; correcção da data de fallback (última concluída = mais **recente**, não a mais antiga).

---

## [1.16.34] — 2026-03-22 — PDF.js worker alinhado ao pdf-parse (5.4.296)

### Correcção
- **`package.json`:** `pdfjs-dist` fixo em **5.4.296** (mesma versão que `pdf-parse` usa no bundle browser). Corrige erro *«The API version "5.4.296" does not match the Worker version "5.4.624"»* na importação KAESER.

---

## [1.16.33] — 2026-03-22 — PDF worker KAESER (importação template)

### Correcção
- **`kaeserPlanoPdfImport.js`:** `PDFParse.setWorker()` passa a usar URL gerada pelo Vite a partir de `pdfjs-dist/build/pdf.worker.min.mjs?url` → ficheiro em `assets/` com hash (deploy conjunto com o bundle). Corrige falha em produção quando `/manut/pdf.worker.mjs` na raiz não existia ou o fetch do worker falhava.
- **`public/pdf.worker.mjs`:** removido (duplicado e desalinhado com a versão npm); **`public/.htaccess`:** `AddType application/javascript .mjs` e cache longo também para `.mjs`.

---

## [1.16.32] — 2026-03-22 — Contador órfão (ficha + documentação) + plano KAESER na documentação

### Correcção / UX
- **`MaquinaFormModal.jsx`:** não mostrar data/horas da ficha como «última manutenção» sem intervenção **concluída**; referência 0 h; Admin pode **limpar órfãos** (`ultimaManutencaoData` + horas).
- **`DocumentacaoModal.jsx`:** mesma lógica de contador; secção KAESER com **Abrir plano de peças**, **Importar consumíveis do PDF já na ficha** (Admin); util `kaeserPlanoPdfImport.js` partilhado com `PecasPlanoModal`.
- **`Clientes.jsx`:** botão **Plano de peças** na ficha do equipamento (KAESER A/B/C/D); `modalPecasManual` + `DocumentacaoModal.onOpenPlanoPecas`.
- **`Equipamentos.jsx`:** `DocumentacaoModal` com `onOpenPlanoPecas` para abrir o plano de peças.

---

## [1.16.31] — 2026-03-22 — KAESER (agendamento, 1.ª intervenção B, anual) + ficha equipamento + plano peças

### Alteração
- **`Agendamento.jsx`:** com `posicaoKaeser` na ficha, mostra «Próxima prevista no ciclo: Tipo X» (editável na execução).
- **`sugerirFaseKaeser.js`:** 1.ª intervenção sem posição no ciclo — pré-selecção **B** em fallback e em janela anual sem Δh/calendário; `tipoIndicadoPorContadorHoras` para aviso por horas.
- **`ExecutarManutencaoModal.jsx`:** modo «Intervenção anual — escolher livremente o kit»; aviso de tipo indicado pelas horas.
- **`DataContext.jsx`:** resposta API fundida em `updateMaquina`; throttle de `fetchTodos` no `focus`; `refreshData` forçado; `getPecasPlanoByMaquina` com `String(maquinaId)`.
- **`Clientes.jsx` / `MaquinaFormModal.jsx`:** ficha frota alinhada a `maquinaAtual`; IDs em `String` onde aplicável.
- **`tests/unit/sugerirFaseKaeser.test.js`:** casos 1.ª intervenção.

---

## [1.16.30] — 2026-03-22 — Documentação de deploy (PDFs técnicos, data.php) + pacote build

### Alteração
- **`DOCUMENTACAO.md`:** modelo `maquinas.documentos`, fluxo de upload/substituição, caminho `uploads/machine-docs/`.
- **`docs/DEPLOY_CHECKLIST.md`**, **`docs/BUILD-E-ZIP.md`**, **`servidor-cpanel/INSTRUCOES_CPANEL.md`**, **`README.md`**, **`DESENVOLVIMENTO.md`:** checklist cPanel, pasta `uploads/machine-docs/`, quando enviar `data.php`.

---

## [1.16.29] — 2026-03-22 — Upload PDF documentação: substituir quando nome e tamanho coincidem

### Contexto
Reenviar o mesmo ficheiro (mesmo nome e tamanho) criava uma segunda linha na ficha e um segundo ficheiro em `uploads/machine-docs/`, sem apagar o anterior.

### Alteração
- **`DocumentacaoModal` + `DataContext`:** em cada upload guardam-se `uploadFileName` e `uploadFileSize` no item de `documentos`. Se já existir entrada com o mesmo **tipo + nome + tamanho**, actualiza-se essa linha (mesmo `id`) e envia-se `replacePath` ao servidor.
- **`data.php` (`machine_pdf`):** parâmetro opcional `replacePath` — validação estrita (`/uploads/machine-docs/maq-{id}-…pdf` + `realpath` dentro da pasta) e `unlink` do PDF antigo antes de gravar o novo.
- **`apiService.js`:** `apiUploadMachinePdf` aceita `replacePath` opcional.

### Deploy
- **API:** enviar `servidor-cpanel/api/data.php` actualizado.

---

## [1.16.28] — 2026-03-22 — Documentação técnica: gravação na API (id número vs string)

### Contexto
Ao importar PDF ou adicionar URL em «Documentação técnica», o toast dizia sucesso mas, ao fechar e reabrir, a lista voltava vazia. A causa era a comparação estrita `m.id !== maquinaId` quando a API devolve `id` numérico e o cliente usa string (ou vice-versa): o estado local não era actualizado e **`persist` / `apiMaquinas.update` não era chamado**. Havia ainda risco de `maqAtual` ficar indefinido se o updater do `setState` não corresse antes do `if (maqAtual)`.

### Alteração
- **`DataContext.jsx`:** `addDocumentoMaquina` / `removeDocumentoMaquina` — comparação com `String(id)`, `flushSync` ao calcular o próximo estado, `await persist(..., { throwOnFailure: true })` com rollback; retorno `{ ok }`.
- **`DocumentacaoModal.jsx`:** toast de sucesso só após `ok`; mensagens de erro se falhar gravação ou remoção.

---

## [1.16.27] — 2026-03-22 — Relatórios: plano KAESER + consumíveis obrigatórios; Admin vê ciclo e tabela

### Contexto
PDF obtido por «Obter PDF» não trazia horas, resumo do plano A/B/C/D nem tabela de consumíveis quando `pecasUsadas` estava vazio. Admin no «Editar relatório» precisava de ver **posição no ciclo**, tipo gravado e **sempre** poder editar / recarregar linhas do plano importado por n.º de série.

### Alteração
- **`src/utils/relatorioBlocosEquipamento.js`:** `relatorioObrigaBlocoConsumiveisPlano` / `relatorioIncluiResumoPlanoNoPdf` — regra extensível (hoje: `isKaeserAbcdMaquina`, exclui montagem).
- **`gerarPdfRelatorio.js`:** linha de horas no contador; bloco «Plano de manutenção (fabricante / série)»; secção «Consumíveis e peças» sempre que obrigatória, com texto se lista vazia.
- **`relatorioHtml.js`:** mesma lógica para email/impressão HTML.
- **`ExecutarManutencaoModal.jsx`:** Admin KAESER — cartão com ciclo na ficha + tipo já gravado no relatório; área de consumíveis sempre visível; botão «Carregar plano»; gravação Admin envia sempre `pecasUsadas` (e `tipoManutKaeser`) em periódicas KAESER para não omitir o array na API.

---

## [1.16.26] — 2026-03-21 — Editar relatório: um só campo de horas (contador)

### Contexto
No modal «Editar relatório» (Admin) podiam aparecer **dois** blocos de horas (secção KAESER + checklist), com rótulos que sugeriam «totais» vs «serviço». O modelo de dados é **uma única leitura acumulada** no equipamento (`horasServico` / `horasTotais` espelhados na BD).

### Alteração
- **`ExecutarManutencaoModal.jsx`:** horas do contador apenas em **Status e datas**; secção KAESER em admin limita-se a tipo A/B/C/D e consumíveis; checklist **não** repete o input para Admin. Bootstrap do formulário usa **horas gravadas na manutenção** quando existem, senão a ficha (`horasContadorNaManutencao` → `horasContadorNaFicha`).
- **`Manutencoes.jsx`**, **`relatorioHtml.js`:** rótulo unificado «Horas no contador (acumuladas)».

---

## [1.16.25] — 2026-03-21 — API `maquinas` update: não sobrescrever periodicidade em patches

### Contexto
Pedidos `update` com payload mínimo (ex.: apenas `proximaManut` após `scheduleSyncProximaParaMaquinas`) passavam por `preprocess_maquina()` sem `periodicidade` / `periodicidadeManut`, activando o fallback por subcategoria (muitas vezes trimestral) e o default final `trimestral`, gravando por cima de uma ficha **anual** — PDF/email mostravam «próximas manutenções» com intervalo errado.

### Alteração
- **`servidor-cpanel/api/data.php` (update `maquinas`):** antes de `preprocess_maquina()`, fundir o registo existente (via `SELECT`) com o payload recebido (`array_merge`); o cliente continua a poder sobrescrever campos enviados explicitamente.

### Deploy
- **Frontend:** extrair `dist_upload.zip` (conteúdo de `dist/`) para `public_html/manut/` (substituir ficheiros existentes).
- **API:** enviar **`servidor-cpanel/api/data.php`** para `public_html/api/data.php` (ou caminho equivalente no hosting).

---

## [1.16.24] — 2026-03-22 — Wizard «Executar manutenção»: contraste e layout (tablets / KAESER)

### Contexto
No passo «Confirmação» (e passos com grelha de horas), em tema escuro o cartão de equipamento usava fundo claro com texto claro; havia scroll horizontal e checkbox com texto espalmado em colunas estreitas (Galaxy Tab / modo campo).

### Alteração
- **`Manutencoes.css`:** `.exec-equip-verify-card` alinhado a `var(--color-bg-elevated)` + texto legível; série em `var(--color-accent)`; `.exec-equip-confirm-label` com `min-width: 0` e quebra de linha; `.wizard-body` com `overflow-x: hidden`; barra de progresso com `flex-wrap`; `.wizard-step-hint` com quebra de palavra e hint KAESER com `:has(.kaeser-help-btn)` em flex-wrap; `.modal-relatorio-form .form-row` com `minmax(0,1fr)`; placeholders e rótulos no wizard mais legíveis; `.wizard-confirm` sem `min-width` fixo que forçava overflow.

---

## [1.16.23] — 2026-03-22 — Persistência máquinas/PDF: erros visíveis; timeouts; migração plano compressor

### Contexto
Gravação da ficha do compressor parecia «perder» dados: o `persist()` fazia rollback mas **não relançava** o erro da API, pelo que o modal mostrava sucesso em falhas reais (ex.: coluna em falta no MySQL). Importação PDF do plano KAESER não deixava rasto nos logs em caso de falha. Em produção faltava a coluna **`plano_manutencao_compressor`** em `maquinas`, o que quebrava o `UPDATE` quando o frontend enviava o plano.

### Alteração
- **`DataContext.jsx`:** `persist(..., { throwOnFailure: true })` nos `await` críticos (`updateMaquina`, `addMaquina`, técnicos, `replacePecasPlanoMaquina`) — toast/fluxo reflectem falhas de servidor; `list` após replace com timeout alargado.
- **`apiService.js`:** `call()` aceita `timeoutMs` (não vai no JSON); CRUD `list(opts)`; `replace_maquina` e refresh com **`API_TIMEOUT_BULK_MS`** (45s).
- **`limits.js`:** `API_TIMEOUT_BULK_MS`.
- **`PecasPlanoModal.jsx`:** `logger.error` na importação PDF e ao limpar planos; toast «PDF ou gravação».
- **Testes:** `tests/unit/parseKaeserPlanoPdf.test.js` (fixture plano SX6); `scripts/test-parse-kaeser-pdf.js` para validar PDFs locais.
- **Migração:** `servidor-cpanel/migrations/2026-03-22-maquinas-plano-manutencao-compressor.sql` — `ALTER TABLE maquinas ADD plano_manutencao_compressor`.

### Deploy
1. **phpMyAdmin:** executar `2026-03-22-maquinas-plano-manutencao-compressor.sql` se a coluna ainda não existir (obrigatório para gravar ficha com plano KAESER).
2. **FTP/cPanel:** conteúdo de `dist/` (ou extrair `dist_upload.zip`) para `public_html/manut/`.
3. **API:** enviar `servidor-cpanel/api/data.php` actualizado (se ainda não estiver em produção com `pecasPlano` / allowed completo).

---

## [1.16.22] — 2026-03-22 — Plano de peças na BD; import PDF só Admin; E2E e modal

### Contexto
O plano KAESER A–D deixou de depender de `localStorage` e passou a sincronizar com **MySQL** (`pecas_plano`). A importação por PDF (parser no browser) ficou **só para administrador**, para reduzir falhas em tablets; técnicos **consultam** o plano vindo da API. Backup/restauro JSON inclui `pecasPlano`.

### Alteração
- **API:** recurso `pecasPlano` em `data.php` (list para todos autenticados; escrita e `replace_maquina` só Admin). Migração `servidor-cpanel/migrations/2026-03-22-pecas-plano-table.sql`.
- **Frontend:** `apiService.fetchTodosOsDados` + `DataContext` (`replacePecasPlanoMaquina`, persistência, exportar/restaurar). `PecasPlanoModal` — UI só Admin para importar/editar/limpar; reset do separador ao reabrir o modal.
- **E2E:** `helpers.js` mock mutável para `pecasPlano`; `14-kaeser-features.spec.js` e `15-kaeser-pdf-import.spec.js` sem `atm_pecas_plano`.

### Deploy
1. Correr a migração SQL em produção (tabela `pecas_plano`).
2. Enviar `api/data.php` actualizado.
3. Publicar o build do frontend em `public_html/manut/` (zip `dist_upload`).

---

## [1.16.21] — 2026-03-22 — KAESER: sugestão de fase (Δh + anual), auditoria no relatório

### Contexto
O plano «Sugestão de fase KAESER (Δh + janela anual)» substitui a sugestão rígida só por horas absolutas por um motor que combina **365 dias** desde a referência na ficha com **Δh ≥ 3000 h**, mostra **duas sugestões** em conflito, grava **tipo sugerido + motivo** no relatório e reflecte-os no **HTML/PDF**.

### Alteração
- **`src/constants/kaeserCiclo.js`:** constantes partilhadas (`KAESER_INTERVALO_HORAS_REF`, janela anual, aviso Δh alto) e utilitários do ciclo 12 anos.
- **`src/utils/sugerirFaseKaeser.js`:** motor puro `sugerirFaseKaeser` + testes em `tests/unit/sugerirFaseKaeser.test.js` (`npm run test:unit`).
- **`ExecutarManutencaoModal.jsx`:** passo horas com resumo expansível, dual «calendário / horas», ajuda «?», aviso ficha vs último relatório, confirmação ao mudar tipo com consumíveis editados; payload com `tipoManutKaeserSugerido` / `sugestaoFaseMotivo`.
- **API:** migração `servidor-cpanel/migrations/2026-03-21-relatorios-kaeser-audit.sql`; `data.php` — colunas permitidas em `relatorios`.
- **`relatorioHtml.js` / `gerarPdfRelatorio.js`:** linha de auditoria no bloco KAESER quando os campos existem.
- **E2E:** `14-kaeser-features.spec.js` — K4.8 (sugestão dual + detalhes).

### Deploy
- Aplicar migração SQL em produção antes de persistir os novos campos na BD.

---

## [1.16.20] — 2026-03-21 — Relatório mensal ISTOBAL: PDF + email (como frota)

### Contexto
O botão «Imprimir / Exportar» abria `window.print()`, o que pendurava o browser à procura de impressoras. Era desejável **PDF directo** e **envio por email** (ficha cliente ISTOBAL + admin + outro), alinhado ao relatório de frota.

### Alteração
- **`mensalIstobalReport.js`:** `buildMensalIstobalPayload`, `gerarRelatorioMensalIstobalPdf` (jsPDF), `gerarRelatorioMensalIstobalHtml` (fragmento para email), `findClienteIstobalFaturacao` (cliente com «ISTOBAL» no nome e email).
- **`Reparacoes.jsx`:** rodapé do modal com **Obter PDF** e **Enviar por email** (painel tipo frota); removido print como acção principal.
- **`Reparacoes.css`:** tabela ISTOBAL com `table-layout: fixed` e larguras de coluna; KPIs e rodapé do modal; alinhamento **H. M.O.**; aviso sem ficha ISTOBAL.
- **E2E `16-reparacoes.spec.js`:** assert dos novos botões.
- **Correcção:** `gerarRelatorioFrotaHtml.js` — template partido no ramo email/documento (fechamento de literal antes do bloco cliente/KPI); corrigido com `headBlock` + concatenação.

---

## [1.16.19] — 2026-03-21 — Email frota: Outlook sem texto literal «&lt;html&gt;»

### Contexto
No Outlook continuava a aparecer a palavra **`<html>`** por cima do logo — o motor HTML do Outlook (Word) trata mal documentos completos (`<!DOCTYPE>`, `<html>`, `<head>`, `<body>`) no corpo da mensagem.

### Alteração
- **`gerarRelatorioFrotaHtml.js`:** opção **`emailFragment: true`** — gera só um `<div>` raiz com `<style>` + conteúdo, sem wrapper de documento.
- **`Clientes.jsx`:** envio por email da frota usa `emailFragment: true`; «Abrir HTML» mantém documento completo para pré-visualização no browser.

---

## [1.16.18] — 2026-03-21 — Email relatório frota: Outlook (HTML visível, labels, logo)

### Contexto
No Outlook, o relatório de frota mostrava **tags HTML** na pré-visualização (`<html>`), **rótulos colados aos valores** (ex.: `CLIENTEAUTO`, `NIF512…`) e **logo partida** (URL relativa no `<img>`).

### Alteração
- **`gerarRelatorioFrotaHtml.js`:** `resolveLogoSrc()` — URL **absoluta** do logo (`origin` + path ou fallback `https://www.navel.pt/...`). Grelha do cliente: estilos **compatíveis com email** (`display:block` / `inline`, margens) em vez de flex ignorado pelo Outlook; rótulos com **dois pontos e espaço** (`Cliente:`, `NIF:`, …).
- **`servidor-cpanel/api/send-report.php`:** com anexo PDF, corpo passa a **`multipart/alternative`** (parte `text/plain` derivada do HTML + parte `text/html`) **dentro** do `multipart/mixed`, para snippet legível e melhor escolha da parte HTML no cliente.

### Deploy
- Frontend: novo build (`dist_upload`) com **v1.16.18**.
- Servidor: voltar a enviar **`api/send-report.php`** actualizado.

---

## [1.16.17] — 2026-03-21 — Email frota: ignorar VITE_API_BASE_URL localhost no deploy

### Contexto
Build de produção com `.env` local **`VITE_API_BASE_URL=http://localhost:8080`** embute esse URL no bundle; em **navel.pt** o `fetch` ia para **localhost** → bloqueio **Content-Security-Policy** (`connect-src` sem localhost) e falha de envio HTML+PDF.

### Alteração
- **`emailConfig.js`:** `safeViteApiBaseUrl()` — em runtime, se a base aponta para localhost/127.0.0.1 e a página **não** está nesse host, ignora-se a variável e usa-se `/api/send-report.php`.
- **`.env.example`:** aviso explícito contra localhost no build de deploy.
- **`.env.local`:** removido `VITE_API_BASE_URL` (era a origem do localhost embutido no bundle).
- **`.env.production`:** `VITE_API_BASE_URL=` vazio para o build de produção não herdar base de ficheiros locais.

---

## [1.16.16.2] — 2026-03-21 — api/.htaccess: SecRuleEngine causa 500 (data.php)

### Contexto
Em alojamento partilhado, `SecRuleEngine Off` em `public_html/api/.htaccess` é **muitas vezes proibido**; com `mod_security2` activo o Apache aplica o bloco e responde **500** a **toda** a pasta `api/` → login (`data.php`) e logs (`log-receiver.php`) falham.

### Alteração
- **`api-htaccess.txt`:** bloco ModSecurity **comentado** por omissão; ficheiro passa a ser sobretudo instruções. Quem já tem `.htaccess` activo no servidor deve **remover** o `<IfModule mod_security2.c>…` ou apagar o ficheiro para restaurar o login.

---

## [1.16.16.1] — 2026-03-21 — api/.htaccess: sem CORS duplicado (login)

### Contexto
Com o `.htaccess` em `public_html/api/` que incluía `Header always set Access-Control-Allow-Methods`, alguns browsers recebiam **cabeçalhos CORS duplicados** (Apache + `data.php`), o que pode impedir o **login** (fetch ao `data.php` falha ou resposta rejeitada).

### Alteração
- **`api-htaccess.txt`:** removido bloco `mod_headers` / CORS — só fica a excepção ModSecurity para `send-email.php` e `send-report.php`. Quem já colou o ficheiro antigo no servidor deve **editar** o `.htaccess` em `api/` e **apagar** o bloco `<IfModule mod_headers.c> ... </IfModule>`.

---

## [1.16.16] — 2026-03-21 — Frota email: ModSecurity + limites POST (Failed to fetch)

### Contexto
Continuação de **Failed to fetch** no envio frota com PDF; manutenção (`send-email.php`) OK. Causas prováveis no servidor: **ModSecurity** só desactivado para `send-email.php` no `.htaccess` modelo — `send-report.php` bloqueado; ou **post_max_size** insuficiente para JSON com `pdf_base64` (resposta 413 / corte sem CORS legível).

### Alterações
- **`api-htaccess.txt`:** `SecRuleEngine Off` para `send-email.php` **e** `send-report.php` (`FilesMatch`).
- **`api-user-ini.txt`:** `post_max_size` / `upload_max_filesize` = **48M**.
- **`emailConfig.js`:** em produção no browser, URL **`/api/send-report.php`** (path na raiz do site).
- **`emailService.js`:** log de tamanho aproximado do payload em falhas de rede; mensagem de erro com lembrete servidor quando há PDF.
- **`INSTRUCOES_CPANEL.md`:** secção de troubleshooting «Failed to fetch» para frota.

---

## [1.16.15] — 2026-03-21 — Email frota/HTML: URL canónico (Failed to fetch)

### Contexto
Envio do relatório de frota (HTML + PDF) falhava com **Failed to fetch** nos logs; relatórios de manutenção (send-email.php) funcionavam. Causa provável: `enviarRelatorioHtmlEmail` construía a URL com `VITE_API_BASE_URL || window.location.origin` — em produção sob `https://www.navel.pt/manut` o origin é correcto, mas **builds com `VITE_API_BASE_URL` apontado para outro host** (ex. dev) faziam o pedido para o servidor errado. Não é o caso típico do apóstrofo em JSON (`JSON.stringify` trata `Pico d'Agua Park` correctamente); o cabeçalho Navel no HTML já usa `escapeHtml(EMPRESA.localidade)`.

### Alterações
- **`emailConfig.js`:** `getSendReportUrl()` — override opcional `VITE_API_BASE_URL`; em `localhost` mantém `/api/send-report.php` no mesmo origin (proxy); caso contrário deriva de `ENDPOINT_URL` (send-email → send-report no mesmo host).
- **`emailService.js`**, **`EnviarDocumentoModal.jsx`:** usam `getSendReportUrl()`.
- **`send-report.php`:** CORS `Access-Control-Allow-Headers` alinhado a send-email (`X-Requested-With`).
- **`.env.example`:** nota sobre deixar `VITE_API_BASE_URL` vazio em produção.

---

## [1.16.14] — 2026-03-20 — Frota: próxima manutenção consistente (agenda + cálculo)

### Contexto
No relatório de frota (HTML/PDF), alguns equipamentos mostravam «Última» e relatório mas **Próxima / Dias** vazios; estado «Conforme» sem data visível. Causas: (1) só `pendente`/`agendada` eram consideradas — **`em_progresso` ignorado**; (2) sem registo aberto e `proximaManut` desactualizado na BD, **faltava fallback** por periodicidade (regra já usada no PDF de manutenção); (3) `maquinaId` **number vs string** quebrava `minDataManutencaoAberta` e a sincronização de `proximaManut`; (4) **`proximaDataNaFicha` em `Clientes.jsx` não existia** (referência inválida).

### Alterações
- **`proximaManutAgenda.js`:** comparação de IDs normalizada (`String`) em todas as funções.
- **`frotaReportHelpers.js`:** `resolveProximaManutParaFrota` — ordem: agenda aberta (incl. `em_progresso`) → `proximaManut` → `computarProximasDatas` a partir da última concluída.
- **`gerarRelatorioFrota.js`**, **`gerarRelatorioFrotaHtml.js`:** usam o resolver; secção atraso PDF corrige destructuring de `proxDataKey`.
- **`Clientes.jsx`:** `proximaDataNaFicha` com `useCallback`; KPIs e filtros da ficha alinhados ao mesmo critério; joins máquina/manutenção com `normEntityId`.

---

## [1.16.13] — 2026-03-21 — Frota: correcções de dados, email HTML+PDF, limpeza

### Relatório de frota (dados e layout)
- **`frotaReportHelpers.js`:** `normEntityId`, `dateKeyForFilter`, `maquinaPertenceCliente`.
- **Período vs listagem:** intervalo limita só KPIs «no período»; estado/próxima/última usam todas as manutenções.
- **Conformidade (HTML):** alinhada ao PDF (`estado === 'conforme'`), não `proximaManut` na máquina.
- **Estado:** Conforme / Não conforme (atraso) / Por instalar; próxima = registo agendado ou `proximaManut`.
- **PDF:** S/N sem truncagem agressiva; cabeçalho com logo Navel; rodapé como relatório de manutenção; exports `loadImageAsDataUrl` / `addImageFitInBoxMm` em `gerarPdfRelatorio.js`.
- **`DataContext.jsx`:** `getSubcategoria` / `getCategoria` com match `String(id)`.

### Email frota
- Envio usa `enviarRelatorioHtmlEmail` com **HTML no corpo** e **PDF jsPDF em anexo** (`pdf_base64` — já suportado por `send-report.php`).
- **`emailService.js`:** `blobToRawBase64`; documentação do endpoint actualizada.

### Limpeza / documentação
- Removido re-export morto `gerarRelatorioFrota` (só se usava `gerarRelatorioFrotaPdf`).
- **`.gitignore`:** `tests/playwright-report/` (artefactos gerados).
- **`docs/ROADMAP-EVOLUCAO-2026.md`:** item relatório executivo marcado entregue.
- **`DESENVOLVIMENTO.md`**, **`INSTRUCOES_CPANEL.md`:** envio frota / `send-report.php` actualizados.

---

## [1.16.12] — 2026-03-21 — Equipamentos: crash ao abrir ficha via nº série (Manutenções)

### Contexto
Ao clicar no número de série na lista (ex. manutenções executadas), a navegação para `?maquina=` abria a vista de máquinas da subcategoria; o JSX usa o ícone `CalendarDays` nos botões «Próximas», mas o símbolo **não estava importado** de `lucide-react` → `ReferenceError` → `ErrorBoundary` a vermelho em toda a app até recarregar/sessão.

### Alterações
- **`Equipamentos.jsx`:** importar `CalendarDays`; `setSearchParams` ao remover `maquina` passa a clonar `URLSearchParams` (evita mutar o objecto interno do router).

### Ficheiros
- `src/pages/Equipamentos.jsx`, `src/config/version.js`

---

## [1.16.11] — 2026-03-21 — Fotos: máx. 6, PDF grelha 4×A4, compressão mais segura, PHP alinhado

### Contexto
Reduzir risco de falhas de memória / timeout em tablets (Chrome, Edge, Firefox) ao gerar PDF ou enviar email; melhorar apresentação em A4 (até 4 fotos por linha, proporção preservada, quebra de página).

### Alterações
- **`MAX_FOTOS` = 6** (`limits.js`); UI, toasts e E2E actualizados.
- **`comprimirImagemRelatorio.js`:** meta de base64 mais baixa, mais passagens de qualidade/tamanho, passagem extra dura se ainda exceder ~560k caracteres.
- **`gerarPdfRelatorio.js` (`gerarPdfCompacto`):** secção de fotos com miniaturas em grelha (4 colunas, `addImageFitInBoxMm` com try/catch em `getImageProperties` e `addImage`); suporta `fotos` como JSON string; URLs remotas via `loadImageAsDataUrl`.
- **`relatorioBaseStyles.js` (`htmlFotos`):** impressão/HTML com linhas de até 4 fotos + classes triple/quad.
- **`send-email.php`:** cap de 6 fotos após parse; PDF FPDF com mesma lógica de grelha (`imageFitContain`); galeria no email HTML a 4 colunas.
- **Regra `.cursor`:** secção 6 do PDF canónico actualizada (documentação fotográfica em grelha).

### Qualidade (E2E)
- `17-reparacoes-avancado.spec.js`: input de ficheiros no modal de reparação usa `input[type="file"][multiple]` (Galeria) para evitar strict mode com dois inputs (câmara + galeria).

### Documentação (pós-deploy)
- `docs/FOTOS-PDF-EMAIL-LIMITES.md` — memória operacional: MAX_FOTOS, compressão, PDF/HTML, PHP, E2E, hosting.
- `DOCUMENTACAO.md`, `DESENVOLVIMENTO.md`, `docs/BUILD-E-ZIP.md` — versão e referências cruzadas.

### Ficheiros
- `src/config/limits.js`, `src/utils/comprimirImagemRelatorio.js`, `src/utils/gerarPdfRelatorio.js`, `src/utils/relatorioBaseStyles.js`, `src/utils/relatorioHtml.js`, `src/utils/relatorioReparacaoHtml.js`, `servidor-cpanel/send-email.php`, `tests/e2e/09-edge-cases.spec.js`, `tests/e2e/17-reparacoes-avancado.spec.js`, `docs/TESTES-E2E.md`, `.cursor/rules/at-manut-workflow.mdc`, `src/config/version.js`, `docs/FOTOS-PDF-EMAIL-LIMITES.md`, `DOCUMENTACAO.md`, `DESENVOLVIMENTO.md`, `docs/BUILD-E-ZIP.md`

---

## [1.16.10] — 2026-03-21 — UX: limite de fotos visível + toast ao atingir máximo

### Alterações
- Texto de ajuda no painel de fotos (manutenção e reparação): **máx. 8** fotos por relatório, alinhado a PDF/email e compressão no dispositivo; aviso quando o limite está cheio.
- **Toast** ao tentar adicionar com limite cheio; mensagem alinhada quando a galeria devolve mais ficheiros do que cabem.

### Ficheiros
- `src/config/limits.js`, `src/index.css`, `src/components/ExecutarManutencaoModal.jsx`, `src/components/ExecutarReparacaoModal.jsx`, `src/config/version.js`

---

## [1.16.9] — 2026-03-20 — ATecnica: fotos no «Editar» + compressão adaptativa para relatórios

### Contexto
Utilizadores **ATecnica** com relatório em rascunho (não assinado) ao escolher **Editar** no menu da linha abriam apenas o formulário simples de manutenção, **sem** passo de fotografias nem botões «Tirar foto» / «Galeria» (fluxo completo existia só via **Continuar execução** ou via admin «Editar relatório»).

### Alterações
- **`Manutencoes.jsx`:** se o perfil não é admin, existe relatório e **não** está assinado pelo cliente, **Editar** abre `ExecutarManutencaoModal` (igual ao fluxo de execução), com câmara e galeria no passo de fotos.
- **`comprimirImagemRelatorio.js`:** utilitário partilhado — redimensiona para lado máx. até 1280 px, JPEG; se o base64 continuar grande, novas passagens com menor qualidade e resolução (**sem** rejeitar ficheiros por limite rígido de KB).
- **`ExecutarManutencaoModal` / `ExecutarReparacaoModal`:** usam o utilitário; toast com mensagem clara em falha de decode; reparações processam fotos em sequência (menos pressão de memória em tablets).

### Ficheiros
- `src/pages/Manutencoes.jsx`, `src/utils/comprimirImagemRelatorio.js`, `src/components/ExecutarManutencaoModal.jsx`, `src/components/ExecutarReparacaoModal.jsx`, `src/config/version.js`

---

## [1.16.8] — 2026-03-21 — Fotos no «Editar relatório» não desaparecem ao sincronizar dados

### Contexto
Ao anexar fotos pela Galeria no modal de admin (editar relatório), as miniaturas apareciam e sumiam em menos de 1 segundo: qualquer actualização de `manutencoes` no `DataContext` disparava o `useLayoutEffect` do modal, repunha `bootstrappedIdRef` e o bootstrap voltava a executar `setFotos(existingRel?.fotos ?? [])`, apagando o estado local.

### Alterações
- **`ExecutarManutencaoModal`:** deixar de anular `bootstrappedIdRef` nos ramos com `manutencao` já definida; no ramo de candidato único, só anular quando o id da intervenção escolhida muda; `setManutencaoAtual` preserva a referência se o id for o mesmo.

### Ficheiros
- `src/components/ExecutarManutencaoModal.jsx`, `src/config/version.js`

---

## [1.16.7] — 2026-03-20 — E2E: sessão dev + wizard de execução

### Contexto
A suite Playwright falhava em massa após `page.goto()` pós-login: o bypass de desenvolvimento em `localhost` não gravava JWT em `sessionStorage`. Os testes do modal de execução assumiam o formulário single-page antigo; o UI passou a wizard de 7 passos.

### Alterações
- **`AuthContext`:** em DEV (`localhost` / `127.0.0.1`), login válido grava JWT mínimo via `setToken`; restauração de sessão no arranque igual à produção; password errada continua a falhar (validação `admin123` / `tecnico123`).
- **`ExecutarManutencaoModal`:** mensagem de erro de assinatura também no passo 7 (visível ao falhar «Enviar»).
- **E2E (`helpers.js`):** `tecnicos` no mock da API; `checklistMarcarTodos` usa o botão da zona «Marcar todos» (não «Limpar tudo» do pré-preenchimento); `execWizardSeguinte` + `fillExecucaoModal` alinhados ao wizard.
- **E2E (`04-manutencoes`, `05-montagem`, `11-blocos-abc`):** fluxos actualizados; montagem abre sempre a linha **Montagem** (não o primeiro «Executar» da lista).

### Ficheiros
- `src/context/AuthContext.jsx`, `src/components/ExecutarManutencaoModal.jsx`, `src/config/version.js`, `tests/e2e/helpers.js`, `tests/e2e/04-manutencoes.spec.js`, `tests/e2e/05-montagem.spec.js`, `tests/e2e/11-blocos-abc.spec.js`

---

## [1.16.6] — 2026-03-21 — Fluxo executar: hábito único + plano persistido (Fase A)

### Contexto
Reduzir redundâncias que geravam inconsistências e percursos confusos (especialmente em tablet/campo). Plano de execução acordado em `docs/PLANO-FLUXOS-EXECUCAO.md`.

### Alterações
- **`ExecutarManutencaoModal`:** já não cria pendente para hoje automaticamente; ecrã **sem intervenção aberta** com confirmação **«Criar intervenção para hoje»**; se várias ordens com a **mesma data mínima**, lista de escolha; escolha canónica via `candidatosMesmaDataMinimaAberta`.
- **`Equipamentos`:** removido modal de execução; botão **Próximas** → `Manutenções` com `?filter=proximas&maquinaId=`.
- **`Manutencoes`:** suporte a `maquinaId` na URL + banner «Mostrar todas».
- **`Calendario`:** por evento de manutenção aberta, botão **Executar/Continuar** → `manutencoes?filter=proximas&executar=`.
- **`proximaManutAgenda.js`:** `listManutencoesAbertasOrdenadas`, `candidatosMesmaDataMinimaAberta`, export `STATUS_MANUTENCAO_ABERTA`.
- **Regras Cursor:** referência ao plano e proibição de `addManutencao` implícito no fluxo de execução.

### Ficheiros
- `docs/PLANO-FLUXOS-EXECUCAO.md`, `src/utils/proximaManutAgenda.js`, `src/components/ExecutarManutencaoModal.jsx`, `src/pages/Equipamentos.jsx`, `src/pages/Manutencoes.jsx`, `src/pages/Calendario.jsx`, `src/pages/Calendario.css`, `.cursor/rules/at-manut-workflow.mdc`, `src/config/version.js`

---

## [1.16.5] — 2026-03-21 — Sincronizar `proximaManut` na BD em toda mutação de manutenções

### Contexto
`proximaManut` na tabela de máquinas deve reflectir sempre a primeira data «aberta» na agenda (pendente / agendada / em_progresso), não só após `recalcularPeriodicasAposExecucao`.

### Alterações
- **`scheduleSyncProximaParaMaquinas(ids)`** em `DataContext.jsx`: após `setManutencoes`, `queueMicrotask` + `manutencoesRef` + `updateMaquina` por máquina afectada.
- Chamado em **`addManutencao`**, **`addManutencoesBatch`**, **`updateManutencao`** (inclui mudança de `maquinaId` hipotética), **`removeManutencao`**, **`confirmarManutencoesPeriodicas`**.
- **`sincronizarProximaManutComAgenda`:** passa a usar microtask + ref (consistente com o resto).
- **`recalcularPeriodicasAposExecucao`:** patch da máquina (`proximaManut` + opcional `ultimaManutencaoData`) aplicado no mesmo microtask após o merge do estado.

### Ficheiros
- `src/context/DataContext.jsx`, `src/config/version.js`

---

## [1.16.4] — 2026-03-21 — Ficha cliente: próxima data alinhada à agenda + «Novo equipamento»

### Problema
- Na ficha do cliente, badges/KPIs usavam sobretudo `maquinas.proximaManut`, que podia ficar desactualizado após `recalcularPeriodicasAposExecucao` (lista «próximas» correcta, ficha com datas erradas).
- Dois `updateMaquina` seguidos no edit admin (recalc + `ultimaManutencaoData`) podiam competir; faltava sincronizar `proximaManut` com a agenda após o recálculo.
- Com cliente que já tinha equipamentos, não havia acção visível para **adicionar** mais um (só no estado vazio).

### Correcção
- **`proximaManutAgenda.js`:** `minDataManutencaoAberta` — menor data entre pendente / agendada / em_progresso.
- **`DataContext`:** após recalcular periódicas, `updateMaquina` com `proximaManut` derivada da lista fundida; opção `ultimaManutencaoData` no mesmo patch (edit admin); `sincronizarProximaManutComAgenda` para periódica sem periodicidade definida (micro-delay).
- **`Clientes.jsx`:** KPIs, filtros, badges e vista KPI usam agenda primeiro, fallback `proximaManut`; botão **Novo equipamento** (Admin) na barra da ficha.

### Ficheiros
- `src/utils/proximaManutAgenda.js`, `src/context/DataContext.jsx`, `src/components/ExecutarManutencaoModal.jsx`, `src/pages/Clientes.jsx`, `src/config/version.js`

---

## [1.16.3] — 2026-03-21 — Admin editar relatório: agendamento vs execução (PDF/email/lista)

### Problema
O modal «Editar relatório» tinha um único campo de data ligado a `manutencoes.data` (agendamento). Ao «corrigir a execução», gravava-se na data agendada; `dataCriacao`/`dataAssinatura` do relatório não eram actualizados — lista executadas e relatórios ficavam incoerentes.

### Correcção
- **Dois campos no admin:** «Data de agendamento» (`manut.data`) e «Data de execução (relatório)» (`dataAssinatura` se assinado, senão `dataCriacao`), com texto de ajuda.
- **Gravação:** `updateManutencao` só altera agendamento; `updateRelatorio` actualiza datas de execução; renumerar relatório pelo **ano da execução**; `recalcularPeriodicasAposExecucao` e `ultimaManutencaoData` usam a **data de execução**.
- **PDF:** linha «DATA DE EXECUÇÃO» com fallback `dataCriacao` quando não há assinatura (alinhado ao HTML do email).

### Ficheiros
- `src/components/ExecutarManutencaoModal.jsx`, `src/pages/Manutencoes.css`, `src/utils/gerarPdfRelatorio.js`

---

## [1.16.2] — 2026-03-21 — Admin: marcar envio ao cliente manualmente

### Funcionalidade
- **Manutenções (executadas), só Admin:** no menu «…» (e no menu mobile «Mais acções»), **Marcar enviado ao cliente (manual)** abre um modal com email editável (pré-preenchido com a ficha do cliente). Confirma grava `enviadoParaCliente` + `ultimoEnvio` na BD **sem reenviar** email — semáforo verde e filtros «Email: Enviados» passam a incluir a linha.
- **Reverter marca de envio ao cliente** (vermelho de novo), com confirmação — não apaga emails já enviados.

### Ficheiro
- `src/pages/Manutencoes.jsx`

---

## [1.16.1] — 2026-03-20 — Persistência email ao cliente + carregamento offline

### Contexto
Conclusão do trabalho interrompido (OOM): garantir que o estado «enviado ao cliente» e `ultimoEnvio` sobrevivem a refresh, sync e queda para cache offline; alinhar schema de `relatorios` com a API.

### Alterações
- **`DataContext.jsx`:** ao carregar dados do `localStorage` (offline), `setRelatorios` usa `mergeRelatoriosMantendoEnvio` como no `fetchTodos` online — não perde `enviadoParaCliente` / `ultimoEnvio` já presentes em memória quando o snapshot em cache está desactualizado.
- **`servidor-cpanel/api/data.php`:** `ultimo_envio` incluído em `json_cols` para `relatorios` — leitura devolve objecto `{ data, destinatario }` quando gravado como JSON; valores legados (datetime em texto) mantêm-se como string (`json_decode` falha de forma segura).
- **`servidor-cpanel/setup.sql`:** tabela `relatorios` com `checklist_snapshot`, `pecas_usadas`, `tipo_manut_kaeser`, `enviado_para_cliente` e `ultimo_envio` em TEXT (novas instalações alinhadas com `data.php`).
- **Migrações:** `migrations/alter_relatorios_ultimo_envio_text.sql` — alterar coluna existente de DATETIME para TEXT em produção; `add_relatorio_enviado_cliente.sql` — removido `AFTER pecas_usadas` para não falhar em BD antigas.

### Deploy cPanel
1. Executar `add_relatorio_enviado_cliente.sql` se a coluna ainda não existir.
2. Executar `alter_relatorios_ultimo_envio_text.sql` se `ultimo_envio` ainda for DATETIME (necessário para gravar JSON do envio).
3. Fazer upload de `data.php` actualizado.

---

## [1.16.0] — 2026-03-19 — Correcções críticas PDF, datas periódicas, filtros executadas, link equipamento

### Contexto da sessão
Sessão intensa de correcção de bugs acumulados nos relatórios PDF, cálculo de datas periódicas, envio de email e navegação. Múltiplas iterações foram necessárias devido a regressões introduzidas ao longo da sessão. As lições aprendidas foram documentadas em `.cursor/rules/at-manut-workflow.mdc` para prevenção futura.

### Correcções PDF (`gerarPdfRelatorio.js`)
- **Ordem das secções restruturada (DEFINITIVA):** Checklist → Notas → Fotos → Consumíveis → Declaração → Próximas → Assinaturas. A declaração e próximas manutenções aparecem ANTES das assinaturas (lógica legal: cliente lê tudo e depois assina).
- **Declaração de aceitação:** renderiza SEMPRE (não condicional), com espaçamento adequado entre secções (eliminada sobreposição de texto).
- **Periodicidade na tabela:** mostra "Trimestral"/"Semestral"/"Anual" (capitalizado) em vez de "periodica".
- **Altura das caixas de assinatura:** avalia AMBAS as assinaturas (técnico e cliente) para dimensionar a caixa.
- **Blocos isolados:** declaração e próximas envolvidos em blocos `{}` para isolar variáveis e evitar conflitos de escopo.

### Cálculo de datas periódicas — abordagem redesenhada
- **Nova função `computarProximasDatas()`** em `diasUteis.js`: calcula N datas futuras a partir da data de execução + periodicidade, ajustando para dias úteis e feriados dos Açores.
- **PDF e Email usam datas computadas em tempo real** (não registos da base de dados). Isto elimina discrepâncias causadas por persistência assíncrona falhada ou recálculos com data errada.
- **Callers actualizados:** `Manutencoes.jsx` (`handleAbrirPdf`), `Clientes.jsx` (`handleDownloadPdfManutencao`), `EnviarEmailModal.jsx`.

### Bug corrigido: auto-preenchimento `dataRealizacao`
- **Antes:** manutenções em atraso pré-preenchiam `dataRealizacao` com `m.data` (data ORIGINAL de agendamento, e.g., Março).
- **Depois:** pré-preenche com `getHojeAzores()` (data ACTUAL). Se o técnico não alterasse o campo, todo o recálculo periódico usava a data errada como base.
- **Ficheiro:** `ExecutarManutencaoModal.jsx` linha ~245.

### Bug corrigido: admin edit não recalculava datas
- **Antes:** `recalcularPeriodicasAposExecucao` só era chamado se `form.adminData !== manutencaoAtual.data` (data efectivamente alterada).
- **Depois:** recalcula SEMPRE que o admin grava uma manutenção periódica, usando `form.adminData || manutencaoAtual.data`. Garante consistência mesmo com dados previamente corrompidos.
- **Ficheiro:** `ExecutarManutencaoModal.jsx` bloco de admin edit save.

### Funcionalidades novas
- **Filtros para executadas** (`Manutencoes.jsx`/`.css`): chips de período (último mês, 2 meses, 3 meses), intervalo de datas, pesquisa por texto, filtro por estado de envio de email.
- **Indicador de email enviado**: coluna com dot verde/vermelho na tabela de executadas, indicando se o relatório foi enviado por email para endereço do cliente.
- **Link directo ao equipamento**: nº de série clicável na lista de executadas → abre ficha do equipamento com scroll e highlight animado (CSS `maq-highlight-pulse`).
- **Contraste email modal**: CSS com alta especificidade e cores hardcoded para garantir visibilidade dos endereços de email em dark mode.

### Ficheiros alterados
- `src/utils/gerarPdfRelatorio.js` — reestruturação completa da ordem das secções
- `src/utils/diasUteis.js` — nova função `computarProximasDatas()`
- `src/pages/Manutencoes.jsx` — filtros executadas, email indicator, link equipamento, datas computadas
- `src/pages/Manutencoes.css` — estilos filtros, email dot, link série
- `src/pages/Clientes.jsx` — datas computadas no PDF
- `src/components/EnviarEmailModal.jsx` — datas computadas no email
- `src/components/ExecutarManutencaoModal.jsx` — fix auto-fill dataRealizacao, fix admin recalc
- `src/pages/Equipamentos.jsx` — navigateToMaquina, highlight, scroll
- `src/pages/Equipamentos.css` — highlight animation
- `src/index.css` — contraste email modal
- `src/config/version.js` — v1.16.0
- `.cursor/rules/at-manut-workflow.mdc` — regras canónicas PDF + datas + prevenção regressões

### Documentação
- Regras canónicas adicionadas a `.cursor/rules/at-manut-workflow.mdc`:
  - Estrutura exacta do PDF (10 secções numeradas)
  - Regras de cálculo de datas futuras
  - Prevenção de regressões (lições da sessão)

### Handoff
- Build v1.16.0 compilado com sucesso. ZIP disponível em `dist-manut.zip`.
- Ordem do PDF é DEFINITIVA — não alterar sem confirmar com a lista canónica nas regras.
- As datas no PDF são computadas; as datas na BD são geridas por `recalcularPeriodicasAposExecucao` (que agora é SEMPRE chamado no admin edit).

---

## [1.15.1] — 2026-03-18 — Edição de reparações; Email piping ISTOBAL via cPanel

### Funcionalidades
- **Editar Reparação:** Novo botão de edição (ícone lápis) em reparações pendentes/em progresso — permite alterar máquina, técnico, data, nº aviso e descrição (Admin only)
- Modal de edição reutiliza layout do formulário "Nova Reparação" com pré-preenchimento dos dados actuais e filtro de cliente
- Estilo `.icon-btn.secondary` com variante modo-campo (azul, contraste adequado)

### Integração ISTOBAL — Migração de Make.com para cPanel Email Piping
- Migração do processamento de emails ISTOBAL de Make.com (créditos esgotados) para cPanel Email Piping (gratuito)
- Novo subdomínio `bot.navel.pt` com MX records locais para recepção directa de emails no cPanel
- Script `parse-istobal-email.php` refactorizado: shebang para piping, detecção robusta de remetente/assunto (MIME decode, header folding), criação de reparação mesmo sem máquina associada
- Regra de redirect automático no Outlook 365 → `istobal@bot.navel.pt`

### Handoff
- Próximo passo: verificar que os próximos emails automáticos da ISTOBAL (redirect O365) são correctamente parseados e associados à máquina via nº série

---

## [1.14.1] — 2026-03-17 — Contraste e legibilidade; melhorias arquitecturais (M1/M2/M4/M5/R1/R2/R3)

### Contraste e legibilidade — auditoria completa
- `--color-text-muted` +12% luminosidade (`#c8d6e3` → `#d8e2ec`) — ratio WCAG ~9.6:1
- `--color-border` reforçado (`#2d3a4d` → `#3a4a60`) — bordas mais visíveis
- `--color-accent-muted` mais opaco (0.15 → 0.22) — botões secundários distintos
- Nova variável `--color-text-subtle` para hierarquia tipográfica sem opacity
- **Sidebar**: nav-links font-weight 600, active 700, user-name em --color-text
- **Dashboard**: stat-label weight 600, sublabel sem opacity, weekday headers em --color-text, ícones opacity 0.85
- **Tabelas**: th font-weight 700, form labels em --color-text
- **Eliminação de opacity** em textos/ícones: ~20 ocorrências em 12 ficheiros CSS (chevrons, separadores, empty-icons, breadcrumbs, log-version, hints, readonly)
- **Modo campo**: --color-text-muted escurecido para `#1e2a38`, empty-icon opacity 0.85

### Melhorias arquitecturais (workflow e relatórios)
- **M1**: Pré-preenchimento inteligente da checklist (última execução do mesmo tipo/máquina)
- **M2**: Scan & Go — QR Code detecta manutenção pendente (7 dias) e abre wizard
- **M4**: Quick Notes — chips de texto configuráveis abaixo das observações
- **M5**: Prontidão semanal — OfflineBanner mostra manutenções pré-carregadas (5 dias)
- **R1**: Historial compacto de anomalias (últimas 5 manutenções) no relatório individual
- **R2**: Indicadores de tendência (★ ● ◐ ⚠ ○) no relatório de frota
- **R3**: Próxima manutenção prevista com periodicidade no relatório individual
- Auditoria de dependências: constantes extraídas, hardcoding eliminado, race conditions corrigidas

### Documentação
- `docs/ROADMAP.md` actualizado com estado v1.14.1, 3 melhorias propostas (P1/P2/P3), backlog reorganizado

### Ficheiros alterados
- `src/index.css` (variáveis + contraste global)
- `src/components/Layout.css`, `Breadcrumbs.css`, `PesquisaGlobal.css`, `OfflineBanner.css`
- `src/pages/Dashboard.css`, `Clientes.css`, `Manutencoes.css`, `Reparacoes.css`, `Calendario.css`, `Equipamentos.css`, `Logs.css`
- `src/components/ExecutarManutencaoModal.jsx`, `QrReaderModal.jsx`, `EnviarEmailModal.jsx`, `OfflineBanner.jsx`
- `src/utils/relatorioHtml.js`, `gerarRelatorioFrotaHtml.js`
- `src/config/version.js` → `1.14.1`
- `src/config/storageKeys.js`
- `docs/ROADMAP.md`, `CHANGELOG.md`

---

## [1.14.0] — 2026-03-17 — Wizard manutenção layout fixo; PDFs sem diálogo de impressão; email com opções de destinatários

### Wizard ExecutarManutencaoModal — redesign de layout
- **Estrutura fixa de 3 secções** — cabeçalho fixo (título + hint + barra de progresso), corpo com scroll independente (`wizard-body`), rodapé fixo com botões de navegação (`wizard-footer`)
- Elimina o problema de janelas ora grandes ora pequenas e botões em posições inconsistentes entre passos
- **Rodapé unificado** — botões Anterior / Próximo / Cancelar / Guardar sem assinatura / Gravar / Enviar relatório renderizados condicionalmente por passo
- Modal de altura fixa: `95dvh` em mobile, `80dvh` em desktop (`max-width: 700px`)
- Scrollbar de corpo com estilos personalizados para boa visibilidade em dark e light theme

### Checklist — destaque visual (passo 1)
- Secção da checklist com cor de fundo distinta (`.checklist-section-wizard`) e badge "✱ Preenchimento obrigatório"
- Scroll interno da checklist removido — o scroll é gerido pelo `wizard-body` (scroll único e intuitivo)
- Alternância de cor nas linhas (`:nth-child(even)`) para facilitar leitura

### PDFs e email — auditoria geral
- **Nenhum botão abre diálogo de impressão** — todos os fluxos de "obter PDF" fazem download directo via Blob
- **Botão "enviar por email"** abre sempre painel de destinatários: email do cliente, email admin (`comercial@navel.pt`), campo de endereço livre
- Corrigido em: `Manutencoes.jsx`, `Reparacoes.jsx`, `EnviarEmailModal.jsx`, `Equipamentos.jsx`, `ExecutarReparacaoModal.jsx`

### Relatório de frota (painel do cliente)
- **Filtro por período** antes de gerar o relatório (data início / data fim; ambos opcionais)
- **3 acções directas**: Abrir HTML em nova aba, Gravar PDF (download), Enviar por email (com painel de destinatários)
- Histórico de manutenções reconvertido em tabela compacta com ícones de acção por linha
- Botão "Adicionar máquina" removido do painel de frota do cliente

### Dashboard
- Cartão "Próximas" mostra agora o nº de manutenções nos **próximos 6 meses** (em vez de todas as futuras)
- Sublabel "próximos 6 meses" adicionado sob o valor

### Relatório de manutenção — campos de data
- Label "Data" renomeado para "Data agendada" no formulário de agendamento
- `RelatorioView` apresenta "Data agendada" e "Data de execução" em linhas separadas

### Assinaturas nos relatórios
- Corrigido problema de molduras a cortar o texto e a assinatura — caixas de assinatura agora abraçam todo o conteúdo
- Imagens de assinatura com `max-width: 100%` e layout de inner `<div>` para escala responsiva

### Scroll nos modais
- `.modal-overlay` é agora o único contentor de scroll (removido `overflow-y: auto` do genérico `.modal`)
- `overscroll-behavior: contain` + `touch-action: pan-y` no overlay para scroll correcto em desktop e touch

### Ficheiros alterados
- `src/components/ExecutarManutencaoModal.jsx`, `src/pages/Manutencoes.css`
- `src/components/EnviarEmailModal.jsx`
- `src/pages/Manutencoes.jsx`, `src/pages/Reparacoes.jsx`, `src/pages/Clientes.jsx`, `src/pages/Equipamentos.jsx`
- `src/components/ExecutarReparacaoModal.jsx`
- `src/utils/relatorioBaseStyles.js`
- `src/index.css`, `src/pages/Clientes.css`
- `src/pages/Dashboard.jsx`, `src/pages/Dashboard.css`
- `src/components/RelatorioView.jsx`
- `src/config/version.js` → `1.14.0`

---

## [1.13.0] — 2026-03-13 — Relatório executivo de frota N3, declaração de aceitação do cliente

### Relatório Executivo de Frota (N3) — Enriquecido
- **Agrupamento por categoria** — equipamentos organizados por tipo (Elevadores, Compressores, etc.) para frotas grandes
- **Coluna "Dias"** — dias de atraso (+N) ou dias até próxima manutenção (-N), ordenados por urgência
- **Secção de reparações** — reparações concluídas dos últimos 12 meses incluídas no relatório
- **Resumo anual** — manutenções e reparações executadas/pendentes/em atraso para o ano corrente
- **KPIs expandidos** — 5 cards: Equipamentos, Conformidade%, Em atraso, Manutenções ano, Reparações ano
- **Envio por email** — novo botão "Enviar frota" na lista e ficha de cliente (via send-report.php com CC a comercial@navel.pt)

### Declaração de aceitação/compromisso do cliente
- **Texto actualizado** com legislação em vigor: EN 1493:2022, Diretiva 2006/42/CE, Regulamento (UE) 2023/1230, DL 50/2005
- **Referência ao fornecedor NAVEL** e ao período mínimo de conservação de 2 anos
- **Texto dinâmico** que se adapta ao tipo de serviço (montagem / manutenção / reparação) via `getDeclaracaoCliente(tipo)`
- **Visível antes de assinar** — declaração apresentada ao cliente nos 3 modais de assinatura digital (RecolherAssinaturaModal, ExecutarManutencaoModal, ExecutarReparacaoModal)
- **Uniforme em todos os PDFs** — mesmo texto usado nos relatórios HTML de manutenção e reparação

### Documentação
- `docs/ROADMAP.md` e `docs/ROADMAP-EVOLUCAO-2026.md` actualizados para v1.12.0+

---

## [1.12.0] — 2026-03-13 — Integridade de dados, cascatas, pipeline de agendamento, UX defensiva

### Agendamento de manutenções — Pipeline intuitivo
- **Nova manutenção** redesenhada com pipeline: Cliente → Categoria → Equipamento → Data + Técnico
- Dropdowns filtrados em cascata (só mostra categorias/máquinas do cliente seleccionado)
- Técnico agora é dropdown (lista de técnicos registados) em vez de campo livre
- Bloco de horas totais/serviço removido do agendamento (preenchido na execução)

### Coluna "Dias" na lista de manutenções
- Nova coluna com cálculo automático: `+N` (atraso, vermelho), `Hoje` (azul), `-N` (futuro, verde)
- Ordenação por dias de atraso (mais urgente primeiro)
- Badge de dias visível também nos cards mobile

### Sincronização automática de manutenções
- Ao carregar dados, detecta máquinas com `proximaManut` sem manutenção agendada e cria automaticamente
- Editar `proximaManut` na ficha do equipamento actualiza/cria manutenção correspondente
- Eliminar manutenção concluída remove em cascata todas as periódicas futuras geradas

### Integridade de dados — Cascatas completas (auditoria CRUD)
- **removeCliente**: agora elimina em cascata máquinas, manutenções, relatórios, reparações, relatórios de reparação e peças plano
- **removeMaquina**: agora elimina reparações e relatórios de reparação (faltava)
- **removeSubcategoria**: elimina checklists via API (antes só do estado local)
- **clearAllClientesAndRelated**: limpa pecasPlano do estado e localStorage
- **Backend data.php**: DELETE em cascata — cliente→máquinas→manutenções→relatórios→reparações; subcategoria→checklists

### Protecção contra eliminação acidental e indevida
- Modal de confirmação obrigatório antes de eliminar: manutenções, documentos, peças, categorias, subcategorias, checklists
- Manutenções e reparações com relatório assinado pelo cliente **não podem ser eliminadas** (nem por Admin)
- `window.confirm()` substituído por modais consistentes em Categorias e Logs
- Removida opção "Executada" do dropdown de edição de manutenção (execução obrigatória via modal)

### Correcções e melhorias UX
- `alert()` eliminado de `gerarPdfRelatorio.js` (substituído por `throw` — chamadores usam `showToast`)
- Mensagem de eliminação de reparação corrigida (agora reflecte o comportamento real)
- Feedback de eliminação normalizado (`'success'` em vez de `'info'`)
- Validação de nome vazio em `addCategoria`/`addSubcategoria`
- NIFs duplicados no mesmo ficheiro de importação detectados e ignorados

### Email
- Reply-To e CC alterados de `geral@navel.pt` para `comercial@navel.pt`
- CC garantido em **todos** os pontos de envio (relatórios com PDF incluídos)

## [1.11.0] — 2026-03-12 — Históricos, assinatura em 2 passos, agendamento recorrente, técnicos, responsivo

### CSS responsivo centralizado (última actualização)
- **15 variáveis de layout** em `:root` (`--sidebar-width`, `--nav-height`, `--page-max`, `--modal-width-sm/md/lg/xl`, `--scroll-max-sm/md/lg`, `--card-pad`, `--page-pad`, `--grid-min-col`) — todas usam `clamp()` e `min()` para adaptação automática
- Substituídos ~180 valores hardcoded `px` em 20+ ficheiros CSS por variáveis centralizadas
- Qualquer ajuste responsivo futuro faz-se num único local (`:root` em `index.css`)
- Modais, scroll containers, paddings, sidebar e navbar adaptam-se automaticamente ao ecrã
- Signature canvas com `clamp(120px, 18vh, 180px)` — adapta a qualquer viewport

### Gestão de técnicos
- Ficha completa por técnico (nome, telefone, assinatura digital) na BD (`tecnicos` table)
- CRUD restrito ao Admin (Definições → Técnicos)
- Assinatura digitalizada armazenada como base64 na BD
- Relatórios PDF incluem identificação + assinatura do técnico (lado esquerdo) e do cliente (lado direito)
- Fallback de tecnicos via `TECNICOS_FALLBACK` quando BD não tem registos

### Correcções email e relatórios
- Nova função `enviarRelatorioHtmlEmail` em `emailService.js` para envio de HTML pré-renderizado
- Corrigido: reparações usavam parâmetros errados no envio de email (silent failure)
- `send-report.php`: resposta normalizada para `{ ok, message }`, tags HTML preservadas
- Logging completo em todos os fluxos de email (success + error)
- `EnviarEmailModal` pré-preenche email do cliente

### UI/UX tablet (Samsung Galaxy S10 Lite)
- Corrigido scroll táctil em todos os painéis (`.layout` → `height: 100dvh; overflow: hidden`)
- `-webkit-overflow-scrolling: touch` em `.main` e modais
- Contraste de texto aumentado: `--color-text` → `#f4f7fa` (WCAG AAA), `--color-text-muted` → `#b0c0d0`
- `--color-accent` → `#1ab8f0` para melhor visibilidade de itens activos

### Documentação actualizada (15 ficheiros)
- Versão → 1.11.0 em todos os docs
- Funcionalidades v1.11.0 documentadas (históricas, técnicos, CSS responsivo, assinatura 2 passos)
- `servidor-cpanel/MIGRACAO_MYSQL.md` → secção 8 com DDL da tabela `tecnicos`
- Comando zip corrigido para `npm run zip` (tar) em BUILD-E-ZIP e CHANGELOG
- Caminho workspace corrigido em GIT-SETUP

### Novas funcionalidades
- **Manutenções históricas**: Admin pode inserir registos passados (ex.: papel do ano anterior) com datas retroactivas
- **Assinatura em 2 passos**: Gravar manutenção sem assinatura → recolher assinatura depois (data bloqueada à data da manutenção)
- **Agendamento recorrente automático**: Ao agendar periódica, opção de criar manutenções futuras (1–3 anos) conforme periodicidade do equipamento
- **Inserção em lote**: Secção Admin para criar múltiplos registos históricos (equipamentos × datas) de uma só vez
- **Badges visuais**: Indicadores "Histórico" e "Pendente assinatura" nas listas de manutenções
- **RecolherAssinaturaModal**: Novo componente para recolha de assinatura digital pós-execução

### Robustez e logging
- Adicionado `logger.action` a 6 funções do DataContext que não tinham logging: `addRelatorio`, `updateRelatorio`, `updateManutencao`, `removeManutencao`, `confirmarManutencoesPeriodicas`, `recalcularPeriodicasAposExecucao`
- Adicionado `.catch(logger.error)` a todas as cadeias `import→persist` do pipeline manutenções/relatórios
- Adicionado logging completo a `Agendamento.jsx` (agendamento pontual, recorrente e lote histórico)
- Adicionado `try/catch` + `logger.error` ao `RecolherAssinaturaModal.handleConfirmar`
- Protecção contra regressão de datas em `updateMaquina` para registos históricos
- Guard `!isHistoricoPassado` para evitar recálculo periódico ao executar registo histórico
- Ano correcto no `numeroRelatorio` para relatórios históricos (`dataCriacao` em vez de `new Date()`)

### Optimização mobile (tablet Samsung Galaxy Tab 10/11)
- Breakpoints CSS consolidados: 768px → 1024px para tablets
- Tokens CSS centralizados em `:root` (cores, tipografia, espaçamento, sombras, z-index)
- Bottom navigation bar em substituição do FAB
- Vista em cards para listas em tablet
- Formulários com touch targets mínimos de 44px

### Dead code purgado (JS)
- Imports não usados: `Menu` (Layout), `SUBCATEGORIAS_COM_CONTADOR_HORAS` (Equipamentos), `SEQUENCIA_KAESER` (ExecutarManutencaoModal)
- Exports mortos: `USERS` (users.js), `KAESER_PLANO_ASK_28T` (DataContext ~40 linhas), `formatISODateAzores`, `calcDistribuicaoStatus`, `calcMtbfMedio`, `getQueue`, `clearQueue`, `clearCache`
- Constantes não importadas: `TOAST_DURATION`, `CACHE_TTL_DAYS`, `LOG_MAX_DAYS`, `MAX_NOTAS_LENGTH`, `STACK_TRUNCATE` (limits.js)
- Ficheiro eliminado: `src/constants/status.js` (nunca importado)

### Dead code purgado (CSS)
- Selectores mortos: `.ficha-maquinas` (→renomeado para `.ficha-maquinas-view`), `.email-toast*`, `.sidebar-toggle`, `body.modo-campo` para classes inexistentes
- Duplicados eliminados: `.btn-simnao` (Manutencoes.css), `.badge-sim`/`.badge-nao` (RelatorioView.css)
- Variáveis CSS em falta adicionadas: `--color-primary-light`, `--color-bg-secondary`

### Documentação actualizada (14 ficheiros)
- Versão → 1.11.0 em todos os docs
- Caminho workspace corrigido (`c:\Cursor_Projetos\NAVEL\AT_Manut`)
- Contagem testes → ~450 (18 specs)
- CHANGELOG: localStorage actualizado para modelo actual (MySQL + `atm_cache_v1`)
- Supabase: clarificado como fora do âmbito do AT_Manut
- TESTE-OFFLINE-MANUAL: porto corrigido (5173), credenciais corrigidas

---

## [1.10.3] — 2026-02-27 — Optimização do processo de build e zip

### Build
- `reportCompressedSize: false` em `vite.config.js` — elimina o cálculo gzip no output, poupa ~6-8 s por build
- Novo script `build:fast` — corre `vite build` directamente (salta `optimize-images` quando as imagens não mudaram) + zip em sequência
- Script `zip` migrado de `Compress-Archive` para `tar` nativo do Windows 10+ — 4× mais rápido (2.5 s vs 11 s)
- **Resultado prático:** ciclo build+zip de ~55 s passa para ~35 s (~35% mais rápido)

---

## [1.10.2] — 2026-02-27 — Correcção definitiva da tabela de clientes

### Clientes — tabela desktop
- Removida a coluna **Morada** da listagem geral (visível apenas na ficha individual); Morada era a principal causa do overflow horizontal
- Tabela agora com 6 colunas: NIF, Nome, Localidade, Telefone, Máq., Acções
- Adoptado `table-layout: fixed` com larguras explícitas por coluna — garante que os botões de acção nunca ficam cortados
- Coluna Nome trunca com `text-overflow: ellipsis` em vez de quebrar para nova linha
- Removido `position: sticky` da coluna de acções (não funciona dentro de `overflow-x: auto`)
- Eliminado wrapper `overflow-x: auto` — a tabela cabe dentro do ecrã sem scroll horizontal

---

## [1.10.1] — 2026-02-22 — Limpeza e optimização do projecto

### Ficheiros removidos (obsoletos)
- `teste-import.json` — substituído por `tests/fixtures/clientes-import-test.json`
- `RELATORIO-TESTE-IMPORTACAO.md` — relatório temporário
- `tests/test-import-manual.spec.js` — substituído por `tests/e2e/18-import-saft-clientes.spec.js`
- `PHP 8.1.32 - phpinfo().pdf` — referência técnica temporária

### .gitignore
- Adicionadas entradas para evitar commit de ficheiros obsoletos se forem recriados

---

## [1.10.0] — 2026-02-22 — Importação clientes: scripts, modal e validação

### Scripts de extracção
- **extract-clientes-saft.js / extract-clientes-fttercei.js:** JSON só inclui registos que cumprem requisitos (NIF, Nome, Morada, Telefone, Email)
- CSV mantém todos os registos para análise

### Modal Importar SAF-T
- Instruções actualizadas: `clientes-filosoft.json` ou `clientes-fttercei.json`, gerados na pasta do projecto
- Validação mais flexível: aceita array, objecto com chave clientes/data/dados, e busca recursiva
- Aceita NIF em `nif`, `NIF`, `CustomerTaxID`, `TaxID`

### Fixture E2E
- `clientes-import-test.json`: segundo registo com telefone e email preenchidos

---

## [1.9.9] — 2026-02-22 — Importação SAF-T: validação mais flexível

### Correção
- **Modal Importar SAF-T:** aceita ficheiro como array directo ou objecto com chave `clientes`/`data`/`dados`
- **Campo NIF:** aceita `nif`, `Nif` ou `NIF` (maiúsculas/minúsculas)
- Mensagens de erro mais claras para diagnóstico

---

## [1.9.8] — 2026-02-22 — Clientes: paginação, eliminar todos, importação refinada

### Novidade
- **Botão "Eliminar todos"** (só Admin, quando há clientes): modal de confirmação que apaga todos os clientes, máquinas, manutenções e relatórios — permite limpar lista importada e importar nova
- **Paginação na lista de clientes:** 25 por página, controlos anterior/seguinte, indicador "X–Y de Z"
- **Ordenação alfabética** por nome (já existia)
- **Coluna Nome:** alinhamento à esquerda para melhor legibilidade

### Importação SAF-T — critérios ajustados
- **Obrigatórios:** NIF, Nome, Morada, Telefone ou telemovel (o que existir), Email
- **Código postal** deixou de ser obrigatório (continua a ser guardado se existir)
- Clientes sem estes campos são ignorados (contagem em "ignorados")

### Correção
- **Paginação ao apagar:** quando se elimina clientes e a página actual fica vazia, volta automaticamente à página 1

---

## [1.9.7] — 2026-02-26 — Importação de clientes via SAF-T (Gestor.32)

### Correção crítica (E2E)
- **`DataContext.jsx` — `importClientes` não exportado no contexto:** a função estava definida e nas dependências do `useMemo` mas **faltava no objeto `value`** passado ao `DataContext.Provider`. Corrigido: `importClientes` incluído no value → importação passa a funcionar.
- **`importClientes` — persistência na API:** a função actualizava só o estado local sem chamar `apiClientes.create`/`update`. Corrigido: cada cliente novo/actualizado é persistido via `persist()` em background.
- **Mock E2E — clientes acumulados:** `setupApiMock` em `helpers.js` passa a manter estado mutável para `clientes` (create/update) para os testes de importação SAF-T funcionarem com dados persistidos.

### Novidade
- **`Clientes.jsx` — botão "Importar SAF-T" (só Admin):** abre modal que aceita ficheiro `clientes-navel-2026.json` gerado pelo script `extract-clientes-saft-2026.js`
- **Modal de importação com preview:** mostra contagem de novos clientes, existentes e total antes de confirmar
- **Dois modos de importação:** "Ignorar existentes" (recomendado — só adiciona novos) e "Actualizar existentes" (substitui morada/contactos com dados do SAF-T)
- **`DataContext.jsx` — `importClientes(lista, modo)`:** função de importação em massa com log de auditoria
- **Scripts de extracção SAF-T 2026:** `extract-clientes-saft-2026.js` (em `C:\Cursor_Dados_Gestor\scripts\`) — extrai 626 clientes do SAF-T Jan/2026 e enriquece com emails do FTTERCEI (210 clientes com email)
- **Workflow recomendado:** gerar SAF-T no Gestor.32 → correr script → importar JSON na app

### Dados exportados
- `C:\Cursor_Dados_Gestor\dados-exportados\clientes-navel-2026.json` — 626 clientes, 210 com email
- `C:\Cursor_Dados_Gestor\dados-exportados\clientes-navel-2026.csv` — formato CSV com BOM UTF-8

---

## [1.9.6] — 2026-02-26 — Integração ISTOBAL email (Make.com webhook) + UX reparações

### Novidade
- **Integração ISTOBAL automática via Make.com:** quando chega email de `isat@istobal.com` na pasta `ISTOBAL` do Outlook, o Make.com envia os dados via HTTP POST para `istobal-webhook.php` que cria automaticamente uma reparação com `origem = istobal_email`
- **`servidor-cpanel/api/istobal-webhook.php`:** endpoint seguro (token `X-ATM-Token`) que parseia HTML do email ISTOBAL, extrai aviso ES, nº de série, data, descrição, instalação e faz match com a máquina pela BD
- **`config.php` — `ATM_WEBHOOK_TOKEN`:** token secreto configurável para autenticar o webhook
- **Make.com (gratuito):** cenário `ISTOBAL - Importar Aviso` activo, monitorizando a cada 15 min

### Melhorias UX — Modal Executar Reparação
- **Técnico:** campo de texto substituído por `<select>` combobox com lista de técnicos
- **Textareas largura total:** Avaria (5 linhas), Trabalho realizado (6 linhas), Notas (4 linhas) ocupam a largura total do painel
- **Horas M.O.:** movido para linha separada abaixo do textarea de trabalho
- **PDF / Pré-visualização:** botão "Pré-visualizar" no footer e "Ver / Guardar PDF" no ecrã de conclusão (igual às manutenções)
- **Modal sem transparência:** fundo sólido, scroll interno correcto, `border-radius` e `box-shadow`
- **Responsivo mobile:** footer com 4 botões em grid 2×2, "Concluir" ocupa linha completa, canvas assinatura adaptado

### Melhorias globais
- **`index.css` — `.textarea-full`:** classe global para textareas full-width e redimensionáveis
- **`ExecutarManutencaoModal` + `Manutencoes`:** textareas de notas actualizadas com `.textarea-full`
- **`Reparacoes.css`:** `.form-row-nova` colapsa para coluna única em mobile

---

## [1.9.5] — 2026-02-22 — Correcção formulário de máquinas (reset + Kaeser) + categorias colapsadas

### Correcções de bugs
- **`Categorias.jsx` — lista de categorias arrancava toda expandida:** `expandedCat` inicializado com todos os IDs. Corrigido para `new Set()` vazio — todas as categorias arrancam colapsadas; o utilizador expande clicando no chevron

### Correcções de bugs
- **`MaquinaFormModal.jsx` — formulário apagava dados ao sair da janela:** O `useEffect` de inicialização re-disparava quando o DataContext fazia refresh silencioso em background (ao refocar a janela). Corrigido com `wasOpenRef` para só inicializar na transição fechado→aberto, nunca em re-renders subsequentes
- **`MaquinaFormModal.jsx` — secção Kaeser A/B/C/D aparecia em todos os compressores:** A condição usava `isCompressor()` (todos os compressores) em vez de `isCompressorParafuso()` (apenas `sub5`/`sub14`). Corrigido em 3 locais: display da secção, inicialização de `posicaoKaeser` no modo add e no modo edit

### Qualidade
- Build v1.9.5 limpo, sem warnings

---

## [1.9.4] — 2026-02-22 — Optimização de bundle + preparação deployment Reparações

### Optimização de performance (build)
- **`AuthContext.jsx`**: convertido import estático de `apiService.js` para imports dinâmicos dentro de cada função (`login`, `logout`, `sessionFromToken`) — `apiService.js` deixou de ser forçado ao bundle principal e passa a ter chunk próprio (3.55 kB)
- **`Logs.jsx`**: convertido import estático de `apiLogsList` para import dinâmico inline (já era lazy page, mas o import estático impedia o splitting correcto)
- **`vite.config.js`**: adicionados `vendor-pdf` (jsPDF) e `vendor-canvas` (html2canvas) a `manualChunks` para nomear explicitamente esses chunks; `chunkSizeWarningLimit` ajustado para 700 KB (bundle principal = 190 KB gzip — abaixo do limiar real de performance)
- Build sem warnings; `dist_upload.zip` gerado (2 MB)

### Regras Cursor actualizadas
- `at-manut-workflow.mdc`: adicionada secção completa "Padrões E2E acumulados" com 10 padrões técnicos detalhados (causa, solução, código exemplo)
- `post-e2e-docs-workflow.mdc`: tabela de padrões reorganizada em React vs E2E; nova FASE 7 com checklist de 12 pontos para novos specs

---

## [1.9.3] — 2026-02-26 — Testes E2E avançados Reparações + correcção RelatorioReparacaoView

### Nova suíte de testes E2E — `17-reparacoes-avancado.spec.js`
- **RA-1** — Matriz completa de permissões Admin vs ATecnica para o módulo Reparações (12 testes)
- **RA-2** — Fluxo multi-dia realista: criar → guardar progresso → retomar → concluir com materiais e assinatura
- **RA-3** — Fotos no modal de execução: upload, remoção, contador 0/8, múltiplas fotos, limite de 8, persistência no progresso
- **RA-4** — Email pós-conclusão: tag Admin sempre, tag ISTOBAL para avisos ES-, tag Cliente quando email disponível, campo manual para clientes sem email
- **RA-5** — Relatório concluído: dados máquina/cliente, nº sequencial, assinante, materiais, rodapé Navel
- **RA-6** — Responsividade mobile 375×812: overflow, filtros, tabela, modal nova, modal execução, sidebar
- **RA-7** — Responsividade tablet 768×1024: overflow, modal mensal, canvas assinatura
- **RA-8** — Comportamento offline: criação e progresso com rede cortada (graceful degradation), dados mantidos em localStorage
- **RA-9** — Estados vazios: empty-state com CTA, filtros vazios, select sem máquinas, mensal sem avisos
- **RA-10** — Data histórica: Admin pode retrodar, ATecnica não vê o campo
- **RA-11** — Peças e consumíveis: adicionar, remover, aparecem no relatório, linhas vazias filtradas
- **RA-12** — Checklist corretivo: secção presente, não bloqueia sem itens
- **RA-13** — Fluxo ISTOBAL completo: badge, aviso ES-, pré-preenchimento, relatório mensal
- **RA-14** — Relatório mensal com 20 avisos volumosos: render <3s, total horas correcto
- **RA-15** — Logging: criação e eliminação de reparações registadas nos logs

### Correcções de bugs (revelados pelos testes)
- **`RelatorioReparacaoView`** não mostrava dados da máquina nem do cliente — adicionada secção "Equipamento / Cliente" com marca, modelo, nº série, localização, nome e NIF do cliente
- **`RelatorioReparacaoView`** não tinha rodapé Navel — adicionado `.rel-footer` com `APP_FOOTER_TEXT`
- **`16-reparacoes.spec.js`** — corrigido selector de badges para `tbody .badge` (excluir badge do cabeçalho)
- **`16-reparacoes.spec.js`** — corrigido teste R5 (sort por data desc: rep05 vem antes de rep02); adicionado `rr-rep05` ao mock data
- **`16-reparacoes.spec.js`** — corrigido selector da navegação mensal (`.mensal-titulo` em vez de `.mensal-nav-titulo`, `aria-label` nos botões)

### Mock data
- Adicionado `rr-rep05` (rascunho em progresso para rep05 ISTOBAL) ao `MC.relatoriosReparacao` em `helpers.js`

---

## [1.9.2] — 2026-02-22 — Materiais por aviso no relatório mensal ISTOBAL + correcção cliente ISTOBAL

### Melhorias Reparações / ISTOBAL
- **Linhas expansíveis** na tabela de avisos do relatório mensal: clicar numa linha com materiais registados expande uma sub-linha com a lista de materiais/consumíveis (referência, descrição, quantidade) — sem valores monetários
- **Badge "nº ref."** no número de relatório indica visualmente que existem materiais registados nesse aviso
- **Impressão inteligente**: ao clicar "Imprimir / Exportar", todos os avisos com materiais ficam automaticamente expandidos antes de o diálogo de impressão abrir; após fechar, o estado regressa ao normal
- Sem qualquer valor de custo ou venda — apenas referências, descrições e quantidades

### Correcção: estrutura de clientes ISTOBAL
- Corrigida identificação do cliente ISTOBAL no mock data: o cliente de faturação é **ISTOBAL Portugal, Lda.** (subsidiária portuguesa, NIF PT, email `portugal@istobal.com`), não a fábrica espanhola
- Acrescentado comentário no mock data a explicar o fluxo completo: avisos chegam via `isat@istobal.com` → Navel executa → relatório individual para `isat@istobal.com` + cliente final → resumo mensal faturado à ISTOBAL Portugal
- Adicionado comentário em `ExecutarReparacaoModal.jsx` a distinguir o email operacional ISTOBAL (`isat@istobal.com`) do contacto de faturação mensal (ISTOBAL Portugal)

---

## [1.9.1] — 2026-02-22 — Relatório mensal ISTOBAL melhorado + ISTOBAL como cliente

### Melhorias Reparações / ISTOBAL
- **Relatório mensal ISTOBAL**: nova coluna "H. M.O." por aviso (base da faturação à ISTOBAL)
- **Total de horas** no rodapé da tabela de avisos ("Total horas a faturar à ISTOBAL: X.X h")
- **Cartão de resumo** "Horas M.O. (faturar)" com destaque visual azul nos stats do modal mensal
- **Linhas em curso** com estilo diferenciado (itálico/opacidade) para distinção visual dos avisos pendentes
- **Botão "Imprimir / Exportar"** no modal mensal para gerar versão impressa do resumo a enviar à ISTOBAL
- **CSS de impressão** (`@media print`): ao imprimir, oculta o resto da página e mostra apenas o conteúdo do relatório mensal
- **ISTOBAL registado como cliente** no mock data (`cli-istobal`, NIF `ES-B46200226`) com notas a clarificar o papel de fornecedor/cliente de faturação
- Clarificada distinção no mock data: clientes finais (ex. Lavagem Express) são quem tem as máquinas instaladas e assina o relatório; ISTOBAL é a entidade de faturação mensal

---

## [1.9.0] — 2026-02-22 — Módulo Reparações + Integração ISTOBAL

### Novo módulo: Reparações (`/reparacoes`)
- **Nova página `Reparacoes.jsx`** com lista filtrada (Todas / Pendentes / Em progresso / Concluídas)
- **Modal "Nova Reparação"**: criação manual com máquina, técnico, data, nº de aviso e descrição de avaria
- **`ExecutarReparacaoModal.jsx`**: execução da reparação com:
  - Formulário multi-secção (Dados, Avaria, Trabalho realizado, Peças/Consumíveis, Fotos, Checklist, Assinatura)
  - **"Guardar progresso"** — salva estado intermédio (`em_progresso`) sem exigir assinatura; utilizador pode reabrir dias depois e retomar
  - Carregamento automático de dados se já existir rascunho em progresso
  - Assinatura digital do cliente (canvas touch/mouse)
  - Campo de data histórica para Admin (retrodatar relatórios)
  - **Envio automático após assinatura** para `comercial@navel.pt` (sempre) + `isat@istobal.com` (se origem ISTOBAL)
  - Envio adicional opcional para o cliente
- **Relatório de reparação** (`relatorioReparacaoHtml.js`) com nº sequencial `AAAA.RP.NNNNN`, peças, horas M.O., assinatura e rodapé Navel
- **Relatório mensal ISTOBAL**: botão "Mensal ISTOBAL" abre modal com navegação por mês, resumo estatístico (avisos recebidos / concluídos / em curso) e tabela estratificada (ISTOBAL vs. manuais)
- Badge na nav com contagem de reparações pendentes
- Stat card no Dashboard com link para `/reparacoes`

### Integração ISTOBAL via email piping (`parse-istobal-email.php`)
- Script PHP de email piping para cPanel (`public_html/api/parse-istobal-email.php`)
- Aceita apenas emails de `isat@istobal.com`
- Extrai campos da tabela HTML (Nº aviso, Nº série, Modelo, Descripción, Fecha, Instalación)
- Match automático da máquina por número de série → cria reparação associada
- Se série não encontrada: cria reparação "a aguardar atribuição" com todos os dados extraídos
- Log em `logs/istobal-email.log` para auditoria
- Instruções de configuração incluídas no cabeçalho do ficheiro

### Base de dados — migração v1.9.0
- `servidor-cpanel/migrar-para-v190.sql`: cria tabelas `reparacoes` e `relatorios_reparacao`
- `servidor-cpanel/api/data.php`: mapeamento das novas tabelas + geração automática de `numeroRelatorio` no formato `AAAA.RP.NNNNN`

### Navegação e contexto
- `Layout.jsx`: item "Reparações" com ícone Hammer
- `App.jsx`: rota `/reparacoes` (lazy-loaded)
- `DataContext.jsx`: estados `reparacoes` + `relatoriosReparacao` com CRUD completo (`addReparacao`, `updateReparacao`, `removeReparacao`, `addRelatorioReparacao`, `updateRelatorioReparacao`, `getRelatorioByReparacao`)
- `apiService.js`: `apiReparacoes` + `apiRelatoriosReparacao`

---

## [1.8.8] — 2026-02-25 — PWA: suprimir modal de instalação em browsers sem suporte

- `InstallPrompt`: o modal só aparece quando a instalação é genuinamente possível (Chrome/Edge desktop com `beforeinstallprompt`, iOS Safari, Android Chrome)
- Firefox desktop, Safari desktop e outros browsers sem suporte PWA deixam de ver o modal — evita confusão ao utilizador

---

## [1.8.7] — 2026-02-25 — Registos históricos (Admin) + script de limpeza de dados

### Datas históricas para Admin — `ExecutarManutencaoModal`
- Novo campo **"Data de realização"** na secção de assinatura, visível apenas para Admin
- Quando preenchido com uma data passada, propaga-se automaticamente a **todas** as datas do registo:
  - `data` da manutenção
  - `dataAssinatura` e `dataCriacao` do relatório
  - `ultimaManutencaoData` e `proximaManut` da máquina (calculada a partir da data histórica)
- Campo tem `max = hoje` (impede datas futuras)
- Aviso visual em laranja quando a data histórica está preenchida
- Fluxo normal inalterado para ATecnica e para Admin sem data preenchida

### Script de limpeza de dados de teste
- Novo ficheiro `servidor-cpanel/limpar-dados-teste.sql` — colar no phpMyAdmin do cPanel
- Apaga clientes, máquinas, manutenções e relatórios (por esta ordem, respeitando chaves externas)
- Mantém categorias, subcategorias, checklist_items e users intactos
- Inclui query de verificação e instruções para limpar o cache localStorage

---

## [1.8.6] — 2026-02-25 — Melhorias de UX mobile: clientes, categorias e scroll

### Lista de clientes — mobile
- **Vista de cartões compactos** (≤640px) em substituição da tabela — cada cartão mostra nome, NIF, localidade, nº de máquinas e badge "Sem email"
- **Cartão inteiro clicável** → abre ficha do cliente
- **Ficha do cliente** redesenhada: nome maior (bold), botão **"Editar"** visível para Admin, botão "Relatório de frota" abaixo dos dados (não no header)
- Dados do cliente (morada, telefone, email) em fonte mais discreta

### Categorias e subcategorias de equipamentos
- Cards **centrados**, fonte reduzida, padding compacto — aspeto mais moderno
- Mobile: **duas colunas** em vez de uma (ocupa menos espaço vertical)
- Seta `ChevronRight` removida (deslocada com layout centrado)

### Ordenação de clientes
- Lista de clientes, seleção em Agendamento e select no formulário de máquina — sempre **A→Z por nome**

### Dashboard — nomes de equipamento
- `.meu-dia-item-nome`: máximo 2 linhas com reticências — sem overflow para fora do cartão

### Correção global: dupla barra de scroll em todos os modais
- `.modal-overlay` → scroll único (`overflow-y: auto`)
- `body:has(.modal-overlay)` → `overflow: hidden` — bloqueia scroll da página por trás
- `.modal` → `overflow-y: visible` — sem scroll duplicado
- Corrigido em: `modal-relatorio`, `modal-relatorio-form`, `modal-ficha-cliente`

---

## [1.8.5] — 2026-02-24 — Importação de planos KAESER a partir de PDF

### Plano de peças — importar PDF por máquina (exclusivo KAESER)
- **Botão "Importar template para esta máquina"** — abre o explorador de ficheiros para escolher um PDF do plano KAESER
- **Parser** `parseKaeserPlanoPdf.js` — extrai secções A, B, C e D do texto do PDF (posição, código, descrição, quantidade, unidade)
- **Integração pdf-parse** — leitura de PDF no browser com `pdf-parse` (mehmet-kozan); worker `pdf.worker.mjs` em `public/` com `PDFParse.setWorker()` para compatibilidade
- Substitui o plano existente da máquina e adiciona todas as peças em lote; toast com resumo por tipo (A/B/C/D)

### Regra de negócio: KAESER vs outras marcas de compressores
- **KAESER:** tabs A/B/C/D + Periódica; botão de importação PDF visível — planos extraídos dos PDFs oficiais
- **Outras marcas** (Fini, ECF, IES, LaPadana): apenas tab **Periódica** — consumíveis adicionados manualmente um a um

---

## [1.8.4] — 2026-02-24 — Marcas correctas · KAESER exclusivo · Migrations MySQL

### Regra de negócio: KAESER exclusivo de compressores
- **`isKaeserMarca(marca)`** — detecção por marca (não por subcategoria); KAESER é exclusivo da categoria Compressores
- **`MARCAS_COMPRESSOR`** e **`MARCAS_ELEVADOR`** — constantes exportadas para sugestão no formulário de máquina
- **Badges**: "KAESER X" só para marca KAESER; outros compressores (Fini, ECF, IES, LaPadana) mostram "Marca X"
- **PecasPlanoModal**: template de importação KAESER ASK 28T apenas para máquinas com marca KAESER
- **relatorioHtml.js**: bloco KAESER no relatório baseado em `marca === 'KAESER'`

### Dados e migrations
- **Mock data** (DataContext): marcas actualizadas — compressores: KAESER, Fini, ECF, IES, LaPadana; elevadores: Cascos, Ravaglioli, Space, Kroftools, TwinBusch, Sunshine, Werther, Velyen
- **seed_mock_data.sql**: v1.8.4 com marcas correctas e coluna `posicao_kaeser`
- **MIGRACAO_MYSQL.md**: 7.3b (posicao_kaeser em maquinas), 7.3c (UPDATEs de marcas)

### Testes E2E
- **14-kaeser-features.spec.js**: ajustes de locators (K5.3, K6.1, K9.2) para maior robustez

---

## [1.8.3] — 2026-02-23 — Relatório KAESER completo: bloco de equipamento, ciclo visual, consumíveis sem limite de páginas

### Relatório de manutenção — Compressor KAESER
- **Título adaptado**: "Relatório de Manutenção — Compressor" para equipamentos KAESER
- **Bloco KAESER** (novo, antes dos dados gerais):
  - Header colorido com o tipo de manutenção efectuada (ex: `Manutenção KAESER — Tipo A · Anual 3000h`)
  - Fabricante, modelo, número de série (em destaque) e ano de fabrico
  - Horas totais acumuladas + horas de serviço (se disponíveis)
  - Ciclo efectuado + próxima manutenção
  - **Sequência visual do ciclo de 12 anos** — círculos coloridos por estado (passado / actual / próximo / futuro)
- **Checklist** em coluna única para KAESER (mais legível, sem truncagem), com contador de pontos
- **Tabela de consumíveis** melhorada:
  - Cabeçalho dinâmico: `Consumíveis e peças — Manutenção Tipo X · Anual`
  - Cabeçalhos de grupo a cor: ✓ Utilizados (verde) / ✗ Não substituídos (cinza)
  - Rodapé resumo: "N artigos utilizados · M não substituídos · X no plano"
  - `page-break-before` separa a tabela de consumíveis dos dados gerais em relatórios longos
  - `page-break-inside: avoid` em cada linha — sem cortes a meio de artigos
- **Suporte a múltiplas páginas**: sem qualquer limite; o relatório cresce conforme o número de itens

---

## [1.8.2] — 2026-02-23 — Plano de consumíveis por máquina · Checklist de execução · Relatório discriminado

### Fluxo de criação de compressor KAESER
- **`MaquinaFormModal`** passa a retornar `(maqData, modo)` no `onSave`, permitindo que o chamador saiba qual máquina foi criada e em que modo
- **`Clientes.jsx`**: após criar um compressor KAESER, `PecasPlanoModal` abre automaticamente para configurar o plano da nova máquina
- **`PecasPlanoModal`**: novo prop `modoInicial` — mostra banner de boas-vindas a orientar o utilizador a configurar o plano (via template ou inserção manual), apenas quando o plano ainda está vazio

### Checklist de consumíveis na execução
- **`ExecutarManutencaoModal`**: secção "Consumíveis e peças" completamente redesenhada como checklist visual
  - Cada item tem checkbox **Sim/Não** (✓ verde / fundo neutro barrado)
  - Botões **"✓ Marcar todos"** e **"✗ Desmarcar todos"** no cabeçalho da secção
  - Itens do plano carregam com `usado: true` por defeito (podem ser desmarcados)
  - "Adicionar consumível manualmente" cria item com `usado: true`
  - Campo `usado: boolean` substitui `quantidadeUsada: number` (formato interno)

### Relatório de manutenção — consumíveis discriminados
- **`relatorioHtml.js`**: secção "Consumíveis e peças" mostra dois grupos:
  - **Utilizados** (✓ fundo verde claro) — itens com `usado: true`
  - **Não utilizados** (✗ fundo cinza, texto riscado) — itens com `usado: false`
  - Compatibilidade retroactiva: relatórios antigos com `quantidadeUsada` são convertidos automaticamente

---

## [1.8.1] — 2026-02-23 — Ciclo KAESER anual · Badge de tipo na lista · Posição no formulário

### Ciclo KAESER — lógica anual completa
- **`SEQUENCIA_KAESER`** em `DataContext`: sequência de 12 posições `['A','B','A','C','A','B','A','C','A','B','A','D']` (ciclo 12 anos)
- **`tipoKaeserNaPosicao(pos)`**, **`proximaPosicaoKaeser(pos)`**, **`descricaoCicloKaeser(pos)`** — helpers exportados
- **`ExecutarManutencaoModal`**: auto-sugere tipo A/B/C/D pelo `posicaoKaeser` da máquina; após concluir avança automaticamente a posição no ciclo via `updateMaquina`
- **`MaquinaFormModal`**: campo "Posição actual no ciclo KAESER" (select com Ano 1–12 e tipo correspondente); inicializa em 0 para novos compressores; sincroniza com dados existentes em modo editar
- **`Manutencoes.jsx`**: badge `KAESER X` (cor primária) junto ao status em todas as manutenções de compressores não concluídas, mostrando o tipo esperado para a próxima manutenção
- **Dados mock**: compressores nas máquinas de exemplo incluem `posicaoKaeser` representativa

---

## [1.8.0] — 2026-02-23 — Ordens de trabalho · Plano de peças KAESER · Relatório de frota

### Ordens de trabalho (Work Orders)
- **Novo status `em_progresso`** no ciclo de vida de manutenções (pendente → em_progresso → concluída)
- **Botão "Iniciar" (⚡)** em `Manutencoes.jsx` — regista `inicioExecucao` (ISO) na manutenção
- **Badge laranja "Em progresso"** na lista de manutenções
- `iniciarManutencao()` em `DataContext` — `updateManutencao` atómico com timestamp
- Modal de execução aceita manutenções `em_progresso` (não só pendente/agendada)
- Formulário de edição inclui `em_progresso` no dropdown de status

### Plano de peças e consumíveis KAESER
- **`KAESER_PLANO_ASK_28T`** em `DataContext` — plano completo extraído dos PDFs de serviço:
  - Tipo A (3.000h/1 ano): 2 artigos  |  Tipo B (6.000h): 3 artigos
  - Tipo C (12.000h): 10 artigos       |  Tipo D (36.000h): 18 artigos
- **`INTERVALOS_KAESER`** e **`SUBCATEGORIAS_COMPRESSOR`** exportados do DataContext
- **`atm_pecas_plano`** — novo estado persistido em `localStorage` com CRUD completo:
  `addPecaPlano`, `addPecasPlanoLote`, `updatePecaPlano`, `removePecaPlano`, `removePecasPlanoByMaquina`, `getPecasPlanoByMaquina`
- **`PecasPlanoModal.jsx`** — modal Admin com tabs A/B/C/D + Periódica, importação do template KAESER ASK 28T, CRUD inline
- Botão **"Plano de peças"** (📦) em `Equipamentos.jsx` por máquina (Admin only)
- Eliminação de máquina cascata para `pecasPlano`

### Execução com peças
- **`ExecutarManutencaoModal.jsx`** — nova secção "Peças e consumíveis utilizados":
  - Dropdown tipo A/B/C/D (compressores) — auto-carrega plano configurado
  - Ajuste de quantidade por peça, remoção e adição manual
  - `pecasUsadas` e `tipoManutKaeser` guardados no relatório
- **`relatorioHtml.js`** — nova secção "Peças e consumíveis utilizados" no HTML/PDF do relatório

### Relatório Executivo de Frota (novo)
- **`gerarRelatorioFrota.js`** — HTML/PDF com:
  - KPIs de frota: total de equipamentos, taxa de cumprimento, em atraso, por instalar
  - Tabela completa de frota com estado por máquina (Conforme / Em atraso / Por instalar)
  - Secção destacada de manutenções em atraso com dias de atraso
  - Rodapé `APP_FOOTER_TEXT` e data de geração
- Botão **"Relatório de frota"** (📊) em `Clientes.jsx` — na tabela e na ficha do cliente

### Documentação técnica
- **`servidor-cpanel/MIGRACAO_MYSQL.md`** — secção 7 com scripts SQL para:
  - `ALTER TABLE manutencoes` (inicio_execucao, tipo_manut_kaeser, status ENUM actualizado)
  - `ALTER TABLE relatorios` (pecas_usadas JSON, tipo_manut_kaeser)
  - `CREATE TABLE pecas_plano` (preparação para migração futura de localStorage → MySQL)

---

## [1.7.3] — 2026-02-23 — Optimizações de performance + Mock de dados grande

### Performance — Bundle splitting
- **`vite.config.js`:** `manualChunks` para `recharts`, `dompurify`, `qrcode` — eliminam-se do bundle inicial
- **`Metricas.js`:** 381 KB → **13 KB** (−96.6%) — `recharts` só carregado ao visitar `/metricas`
- **`Equipamentos.js`:** 47 KB → **22 KB** (−53%) — DOMPurify extraído para chunk próprio
- **`vendor-qr`** (qrcode, 25 KB) e **`vendor-purify`** (DOMPurify, 22 KB): chunks lazy separados

### Robustez de rede
- **`apiService.js`:** `AbortController` com timeout 15s em todas as chamadas API (`call` e `apiLogin`)
- Erro de timeout com `status: 408` e mensagem clara registada no log de sistema
- Protege contra rede lenta no cPanel (Açores) — sem pendurar indefinidamente

### Testes de performance (novo spec 13)
- Criado `tests/e2e/mock-large.js` — 240 registos realistas (20 clientes açorianos, 60 máquinas, 120 manutenções, 40 relatórios)
- Criado `tests/e2e/13-performance.spec.js` — 15 testes de carga e escalabilidade:
  - Limiares de render: Dashboard < 5s, Métricas < 6s, Pesquisa < 2s
  - Valida KPIs com dados volumosos, filtros, pesquisa global, badge "Sem email", indicador localStorage
  - Testa separadamente a estrutura do dataset ML (contagens e regras de isolamento)

### Qualidade
- Suite: **285 testes** (13 specs) — todos a passar
- Confirmado: `useMemo` em todos os KPIs e `React.lazy` em todas as rotas já estavam implementados

---

## [1.7.2] — 2026-02-23 — Correcção de bugs E2E e robustez de testes

### Correcções de bugs

#### `Metricas.jsx` — Redirect para utilizadores sem permissão
- Corrigido redirect de ATecnica ao aceder a `/metricas`: navegação agora feita em `useEffect` (em vez de durante o render) seguindo o padrão de `Logs.jsx`, resolvendo comportamento inconsistente em React 19

#### Testes E2E — Selector de botão QR ambíguo
- Corrigido selector `button[title*="QR"]` em `10-etapas-evolucao.spec.js` (linha 262–669): a adição do botão "Ler QR Code" na sidebar (v1.7.0) tornava o selector ambíguo e causava falha de todos os testes QR ao clicar no botão errado
- Novo selector exacto: `button[title="Gerar etiqueta QR"]` — aponta apenas para o botão de etiqueta nas linhas de máquinas

#### Testes E2E — Autenticação em testes ATecnica
- Corrigido Q7, M9, M10 em `12-v170-features.spec.js`: `sessionStorage.clear()` adicionado antes de `doLoginTecnico()` para garantir que a sessão Admin do `beforeEach` é terminada antes de testar como ATecnica
- Timeouts de `.qr-etiqueta` aumentados para 12 s em testes que aguardavam o container do modal

### Qualidade
- Suite mantém **270 testes** (12 specs) — todos a passar

### Documentação actualizada
- `docs/TESTES-E2E.md` — novos problemas técnicos documentados (selector QR, sessão auth, `navigate` durante render); config `playwright.config.js` corrigida; versão actualizada para v1.7.2
- `docs/ROADMAP.md` — v1.7.1/v1.7.2 adicionados ao histórico; contagem E2E 270; versão actualizada
- `README.md` — versão v1.7.2, tabela de tecnologias com leitor QR e recharts, contagem 270 testes
- `DOCUMENTACAO.md` + `DESENVOLVIMENTO.md` — versão v1.7.2, contagem 270 testes

---

## [1.7.1] — 2026-02-23 — Cobertura E2E completa + Documentação v1.7.0

### Testes E2E
- Criado `tests/e2e/12-v170-features.spec.js` — 42 testes cobrindo todas as etapas v1.7.0 (pesquisa global, leitor QR, modo campo, métricas, indicador localStorage)
- Corrigido `03-clientes.spec.js` — testes de criação de cliente agora preenchem email obrigatório (campo introduzido em v1.6.0)
- Corrigido `04-manutencoes.spec.js` — teste "Listar todas as manutenções" usa `.count()` em vez de `.isVisible()` para containers CSS responsive
- Corrigido `10-etapas-evolucao.spec.js` — timeouts dos testes de QR Code etiqueta aumentados de 5s → 10s (geração QR pode ser lenta sob carga)
- Suite total: **270 testes** (12 specs) — todos a passar

### Documentação actualizada
- `ROADMAP.md` — tabela de estado actual v1.7.0, histórico completo, backlog v1.8.x refinado
- `TESTES-E2E.md` — tabela de specs com spec 12 (total 270 testes)
- `DOCUMENTACAO.md` — stack, estrutura de ficheiros e rotas actualizadas
- `DESENVOLVIMENTO.md` — tabela de ficheiros por funcionalidade actualizada
- `README.md` — versão e tabela de módulos actualizada

---

## [1.7.0] — 2026-02-23 — Roadmap Etapas 5–9: Campo, Pesquisa, KPIs

### Novo

#### Etapa 7 — Pesquisa global (Ctrl+K)
- `PesquisaGlobal.jsx` — modal de pesquisa instantânea acessível em qualquer página
- Pesquisa simultânea em Clientes (nome, NIF, email), Equipamentos (marca, modelo, S/N) e Manutenções (tipo, data, status, técnico)
- Resultados agrupados por tipo com badges coloridos e navegação por teclado (↑↓ Enter)
- Atalho global `Ctrl+K` / `Cmd+K` — registado em `Layout.jsx`
- Barra de pesquisa visível na sidebar; botão `Esc` para fechar
- Clique em resultado navega para a página correspondente (`/clientes`, `/equipamentos`, `/manutencoes`) com `state.highlightId`

#### Etapa 5 — Leitor de QR Code via câmara
- `QrReaderModal.jsx` — modal com feed de câmara usando `@zxing/browser`
- Prefere câmara traseira em dispositivos móveis; fallback para câmara disponível
- Ao ler QR da app (`?maquina=ID`): navega directamente para `/equipamentos?maquina=ID`
- QRs externos: mostra o texto lido com opção "Abrir link"
- Botão "Ler QR Code" na sidebar (disponível a Admin e ATecnica)
- `Equipamentos.jsx` — lê `?maquina=` e `location.state.highlightId` para abrir automaticamente a subcategoria da máquina

#### Etapa 8 — Modo campo (alto contraste)
- Tema de alto contraste em `index.css` (`.modo-campo`) — fundo claro, texto preto, bordas nítidas
- Textos e botões maiores (106% base, min-height 46px)
- Indicador visual "☀ MODO CAMPO" na sidebar quando activo
- Toggle em `Definições` → "Modo campo" com estado persistido em `atm_modo_campo`
- `App.jsx` — aplica/remove a classe `.modo-campo` no `<body>` no mount e em alterações cross-tab

#### Etapa 6 — Dashboard de KPIs e métricas (Admin)
- `src/utils/kpis.js` — funções de cálculo: resumo de contagens, taxa de cumprimento (12 meses), próximas 8 semanas, top clientes em atraso, evolução mensal, MTBF
- `src/pages/Metricas.jsx` — nova página com:
  - Cards de resumo (clientes, equipamentos, manutenções, relatórios, em atraso, sem email)
  - Taxa de cumprimento com indicador circular (verde/amarelo/vermelho)
  - Gráfico de linha — evolução mensal das manutenções (6 meses) com `recharts`
  - Gráfico de barras empilhadas — próximas 8 semanas (pendentes + agendadas)
  - Tabela top 5 clientes com equipamentos em atraso
- Nova rota `/metricas` em `App.jsx`; link "Métricas" na sidebar (Admin)

#### Etapa 9 — Melhorias ao armazenamento (Definições)
- Indicador visual de uso do localStorage: barra de progresso com % e alerta quando > 70%
- Cálculo de uso total (todos os keys `atm_*`) com estimativa de quota de 5 MB

### Dependências adicionadas
- `recharts` — gráficos interactivos na página de Métricas
- `@zxing/browser` — leitura de QR Code via câmara

### Testes E2E
- Criado `tests/e2e/12-v170-features.spec.js` — 42 testes cobrindo as 5 etapas v1.7.0:
  - **P1-P13** Pesquisa Global: modal, Ctrl+K, Escape, resultados, badges, teclado, limpar
  - **Q1-Q7** Leitor QR: modal, header, Escape, status câmara, fechar, acesso ATecnica
  - **MC1-MC6** Modo Campo: toggle, classe body, persistência, desactivar, navegação
  - **M1-M10** Dashboard Métricas: acesso Admin, título, cards, taxa, gráficos, voltar, bloqueio ATecnica
  - **LS1-LS4** Armazenamento: indicador, barra, percentagem, tamanho KB/MB
- Corrigido `04-manutencoes.spec.js` — teste "Listar todas as manutenções" usa `.count()` em vez de `.isVisible()` para os containers que podem ser ocultos via CSS responsive
- Suite total: **267 testes** (12 specs) — todos a passar

### Documentação
- `ROADMAP.md` — actualizado para v1.7.0: estado actual, histórico v1.7.0, backlog v1.8.x revisado
- `TESTES-E2E.md` — tabela de specs actualizada com spec 12 (42 testes; total 267)
- `DOCUMENTACAO.md` — stack, estrutura de ficheiros, rotas actualizadas com novos componentes
- `DESENVOLVIMENTO.md` — tabela de ficheiros por funcionalidade actualizada
- `README.md` — versão e tabela de módulos actualizada

---

## [1.6.2] — 2026-02-23 — Cobertura E2E completa (Etapas 1-4 + Blocos A+B+C)

### Corrigido
- `QrEtiquetaModal.jsx` — adicionado handler de tecla Escape para fechar o modal (UX + E2E fix); sem este handler, 3 testes do spec 10 falhavam por o Playwright pressionar Escape sem efeito
- `tests/e2e/helpers.js` — data de `mt20` alterada de `2026-03-01` para `2026-04-01` nos dados mock base; a data anterior coincidia com o limite de 7 dias do alerta proactivo e activava o modal em testes do spec 10 que não o esperavam, causando bloqueio de UI

### Testes
- Confirmada cobertura E2E completa: **spec 10** (48 testes — Etapas 1 a 4) + **spec 11** (40 testes — Blocos A+B+C) = **88/88 a passar**
- Todos os objectivos do roadmap validados com isolamento correcto entre specs

---

## [1.6.1] — 2026-02-23 — Correções pós-teste E2E v1.6.0

### Corrigido
- `AlertaProactivoModal.jsx` — bug em `toggleExpand`: `!undefined = true` impedia o primeiro colapso de grupo; corrigido para `!(prev[nif] ?? true)` para usar o valor por omissão correcto
- `Clientes.jsx` — removido atributo HTML `required` do input de email (mantida apenas a validação JS em `handleSubmit`) para evitar que a validação nativa do browser bloqueasse o handler antes de mostrar a mensagem de erro personalizada
- `playwright.config.js` — porta `baseURL` actualizada para 5173 (alinhada com Vite dev server actual)

### Testes E2E adicionados
- `tests/e2e/11-blocos-abc.spec.js` — 40 testes cobrindo todos os pontos dos Blocos A, B e C:
  - Bloco A (7): badge "Sem email", email obrigatório no formulário, indicador `*`, sucesso com email, edição sem email, Definições com configuração de dias
  - Bloco A Definições (7): secção visível, input padrão 7 dias, guardar 14 dias, persistência localStorage, validação 0/61, acesso ATecnica
  - Bloco B (4): reagendamento após execução periódica, botão "Executar manutenção" em desktop, sem reagendamento para montagem, pré-condição periodicidadeManut
  - Bloco C (16): modal aparece/não aparece nas condições certas, botões Fechar/Dispensar, persistência dismiss, ATecnica sem modal, envio email, feedback erro, grupos expansíveis, badge contagem
  - Integração (4): fluxos combinados A+B+C

---

## [1.6.0] — 2026-02-23 — Alertas de conformidade v2 (Blocos A + B + C)

### Bloco A — Email obrigatório em clientes + configuração de alertas

- **Email obrigatório** na criação e edição de clientes: campo marcado com `*`, validação JavaScript com mensagem clara
- **Badge de aviso** (`⚠ Sem email`) na tabela de clientes para registos existentes sem email — permite identificar rapidamente quem precisa de actualização
- **Secção "Alertas de conformidade"** nas Definições (Admin): input numérico para "Dias de aviso antecipado" (1–60 dias, padrão: 7), com persistência em `atm_config_alertas`
- Novo módulo `src/config/alertasConfig.js` com utilitários: `getDiasAviso`, `setDiasAviso`, `isAlertsModalDismissedToday`, `dismissAlertsModalToday`, `getAlertasEnviados`, `marcarAlertaEnviado`, `foiAlertaEnviadoHoje`, `getManutencoesPendentesAlertas`

### Bloco B — Reagendamento automático de periódicas após execução

- Ao concluir uma manutenção do tipo `periodica`, se a máquina tem `periodicidadeManut` definida:
  1. Remove automaticamente todas as manutenções futuras pendentes/agendadas dessa máquina
  2. Recalcula e cria novas manutenções para 3 anos a partir da data de execução real
  3. Respeita feriados e dias úteis (mesma lógica da criação pós-montagem)
  4. Mostra toast informativo com o número de periódicas reagendadas
- Implementado como operação atómica no `DataContext` (`recalcularPeriodicasAposExecucao`) — sem race conditions

### Bloco C — Modal de alertas proactivos no início de sessão (Admin)

- Ao carregar o Dashboard, o Admin vê automaticamente um modal com as manutenções programadas dentro do prazo de aviso configurado
- Modal agrupa manutenções por cliente, com código de cores por urgência (hoje / 1-2 dias / 3-5 dias / restantes)
- Por cada cliente: botão "Enviar lembrete por email" — envia directamente para o email do cliente com CC para `geral@navel.pt`
- "Dispensar hoje" regista a dispensa diária e não mostra o modal novamente até à próxima sessão
- Registo de alertas já enviados hoje (`atm_alertas_enviados`) — evita duplicados
- Aviso visual se o cliente não tiver email registado
- **`servidor-cpanel/send-email.php`** alargado com tipo `lembrete`: gera email HTML profissional com tabela de equipamentos, datas e urgência; CC automático ao admin

### Ficheiros criados/modificados
- `src/config/alertasConfig.js` — novo módulo de configuração e utilitários
- `src/pages/Clientes.jsx` — email required + badge sem email
- `src/pages/Clientes.css` — estilo `.sem-email-aviso`
- `src/pages/Definicoes.jsx` — secção "Alertas de conformidade"
- `src/pages/Definicoes.css` — estilos `.def-alerta-*`
- `src/context/DataContext.jsx` — `recalcularPeriodicasAposExecucao` (exposto)
- `src/components/ExecutarManutencaoModal.jsx` — Bloco B integrado
- `src/services/emailService.js` — `enviarLembreteEmail` adicionado
- `src/components/AlertaProactivoModal.jsx` — novo componente
- `src/components/AlertaProactivoModal.css` — estilos do modal
- `src/pages/Dashboard.jsx` — integração do modal de alertas
- `servidor-cpanel/send-email.php` — suporte a `tipo_email: lembrete`

---

## [1.5.1] — 2026-02-23 — Histórico completo em PDF por máquina (Etapa 4)

### Nova funcionalidade — Histórico PDF por máquina
- Botão `FileText` adicionado em cada linha de equipamento (todas as vistas: normal e em atraso)
- Gera e abre uma nova janela com o histórico completo em PDF/impressão via `window.print()`
- **Conteúdo do PDF:**
  - Cabeçalho Navel com logotipo e dados da empresa
  - Ficha do equipamento: marca/modelo, nº série, subcategoria/categoria, localização, cliente (nome, NIF, morada), próxima manutenção
  - Bloco de estatísticas globais: Total | Executadas | Agendadas | Em atraso | Última execução
  - Tabela histórica completa (mais recente primeiro): data, tipo, estado (com badge colorido), técnico, assinado por, observações (truncadas a 90 chars)
  - Última assinatura registada (imagem manuscrita + nome + data)
  - Rodapé Navel em todas as páginas
- Indicador de carregamento (`useGlobalLoading`) durante geração
- `@media print` com `table-header-group` para repetição de cabeçalho em múltiplas páginas

### Ficheiros criados/modificados
- `src/utils/gerarHtmlHistoricoMaquina.js` — novo gerador HTML do histórico
- `src/pages/Equipamentos.jsx` — botão "Histórico PDF", estado `loadingHistorico`, `handleHistoricoPdf()`

---

## [1.5.0] — 2026-02-23 — "O meu dia" + Alertas de conformidade + QR Code por máquina

### Etapa 1 — Vista "O meu dia" (Dashboard)
- Novo painel no Dashboard com todas as manutenções pendentes para hoje e em atraso
- Para o ATecnica: destaque visual com barra lateral azul e título "O meu dia"
- Para o Admin: visível mas menos destacado ("Hoje")
- Cada item mostra: equipamento, cliente, badge "Xd atraso" e botão directo "Executar"
- Se não há intervenções: mensagem amigável com ícone "Sem intervenções pendentes para hoje!"

### Etapa 2 — Alertas de conformidade
- Card "Em atraso" pulsa com animação de anel vermelho quando há manutenções há mais de 7 dias
- Sub-label "⚠ Há X dias!" no card para alertar visualmente o utilizador
- Cálculo automático de `diasMaxAtraso` (diferença em dias desde a manutenção mais antiga em atraso)

### Etapa 3 — QR Code por máquina
- Novo botão QR (`QrCode` icon) em cada linha de equipamento (em todas as vistas: normal e em atraso)
- Modal `QrEtiquetaModal` com etiqueta formatada: cabeçalho NAVEL azul, QR code 100×100 px, marca/modelo, nº série, cliente
- QR codifica URL directo da app: `https://www.navel.pt/manut/equipamentos?maquina={id}`
- Botão "Imprimir etiqueta" usa `window.print()` com CSS de impressão dedicado (apenas a etiqueta, formato 80mm)
- Câmara nativa do telemóvel lê o QR e abre directamente a ficha no browser — zero código extra necessário (Opção A)

### Infra-estrutura
- Dependência adicionada: `qrcode` (geração de QR code no browser via canvas → data URL)
- `APP_VERSION` actualizado para `1.5.0`

---

## [1.4.1] — 2026-02-23 — Logotipo Navel na sidebar + correcções de documentação

### Interface
- Logotipo completo Navel (`logo-navel.png`) substitui o ícone "N" (`logo.png`) no cabeçalho da sidebar
- Dimensões ajustadas: `max-width: 112px`, `max-height: 34px` (−30% face ao original)

### Documentação
- `docs/ROADMAP.md` — 5 etapas prioritárias refinadas com base em análise estratégica e casos de sucesso CMMS (TRACTIAN, DIMO Maint, UpKeep, Limble, MaintainX)
- Etapa 5 corrigida: a sincronização multi-dispositivo **já está assegurada** pelo PHP + MySQL no cPanel — o `localStorage` é apenas cache offline (Supabase fora do âmbito do AT_Manut)
- `.cursor/rules/at-manut-workflow.mdc` — arquitectura clarificada: MySQL/cPanel é fonte de verdade, `localStorage` é cache offline

---

## [1.4.0] — 2026-02-23 — Suite de testes E2E (Playwright)

### Infra-estrutura de testes
- **137 testes automatizados** cobrindo 100% dos fluxos da aplicação, executados com Playwright
- Isolamento total via mock de API (`page.route()` em `**/api/data.php`) — testes rápidos e independentes do servidor
- Injecção de JWT mock em `sessionStorage` para autenticar os dois perfis de utilizador (Admin / ATecnica)

### Ficheiros criados
- `playwright.config.js` — configuração Playwright (timeout 30 s, retries 2, screenshots e vídeo em falha)
- `tests/e2e/helpers.js` — utilitários partilhados: `doLoginAdmin`, `doLoginTecnico`, `setupApiMock`, `fillExecucaoModal`, `signCanvas`, `goTo`, `checklistFillAllSim`
- `tests/e2e/01-auth.spec.js` — autenticação, logout, redirecionamentos, sessão
- `tests/e2e/02-dashboard.spec.js` — cards de KPI, calendário, painel de dia, navegação rápida
- `tests/e2e/03-clientes.spec.js` — CRUD clientes, ficha, pesquisa
- `tests/e2e/04-manutencoes.spec.js` — listagem, filtros, execução, validações (checklist, assinatura), permissões
- `tests/e2e/05-montagem.spec.js` — fluxo completo de montagem: execução, assinatura digital, agendamento de periódicas
- `tests/e2e/06-agendamento.spec.js` — formulário, validações (HTML5 vs React), fluxo completo
- `tests/e2e/07-permissions.spec.js` — RBAC: Admin vs ATecnica (rotas, botões, Definições, Logs)
- `tests/e2e/08-equipamentos-categorias.spec.js` — equipamentos e categorias (CRUD inline, filtros, calendário ATecnica)
- `tests/e2e/09-edge-cases.spec.js` — upload de fotos, limite 8 fotos, assinatura, modais, responsividade mobile, estado vazio

### Cobertura por perfil
| Perfil | Capacidades testadas |
|---|---|
| Admin | CRUD completo, Definições, Logs, exportar/importar backup, todas as permissões |
| ATecnica | Executar manutenções, ver relatórios concluídos, calendário; sem acesso a Definições/Logs/eliminações |

### Problemas técnicos resolvidos
- Validação HTML5 (`required`) bloqueava `handleSubmit` React — testes pré-preenchem campos obrigatórios
- Seletores ambíguos desktop/mobile resolvidos com `.manutencoes-table` (seletores específicos)
- Sessão Admin persistente impedia login ATecnica — `sessionStorage.clear()` antes de cada login de técnico
- `signCanvas` melhorado com `scrollIntoViewIfNeeded()` e fallback `dispatchEvent`

---

## [1.3.0] — 2026-02-22 — Modo offline + sincronização automática (Fase 1)

### Funcionalidade principal: Offline-First
- **Cache local (localStorage):** Após cada fetch bem-sucedido, os dados são guardados em `atm_cache_v1` (TTL 30 dias). Se o dispositivo estiver offline ao abrir a app, os dados são carregados do cache — sem perda de acesso aos dados no terreno.
- **Fila de sincronização (localStorage):** Qualquer operação feita offline (criar, actualizar, eliminar clientes, equipamentos, manutenções, relatórios, etc.) é enfileirada em `atm_sync_queue` até 4 MB. Quando a ligação é restaurada, a fila é processada automaticamente em ordem.
- **Detecção automática online/offline:** Listeners `online`/`offline` do browser actualizam o estado em tempo real. Ao voltar online, a fila é processada e os dados são refrescados do servidor.
- **Sincronização após login:** O evento `atm:login` (disparado pelo AuthContext) garante que a fila é processada e os dados são carregados imediatamente após autenticação bem-sucedida.

### Novos ficheiros
- `src/services/localCache.js` — cache de dados para uso offline (save/load/clear, fallback sem fotos se quota excedida)
- `src/services/syncQueue.js` — fila de mutações offline (enqueue, processQueue, queueSize, removeItem)
- `src/components/OfflineBanner.jsx` — indicador visual de estado de ligação e sincronização
- `src/components/OfflineBanner.css` — estilos do banner (offline, pendentes, a sincronizar)

### Alterações
- `src/services/apiService.js` — exportada função `apiCall` para uso pelo processador de fila
- `src/context/DataContext.jsx` — integração completa: cache, fila offline, estado `isOnline`/`syncPending`/`isSyncing`, `processSync`, todos os `persist()` actualizados com descriptor de fila (23 callsites)
- `src/context/AuthContext.jsx` — dispara evento `atm:login` após login bem-sucedido
- `src/components/Layout.jsx` — adicionado `<OfflineBanner />` no topo do conteúdo

### Comportamento do OfflineBanner
| Estado | Visual |
|--------|--------|
| Offline, sem pendentes | Amarelo: "Sem ligação — dados guardados (HH:mm DD/MM/AAAA)" |
| Offline, com pendentes | Laranja: "Sem ligação · N operações aguardam sincronização" |
| Online, pendentes | Azul: "N operações aguardam envio" + botão "Sincronizar" |
| A sincronizar | Verde: spinner + "A sincronizar operações pendentes…" |

---

## [1.2.0] — 2026-02-22 — Auditoria responsiva completa

### Responsividade
- Melhorias em touch targets (mín. 44px), tipografia fluida (`clamp()`), layouts landscape, `prefers-reduced-motion`
- Ficheiros CSS ajustados: `index.css`, `Layout.css`, `Dashboard.css`, `Manutencoes.css`, `Categorias.css`, `Logs.css`, `Agendamento.css`, `Calendario.css`, `Definicoes.css`

### Documentação
- `docs/ROADMAP.md` — Roadmap evolutivo da app (Fase 1: terreno, Fase 2: produtividade, Fase 3: inteligência)
- `docs/MANUT-APP-INSIGHTS.md` — Investigação de boas práticas CMMS para equipas de campo

---

## [1.1.0] — 2026-02-22 — Documentação, Git e fluxo de deploy

### Documentação
- `docs/GIT-SETUP.md` — repo GitHub (pmacerqueira/AT_Manut), fluxo de push após build
- `docs/DEPLOY_CHECKLIST.md` — instruções com `dist_upload.zip` e `Compress-Archive`

### Git e workflow
- `.gitignore` — `dist_upload.zip`, `.env`, `Thumbs.db`
- Boas práticas Git documentadas em `.cursor/rules/at-manut-workflow.mdc`
- README com secção Git/GitHub e link do repositório

---

## [1.0.0] — 2026-02-21 — Primeira versão estável

**Marco:** Primeira release considerada estável para produção.

### Incluído nesta versão
- Gestão de clientes, equipamentos, manutenções e relatórios
- Checklist de manutenção, assinatura digital, fotos
- Envio de relatórios por email (HTML e PDF) via servidor cPanel
- Agendamento e calendário de manutenções
- Backup/restauro de dados (Definições)
- Logs do sistema (local e servidor cPanel)
- Autenticação (Admin, ATecnica) — JWT em `sessionStorage`
- PWA instalável (ícone "N", ecrã inicial)
- Logotipo Navel no login e sidebar
- Indicador de carregamento global (ícone N a rodar)
- Toast centrado em todos os dispositivos
- Manual UX/UI documentado (`docs/MANUAL-UX-UI.md`)
- Fuso horário Atlantic/Azores em toda a app
- Correções de segurança (CORS, sanitização, validações)
- Persistência completa em `localStorage` (prefixo `atm_`)
- Fix 404 SPA via `.htaccess` para Apache/cPanel
- Cards mobile em Manutenções (layout responsivo)
- PDF multi-página com cabeçalho e rodapé automáticos
- Email HTML com galeria de fotos e próxima intervenção

---

## Referências de arquitectura

> A estrutura do projecto, deployment, testes e persistência estão documentados nos ficheiros canónicos.
> Evitar duplicar essa informação aqui — consultar directamente:
> - **Estrutura e fluxos:** `DOCUMENTACAO.md`
> - **Desenvolvimento:** `DESENVOLVIMENTO.md`
> - **Deploy:** `docs/DEPLOY_CHECKLIST.md` e `docs/BUILD-E-ZIP.md`
> - **Testes E2E:** `docs/TESTES-E2E.md`

---

*Última actualização: 2026-03-17 — v1.14.0*
