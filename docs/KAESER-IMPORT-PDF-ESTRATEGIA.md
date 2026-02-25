# Importação de planos KAESER a partir de PDF

> Estratégia de desenvolvimento — análise da estrutura dos PDFs e fluxo de importação.
> Data: 2026-02-24

---

## 1. Estrutura dos PDFs (análise empírica)

### Pasta de exemplos
`c:\Planos exemplo kaeser\`

### Convenção de nomes
`CLIENTE_MODELO_NumeroSerie.pdf`

Exemplos:
- `PORTOS DOS AÇORES_ASK_28T_ 2735.pdf`
- `PARQUE_MAQUINAS_SM12_2601.pdf`
- `SATA_SM15T_1176.pdf`
- `UNICOL_ASD50T_1008.pdf`

### Estrutura do conteúdo (extraído de PARQUE_MAQUINAS_SM12_2601.pdf)

```
Material : 100731.0 	SM 12 8.0bar 	SCB 400/50 EU
Serial : 2601
Equipment: 4083983

A
0512 490103.10010 SET filter compressor w/o OSC 	1 	PC
1600 9.0920.10030 SIGMA FLUID MOL 5 l 	1 	PC

B
0510 490103.1 	Filter-Set 	1 	PC
1600 9.0920.10030 SIGMA FLUID MOL 5 l 	1 	PC

C
0510 490103.1 	Filter-Set 	1 	PC
1600 9.0920.10030 SIGMA FLUID MOL 5 l 	1 	PC
1801 6.3816.1 	Drive belt 	1 	PC
...

D
0510 490103.1 	Filter-Set 	1 	PC
...
```

### Padrão por linha de peça
- **Posição** (4 dígitos, ex: 0512, 1600)
- **Código artigo** (ex: 490103.10010, 9.0920.10030)
- **Descrição** (texto livre)
- **Quantidade** (número)
- **Unidade** (PC, PÇ, SE, TER, etc.)

Separadores: espaços e/ou tabs. O código de artigo tem formato típico `X.XXXX.X` ou `X.XXXX.XXXXX`.

### Variações observadas (SATA_SM15T_1176.pdf)
- Linhas sem código: "0510 	Use up part - see bill of mate 1 	PÇ" — ignorar ou usar posição como código
- Unidades: PÇ (PT) vs PC (EN)
- Códigos com notação científica: 9.4945E1
- Algumas linhas com quantidade colada à descrição: "6206 1 	PÇ" — parser deve ser tolerante

### Secções
- Marcadores: **A**, **B**, **C**, **D** (linha isolada antes das peças)
- Ordem: sempre A → B → C → D

---

## 2. Fluxo de importação proposto

### 2.1 Na aplicação (browser)

1. **Botão** "Importar template para esta máquina" no `PecasPlanoModal` (apenas KAESER)
2. **Input file** oculto `accept=".pdf"` — abre explorador de ficheiros (PC e mobile)
3. **Leitura** do ficheiro seleccionado via `FileReader` ou `file.arrayBuffer()`
4. **Parsing** no browser com `pdf-parse` (ou `pdfjs-dist` se necessário)
5. **Extracção** de peças por tipo A/B/C/D com regex/heurísticas
6. **Substituição ou merge** — perguntar ao utilizador: "Substituir plano actual?" ou importar por cima
7. **Feedback** — toast com número de peças importadas por tipo

### 2.2 Parser de texto

```js
// Pseudocódigo
const tipos = ['A', 'B', 'C', 'D']
const resultado = { A: [], B: [], C: [], D: [] }
let tipoAtual = null

for (const linha of texto.split('\n')) {
  if (tipos.includes(linha.trim())) {
    tipoAtual = linha.trim()
    continue
  }
  // Regex: posição (4 dígitos) + código (X.X ou X.XXXX.X) + descrição + qtd + unidade
  const match = linha.match(/^(\d{4})\s+([\d.]+)\s+(.+?)\s+(\d+(?:\.\d+)?)\s+(\w+)\s*$/)
  if (match && tipoAtual) {
    resultado[tipoAtual].push({
      posicao: match[1],
      codigoArtigo: match[2],
      descricao: match[3].trim(),
      quantidade: parseFloat(match[4]),
      unidade: match[5]
    })
  }
}
```

**Nota:** O regex pode precisar de ajustes conforme mais PDFs forem analisados (ex: descrições com números, unidades variadas).

---

## 3. Dependências

| Pacote      | Uso                          | Estado        |
|-------------|------------------------------|---------------|
| `pdf-parse` | Extração de texto no Node     | ✅ Instalado  |
| `pdfjs-dist`| Alternativa (browser)        | ✅ Instalado  |

Para o **browser**, `pdf-parse` tem build web. Verificar se funciona com `data` (ArrayBuffer do ficheiro).

---

## 4. Script de análise (Node)

```bash
node scripts/extract-kaeser-plano-pdf.js [caminho.pdf]
```

Default: `c:\Planos exemplo kaeser\PARQUE_MAQUINAS_SM12_2601.pdf`

---

## 5. Estado actual (v1.8.5)

### Implementado
- Parser `parseKaeserPlanoPdf.js` — extrai A/B/C/D do texto do PDF
- Botão "Importar template para esta máquina" no `PecasPlanoModal` — **exclusivo para marca KAESER**
- Worker `pdf.worker.mjs` em `public/` com `PDFParse.setWorker()` para compatibilidade browser
- **Regra de negócio:** compressores de outras marcas (Fini, ECF, IES, LaPadana) mostram apenas tab Periódica — consumíveis adicionados manualmente

### Próximos passos
1. **Validar** estrutura em mais PDFs (ASK 28T, BSD 72 T, SM15T, etc.)
2. **Testes E2E** para o fluxo de importação (com PDF de fixture ou mock do FileReader)

---

## 6. Intervalos de manutenção (referência)

Conforme documentação KAESER:
- **Tipo A:** 3.000h, 9.000h, 15.000h, … (a cada 6.000h dentro do ciclo)
- **Tipo B:** 6.000h, 18.000h, 30.000h, …
- **Tipo C:** 12.000h, 24.000h, 48.000h, …
- **Tipo D:** 36.000h, 72.000h, 108.000h, …

A aplicação já usa `SEQUENCIA_KAESER` e `INTERVALOS_KAESER` para o ciclo de 12 anos.

---

## 7. Resumo para continuação

**Sessão 2026-02-24:** Implementação completa da importação de PDFs KAESER. Regra de negócio: apenas compressores KAESER têm acesso ao botão de importação e aos tabs A/B/C/D; outras marcas (Fini, ECF, IES, LaPadana) usam apenas Periódica com adição manual de consumíveis um a um.

**Ficheiros principais:** `PecasPlanoModal.jsx`, `parseKaeserPlanoPdf.js`, `public/pdf.worker.mjs`
