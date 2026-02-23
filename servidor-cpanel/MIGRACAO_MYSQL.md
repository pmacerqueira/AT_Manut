# Migração para MySQL + API PHP — AT_Manut

Este documento descreve os passos para activar a persistência em servidor (MySQL + API PHP) em substituição do localStorage.

---

## 1. Criar a base de dados no cPanel

1. Entra em **cPanel → MySQL Databases**
2. Cria uma nova base de dados, ex: `navel_atmanut`
3. Cria um utilizador com password forte, ex: `navel_atmanut`
4. Associa o utilizador à base de dados com **ALL PRIVILEGES**
5. Anota as credenciais: host (geralmente `localhost`), nome da BD, utilizador, password

> **Nota:** Em muitos cPanels, o nome real do utilizador é `cpaneluser_navel_atmanut` e da BD `cpaneluser_navel_atmanut`.

---

## 2. Executar o script SQL

1. Abre **phpMyAdmin** no cPanel
2. Selecciona a base de dados criada
3. Clica em **Import**
4. Carrega o ficheiro `setup.sql` da pasta `servidor-cpanel`
5. Executa o import

Isto cria as tabelas (users, categorias, subcategorias, checklist_items, clientes, maquinas, manutencoes, relatorios) e insere os dados iniciais (utilizadores, categorias, checklists).

**Credenciais de login após o setup:**
- **Admin** / `admin123%`
- **ATecnica** / `tecnica123%`

---

## 3. Configurar a API PHP

1. Cria a pasta `public_html/api/` (se não existir)
2. Copia para `public_html/api/`:
   - `api/config.php`
   - `api/db.php`
   - `api/data.php`
3. Edita `config.php` e preenche:
   - `DB_HOST` — normalmente `localhost`
   - `DB_NAME` — nome da base de dados
   - `DB_USER` — nome do utilizador
   - `DB_PASS` — password do utilizador
   - `JWT_SECRET` — uma string aleatória de 32+ caracteres (pode gerar em https://generate-secret.vercel.app/64)

---

## 4. Carregar o frontend

1. Carrega o conteúdo de `dist/` (ou `dist_upload.zip` extraído) para `public_html/manut/`
2. Substitui todos os ficheiros existentes

---

## 5. Testar

1. Abre `https://www.navel.pt/manut/`
2. Faz login com Admin / admin123%
3. Se vires "A carregar dados…" e depois o Dashboard com dados vazios (ou seed), está a funcionar
4. Cria um cliente e uma máquina — os dados devem persistir no servidor

---

## 6. Ficheiros PHP existentes

Os ficheiros existentes (`send-email.php`, `log-receiver.php`) permanecem em `public_html/api/` e não precisam de alterações.

---

## Troubleshooting

- **Erro 500 ao fazer login:** Verifica as credenciais em `config.php` e os logs PHP (cPanel → Errors)
- **Sessão expirada:** O token JWT dura 8 horas; faz logout e login de novo
- **CORS:** O PHP já envia os cabeçalhos correctos; se houver problemas, confirma que estás em `https://www.navel.pt` ou `https://navel.pt`

---

## 7. Alterações de esquema — v1.8.0 (Ordens de trabalho + Peças e consumíveis)

### 7.1 Tabela `manutencoes` — novos campos

Executar em **phpMyAdmin → SQL**:

```sql
-- Suporte a Ordens de Trabalho (status em_progresso + rastreio de tempo)
ALTER TABLE manutencoes
  ADD COLUMN inicio_execucao DATETIME     NULL COMMENT 'Data/hora de início da execução (status em_progresso)',
  ADD COLUMN fim_execucao    DATETIME     NULL COMMENT 'Data/hora de conclusão (preenchido ao concluir)',
  ADD COLUMN tipo_manut_kaeser CHAR(1)    NULL COMMENT 'Tipo de manutenção KAESER: A, B, C ou D';

-- Permitir o novo valor no campo status
-- (Se a coluna for ENUM, alterar; se for VARCHAR, já suporta)
-- Verificar primeiro: SHOW COLUMNS FROM manutencoes LIKE 'status';
-- Se for ENUM:
ALTER TABLE manutencoes
  MODIFY COLUMN status ENUM('pendente','agendada','em_progresso','concluida') NOT NULL DEFAULT 'pendente';
```

### 7.2 Tabela `relatorios` — novos campos

```sql
-- Peças e consumíveis utilizados (JSON) e tipo de manutenção
ALTER TABLE relatorios
  ADD COLUMN pecas_usadas      JSON NULL COMMENT 'Array de peças utilizadas: [{codigoArtigo, descricao, quantidadeUsada, unidade, posicao}]',
  ADD COLUMN tipo_manut_kaeser CHAR(1) NULL COMMENT 'Tipo de manutenção KAESER: A, B, C ou D';
```

### 7.3 Nova tabela `pecas_plano` (Planos de peças por máquina)

> **Nota:** A tabela `pecas_plano` é gerida em `localStorage` (`atm_pecas_plano`) e **não requer** tabela MySQL na versão atual. Fica documentada aqui para futura migração opcional.

```sql
-- Criação futura (opcional) — planos de peças por máquina
CREATE TABLE IF NOT EXISTS pecas_plano (
  id             VARCHAR(40)  NOT NULL PRIMARY KEY,
  maquina_id     VARCHAR(40)  NOT NULL REFERENCES maquinas(id) ON DELETE CASCADE,
  tipo_manut     VARCHAR(20)  NOT NULL COMMENT 'A, B, C, D ou periodica',
  posicao        VARCHAR(20)  NULL,
  codigo_artigo  VARCHAR(60)  NOT NULL,
  descricao      VARCHAR(200) NOT NULL,
  quantidade     DECIMAL(8,2) NOT NULL DEFAULT 1,
  unidade        VARCHAR(10)  NOT NULL DEFAULT 'PÇ',
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_maquina_tipo (maquina_id, tipo_manut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 7.4 Actualizar `data.php` — suporte aos novos campos

No ficheiro `servidor-cpanel/api/data.php`, verificar que as queries de INSERT/UPDATE para `manutencoes` e `relatorios` incluem os novos campos:

- `manutencoes`: mapear `inicioExecucao → inicio_execucao`, `tipoManutKaeser → tipo_manut_kaeser`
- `relatorios`: mapear `pecasUsadas → pecas_usadas` (JSON encode), `tipoManutKaeser → tipo_manut_kaeser`
- No SELECT, fazer `json_decode` em `pecas_usadas` antes de retornar
