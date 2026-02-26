# Checklist de Deploy — AT_Manut

> Última revisão: 2026-02-26 — v1.9.3

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
- Editar `api/config.php` com credenciais MySQL do cPanel
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

**Nota:** O `setup.sql` atual já inclui tudo. Migrações só são necessárias para BDs antigas.

---

## Publicação no painel (cPanel)

### Ficheiros a enviar
| Pasta / ficheiro | Destino cPanel | Notas |
|-----------------|----------------|-------|
| `servidor-cpanel/api/` | `public_html/api/` | PHP da API (inclui atm_log.php, data.php, log-receiver) |
| `servidor-cpanel/log-receiver.php` | `public_html/api/log-receiver.php` | Receptor de logs do frontend |
| `servidor-cpanel/setup.sql` | — | Executar no phpMyAdmin |
| `servidor-cpanel/seed_mock_data.sql` | — | Executar após setup |
| Build React (`dist/`) | `public_html/manut/` | `npm run build` |

### Build da aplicação React
```powershell
cd c:\AT_Manut
npm run build
Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force
```
Enviar `dist_upload.zip` para o cPanel (File Manager → Upload → Extract em `public_html/manut/`).

### Variáveis de ambiente
- Garantir que `VITE_API_BASE_URL` aponta para a API no cPanel (ex.: `https://navel.pt/api`)

---

## Fluxo completo de deployment (resumo)

```powershell
# 1. Verificar lints nos ficheiros editados
# 2. Incrementar APP_VERSION em src/config/version.js
# 3. Build
npm run build   # prebuild corre optimize-images automaticamente
# 4. Gerar zip
Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force
# 5. Actualizar CHANGELOG.md
# 6. Commit + tag + push
git add -A
git commit -m "v{versão} - resumo"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}
# 7. Upload dist_upload.zip → cPanel → public_html/manut/ (extrair)
# 8. Upload servidor-cpanel/send-email.php → cPanel → public_html/api/
```

---

## Verificação pós-deploy

1. **Login** — Admin e ATecnica conseguem autenticar
2. **Dados** — Lista de clientes, máquinas, manutenções e reparações carregam
3. **Relatórios** — Abrir um relatório existente; checklist e fotos exibem correctamente
4. **Reparações** — Criar reparação pendente, executar, guardar progresso, concluir
5. **Email** — Testar envio de email após conclusão de manutenção/reparação
6. **CORS** — Se a app está noutro domínio, verificar headers CORS em `api/index.php`

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

## Resumo de consistência

- **clientes**: 10 registos, `id` = `nif`
- **maquinas**: 23 registos, `cliente_id` e `cliente_nif` alinhados
- **manutencoes**: 28 registos, `maquina_id` válidos
- **relatorios**: 13 registos, `manutencao_id` únicos, `checklist_respostas` e `fotos` em JSON
- **checklist_items**: Todas as subcategorias com itens; sub2/sub4/sub12 com 20 itens
- **reparacoes**: `maquina_id` válidos, `status` ∈ {pendente, em_progresso, concluida}, `origem` ∈ {manual, istobal}
- **relatorios_reparacao**: `reparacao_id` únicos, `pecas_usadas` e `fotos` em JSON, `numero_relatorio` no formato `AAAA.RP.NNNNN`
