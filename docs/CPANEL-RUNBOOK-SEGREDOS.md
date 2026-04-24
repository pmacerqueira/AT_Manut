# Runbook — Segredos da API AT_Manut no cPanel (LiteSpeed)

> **Fonte canónica:** este ficheiro. Referenciado por `docs/DEPLOY_CHECKLIST.md`,
> `docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md`, `docs/SEGURANCA-REVISAO-NAVEL-PT.md`,
> `servidor-cpanel/INSTRUCOES_CPANEL.md` e `.cursor/rules/at-manut-workflow.mdc`.
> Um tema = uma fonte (ver `docs/INDEX.md`).

## TL;DR — para quem não é programador

- Os segredos da API (password da BD, `JWT_SECRET`, tokens) vivem **no servidor**,
  dentro de um ficheiro `.htaccess` em `/home/navel/public_html/api/`.
- **Não** estão no Git. **Não** estão no painel do cPanel como "Environment
  Variables" (neste plano isso não funciona). **Não** estão mais em
  `config.deploy-secrets.php` activo — esse ficheiro foi arquivado.
- Para **rodar** um segredo (mudar password, trocar `JWT_SECRET`, etc.),
  corre-se um script a partir do repo `navel-site` que trata de tudo
  automaticamente, com backup e rollback.

## 1. Contexto técnico — porquê esta arquitectura

