# Memória — segredo de email, relatórios e logs (AT_Manut)

**Para quê serve:** a app e o servidor usam **um único segredo** para enviar emails (`send-email.php`), relatórios HTML (`send-report.php`), e para o browser enviar logs (`log-receiver.php`). O cron por **URL** também usa o mesmo valor na query `?token=`.

**Nome técnico:** `ATM_REPORT_AUTH_TOKEN` no PHP; no PC, para construir a app: `VITE_ATM_REPORT_AUTH_TOKEN` (fica dentro do JavaScript após `npm run build`).

**Regra de ouro:** esse valor **não** está no GitHub. Vive só no **servidor** e no teu **`.env.local`** (ou variáveis do cPanel).

---

## O que foi desenhado para ser simples

1. **No teu PC** (pasta `AT_Manut`), corre **uma vez** (ou quando quiseres rodar o segredo):

   ```powershell
   cd c:\Cursor_Projetos\NAVEL\AT_Manut
   npm run gen:report-auth
   ```

   Isto cria dois ficheiros **só na tua máquina** (estão no `.gitignore`, não sobem para o Git):

   - `servidor-cpanel/api/atm_report_auth.secret.php` — leva este ficheiro para o servidor.
   - `.env.local` — passa a ter a linha `VITE_ATM_REPORT_AUTH_TOKEN=...` para o build da app.

2. **No servidor** (`public_html/api/`), o PHP lê o segredo por esta ordem (actualizada 2026-04-24 — ver **[`CPANEL-RUNBOOK-SEGREDOS.md`](CPANEL-RUNBOOK-SEGREDOS.md)**):

   - Bloco `# BEGIN ATM_ENV` no **`.htaccess`** da pasta `api/` (directivas `RewriteRule ^ - [E=ATM_REPORT_AUTH_TOKEN:…]`), gerado pelo script `cpanel-migrate-setenv.mjs` em `navel-site/scripts/`, **ou**
   - **`atm_report_auth.secret.php`** (ficheiro dedicado que o comando `gen:report-auth` acima gera — **recomendado para quem não quer mexer no `.htaccess`**), **ou**
   - `config.deploy-secrets.php` (**legado** — arquivado em produção como `config.deploy-secrets.php.disabled-TS`; só reactivar em rollback de emergência).

   O painel do cPanel em *Environment Variables* **não** é uma opção neste plano — o LiteSpeed + LSPHP ignora essas variáveis (ticket CiberConceito #225838). O Apache/LiteSpeed está configurado para **não permitir** abrir pelo browser ficheiros como `config.deploy-secrets.php*`, `atm_report_auth.secret.php` e `.htaccess.bak-*` (bloco `FilesMatch` no `.htaccess` da pasta `api/`).

3. **Publicar a app** (PWA em `manut/`):

   ```powershell
   cd c:\Cursor_Projetos\NAVEL\AT_Manut
   npm run build
   cd c:\Cursor_Projetos\NAVEL\navel-site
   npm run deploy:at-manut -- --yes
   ```

   Sem o passo `gen:report-auth` antes do build, a app **não** envia email (token vazio).

---

## Enviar ficheiros PHP para o cPanel (repo `navel-site`)

Credenciais: ficheiro **`.env.cpanel`** dentro de `navel-site` (não vai para o Git). Testar ligação:

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
npm run deploy:probe
```

Exemplo — enviar **só** o ficheiro de segredo (ajusta o caminho se a tua pasta for outra):

```powershell
npm run deploy:file -- --file="c:/Cursor_Projetos/NAVEL/AT_Manut/servidor-cpanel/api/atm_report_auth.secret.php" --remote="/home/navel/public_html/api" --yes
```

O valor de `--remote` tem de acabar na pasta **`api`** onde está o `send-email.php`. O prefixo `/home/.../public_html` aparece no teu `.env.cpanel` como `CPANEL_REMOTE_ROOT`.

---

## Teste rápido depois de tudo instalado

Com **POST** (não abrir só no browser como GET): se o segredo **não** estiver definido, a API responde **503** com `code: misconfigured`. Quando está bem, um POST sem token correcto deve dar **403**, não 503.

---

## Horário ATecnica (login que “entra e sai” logo)

Se o técnico **faz login** mas volta ao ecrã de login em **1–2 segundos** e o **admin** entra bem, quase sempre o **`TecnicoHorarioGuard`** no browser está com `enabled: true` em `src/config/tecnicoHorarioRestrito.js` enquanto no **servidor** o ficheiro `tecnico_horario_restrito.json` **não** está activo. Alinha os dois (ou deixa `enabled: false` no JS enquanto o JSON no servidor não tiver `"enabled": true`). Ver `servidor-cpanel/INSTRUCOES_CPANEL.md` → secção horário restrito.

**Política por defeito no código (quando o horário está activo no servidor e no JS):** dias úteis **08:00–18:00** em linguagem corrente (no JSON o bloco nocturno termina às **07:59** por causa da comparação inclusiva no PHP — ver `INSTRUCOES_CPANEL.md`); fuso **Atlantic/Açores**; **sábado e domingo** sem acesso. Toast no login quando `TECNICO_HORARIO_RESTRITO`.

## Documentação relacionada

- [`CPANEL-RUNBOOK-SEGREDOS.md`](CPANEL-RUNBOOK-SEGREDOS.md) — runbook técnico de todos os segredos `ATM_*` (BD, JWT, tokens) no servidor LiteSpeed.
- [`DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md) — deploy completo.
- [`INDEX.md`](INDEX.md) — índice de toda a documentação.
- `servidor-cpanel/INSTRUCOES_CPANEL.md` — email, limites POST, sandbox em localhost.

---

*Última actualização do fluxo “ficheiro secret + gen:report-auth”: ver `CHANGELOG.md`.*
