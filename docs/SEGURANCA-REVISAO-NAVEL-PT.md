# Revisão de segurança — www.navel.pt (navel-site + AT_Manut)

**Data da revisão:** 2026-04-22  
**Tipo:** análise estática do código nos repositórios + verificação anterior do layout no servidor (SFTP) + `npm audit` nos frontends. **Não** substitui um teste de penetração profissional.

**Para quem não é programador:** abaixo, “**Crítico**” = tratar já; “**Alto**” = em pouco tempo; “**Médio**” = planear; “**Baixo**” ou “**Melhoria**” = quando houver calendário. “**Pontos fortes**” = onde o desenho já ajuda.

---

## Estado após correcções (código no Git — 2026-04-22)

| Item (revisão anterior) | O que foi feito no repositório |
|-------------------------|--------------------------------|
| Crítico — PHP de diagnóstico | Removidos `test-email.php`, `teste-webhook.php`, `clear-cache.php`, `teste-istobal-post.php`. Adicionado `servidor-cpanel/api/.htaccess` que nega HTTP a `test-*`, `teste-*`, `clear-cache.php` e `ingest-istobal-retro.php` (defesa se ficheiros antigos ainda existirem no servidor). |
| Crítico — segredos em `config.php` | Eliminados fallbacks de passwords/tokens no Git. Produção deve usar **Environment Variables**; em pedidos **HTTP**, falta de `ATM_JWT_SECRET`, credenciais BD, ou `ATM_TAXONOMY_TOKEN` devolve **503 JSON** `misconfigured`. Criado `config.local.php.example` + entrada no `.gitignore` para `config.local.php` (dev local). |
| Crítico — token de email / relatório / logs | **2026-04-22:** removidos defaults no Git para `ATM_REPORT_AUTH_TOKEN`. Endpoints `send-email.php`, `send-report.php`, `log-receiver.php` e cron **HTTP** usam `atm_report_auth.php`; PWA: `VITE_ATM_REPORT_AUTH_TOKEN` no build. |
| Crítico — `ingest-istobal-retro.php` na web | Garantia **CLI-only** no PHP (`403` se não for `php-cli`). |
| Alto — `image-proxy.php` / SSRF | Validação de host (só IPs públicos após DNS), recusa URLs com utilizador/password embutidos, `verify_peer` TLS activo, sem redirects HTTP automáticos (`follow_location` 0). |

**Deploy 2026-04-22 (executado):** enviados `config.php`, `image-proxy.php`, `.htaccess`, `ingest-istobal-retro.php`, `config.deploy-secrets.php` (só no servidor; bloqueado por HTTP); apagados `test-email.php` e `clear-cache.php` no remoto.

