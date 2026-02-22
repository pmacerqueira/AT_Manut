# Publicação no cPanel — 21 Fev 2026 (v1.5.0)

## O que foi preparado

✅ **Build** executado com sucesso  
✅ **APP_VERSION** actualizada para `1.5.0`  
✅ **CHANGELOG.md** actualizado com as alterações de responsividade  
✅ **dist_upload.zip** criado em `c:\AT_Manut\dist_upload.zip`  

O zip contém:
- **manut/** — aplicação React (index.html, assets/, .htaccess, vite.svg)
- **api/** — send-email.php (envio de relatórios com PDF)

---

## Alterações desta versão (v1.5.0)

- Responsividade e orientação em tablets
- Painéis e modais ajustam-se à rotação do dispositivo (portrait/landscape)
- Uso de viewport dinâmica (dvh) para reflow correcto

---

## Passo a passo — Publicação

### PASSO 1 — Aplicação (public_html/manut/)

1. **Abrir cPanel** → Administrador de ficheiros → `public_html/`
2. **Entrar na pasta** `manut/` (criar se não existir)
3. **(Opcional, recomendado)** Fazer backup: seleccionar todo o conteúdo → Comprimir → guardar como `manut_backup_antes_v1.5.zip`
4. **Apagar** todo o conteúdo antigo da pasta `manut/`
5. **Extrair** o ficheiro `dist_upload.zip` (no teu PC)
6. **Upload** do conteúdo da pasta `manut/` do zip para `public_html/manut/`
   - Ou: fazer upload do zip → no cPanel, extrair o zip → mover o conteúdo de `manut/` para `public_html/manut/`
7. **Verificar** que em `public_html/manut/` tens:
   - `index.html`
   - pasta `assets/` (com .js e .css)
   - `.htaccess`
   - `logo.png` (se existir no zip — se não, manter o que já está no servidor)
   - `vite.svg` (ícone)

---

### PASSO 2 — API de email (public_html/api/)

1. **Abrir** `public_html/api/`
2. **Upload** de `send-email.php` (da pasta `api/` dentro do zip)
3. **Substituir** o ficheiro existente
4. **Não apagar** os outros ficheiros da pasta: `fpdf.php`, `send-report.php`, `data.php`, `db.php`, `config.php` — devem continuar lá

---

### PASSO 3 — Base de dados MySQL (se criaste/alteraste mock data)

A app carrega dados da API (`data.php`) que usa MySQL. Se hoje criaste ou alteraste mock data / setup / seed, deves actualizar a base de dados no cPanel.

#### 3A. Instalação nova (ainda não existe BD AT_Manut)

1. **cPanel** → phpMyAdmin → criar base de dados (ex.: `navel_atm`) se não existir
2. Seleccionar a BD
3. **Importar** `servidor-cpanel/setup.sql` (schema, users, categorias, subcategorias, checklist_items)
4. **Importar** `servidor-cpanel/seed_mock_data.sql` (10 clientes, 23 máquinas, 28 manutenções, 13 relatórios)
5. Verificar em `api/config.php` que as credenciais MySQL apontam para a BD correcta

#### 3B. Actualização de BD existente (já tens dados)

Se **alteraste** o `seed_mock_data.sql` ou o `setup.sql` e queres que o servidor tenha os novos dados:

**Opção 1 — Repor só o mock (clientes, máquinas, manutenções, relatórios):**
```sql
-- No phpMyAdmin, seleccionar a BD e executar (⚠️ APAGA os dados destas tabelas):
TRUNCATE TABLE relatorios;
TRUNCATE TABLE manutencoes;
TRUNCATE TABLE maquinas;
TRUNCATE TABLE clientes;

-- Depois: Importar → escolher seed_mock_data.sql
```

**Opção 2 — Schema alterado (novas colunas/tabelas):**  
Se mudaste `setup.sql` (ex.: novos campos em checklist_items), pode ser necessário executar migrações em `servidor-cpanel/migrations/`. Consulta `docs/DEPLOY_CHECKLIST.md` (secção "Cenário B").

**Opção 3 — Manter os dados actuais:**  
Se os dados no servidor estão correctos e não queres perder nada, **não** executes seed nem truncates. Só publica a app (Passos 1 e 2).

| Cenário | O que fazer |
|---------|-------------|
| BD nova, primeira vez | setup.sql + seed_mock_data.sql |
| Alteraste o seed e queres repor o mock | TRUNCATE das 4 tabelas + importar seed_mock_data.sql |
| Alteraste o schema (setup) | Ver migrations em `servidor-cpanel/migrations/` |
| Dados no servidor estão certos | Nada — só publicar a app |

**Localização dos ficheiros SQL:**
- `c:\AT_Manut\servidor-cpanel\setup.sql`
- `c:\AT_Manut\servidor-cpanel\seed_mock_data.sql`
- `c:\AT_Manut\servidor-cpanel\migrations\` (para BDs antigas)

---

### PASSO 4 — Verificação

1. Abrir no browser: **https://www.navel.pt/manut/**
2. Fazer login (Admin ou ATecnica)
3. Verificar se a versão está actualizada: deve aparecer v1.5.0 (ou limpar cache do browser)
4. Testar num tablet ou em modo responsivo (F12 → ícone telemóvel) e rodar entre portrait/landscape — os painéis devem ajustar-se

---

## Ficheiros modificados nesta sessão (referência)

Estes ficheiros fonte foram alterados — o build já inclui as alterações no output:

| Ficheiro | Alteração |
|----------|-----------|
| `src/main.jsx` | APP_VERSION 1.5.0 |
| `src/index.css` | dvh, modais, orientação |
| `src/components/Layout.css` | dvh, layout |
| `src/pages/Dashboard.css` | day-panel, action-sheet, listas |
| `src/pages/Calendario.css` | calendário responsivo |
| `src/pages/Manutencoes.css` | checklist, fotos |
| `CHANGELOG.md` | entrada 2026-02-21 |

---

## Se precisares de actualizar a API (data.php, atm_log.php, etc.)

Os ficheiros em `servidor-cpanel/api/` vão para `public_html/api/`:

| Origem | Destino |
|--------|---------|
| `servidor-cpanel/send-email.php` | `public_html/api/` |
| `servidor-cpanel/api/data.php` | `public_html/api/` |
| `servidor-cpanel/api/atm_log.php` | `public_html/api/` |
| `servidor-cpanel/api/send-report.php` | `public_html/api/` |
| `servidor-cpanel/log-receiver.php` | `public_html/api/` |

*Nota: Nesta sessão só alterámos CSS/React. Os ficheiros PHP não foram modificados.*

---

## Localização do zip

```
c:\AT_Manut\dist_upload.zip
```

Após publicar, a app estará em: **https://www.navel.pt/manut/**
