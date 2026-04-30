# Checklist de Deploy — AT_Manut

> Última revisão: 2026-04-30 — `v1.16.81`: Reparações/Manutenções UI + RA-8/`expectToast` E2E; suite Reparações 111 testes `--workers=1` verde; deploy PWA `navel-site` → `npm run deploy:at-manut -- --yes`.

## Resumo da verificação da base de dados

| Tabela | Conteúdo setup.sql | Seed mock | Referências |
|--------|-------------------|-----------|-------------|
| users | 2 (admin, ATecnica) | — | — |
| categorias | 4 | — | subcategorias.categoria_id |
| subcategorias | 16 | — | maquinas.subcategoria_id, checklist_items.subcategoria_id |
| checklist_items | ~150 | — | relatorios.checklist_respostas (chaves) |
| clientes | — | 10 | maquinas.cliente_id, maquinas.cliente_nif |
| maquinas | — | 23 | manutencoes.maquina_id, reparacoes.maquina_id |
| manutencoes | — | 28 | relatorios.manutencao_id |
| relatorios | — | 13 | — |
| reparacoes | — | — | relatorios_reparacao.reparacao_id |
| relatorios_reparacao | — | — | — |
| tecnicos | 3 (Aldevino, Carlos, Emanuel) | — | relatorios.tecnico, relatorios_reparacao.tecnico |

---

## Fluxo de dados e consistência

### Ordem de dependências (INSERT)
1. **clientes** → PK `id` (usamos `nif` como id para simplicidade)
2. **maquinas** → `cliente_id` = cliente.id, `cliente_nif` = cliente.nif
3. **manutencoes** → `maquina_id` deve existir em maquinas
4. **relatorios** → `manutencao_id` deve existir em manutencoes (UNIQUE: 1 relatório por manutenção)
5. **reparacoes** → `maquina_id` deve existir em maquinas
6. **relatorios_reparacao** → `reparacao_id` deve existir em reparacoes

### Mapeamento API ↔ BD
- **camelCase** (frontend) ↔ **snake_case** (MySQL): `clienteNif`↔`cliente_nif`, `periodicidadeManut`↔`periodicidade`, `maquinaId`↔`maquina_id`, etc.
- **JSON**: `checklist_respostas`, `fotos`, `documentos`, `pecas_usadas` — armazenados como JSON/TEXT
- **Reparações:** `status` = `pendente|em_progresso|concluida`; `origem` = `manual|istobal`

### Checklist items por subcategoria
- **sub1, sub2, sub4, sub12, sub13**: elevadores — checklists periódica + montagem (sub2, sub4, sub12)
- **sub5, sub6, sub10, sub11, sub14, sub15, sub16**: compressores
- **sub7**: geradores
- **sub8, sub9**: equipamentos de pneus

---

## Cenário A: Instalação nova (cPanel)

### 1. Base de dados
```sql
-- No phpMyAdmin ou MySQL:
SOURCE setup.sql;          -- Schema + users + categorias + subcategorias + checklist_items
SOURCE seed_mock_data.sql; -- 10 clientes, 23 máquinas, 28 manutenções, 13 relatórios
```