| Ponto | Detalhe |
|---|---|
| Alojamento | cPanel (CiberConceito, ticket #225838) |
| Servidor HTTP | **LiteSpeed** (não Apache "puro") |
| PHP | **LSPHP 8.1** com SAPI `litespeed` |
| `mod_env` | **Não carregado** → `SetEnv` é ignorado silenciosamente |
| `mod_rewrite` | Activo → `RewriteRule ^ - [E=KEY:VALUE]` funciona e é fiável |
| `SetEnvIf` | Activo mas **envolve** o valor em aspas literais → inviável para passwords com aspas/chavetas |

A descoberta foi feita em produção em 2026-04-24 com probes PHP. A
recomendação original da CiberConceito (`SetEnv` + `getenv()`) está correcta
no geral mas **não aplicável** a este plano específico. A solução adoptada
(`RewriteRule [E=...]`) preserva a filosofia "segredos em .htaccess, código
lê com `getenv()`" sem alterar o `config.php` da API.

## 2. Arquitectura actual em produção

```
/home/navel/public_html/api/
├── .htaccess                            ← gerado pelo script; contém:
│                                          • bloco # BEGIN ATM_ENV com
│                                            RewriteRule [E=ATM_*:...]
│                                          • bloco FilesMatch (defesa)
├── .htaccess.bak-YYYYMMDD-HHMMSS        ← backup automático (manter)
├── config.php                           ← lê tudo via atm_env() (getenv,
│                                          $_ENV, $_SERVER, REDIRECT_*)
├── config.deploy-secrets.php.disabled-… ← fallback LEGADO arquivado
│                                          (bloqueado pelo FilesMatch)
└── atm_report_auth.secret.php           ← mecanismo separado para
                                           ATM_REPORT_AUTH_TOKEN
```

**Bloqueado por `FilesMatch` (HTTP 403):**
`test-*.php`, `teste-*.php`, `clear-cache.php`, `ingest-istobal-retro.php`,
`config.deploy-secrets.php(.disabled-*)`, `atm_report_auth.secret.php`,
`.htaccess.bak-*`.

**No repositório AT_Manut:** `servidor-cpanel/api/.htaccess` contém **apenas**
o bloco `FilesMatch` + cabeçalho de documentação. O bloco `# BEGIN ATM_ENV`
nunca é versionado — é gerado a partir dos valores reais no servidor.

## 3. Scripts (no repo `navel-site/scripts/`)

| Script | Função |
|---|---|
| `cpanel-migrate-setenv.mjs` | Lê segredos do servidor (do `config.deploy-secrets.php` actual ou de uma versão `.disabled-TS`). Gera `.htaccess` canónico com `RewriteRule [E=ATM_*:...]` para cada variável. Faz backup `.htaccess.bak-TS` e publica. |
| `cpanel-verify-setenv.mjs` | Atomically renomeia o fallback para `.test-disabled-TS`, faz smoke-test HTTPS ao `/api/data.php`. Só arquiva definitivamente se respostas forem 401 esperadas — em qualquer 5xx faz rollback automático. |
| `cpanel-rollback-htaccess.mjs` | Repõe o `.htaccess` à versão do repo (só `FilesMatch`). Usar **apenas** em emergência e **antes** reactivar o `config.deploy-secrets.php` renomeando `.disabled-TS` de volta. |
| `cpanel-audit-crosssite.mjs` | Auditoria `.htaccess` (raiz + `/api/`) + smoke-tests HTTPS aos endpoints de AT_Manut e navel-site. Usar depois de qualquer alteração. |

Todos exigem `.env.cpanel` em `navel-site/` (SFTP na porta 11022). Todos
têm `--dry` por defeito e aceitam `--yes` para aplicar.

## 4. Fluxos operacionais

### 4.1. Rodar uma password / token (caso mais comum)

**Exemplo — rodar `ATM_DB_PASS` após incidente:**

1. Abrir phpMyAdmin do cPanel, alterar a password do utilizador MySQL.
2. **Reactivar o fallback temporariamente** (SFTP / File Manager): renomear
   `config.deploy-secrets.php.disabled-TS` → `config.deploy-secrets.php`.
3. Editar o valor de `ATM_DB_PASS` dentro desse ficheiro PHP (linha
   `putenv('ATM_DB_PASS=…')`).
4. Regenerar o `.htaccess` + rearquivar o fallback:

   ```powershell
   cd c:\Cursor_Projetos\NAVEL\navel-site
   node scripts/cpanel-migrate-setenv.mjs --yes --remove-fallback
   ```

   O script lê o valor novo, actualiza o `.htaccess` (com backup) e
   volta a renomear o fallback para `.disabled-TS`.
5. Validar:

   ```powershell
   node scripts/cpanel-verify-setenv.mjs --yes
   node scripts/cpanel-audit-crosssite.mjs
   ```

**Alternativa sem ficheiro PHP intermédio:** editar directamente o bloco
`# BEGIN ATM_ENV` em `/home/navel/public_html/api/.htaccess` via File
Manager do cPanel — é texto simples. Mas o script é preferível porque gera
backup, valida sintaxe e faz escape correcto de caracteres especiais.

### 4.2. Adicionar nova variável `ATM_*`

1. No repo, alterar `servidor-cpanel/api/config.php` para ler a nova var
   via `atm_env('ATM_NOVA_VAR')`.
2. No servidor, reactivar `config.deploy-secrets.php` (ou editar o
   `.disabled-TS` e renomear) e adicionar a linha `putenv('ATM_NOVA_VAR=…');`.
3. Correr `cpanel-migrate-setenv.mjs --yes --remove-fallback` para
   regenerar `.htaccess` incluindo a nova variável.

### 4.3. Deploy do `config.php` com alterações ao parsing de env vars

Usar o fluxo normal (scripts do `navel-site`):

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
node scripts/cpanel-deploy.mjs --file="c:/Cursor_Projetos/NAVEL/AT_Manut/servidor-cpanel/api/config.php" --remote="/home/navel/public_html/api" --yes
```

Depois correr a auditoria para confirmar que nada partiu.

### 4.4. Rollback de emergência

**Cenário:** depois de regenerar o `.htaccess`, a API começa a dar 5xx
ou 503 `misconfigured`.

1. `cpanel-verify-setenv.mjs` já faz rollback automático se detectar
   durante a validação. Se isto acontecer, não há nada a fazer — o estado
   anterior é restaurado.
2. Se o problema só aparece depois (teste manual), duas opções:

   **(a) Restaurar o .htaccess anterior** (mais rápido):
   ```powershell
   # Renomear no servidor o backup para nome activo:
   # /api/.htaccess.bak-YYYYMMDD-HHMMSS → /api/.htaccess
   ```
   Via File Manager do cPanel ou SFTP (qualquer cliente).

   **(b) Reverter para o fallback `config.deploy-secrets.php`:**
   ```powershell
   cd c:\Cursor_Projetos\NAVEL\navel-site
   node scripts/cpanel-rollback-htaccess.mjs --yes
   # depois, no servidor, renomear:
   # /api/config.deploy-secrets.php.disabled-TS → /api/config.deploy-secrets.php
   ```

Depois do rollback, diagnosticar. O ponto mais provável: alguma variável
com caractere inesperado que o `RewriteRule [E=…]` não conseguiu escapar.
Ver secção de troubleshooting.

## 5. Variáveis esperadas (referência)

Lista canónica em `servidor-cpanel/api/config.php` (procurar `atm_env`).
Resumo:

| Variável | Quem usa | Notas |
|---|---|---|
| `ATM_DB_HOST` | `config.php` → MySQL | Normalmente `localhost` |
| `ATM_DB_USER` | idem | Utilizador MySQL |
| `ATM_DB_PASS` | idem | **Sensível** — pode ter `'"+{}~` |
| `ATM_DB_NAME` | idem | Nome da BD |
| `ATM_JWT_SECRET` | `data.php`, `auth/login` | **Sensível**, ≥ 32 chars |
| `ATM_TAXONOMY_TOKEN` | `taxonomy-nodes.php` | **Igual** ao `taxonomy_auth_token` do navel-site `documentos-api-config.php` |
| `ATM_REPORT_AUTH_TOKEN` | `send-email/report/log-receiver` | Tem mecanismo paralelo em `atm_report_auth.secret.php` |
| `ATM_NAVEL_DOC_INTEGRATION_TOKEN` | `navel-doc-lib.php` | **Igual** ao `at_integration_bearer` do navel-site |
| `ATM_NAVEL_DOCUMENTOS_API_URL` | idem | Opcional (default deduzido) |
| `ATM_ISTOBAL_WEBHOOK_TOKEN` | `istobal-webhook.php` | **Sensível** |
| `ATM_DEV_SANDBOX_EMAIL` | `send-email.php` | Opcional |
| `ATM_TECNICO_HORARIO_DISABLED` | `tecnico_horario_restrito.php` | `1` para desactivar em emergência |
| `ATM_TECNICO_HORARIO_JSON` | idem | Caminho alternativo do JSON |

## 6. Troubleshooting

### Sintoma: API devolve 503 `misconfigured`

- `config.php` não conseguiu ler uma var obrigatória.
- Verificar no servidor se o bloco `# BEGIN ATM_ENV` do `.htaccess` inclui
  `ATM_DB_*` e `ATM_JWT_SECRET`.
- Correr probe:
  ```powershell
  cd c:\Cursor_Projetos\NAVEL\navel-site
  node scripts/cpanel-verify-setenv.mjs   # dry-run; só diagnostica
  ```

### Sintoma: login com 401 "Utilizador ou password incorretos" mesmo com password correcta

- `ATM_DB_PASS` chegou ao PHP com caracteres mal escapados.
- Reverter para backup do `.htaccess` (ver 4.4.a) e inspeccionar o
  diff do bloco gerado vs. o valor original.
- O migrador já escapa `'` e `"`; reportar se descobrires um caso novo.

### Sintoma: taxonomia do navel-site falha (área reservada não lista pastas)

- `ATM_TAXONOMY_TOKEN` dessincronizado de `documentos-api-config.php`
  (raiz `public_html/`) do navel-site. Os dois **têm** de ser iguais.
- Confirmar ambos no servidor via SFTP ou File Manager.

### Sintoma: upload de biblioteca a partir do AT_Manut dá 401 no documentos-api.php

- `ATM_NAVEL_DOC_INTEGRATION_TOKEN` ≠ `at_integration_bearer` do
  `documentos-api-config.php`. Alinhar ambos.

### Sintoma: ficheiros "esquecidos" no servidor

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
node scripts/cpanel-audit-crosssite.mjs
```

Mostra listagem de `/api/` com todos os `.bak-*` e `.disabled-*`. **Não
apagar** os `.bak-*` recentes nem o `.disabled-*` mais recente — servem
de rede de segurança.

## 7. Relação com o `navel-site` (área reservada)

A migração é **isolada** à pasta `/api/`. A área reservada do navel-site
autentica via Supabase (cliente JS) e chama `/documentos-api.php` na raiz
`public_html/` — que tem a sua própria configuração em
`documentos-api-config.php` (também na raiz). **Nada disto** passa pelo
`.htaccess` da pasta `/api/`.

Pontos de interligação que passam pelo `/api/` (afectados pelo `.htaccess`
gerado, mas testados):

- `/api/taxonomy-nodes.php` — usado pelo `documentos-api.php` do navel-site.
- `/api/navel-documentos-upload.php` e `/api/navel-documentos-download.php`
  — usados pelo AT_Manut para ler/escrever na biblioteca NAVEL; internamente
  fazem HTTPS ao `/documentos-api.php` com o `ATM_NAVEL_DOC_INTEGRATION_TOKEN`.

Ver `navel-site/docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md` e
`navel-site/docs/CPANEL-SEGREDOS-ENV.md`.

## 8. Checklist anual (revisão de segurança)

- [ ] Rodar `ATM_DB_PASS` (phpMyAdmin → nova password → script de migração).
- [ ] Rodar `ATM_JWT_SECRET` (todos os técnicos têm de fazer login outra vez).
- [ ] Rodar `ATM_TAXONOMY_TOKEN` e `ATM_NAVEL_DOC_INTEGRATION_TOKEN`
      — **sincronizar no `documentos-api-config.php` do navel-site** no mesmo momento.
- [ ] Rodar `ATM_REPORT_AUTH_TOKEN` (`npm run gen:report-auth` no AT_Manut
      + rebuild + redeploy + colocar valor no fallback, regerar `.htaccess`).
- [ ] Apagar `.htaccess.bak-*` com mais de 60 dias (manter sempre pelo
      menos os 2 mais recentes).
- [ ] Correr `node scripts/cpanel-audit-crosssite.mjs` e arquivar output.

## 9. Histórico

| Data | Evento |
|---|---|
| 2026-04-22 | CiberConceito #225838 — recomenda `SetEnv` + `getenv()`. |
| 2026-04-24 | Descoberto que `mod_env` não está carregado neste plano (LiteSpeed + LSPHP). Migração para `RewriteRule [E=…]`. `config.deploy-secrets.php` arquivado. Esta arquitectura entra em produção. |

---

*Tema único e canónico — editar **aqui** em vez de duplicar.*
