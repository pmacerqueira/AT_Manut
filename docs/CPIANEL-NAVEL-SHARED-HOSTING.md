# Alojamento partilhado — navel-site + AT_Manut (www.navel.pt)

Documento **canónico** sobre o mesmo cPanel e o mesmo `public_html/`. Evita colisões de nomes e deploys que apaguem código da outra aplicação.

**Relacionado:** `docs/DEPLOY_CHECKLIST.md` · no repo `navel-site`: `DEPLOY.md`, `docs/DEPLOY-AUTOMATICO-CPANEL.md`, `docs/ARQUITETURA.md`.

---

## 1. Princípio

- **`public_html/` é um único namespace no servidor.** Cada caminho tem **um dono** (repositório / app).
- **Nunca** assumir que um ficheiro pode ser substituído por “o build do projecto X” sem confirmar **quem é o dono** desse caminho no servidor.
- **`replace` total** de um PHP de produção a partir de um repo **sem rever o outro projecto** é proibido na prática operacional: pode apagar integrações da app irmã.

---

## 2. Mapa de responsabilidades (produção típica)

| Caminho no servidor | Dono | Origem no Git | Notas |
|---------------------|------|---------------|--------|
| `public_html/index.html`, `assets/`, `.htaccess`, … | **navel-site** | `navel-site/dist/` | SPA institucional |
| `public_html/*.php` na **raiz** (ex. `send-contact.php`, `documentos-api.php`, `onedrive-*.php`) | **navel-site** | `navel-site/public/*.php` | `npm run deploy:php` envia **só** estes para a **raiz** de `CPANEL_REMOTE_ROOT` |
| `public_html/manut/**` | **AT_Manut** | `AT_Manut/dist/` | PWA — deploy SFTP: `navel-site` → `npm run deploy:at-manut -- --yes` |
| `public_html/api/**` | **AT_Manut** | `AT_Manut/servidor-cpanel/api/` | API REST (`data.php`, `db.php`, `config.php`, …) |
| `public_html/uploads/**` | **Partilhado** | — | Convenção por subpasta (ex. `machine-docs/`, `brand-logos/`); não sobrescrever pastas da outra app sem acordo |

---

## 3. Colisão de nomes — o que não fazer

- **Não** criar no **navel-site** um ficheiro em `public/` com o **mesmo nome** que já existe em **`servidor-cpanel/api/`** do AT_Manut **se** o deploy desse ficheiro for para o **mesmo caminho URL** (ex.: raiz vs `api/`).
- Hoje **não há** `data.php` no `navel-site/public/` — o **`data.php` de produção** é **só** o da pasta **`api/`** (AT_Manut).
- Antes de introduzir **qualquer** novo `*.php` na raiz do site ou em `api/`, verificar a tabela acima e o outro repositório.

---

## 4. `data.php` — uma ou duas aplicações?

**Estado actual (2026):** **`public_html/api/data.php`** é **exclusivo do AT_Manut** (CRUD MySQL, JWT, `r:` + `action:`). O site institucional **não** usa este ficheiro como entrypoint.

**Se no futuro ambas as apps precisarem de lógica no mesmo ficheiro:**

1. **Preferido:** manter **entrypoints separados** (ex. continuar com `api/data.php` só AT_Manut; no site, `documentos-api.php` ou outro nome **dedicado**). Menor risco, deploys independentes.
2. **Se existir um único `data.php` partilhado:** **proibido** “merge” por **replace** de um repo sobre o outro. Obrigatório:
   - alteração em **um** ramo/revisão que ambos os projectos validem;
   - **diff** explícito (PHP) e testes/regressão **das duas** superfícies (front AT_Manut + consumidores navel-site, se houver);
   - documentar no **mesmo** PR qual versão no servidor é canónica.
3. O pipeline `navel-site` **`deploy:php`** **não** envia ficheiros para `api/`; uploads pontuais para `api/` usam `--remote=…/api` com ficheiros **do repo AT_Manut** (ver `docs/DEPLOY-AUTOMATICO-CPANEL.md`).

---

## 5. Checklist antes de publicar PHP

- [ ] Este ficheiro é **meu** segundo o mapa da secção 2?
- [ ] O destino no servidor é **raiz** vs **`api/`** e corresponde ao **mesmo** projecto?
- [ ] Não estou a renomear nem a duplicar um nome já usado pela outra app no **mesmo** caminho?
- [ ] Se toquei em `data.php`: confirmei que só o **AT_Manut** é dono e que não há alteração pendente no **navel-site** que dependa de um homónimo?

---

## 6. Onde está isto replicado para agentes

- Workspace NAVEL: `.cursor/rules/navel-workspace.mdc` (regra global, sempre aplicada).
- Este ficheiro: detalhe e checklist.
