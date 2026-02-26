# Integração Filosoft Gestor.32 — AT_Manut

## Visão geral

O **Filosoft Gestor.32** (NAVEL) está instalado em `C:\Filosoft.32`. A pasta `empnav` contém os dados da empresa NAVEL. Os ficheiros de dados são binários (.dat, .idx, .blb) — formato proprietário sem API pública.

## Formas de obter a lista de clientes

### 1. Extrair do ficheiro SAF-T PT (recomendado)

O SAF-T PT (Ficheiro de Auditoria Fiscal) é gerado mensalmente pelo Gestor.32 e contém **todos os clientes** que tiveram faturas no período. O ficheiro XML inclui a secção `<MasterFiles>` com blocos `<Customer>`.

**Caminho típico:** `C:\Filosoft.32\SAFT*.xml`

**Script incluído no projeto:**

```powershell
# Com caminho explícito
node scripts/extract-clientes-saft.js "C:\Filosoft.32\SAFT512012962-e-fatura-01-12-2021-31-12-2021.xml"

# Com caminho default (se existir SAFT na pasta Filosoft.32)
npm run extract-clientes-saft
```

**Output:**
- `clientes-filosoft.csv` — para Excel (separador `;`, encoding UTF-8 com BOM)
- `clientes-filosoft.json` — formato AT_Manut (id, nif, nome, morada, localidade, codigoPostal, telefone, email)

**Nota:** O SAF-T disponível na raiz é de dezembro 2021. Para lista atualizada, gerar novo SAF-T no Gestor.32 (menu Faturação → Exportar SAF-T) e executar o script com o novo ficheiro.

### 2. Exportação manual no Gestor.32

Se o Gestor.32 tiver menu de exportação de terceiros (clientes/fornecedores):

1. Abrir Gestor.32 → Ficha de Terceiros (ou equivalente)
2. Procurar opção **Exportar** ou **Ficheiros** → **Exportar**
3. Escolher formato CSV ou Excel
4. Selecionar campos: Código, NIF, Nome, Morada, Localidade, Código Postal, Telefone, Email

### 3. Extrair do FTTERCEI.dat (binário)

O ficheiro de terceiros `empnav\Ano2026\FTTERCEI.dat` (e equivalentes por ano) contém **todos** os terceiros (clientes e fornecedores) em formato binário proprietário. O script `extract-clientes-fttercei.js` usa heurísticas para extrair registos a partir dos padrões de texto no ficheiro.

```powershell
# Usa o ano mais recente por defeito
npm run extract-clientes-fttercei

# Ou com caminho explícito
node scripts/extract-clientes-fttercei.js "C:\Filosoft.32\empnav\Ano2026\FTTERCEI.dat"
```

**Output:** `clientes-fttercei.csv` e `clientes-fttercei.json`

**Nota:** A extração é heurística — pode haver falsos positivos ou campos vazios (ex.: código postal). O SAF-T é mais fiável quando disponível.

## Estrutura de dados NAVEL (empnav)

| Pasta/Ficheiro | Descrição |
|----------------|-----------|
| `empnav\` | Dados da empresa NAVEL |
| `empnav\ano0\fttercei.dat` | Ficheiro de terceiros (clientes/fornecedores) — dados mestres |
| `empnav\ano2006\` … `empnav\Ano2026\` | Dados por ano fiscal |
| `empnav\ENCMOB_FTTERCEI.dat` | Outra tabela de terceiros (encargos móveis?) |
| `EXPORT\` | PDFs de faturas exportadas |

### 4. Extrair artigos por armazém (FTARTIGO)

O ficheiro `empnav\Ano2026\FTARTIGO.dat` contém artigos com stock por armazém. O código do artigo e armazém estão concatenados (ex.: `000431002` = artigo 000431 no armazém 002).

```powershell
# Artigos do armazém 002 (default)
npm run extract-artigos-armazem

