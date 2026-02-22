# Sessão — Integração Filosoft / Lista de Clientes NAVEL

**Data:** 22 de fevereiro de 2026

## Objetivo

Extrair lista de clientes da empresa NAVEL a partir do ERP Filosoft Gestor.32 (instalado em `C:\Filosoft.32`).

## O que foi feito

### 1. Análise da estrutura Filosoft.32

- **empnav** — pasta com dados da empresa NAVEL
- **FTTERCEI** — ficheiro de terceiros (clientes/fornecedores): `.dat` (dados), `.idx` (índice), `.blb` (blobs)
- **SAF-T PT** — ficheiros XML com clientes na secção `<MasterFiles><Customer>`
- Formato binário proprietário; dados em texto (Windows-1252) com campos separados por `0x01`

### 2. Script SAF-T — `scripts/extract-clientes-saft.js`

- Extrai clientes do ficheiro SAF-T XML
- **Comando:** `npm run extract-clientes-saft` ou `node scripts/extract-clientes-saft.js [caminho.xml]`
- **Output:** `clientes-filosoft.csv`, `clientes-filosoft.json`
- **Default:** primeiro `SAFT*.xml` em `C:\Filosoft.32`
- **Resultado:** 553 clientes (do SAF-T de dez/2021)

### 3. Script FTTERCEI — `scripts/extract-clientes-fttercei.js`

- Extrai terceiros do ficheiro binário `FTTERCEI.dat` usando heurísticas (NIF, padrões de texto)
- **Comando:** `npm run extract-clientes-fttercei` ou `node scripts/extract-clientes-fttercei.js [caminho.dat]`
- **Output:** `clientes-fttercei.csv`, `clientes-fttercei.json`
- **Default:** `C:\Filosoft.32\empnav\Ano2026\FTTERCEI.dat` (ano mais recente)
- **Resultado:** 1011 terceiros (clientes + fornecedores)

### 4. Documentação e configuração

- `docs/FILOSOFT-INTEGRACAO.md` — guia de integração
- `package.json` — scripts `extract-clientes-saft` e `extract-clientes-fttercei`
- `.gitignore` — exclusão de `clientes-filosoft.*` e `clientes-fttercei.*` (dados sensíveis)

## Ficheiros criados/alterados

| Ficheiro | Ação |
|----------|------|
| `scripts/extract-clientes-saft.js` | Criado |
| `scripts/extract-clientes-fttercei.js` | Criado |
| `docs/FILOSOFT-INTEGRACAO.md` | Criado/atualizado |
| `docs/SESSAO-FILOSOFT-2026-02-22.md` | Este ficheiro |
| `package.json` | Novos scripts |
| `.gitignore` | Novas exclusões |

## Uso rápido

```powershell
# Lista de clientes do SAF-T (mais fiável, requer SAF-T recente)
npm run extract-clientes-saft

# Lista de terceiros do FTTERCEI (todos, direto do ERP)
npm run extract-clientes-fttercei
```

### 5. Script artigos por armazém — `scripts/extract-artigos-armazem.js`

- Extrai artigos de um armazém do FTARTIGO.dat (código+armazém concatenados, ex: 000431002)
- **Comando:** `npm run extract-artigos-armazem` ou `node scripts/extract-artigos-armazem.js [armazem] [caminho]`
- **Output:** `artigos-armazem-002.csv`, `artigos-armazem-002.json`
- **Resultado:** 841 artigos no armazém 002 (Ano2026)

## Arquitectura interna do Gestor.32 (descoberta nesta sessão)

### Formato dos ficheiros
- **Binário proprietário** — sem documentação pública
- **Campos de tamanho fixo** preenchidos com zeros (`0x00`)
- **Separador de campo:** `0x01` (SOH — Start of Heading)
- **Encoding:** Windows-1252 (Latin-1 para leitura)
- **Três ficheiros por tabela:**
  - `.dat` — dados (registos)
  - `.idx` — índice binário (B-tree, provavelmente sobre campo `Codigo`)
  - `.blb` — blobs (fotos, texto longo); geralmente pequeno

### Nomenclatura `FT` — "Ficheiro de" (dados mestres)
| Ficheiro | Descrição |
|----------|-----------|
| `FTTERCEI` | Ficheiro de Terceiros (clientes + fornecedores) |
| `FTARTIGO` | Ficheiro de Artigos × Armazém |
| `FTARTAC` | Registo de alteração de códigos |
| `FTARTSER` | Números de série de artigos |

### Estrutura `FTARTIGO`
- Um registo por combinação **artigo × armazém**
- Código no ficheiro = `CodigoArtigo` + `CodigoArmazem` (últimos 3 dígitos)
- Ex: `000431002` = artigo `000431`, armazém `002`
- Por ano fiscal — o ficheiro de cada ano contém todos os artigos registados nesse ano
- `Ano2026\FTARTIGO.dat` — 52 MB, ~5.779 artigos únicos, 51.519 entradas (artigo × armazém)

### Armazéns NAVEL identificados
| Armazém | Artigos | Notas |
|---------|---------|-------|
| **001** | 1.175 | Armazém secundário |
| **002** | 841 | **Armazém de referência principal** |
| 003 | 246 | Obsoleto |
| 900–903 | ~40-98 | Possível consignação/obra/viatura |
| 999 | 21 | Teste/genérico |

### `FTTERCEI` — Terceiros
- Ficheiro mestre partilhado entre anos (`empnav\Ano2026\FTTERCEI.dat`)
- 1.011 terceiros extraídos (clientes + fornecedores)
- Campos: NIF, Nome, Tipo (A=cliente, F=fornecedor), Morada, Localidade, Postal, País, Telefone, Fax, Telemovel, Email, Website, etc.

### SAF-T PT
- Formato XML standard — a forma mais fiável de exportar dados
- Secção `<MasterFiles><Customer>` — 553 clientes (do SAF-T dez/2021)
- Encoding: Windows-1252

### Modificações nos ficheiros binários
- **Apagar registos:** NÃO RECOMENDADO — requer reconstrução do `.idx` (formato desconhecido)
- **Editar descrições:** Tecnicamente mais viável (campo fixo, índice provavelmente só sobre `Codigo`), mas arriscado sem documentação oficial
- **Regra geral:** qualquer alteração estrutural deve ser feita pelo Gestor.32

### Curiosidades
- Filosoft fundada em 1988 — arquitectura reflecte 30+ anos de evolução
- Pasta `ano0` e `ano1899`: templates/schema sem dados reais
- `tabela.cdf` e `tabela2.cdf`: ficheiros de configuração de importação (formato INI), definem mapeamento de campos para importação/exportação de artigos

## Notas para sessões futuras

- O SAF-T só inclui clientes com faturas no período — para lista completa, usar FTTERCEI
- Para SAF-T atualizado: gerar no Gestor.32 (Faturação → Exportar SAF-T)
- O JSON gerado é compatível com o formato de clientes do AT_Manut (id, nif, nome, morada, localidade, codigoPostal, telefone, email)
- Armazém de referência para artigos: **002**
- Para catálogo completo de artigos únicos: deduplicar FTARTIGO por código (remover últimos 3 dígitos)
