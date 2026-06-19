# Fotografias nos relatórios — limites, PDF, email e deploy

Documento de **memória operacional** para agentes e desenvolvimento futuro (v1.16.11+; layout PDF/email v1.17.5).

---

## Constante canónica

| Constante | Valor | Ficheiro |
|-----------|-------|----------|
| `MAX_FOTOS` | **6** | `src/config/limits.js` |

Usada em: `ExecutarManutencaoModal.jsx`, `ExecutarReparacaoModal.jsx`, `gerarPdfRelatorio.js` (`gerarPdfCompacto`), mensagens de UI/toast.

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
| `src/utils/gerarPdfRelatorio.js` | `gerarPdfCompacto`, `addImageFitInBoxMm`, `normalizeRelatorioFotos`, `renderChecklistSection` |

### Ordem canónica (manutenção — v1.17.5)

Corpo principal: cabeçalho → tipo/nº → resumo executivo → dados → pontos de atenção → **checklist (1 página A4)** → **notas (lista)** → fotos → consumíveis/peças.

**Página final dedicada:** próximas manutenções (lista completa) → declaração → assinaturas → rodapé.

Reparação: peças → fotos → notas → checklist no corpo; declaração + assinaturas no fecho.

Detalhe completo: `DOCUMENTACAO.md` § Estrutura do PDF e `.cursor/rules/at-manut-workflow.mdc`.

### Fotos no PDF

- Secção **“Documentação fotográfica”**: grelha de **até 4 fotos por linha** em A4 (largura útil `cW`), espaçamento em mm, **proporção preservada** (`addImageFitInBoxMm` = contain).
- **Nova página** se a linha de miniaturas não couber (`y + cellH > limiar`).
- `getImageProperties` / `addImage` em `try/catch` — foto inválida não derruba o PDF.
- URLs `http(s)` nas fotos: resolução via `loadImageAsDataUrl` (proxy CORS quando necessário).

### Notas

- `linhasNotasRelatorio()` em `execWizardHelpers.js` — uma nota por linha; separa legado com notas rápidas concatenadas.
- Espelho PHP: `atm_linhas_notas_relatorio()` em `send-email.php`.

---

## Servidor cPanel — email + PDF FPDF

| Ficheiro | Notas |
|----------|--------|
| `servidor-cpanel/send-email.php` | `ATM_MAX_FOTOS_RELATORIO` = **6**; PDF FPDF alinhado a `gerarPdfCompacto`; função `f()` normaliza Unicode → Latin-1 (evita mojibake); rótulos da tabela de dados com coluna alargada + `MultiCell`; grelha 4 colunas no PDF; galeria no HTML do email a **4 colunas**. |

### Corpo HTML do email (v1.17.5)

- **Encoding:** texto estático em **UTF-8 literal** no PHP; valores do formulário/BD via `atm_html_esc()` (`htmlspecialchars`, UTF-8). Evita entidades visíveis (`&ccedil;`, `&atilde;`) em clientes que não interpretam HTML entities.
- **MIME:** `Content-Transfer-Encoding: base64` em `text/plain` e `text/html`.
- **Secções:** preheader (pré-visualização móvel), resumo executivo, tabela de dados, pontos de atenção, notas (uma por linha), peças utilizadas, aviso de PDF, fotos, assinatura, mini-tabela das **4 próximas datas**, CTA de contacto (técnico + NAVEL). Versão **text/plain** espelha o essencial.

Payload canónico: `emailService.js` → `resumo_executivo_json` + `proximas_manutencoes_json` + `pecas_usadas_json` + `quick_notes_json` (ver `relatorioPdfResumo.js`).

**Deploy:** sempre que a lógica de fotos/PDF/HTML no email mudar, é obrigatório **fazer upload deste ficheiro** para o servidor (não vai no `dist_upload.zip` da app React).

```powershell
cd c:\Cursor_Projetos\NAVEL\navel-site
node scripts/cpanel-deploy.mjs --file="…\AT_Manut\servidor-cpanel\send-email.php" --remote="public_html/api" --yes
```

---

## ATecnica — acesso a fotos no fluxo de manutenção

- **Continuar execução** já abria o wizard com fotos.
- **Editar** com relatório em rascunho (não assinado): `Manutencoes.jsx` → `openEdit` redirecciona para `setModalExecucao` (mesmo fluxo), para não cair no formulário simples sem fotos.

---

## Testes relacionados

### E2E

- `tests/e2e/09-edge-cases.spec.js` — “Limite de 6 fotos é respeitado” (contador `0/6`).
- `tests/e2e/17-reparacoes-avancado.spec.js` — “Limite de 6 fotos…”, “Contador… 0/6”, toast ao exceder.

```powershell
npx playwright test tests/e2e/09-edge-cases.spec.js tests/e2e/17-reparacoes-avancado.spec.js --grep "Limite de 6 fotos"
```

No modal de **reparação** existem **dois** `input[type="file"]` (câmara com `capture` e galeria com `multiple`). Nos testes Playwright, usar `input[type="file"][multiple]` para evitar *strict mode violation*.

### Unitários

- `tests/unit/execWizardHelpers.test.js` — `linhasNotasRelatorio` (newline, legado, notas rápidas embutidas).

---

## Hosting — limites PHP (referência)

Se o envio de relatório falhar com corpo grande, verificar no cPanel: `post_max_size`, `upload_max_filesize`, `memory_limit`. Com 6 fotos comprimidas o pedido deve manter-se razoável; relatórios antigos com muitas imagens grandes na BD podem exigir migração manual.

---

## Changelog

Resumo por versão: `CHANGELOG.md` (entradas **1.17.x** e anteriores).