### 2. Configuração
- **Produção (validado 2026-04-24 via probe PHP ao servidor navel.pt):** os segredos são injectados no PHP via **`RewriteRule ^ - [E=KEY:VALUE]`** em **`public_html/api/.htaccess`**. Neste plano (LiteSpeed + LSPHP) o `mod_env` **não** está carregado, pelo que `SetEnv` é ignorado silenciosamente. O `config.php` lê via **`atm_env()`** (`getenv`, `$_ENV`, `$_SERVER`, `REDIRECT_*`).
- **Como actualizar em produção:** correr a partir de `navel-site/` o script `node scripts/cpanel-migrate-setenv.mjs` (dry-run; rever lista) e depois com `--yes` (aplica com backup `.htaccess.bak-TS` e publica **`config.cli-env.php`** para PHP CLI — pipe ISTOBAL). O script lê os valores do `config.deploy-secrets.php` activo ou do `.disabled-*` mais recente. Para validar HTTP sem o fallback PHP, correr `node scripts/cpanel-verify-setenv.mjs --yes` (desativa temporariamente o `config.deploy-secrets.php` se existir e faz rollback automático se algo falhar).
- **Fallback legado:** **`public_html/api/config.deploy-secrets.php`** (modelo `config.deploy-secrets.php.example`) — gitignored, **arquivado** após validação como `config.deploy-secrets.php.disabled-TS` (bloqueado por `FilesMatch`). Renomear de volta se for preciso rollback.
- Variáveis: `ATM_DB_*`, `ATM_JWT_SECRET`, `ATM_TAXONOMY_TOKEN`, `ATM_REPORT_AUTH_TOKEN`, etc. (lista completa no cabeçalho de `config.php`). O `ATM_REPORT_AUTH_TOKEN` tem também um mecanismo próprio (`atm_report_auth.secret.php`, já activo no servidor).
- **Biblioteca NAVEL (opcional):** `ATM_NAVEL_DOC_INTEGRATION_TOKEN` alinhado com `at_integration_bearer` no `documentos-api-config.php` do navel-site; opcional `ATM_NAVEL_DOCUMENTOS_API_URL`, `ATM_NAVEL_DOC_PROXY_MAX_RESPONSE_BYTES` (limite de resposta do proxy; omissão 12 MiB). Ver `navel-doc-lib.php` e `navel-site/docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`.
- Opcional dev local: `servidor-cpanel/api/config.local.php` (a partir de `config.local.php.example`).
- Recomendado: `SET GLOBAL max_allowed_packet = 67108864;` (64 MB para fotos em relatórios)

### 3. Credenciais de login
| Utilizador | Password    | Role    |
|------------|-------------|---------|
| Admin      | admin123%   | admin   |
| ATecnica   | tecnica123% | tecnico |

---

## Cenário B: Atualização de BD existente

Se a BD foi criada antes das migrações mais recentes:

1. `add_tipo_checklist.sql` — adiciona coluna `tipo` e índice
2. `add_sub2_checklists.sql` — checklists sub2
3. `add_sub4_checklists.sql` — checklists sub4
4. `add_sub12_checklists.sql` — checklists sub12
5. Scripts de migração para tabelas `reparacoes` e `relatorios_reparacao` (se não existirem no schema actual)
6. `add_tecnicos_table.sql` — tabela de técnicos (nome, telefone, assinatura digital)

**Nota:** O `setup.sql` atual já inclui tudo. Migrações só são necessárias para BDs antigas.

---

## WWW.NAVEL.PT — Mesmo cPanel que o site institucional (`navel-site`)

A app **AT_Manut** em produção e o **website NAVEL** (`navel-site`) partilham o **mesmo domínio** (`www.navel.pt` / `navel.pt`) e a **mesma conta cPanel** (ex. CiberConceito). A árvore típica em `public_html` é:

| Caminho no servidor | Origem no repositório | Conteúdo |
|---------------------|------------------------|----------|
| `public_html/` (raiz) | `navel-site` → `dist/` + `public/*.php` | Site institucional (SPA, formulários, documentos) |
| `public_html/manut/` | **AT_Manut** → `dist/` (SFTP) ou `dist_upload.zip` | PWA de manutenções e reparações |
| `public_html/api/` | **AT_Manut** → `servidor-cpanel/api/*.php` | API REST (`data.php`, `db.php`, `config.php`, …) |

- **URL da API** usada pelo AT_Manut: tipicamente `https://www.navel.pt/api` ou `https://navel.pt/api` (ver `VITE_API_BASE_URL` no build).
- **Integrações** entre as duas apps (taxonomia, biblioteca de documentos): ver no repo `navel-site` o ficheiro `docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`.

### Deploy automático (recomendado) — repo `navel-site`

Credenciais em **`navel-site/.env.cpanel`** (local, gitignored). Script: **`navel-site/scripts/cpanel-deploy.mjs`**.

**PWA (`public_html/manut/`):** após `npm run build` em **AT_Manut**:

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
npm run deploy:at-manut -- --yes
```

Envia `../AT_Manut/dist/` para `{CPANEL_REMOTE_ROOT}/manut/` (incremental por hash).

**Um ficheiro PHP da API** (ex. `data.php`):

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
node scripts/cpanel-deploy.mjs --file="c:/Cursor_Projetos/NAVEL/AT_Manut/servidor-cpanel/api/data.php" --remote="<CPANEL_REMOTE_ROOT>/api" --yes
```

`CPANEL_REMOTE_ROOT` está no `.env.cpanel` (ex.: `/home/navel/public_html`).