# Outro armazém
node scripts/extract-artigos-armazem.js 001 "C:\Filosoft.32\empnav\Ano2026\FTARTIGO.dat"
```

**Output:** `artigos-armazem-002.csv` e `artigos-armazem-002.json` (código, descrição, quantidade, família, unidade)

## Importação no AT_Manut — Workflow completo

### Script principal (Jan/2026 em diante)

```
C:\Cursor_Dados_Gestor\scripts\extract-clientes-saft-2026.js
```

Este script combina dois passos num só:
1. **Extrai** clientes do SAF-T XML (NIF, Nome, Morada, Localidade, CodigoPostal)
2. **Enriquece** com email e telefone do `clientes-fttercei.json` (cruzamento por NIF)

**Resultado Jan/2026:** 626 clientes, 210 com email, 0 com telefone (não exportado pelo SAF-T nem pelo FTTERCEI).

### Passo a passo para actualizações periódicas

```
1. Gestor.32 → Faturação → Exportar SAF-T PT
   → Guardar em C:\Cursor_Dados_Gestor\SAFT512012962-e-fatura-*.xml

2. node "C:\Cursor_Dados_Gestor\scripts\extract-clientes-saft-2026.js"
   → Gera C:\Cursor_Dados_Gestor\dados-exportados\clientes-navel-2026.json

3. Dashboard AT_Manut → Clientes (Admin) → botão "Importar SAF-T"
   → Escolher clientes-navel-2026.json
   → Preview mostra: X novos | Y existentes | total
   → Modo "Ignorar existentes" (recomendado) ou "Actualizar existentes"
   → Confirmar → toast com resultado
```

### Função no DataContext

```js
importClientes(lista, modo)
// lista  → array de { nif, nome, morada, localidade, codigoPostal, telefone, email }
// modo   → 'novos' (só adiciona novos) | 'atualizar' (novos + actualiza existentes)
// return → { adicionados, atualizados, ignorados }
```

### Campos disponíveis por fonte

| Campo        | SAF-T | FTTERCEI | Notas |
|--------------|-------|----------|-------|
| NIF          | ✅    | ✅       | chave de cruzamento |
| Nome         | ✅    | ✅       | SAF-T tem razão social fiscal |
| Morada       | ✅    | ✅       | SAF-T usa BillingAddress |
| Localidade   | ✅    | ✅       | tag `<City>` no SAF-T |
| Código Postal| ✅    | ✅       | tag `<PostalCode>` |
| Telefone     | ❌    | ⚠️       | FTTERCEI não conseguiu extrair este campo |
| Email        | ❌    | ✅       | 210 de 626 clientes têm email |

> **Nota sobre telefone:** O SAF-T PT não inclui telefone dos clientes (só da empresa emissora). O FTTERCEI binário tem o campo mas o extractor heurístico não o isolou com fiabilidade. Se for preciso, o telefone pode ser inserido manualmente na ficha do cliente no AT_Manut.

## Arquitectura interna dos ficheiros

### Formato binário

| Elemento | Detalhe |
|----------|---------|
| Encoding | Windows-1252 (Latin-1) |
| Separador de campo | `0x01` (SOH) |
| Preenchimento | `0x00` (null) até tamanho fixo do campo |
| Extensão `.dat` | Dados (registos) |
| Extensão `.idx` | Índice binário (B-tree sobre `Codigo`) |
| Extensão `.blb` | Blobs — fotos, texto longo; geralmente pequeno |

### Estrutura FTARTIGO — artigos × armazém

O código no `.dat` é **`CodigoArtigo` + `CodigoArmazem`** (3 dígitos finais):

```
000431002  →  artigo 000431, armazém 002
000430901  →  artigo 000430, armazém 901
```

Cada registo = uma combinação artigo × armazém. Um artigo com stock em 001 e 002 aparece duas vezes.

### Armazéns NAVEL

| Armazém | Artigos | Observação |
|---------|---------|------------|
| **002** | 841 | **Referência principal** |
| 001 | 1.175 | Secundário |
| 003 | 246 | Obsoleto |
| 900–903 | 40–98 | Consignação/obra/viatura? |
| 999 | 21 | Teste |

### Regras para modificação de ficheiros

- **Apagar registos:** NÃO FAZER — requer reconstrução do `.idx` (formato desconhecido)
- **Editar campos:** Tecnicamente possível em campos fixos não indexados (ex: Descricao), mas arriscado
- **Regra geral:** qualquer alteração deve ser feita pelo Gestor.32

## Referências

- Filosoft: [www.filosoft.pt](https://www.filosoft.pt)
- SAF-T PT: [Portal das Finanças](https://www.portaldasfinancas.gov.pt/pt/main.jsp)
