# Fotografias nos relatórios — limites, PDF, email e deploy

Documento de **memória operacional** para agentes e desenvolvimento futuro (v1.16.11+).

---

## Constante canónica

| Constante | Valor | Ficheiro |
|-----------|-------|----------|
| `MAX_FOTOS` | **6** | `src/config/limits.js` |

Usada em: `ExecutarManutencaoModal.jsx`, `ExecutarReparacaoModal.jsx`, `gerarPdfRelatorio.js` (`gerarPdfCompacto`), `relatorioHtml.js`, `relatorioReparacaoHtml.js`, mensagens de UI/toast.

**Dados legados** com mais de 6 entradas no array `fotos`: HTML e PDF mostram **apenas as primeiras 6**; o PDF compacto pode indicar no subtítulo que existem mais fotografias no total (quando aplicável).

---

## Compressão no dispositivo (tablet / telemóvel)

| Ficheiro | Função |
|----------|--------|
| `src/utils/comprimirImagemRelatorio.js` | `fileToMemory`, `comprimirFotoParaRelatorio` |

- Várias passagens JPEG (lado máximo decrescente até ~640px, qualidade decrescente).
- Meta “suave” de tamanho da string base64 ~380k caracteres por foto.
- Se ainda exceder ~560k, última passagem extra (~520px, qualidade ~0,32).
- Objetivo: reduzir crashes por memória e payloads HTTP grandes em **Chrome / Edge / Firefox** em equipamentos tipo **Samsung Galaxy A10, A11, S10**.

---

## PDF compacto (browser — jsPDF)

| Ficheiro | Função |
|----------|--------|
| `src/utils/gerarPdfRelatorio.js` | `gerarPdfCompacto`, `addImageFitInBoxMm`, `normalizeRelatorioFotos` |

- Secção **“Documentação fotográfica”**: grelha de **até 4 fotos por linha** em A4 (largura útil `cW`), espaçamento em mm, **proporção preservada** (`addImageFitInBoxMm` = contain).
- **Nova página** se a linha de miniaturas não couber (`y + cellH > limiar`).
- `getImageProperties` / `addImage` em `try/catch` — foto inválida não derruba o PDF.
- URLs `http(s)` nas fotos: resolução via `loadImageAsDataUrl` (proxy CORS quando necessário).

**Ordem canónica das secções** do PDF: ver `.cursor/rules/at-manut-workflow.mdc` (secção 6 actualizada para grelha + máx. 6).

---

## HTML de relatório (impressão / pré-visualização)

| Ficheiro | Função |
|----------|--------|
| `src/utils/relatorioBaseStyles.js` | `htmlFotos` — linhas de 1, 2, 3 ou 4 fotos (`rpt-fotos-row--single|pair|triple|quad`) |
| `src/utils/relatorioHtml.js` | Manutenção periódica / montagem |
| `src/utils/relatorioReparacaoHtml.js` | Reparação |

`object-fit: contain`; `page-break-inside: avoid` nas linhas da grelha.

---

## Servidor cPanel — email + PDF FPDF

| Ficheiro | Notas |
|----------|--------|
| `servidor-cpanel/send-email.php` | `ATM_MAX_FOTOS_RELATORIO` = **6** após parse de `photos_json`; PDF com grelha 4 colunas e `imageFitContain`; galeria no HTML do email a **4 colunas** (largura ~132px). |

**Deploy:** sempre que a lógica de fotos/PDF no email mudar, é obrigatório **fazer upload deste ficheiro** para o servidor (não vai no `dist_upload.zip` da app React).

---

## ATecnica — acesso a fotos no fluxo de manutenção

- **Continuar execução** já abria o wizard com fotos.
- **Editar** com relatório em rascunho (não assinado): `Manutencoes.jsx` → `openEdit` redirecciona para `setModalExecucao` (mesmo fluxo), para não cair no formulário simples sem fotos.

---

## Testes E2E relacionados

- `tests/e2e/09-edge-cases.spec.js` — “Limite de 6 fotos é respeitado” (contador `0/6`).
- `tests/e2e/17-reparacoes-avancado.spec.js` — “Limite de 6 fotos…”, “Contador… 0/6”, toast ao exceder.

Comando útil:

```powershell
npx playwright test tests/e2e/09-edge-cases.spec.js tests/e2e/17-reparacoes-avancado.spec.js --grep "Limite de 6 fotos"
```

No modal de **reparação** existem **dois** `input[type="file"]` (câmara com `capture` e galeria com `multiple`). Nos testes Playwright, usar `input[type="file"][multiple]` para evitar *strict mode violation*.

---

## Hosting — limites PHP (referência)

Se o envio de relatório falhar com corpo grande, verificar no cPanel: `post_max_size`, `upload_max_filesize`, `memory_limit`. Com 6 fotos comprimidas o pedido deve manter-se razoável; relatórios antigos com muitas imagens grandes na BD podem exigir migração manual.

---

## Changelog

Resumo por versão: `CHANGELOG.md` (entradas **1.16.9**–**1.16.11**).