### Permissões no servidor (`data.php`) e no frontend

- **ATecnica** pode **editar** manutenção concluída e relatório **até** `enviadoParaCliente` indicar envio ao cliente; inclui **corrigir datas de agendamento e de execução** no modal de execução (`ExecutarManutencaoModal.jsx`) enquanto o relatório não foi enviado.
- **Depois** do envio ao cliente, **só admin** altera ou elimina (`usePermissions.js` + `data.php` em `update`/`delete` de `relatorios` e `manutencoes`).

---

## Publicação no painel (cPanel)

### Ficheiros a enviar
| Pasta / ficheiro | Destino cPanel | Notas |
|-----------------|----------------|-------|
| `servidor-cpanel/api/` | `public_html/api/` | PHP da API (inclui `atm_report_auth.php`, atm_log.php, data.php, log-receiver) e **`tecnico_horario_restrito.json`** (horário ATecnica; não versionar alterações locais se forem só para um ambiente) |
| `servidor-cpanel/log-receiver.php` | `public_html/api/log-receiver.php` | Receptor de logs do frontend |
| `servidor-cpanel/setup.sql` | — | Executar no phpMyAdmin |
| `servidor-cpanel/seed_mock_data.sql` | — | Executar após setup |
| Build React (`dist/`) | `public_html/manut/` | `npm run build` ou `dist_upload.zip` |

### PDFs técnicos dos equipamentos (`uploads/machine-docs/`)

- O primeiro upload via **Documentação técnica** cria automaticamente `public_html/uploads/machine-docs/` (a partir da pasta pai de `api/`, normalmente `public_html/`).
- Os PDFs ficam com nome `maq-{id}-{timestamp}-{aleatório}.pdf`; as referências e metadados ficam na coluna JSON **`maquinas.documentos`**.
- **Actualizar `data.php`** no cPanel sempre que o repositório incluir alterações a `machine_pdf` (upload, `replacePath` para substituir ficheiro antigo, limites de tamanho) ou a `maquinas` (merge em updates parciais, etc.).
- **Frontend:** importações/substituições e gravação da lista usam `DocumentacaoModal.jsx` + `DataContext.addDocumentoMaquina` (v1.16.28+).

### Fotografias técnicas dos equipamentos (`uploads/machine-photos/`)

- O primeiro upload cria automaticamente `public_html/uploads/machine-photos/`.
- As fotos são captadas/seleccionadas em `DocumentacaoModal.jsx` (separador **Fotografias**) e comprimidas no browser para JPEG leve com `comprimirImagemRelatorio.js`.
- Nome no servidor: `equipamento_numeroSerie_dataHora_random.jpg` (segmentos sanitizados para URL/disco). A galeria mostra da foto mais recente para a mais antiga.
- O servidor aceita apenas JPEG optimizado via `uploads/machine_photo` em `data.php`; técnicos e admins autenticados podem gravar.
- A referência fica em `maquinas.documentos` com tipo interno `__foto_equipamento`; por isso **não** afecta a contagem de documentação obrigatória.
- Sempre que esta funcionalidade muda, publicar **PWA** (`public_html/manut/`) e **`data.php`** (`public_html/api/data.php`).

### Build da aplicação React

```powershell
cd c:\Cursor_Projetos\NAVEL\AT_Manut
npm run build
```

Em seguida **`npm run deploy:at-manut -- --yes`** a partir de `navel-site` (ver acima).  
**Alternativa manual:** `npm run build:zip` e extrair `dist_upload.zip` em `public_html/manut/` — ver [`BUILD-E-ZIP.md`](./BUILD-E-ZIP.md).

### Variáveis de ambiente
- **`VITE_API_BASE_URL`:** em produção costuma ficar vazio; só preencher se a API estiver noutro host (ver `.env.example`).
- **`VITE_ATM_REPORT_AUTH_TOKEN`:** obrigatório no **momento do `npm run build`** — deve ser **o mesmo** valor que `ATM_REPORT_AUTH_TOKEN` no servidor (`send-email.php`, `send-report.php`, `log-receiver.php`). **Fluxo simples:** em `AT_Manut` corre `npm run gen:report-auth` (preenche `.env.local` + `atm_report_auth.secret.php`, fora do Git); envia o `.secret.php` para `public_html/api/`. Ver **[`docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md`](MEMORIA-SEGREDO-EMAIL-E-LOGS.md)**.
- **cPanel / PHP:** neste alojamento a fonte primária é o bloco `RewriteRule [E=ATM_...:valor]` no `.htaccess` real de `public_html/api/` (gerido pelos scripts do `navel-site`). Para `ATM_REPORT_AUTH_TOKEN`, também existe o fallback dedicado `atm_report_auth.secret.php` (bloqueado por `.htaccess`). O painel cPanel → Environment Variables não é usado neste plano LSPHP.

