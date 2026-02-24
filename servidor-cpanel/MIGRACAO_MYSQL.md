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

### 7.3b Tabela `maquinas` — coluna `posicao_kaeser` (v1.8.1)

```sql
-- Posição no ciclo de manutenção anual (0-11, wrap automático)
-- Aplica-se a todos os compressores de parafuso (não só KAESER)
ALTER TABLE maquinas
  ADD COLUMN posicao_kaeser TINYINT UNSIGNED NULL
    COMMENT 'Posição no ciclo ABCD (0=Ano1/TipoA … 11=Ano12/TipoD). NULL para equipamentos sem ciclo.';

-- Inicializar com posição 0 para compressores já existentes (sub5,sub6,sub10,sub11,sub14,sub15,sub16)
UPDATE maquinas SET posicao_kaeser = 0
WHERE subcategoria_id IN ('sub5','sub6','sub10','sub11','sub14','sub15','sub16')
  AND posicao_kaeser IS NULL;
```

### 7.3c Correcção de marcas — v1.8.4

As marcas foram revistas para reflectir as marcas reais que a Navel trabalha:
- **Compressores:** KAESER, Fini, ECF, IES, LaPadana  
- **Elevadores:** Cascos, Ravaglioli, Space, Kroftools, TwinBusch, Sunshine, Werther, Velyen

```sql
-- Actualizar marcas na BD (caso já tenha dados com marcas antigas)
UPDATE maquinas SET marca='Cascos'     WHERE id='m01' AND marca IN ('Navel','Atlas Copco');
UPDATE maquinas SET marca='KAESER',    modelo='ASK 28T',   numero_serie='2735'        WHERE id='m02';
UPDATE maquinas SET marca='Ravaglioli',modelo='X132'                                  WHERE id='m03';
UPDATE maquinas SET marca='Space',     modelo='TES-5T'                                WHERE id='m05';
UPDATE maquinas SET marca='Fini',      modelo='K-MAX 15-13',numero_serie='FIN-KM15-006' WHERE id='m06';
UPDATE maquinas SET marca='TwinBusch', modelo='TWB-420'                               WHERE id='m09';
UPDATE maquinas SET marca='Werther',   modelo='W3000 XL'                              WHERE id='m10';
UPDATE maquinas SET marca='ECF',       modelo='EA 55 8',    numero_serie='ECF-EA55-011' WHERE id='m11';
UPDATE maquinas SET marca='IES',       modelo='IM 11 8',    numero_serie='IES-IM11-012' WHERE id='m12';
UPDATE maquinas SET marca='KAESER',    modelo='BSD 72 T',   numero_serie='KAE-BSD72-013' WHERE id='m13';
UPDATE maquinas SET marca='LaPadana',  modelo='VDX 25',     numero_serie='LAP-VDX25-014' WHERE id='m14';
UPDATE maquinas SET marca='Fini',      modelo='Plus 38-270',numero_serie='FIN-P38-015'  WHERE id='m15';
UPDATE maquinas SET marca='Kroftools', modelo='KP-3500',    numero_serie='KRO-KP35-016' WHERE id='m16';
UPDATE maquinas SET marca='Sunshine',  modelo='SH-240',     numero_serie='SUN-SH240-019' WHERE id='m19';
UPDATE maquinas SET marca='Space',     modelo='TES-8T',     numero_serie='SPA-TES-020'  WHERE id='m20';
UPDATE maquinas SET marca='Velyen',    modelo='VL-400',     numero_serie='VEL-VL400-021' WHERE id='m21';
UPDATE maquinas SET marca='Ravaglioli',modelo='X102',       numero_serie='RAV-X102-022' WHERE id='m22';
UPDATE maquinas SET marca='Kroftools', modelo='KP-5000',    numero_serie='KRO-KP50-023' WHERE id='m23';
-- Corrigir periodicidade dos compressores (anual nos Açores, não trimestral)
UPDATE maquinas SET periodicidade='anual'
WHERE subcategoria_id IN ('sub5','sub6','sub10','sub11','sub14','sub15','sub16');
```

### 7.4 Actualizar `data.php` — suporte aos novos campos

No ficheiro `servidor-cpanel/api/data.php`, verificar que as queries de INSERT/UPDATE para `manutencoes` e `relatorios` incluem os novos campos:

- `manutencoes`: mapear `inicioExecucao → inicio_execucao`, `tipoManutKaeser → tipo_manut_kaeser`
- `relatorios`: mapear `pecasUsadas → pecas_usadas` (JSON encode), `tipoManutKaeser → tipo_manut_kaeser`
- No SELECT, fazer `json_decode` em `pecas_usadas` antes de retornar