**2026-04-24 — Migração de segredos para o `.htaccess` (CiberConceito #225838).** Testámos **em produção** a recomendação original (`SetEnv`) e comprovámos via probe PHP que **mod_env não está carregado** neste plano (LiteSpeed + LSPHP 8.1 + SAPI `litespeed`): `SetEnv` é ignorado silenciosamente. Passámos a usar `RewriteRule ^ - [E=KEY:VALUE]` (mod_rewrite), que injecta os valores directamente em `$_SERVER` e `getenv()` — testado com SHA‑1 de cada variável inclusive a password da BD que tem `' " { } ~ +`. O `.htaccess` em produção é **gerado pelo script** `navel-site/scripts/cpanel-migrate-setenv.mjs` (nunca versionado; o ficheiro no repo contém só o bloco `FilesMatch` de defesa em profundidade e documenta esta arquitectura). O fallback legado `config.deploy-secrets.php` foi renomeado para `config.deploy-secrets.php.disabled-TS` (bloqueado pelo `FilesMatch`) — pronto para rollback se necessário. Confirmado que a API funciona apenas com o método `[E=...]` (login devolve 401 "Utilizador ou password incorretos" — ligação à BD e JWT operacionais).

---

## Resumo executivo

O conjunto **navel.pt** tem **boas bases**: autenticação JWT na API de manutenção, uso predominante de **SQL preparado** (menos risco de injeção SQL clássica), **papéis** admin vs técnico, webhook ISTOBAL com **token em header** e comparação segura (`hash_equals`), formulário de contacto com **rate limit** por IP, e política escrita de **alojamento partilhado** (`docs/CPIANEL-NAVEL-SHARED-HOSTING.md`).

Os **maiores riscos** encontrados nesta revisão são: (1) **scripts de diagnóstico PHP** na pasta `api/` se estiverem **acessíveis na Internet** — revelam detalhes internos; (2) **valores por omissão** em `config.php` no Git — em produção **tudo** deve vir de **variáveis de ambiente**; (3) o **proxy de imagens** (`image-proxy.php`) pode ser abusado para pedidos a **URLs internas** (SSRF) se não estiver filtrado; (4) dependências **npm** no AT_Manut com vulnerabilidades conhecidas (PDF / sanitização HTML).

---

## O que foi analisado

| Fonte | Conteúdo |
|-------|-----------|
| `navel-site/public/*.php` | Site institucional, documentos, OneDrive, contacto, Supabase keep-alive |
| `AT_Manut/servidor-cpanel/api/*.php` | API principal, webhooks, downloads, taxonomia, proxies |
| `npm audit` (só dependências de produção) | `navel-site` e `AT_Manut` |

---

## Achados por gravidade

### Crítico

1. **Scripts de teste / diagnóstico expostos em `https://…/api/`**  
   No código existem ficheiros como `test-email.php`, `teste-webhook.php`, `clear-cache.php`. O `test-email.php` **liga erros ao browser**, usa **CORS `*`**, pode mostrar **conteúdo de `.htaccess`**, caminhos no servidor e tentar ler **logs**. Isso é **informação útil a atacantes**.  
   **Recomendação:** no servidor, **apagar** estes ficheiros **ou** proteger com **regra no `.htaccess`** (só IPs internos / VPN) **ou** `Require valid-user` com password forte **só para admins**. Confirmar no File Manager do cPanel o que está realmente em `public_html/api/`.  
   *Nota:* `ingest-istobal-retro.php` é pensado para **linha de comandos**; se estiver só na pasta web, **não** deve ser invocável por URL sem proteção.

2. **`teste-istobal-post.php` contém um token de exemplo no próprio ficheiro**  
   Qualquer pessoa que consiga ler o código PHP no servidor (ou no Git) vê o token. **Não** deve existir em produção; o token real deve ser **só** em ambiente / config segura.

3. **Segredos por omissão em `servidor-cpanel/api/config.php` (repositório)**  
   Há fallbacks para base de dados, `JWT_SECRET`, tokens de webhook e taxonomia. **Se o servidor usar estes valores** e o repositório for ou tiver sido público, trata-se de **credenciais fracas ou comprometidas**.  
   **Recomendação:** em produção (LiteSpeed + LSPHP), definir todos os segredos via **`RewriteRule [E=KEY:VALUE]`** no `.htaccess` de `public_html/api/` — automatizado por `navel-site/scripts/cpanel-migrate-setenv.mjs` (ver [`CPANEL-RUNBOOK-SEGREDOS.md`](CPANEL-RUNBOOK-SEGREDOS.md)). No ficheiro em produção, **não** depender dos defaults do Git. Rodar **rotação** de passwords e tokens se alguma vez houve exposição.

### Alto

4. **`image-proxy.php` — risco SSRF (Server-Side Request Forgery)**  
   O script obtém uma URL passada pelo cliente e faz `file_get_contents`. Um atacante autenticado (ou em certos cenários CORS) poderia tentar apontar para **serviços internos** (metadados cloud, `localhost`, etc.). Além disso, `verify_peer` está desligado no SSL — pior para manipulação em trânsito.  
   **Recomendação:** permitir só **hosts na lista branca** (ex.: domínios CDN conhecidos), bloquear IPs privados e link-local, e idealmente reativar verificação TLS para destinos públicos.

5. **Conta admin comprometida**  
   Operações como `bulk_restore` apagam **toda** a tabela e repõem dados — é **correcto** estar só para admin, mas o impacto é total. Reforço: **password forte**, **2FA** se disponível no futuro, e **não** partilhar conta admin.

### Médio

6. **`npm audit` no AT_Manut** — `jspdf` (crítico na base de dados de vulnerabilidades) e `dompurify` (moderado). Afetam sobretudo **geração/visualização de PDF** e **HTML sanitizado** no browser.  
   **Recomendação:** `npm audit fix` (e testar a app), ou actualizar pacotes manualmente após ler os changelogs.

7. **Webhook ISTOBAL e tokens partilhados**  
   São **segredos longos**; se vazarem (email, log, backup), alguém pode **injectar** eventos. Manter token **só** em env, **rodar** se suspeita, e monitorizar `logs/istobal-email.log`.

8. **Login da API sem rate limit visível**  
   Risco de **força bruta** no `auth/login`. Mitigações típicas: limite por IP, captcha após falhas, ou bloqueio temporário (requer alteração no PHP).

9. **`onedrive-cron.php` e token em query string**  
   A documentação já avisa: token em **query** pode aparecer em **logs de acesso**. Preferir **header `X-Cron-Token`** ou **POST** conforme o servidor permitir.

### Baixo / melhorias

10. **`keep-alive-supabase.php?verbose=1`** — confirmar que não expõe dados sensíveis em texto claro em produção.  
11. **Logs (`error_log`, `atm_debug.log`)** — podem crescer e, em erro, **ocasionalmente** conter detalhes úteis a atacantes; rotação e revisão periódica.  
12. **Cabeçalhos de segurança HTTP** (CSP, HSTS, etc.) — avaliar no `.htaccess` / cPanel para a SPA e PHP.

---

## Pontos fortes (manter)

- **JWT** obrigatório para a maior parte da API; **roles** e regras após relatório **enviado ao cliente**.  
- **Lista branca** de recursos (`$RESOURCE_MAP`) — nomes de tabelas e colunas **não** vêm directamente do atacante.  
- **`istobal-webhook.php`:** só POST, token com `hash_equals`, filtro de remetente.  
- **`taxonomy-nodes.php`:** Bearer token, leitura só.  
- **`send-contact.php`:** POST apenas, sanitização, anti-injeção de headers, **rate limit** por IP.  
- **`navel-documentos-download.php`:** JWT + sanitização de caminho.  
- **navel-site (npm audit):** **0** vulnerabilidades reportadas nas dependências de produção (na data da análise).

---

## O que fazer a seguir (após as correcções no código)

| Prioridade | Acção | Notas |
|------------|--------|--------|
| **Imediato** | **Deploy** para `public_html/api/`: `config.php`, `image-proxy.php`, `.htaccess`, `ingest-istobal-retro.php` (substituir). | Usar o fluxo habitual (ex. `navel-site` `cpanel-deploy.mjs` por ficheiro). |
| **Imediato** | No **cPanel → File Manager → `public_html/api/`**, **apagar** se ainda existirem: `test-email.php`, `teste-webhook.php`, `clear-cache.php`, `teste-istobal-post.php`. | O `.htaccess` novo já bloqueia estes nomes, mas apagar remove código morto e confusão. |
| **Imediato** | **`.htaccess` com `RewriteRule [E=…]`** em `/home/navel/public_html/api/` garantir `ATM_DB_USER`, `ATM_DB_PASS`, `ATM_DB_NAME`, `ATM_JWT_SECRET` (≥32 caracteres), `ATM_TAXONOMY_TOKEN`, **`ATM_REPORT_AUTH_TOKEN`**. O painel cPanel → *Environment Variables* **não** funciona neste plano (LSPHP). Usar `navel-site/scripts/cpanel-migrate-setenv.mjs` — ver **[`CPANEL-RUNBOOK-SEGREDOS.md`](CPANEL-RUNBOOK-SEGREDOS.md)**. | Sem `ATM_REPORT_AUTH_TOKEN`, `send-email` / `send-report` / `log-receiver` e cron **HTTP** respondem **503** `misconfigured`. |
| **Imediato** | **Build AT_Manut:** definir **`VITE_ATM_REPORT_AUTH_TOKEN`** igual ao servidor (fica no bundle). | Ver `docs/DEPLOY_CHECKLIST.md` e `.env.example`. |
| **Curto prazo** | **Rodar** passwords BD / `JWT_SECRET` / tokens se os valores antigos estiveram no Git público ou partilhados. | Especialmente após esta alteração de `config.php`. |
| **Curto prazo** | **`npm audit` no AT_Manut** (`jspdf`, `dompurify`) e testar PDFs na app. | Médio na revisão original; ainda pendente. |
| **Médio prazo** | **Rate limit** no `auth/login` da API; **cron OneDrive** sem token na query string em logs. | Ver secção “Médio” nos achados abaixo. |
| **Opcional** | **Pentest** externo antes de grandes mudanças na Área Reservada. | Garantia independente. |

---

## Documentos relacionados

- `docs/CPIANEL-NAVEL-SHARED-HOSTING.md` — partilha de `public_html/` entre projectos.  
- `.cursor/rules/navel-workspace.mdc` (workspace NAVEL) — regra global de deploy e colisão de ficheiros.

---

*Este documento foi gerado no âmbito de uma revisão assistida por ferramentas; deve ser actualizado após correcções ou novos módulos.*