---

## Fluxo completo de deployment (resumo)

```powershell
# 1. Lints / testes conforme alteração
# 2. Incrementar APP_VERSION em src/config/version.js
# 3. Build PWA
cd c:\Cursor_Projetos\NAVEL\AT_Manut
npm run build
# 4. Deploy PWA (SFTP)
cd ..\navel-site
npm run deploy:at-manut -- --yes
# 5. Se mudou PHP da API: cpanel-deploy.mjs --file=... --remote=.../api --yes
# 6. CHANGELOG.md, commit, tag, push (se aplicável)
```

---

## Verificação pós-deploy

1. **Login** — Admin e ATecnica conseguem autenticar
2. **Dados** — Lista de clientes, máquinas, manutenções e reparações carregam
3. **Relatórios** — Abrir um relatório existente; checklist e fotos exibem correctamente
4. **Documentação equipamento** — Abrir ficha → Documentação → confirmar `Documentos da ficha`, `Biblioteca NAVEL` e `Fotografias`; testar upload de fotografia em tablet/telemóvel se possível
5. **Reparações** — Criar reparação pendente, executar, guardar progresso, concluir
6. **Email** — Testar envio de email após conclusão de manutenção/reparação
7. **Clientes (UI)** — tabela desktop sem truncamento excessivo em `Localidade`; botões `Frota/Editar/Eliminar` com contraste adequado.
8. **Categorias (UI)** — ações com tamanhos consistentes e rótulos visíveis em desktop/tablet (`Editar`, `Eliminar`, `Cima`, `Baixo`).
9. **Manutenções (UI)** — distribuição de colunas equilibrada na tabela desktop; em `≤1024px` confirmar fallback para cartões.
10. **CORS** — A API é **`api/data.php`** (POST JSON); origens permitidas estão em `data.php` / `config.php` conforme deploy actual.

---

## Sistema de logs e diagnóstico

### O que o Admin vê no painel (Logs → Servidor)

| Origem | Quando | Utilizador | Dispositivo |
|--------|--------|------------|-------------|
| **Frontend** | Erros de rede, falhas de API, acções (login, addCliente, addReparacao, etc.) | Qualquer user autenticado | Qualquer (desktop, mobile) |
| **API/Servidor** | Erros de BD (conexão, login, CRUD, bulk_create, bulk_restore) | User que fez o pedido | — |
| **API/Servidor** | Erros PHP fatais (E_ERROR, E_PARSE, etc.) | — | — |

### Fluxo

1. **Frontend** (logger.js): regista action/error/warn/fatal → envia para `log-receiver.php` → `api/logs/atm_YYYY-MM.log`
2. **API** (atm_log.php): em erros de BD ou PHP → escreve directamente em `api/logs/atm_YYYY-MM.log`
3. **Admin** (Logs.jsx): selecciona "Servidor (todos os users)" → `api/data.php?resource=logs&action=list` → lê `atm_*.log`

### Formato das entradas (TSV)

`timestamp | level | sessionId | userId | route | version | component | action | message | details`

### Para diagnóstico remoto

1. Admin abre Logs → Servidor (todos os users)
2. Filtra por "Erro" ou "Fatal"
3. Exporta como TXT ou JSON e partilha
4. Ou usa "Copiar para suporte" (logs locais) + confirma que "Sync" foi feito

---

## Resumo de consistência (após `seed_mock_data.sql`)

Contagens típicas de **ambiente de demonstração** — não assumir em produção real.

- **clientes** ~10 (`id` = `nif`), **maquinas** ~23, **manutencoes** ~28, **relatorios** ~13
- **checklist_items** cobre subcategorias; sub2/sub4/sub12 com checklists alargadas
- **reparacoes** / **relatorios_reparacao**: FK válidas; `numero_relatorio` reparação formato `AAAA.RP.NNNNN`
