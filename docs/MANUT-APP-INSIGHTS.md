# AT_Manut — Continuidade entre Agentes e Memória Operacional

> Documento canónico para manter continuidade quando muda o agente/modelo no Cursor.
> Última revisão: 2026-10-08.

---

## 1) Verdades operacionais (sem ambiguidades)

- **Não existe memória global automática** entre todos os chats/sessões.
- **Não existe aprendizagem permanente automática** de um modelo para outro só por conversação.
- A continuidade é garantida por artefactos do projeto: **código, regras, changelog e notas de sessão**.

---

## 2) Como garantir continuidade forte entre agentes

### A. Regras bem escritas
- `/.cursor/rules/at-manut-workflow.mdc` é obrigatória e sempre aplicada.
- Todas as decisões de arquitetura devem ser refletidas nesta regra quando passarem a padrão estável.

### B. Changelog orientado a decisão
- `CHANGELOG.md` deve explicar **porque** a mudança foi feita (não só o que mudou).
- Sempre que houver correção crítica, registar impacto funcional e risco mitigado.

### C. Notas de sessão
- Registar decisões e contexto de sessões relevantes no `CHANGELOG.md` e, quando justificado, em documentos dedicados em `docs/`.
- Cada nota deve incluir: contexto, problema, causa raiz, ficheiros alterados e próximos passos.

---

## 3) Protocolo obrigatório no início de cada conversa

O agente deve começar com um resumo curto em 5 pontos:
1. Objetivo atual (1 frase).
2. Estado confirmado do projeto (build/teste/deploy).
3. Risco principal ativo.
4. Ficheiros/fonte de verdade a consultar primeiro.
5. Próxima ação concreta.

---

## 4) Fontes canónicas por tema

- Arquitetura e fluxos: `DOCUMENTACAO.md`
- Execução de desenvolvimento: `DESENVOLVIMENTO.md`
- Regras de trabalho do agente: `.cursor/rules/at-manut-workflow.mdc`
- Histórico de versões: `CHANGELOG.md`
- Testes e regressões: `docs/TESTES-E2E.md`

Evitar duplicar as mesmas instruções em vários ficheiros. Se existir conflito, vence a fonte canónica.

---

## 5) Recuperação pós-crash — workspace multi-projecto

O workspace `c:\Cursor_Projetos\NAVEL` contém vários projectos independentes (AT_Manut, app-ftecnicas, app-stocks-next, navel-site). Quando o Cursor crasha e reinicia, pode perder o contexto de qual projecto estava activo.

### Problema documentado (2026-03-12)
- Agente estava a trabalhar no AT_Manut.
- Cursor crashou e reiniciou na raiz do workspace NAVEL.
- Novo agente assumiu incorrectamente que estava no app-ftecnicas e fez build do projecto errado.
- Utilizador teve de intervir manualmente para corrigir.

### Solução implementada
- **Regra global** (`.cursor/rules/navel-workspace.mdc`) com mapa de projectos, regras de build/deploy por projecto, e protocolo de recuperação.
- **Regra AT_Manut** (`.cursor/rules/at-manut-workflow.mdc`) actualizada com secção de crash recovery.
- **Pistas de contexto** para agentes: "public_html/manut" = AT_Manut; "app-ftecnicas" = outro projecto.

### Protocolo obrigatório pós-crash
1. Verificar agent-transcripts e ficheiros abertos para identificar projecto activo.
2. Se ambíguo, **perguntar ao utilizador** — nunca assumir.
3. Confirmar com `git status` dentro da pasta correcta antes de qualquer acção.
4. Nunca executar build/deploy sem confirmar o projecto.

---

## 7) Handoff — Agenda periódica AUTO ELGE (2026-08-15)

**Problema:** trimestre Jul/2026 em falta; PDF com datas diferentes da agenda.

**Causas:** (1) `gerarManutencoesPeriodicasFuturas` saltava slots passados sem excepção de atraso ≤1 período; (2) PDF usava só `computarProximasDatas` (ignorava conflitos entre elevadores); (3) PHP `COUNT(*)+1` na numeração de relatórios.

**Correcções:** v1.17.8 (`deveIncluirSlotPeriodicoAntesDeHoje`), v1.17.9 (paridade PDF), v1.17.10 (PHP MAX+1, testes `agendaProximasParity.test.js`).

**Doc canónica:** [`docs/AGENDA-PERIODICA-E-PROXIMAS.md`](AGENDA-PERIODICA-E-PROXIMAS.md) — consultar antes de alterar agenda, sync ou secção «próximas» do PDF.

**Verificação rápida:** `maquinas.proximaManut` = 1.ª linha aberta na lista = 1.ª data no PDF (manutenção concluída).

---

## 8) Handoff — relatórios e fotos (2026-10-08)

**Publicado:** ver `src/config/version.js`. PWA em `public_html/manut/` e `send-email.php` em `public_html/api/`.

**O que ficou estável:**
- Manutenção preventiva de elevadores: execução e observação separadas, documentos, teste com veículo e 2 ciclos, fora de âmbito, nota legal, quadro de fora de serviço, planeamento por baixo das próximas datas.
- Rótulos da checklist por extenso (`rotuloRespostaPdf`). «2 CICLOS» mantém-se no teste com carga. Coluna de 38 mm no jsPDF e no FPDF.
- Foto da chapa e mais uma foto do equipamento e do local, em qualquer equipamento, na manutenção e ao concluir a reparação. Aviso amarelo até OK.
- O email não falha se `quick_notes_json` não vier no pedido (`atm_quick_notes_default_list`).
- Snapshots já assinados não se reescrevem. O catálogo de normas continua `validado: false`.

**Doc canónica:** [`docs/PLANO-RELATORIOS-ELEVADORES-PREVENTIVA.md`](PLANO-RELATORIOS-ELEVADORES-PREVENTIVA.md) e [`docs/FOTOS-PDF-EMAIL-LIMITES.md`](FOTOS-PDF-EMAIL-LIMITES.md).

**Ainda de fora, de propósito:** execução em lote sem foto de cada máquina; catálogo de normas por validar; a pergunta viva «Validar o bom funcionamento antes do elevador ser recolocado em serviço» não foi reescrita.

---

## 9) Handoff — técnico no terreno (2026-10-08, v1.17.31)

**Origem:** avaliação de UX pedida pelo Pedro; implementados os pontos 1–4. **Ponto 5 (execução em lote) fica para análise conjunta** — as operações em lote são do Admin, não dos técnicos.

**O que mudou e onde:**
- Rascunho automático do wizard: `src/services/execDraft.js` + bloco de restauro/autosave em `ExecutarManutencaoModal.jsx` (`draftInfo`, `bootstrapTick`, `descartarRascunho`). Repõe só se `sig` (manutenção|relatório|checklist) coincidir e ≤ 14 dias. Cancelar guarda em vez de perder.
- Checklist sem «Marcar todos»: `ChecklistStep.jsx` (só «Desmarcar todos»); `ChecklistElevadorPonto.jsx` com atalho «Executado, sem anomalia» excepto em pontos de segurança (`pontoImplicaForaDeServico`). Elevadores sem pré-preenchimento da visita anterior (`fontePreFill`).
- Painel «Na última visita»: `src/domain/ultimaVisitaDomain.js` + `UltimaVisitaPanel.jsx` (passo 1).
- Fila offline em IndexedDB: `syncQueue.js` (API síncrona mantida; `initQueue()` no mount do `DataContext`); Dashboard «O meu dia» com bloco «por enviar» (`pendentesEnvioDomain.js`).

**Testes:** 189 unitários. Specs E2E 04 e 09 repostos a 43/43 — cinco testes de 04 e três de 09 já falhavam na v1.17.30 por mudanças do modelo de elevadores; os helpers (`checklistMarcarTodos`, `execWizardSeguinte`, `ensureNotasComFrasePredefinida`, `preencherContextoElevadorChecklist`, `preencherFuncaoAssinanteElevador`) foram alinhados.

**Risco a vigiar:** rascunho reposto noutro dispositivo não acontece (é local); se o Admin corrigir o relatório entretanto, a `sig` muda e o rascunho é descartado — comportamento desejado.

---

## 10) Handoff — auditoria responsiva (2026-10-09, v1.17.32)

**Origem:** auditoria aos fluxos do técnico em telemóvel (390×844) e tablet (820×1180) com Playwright (`isMobile`, `hasTouch`), como ATecnica. Sem overflow horizontal; os problemas estavam no assistente de execução no telemóvel. Cinco melhorias + notas menores, todas implementadas e verificadas por screenshot (toasts = 0 nos bloqueios; rodapés numa fila; checklist 2 colunas; rodapé da reparação visível sem scroll; «Menu» fecha o menu).

**O que mudou e onde:**
- Validação inline sem toast: `avisarBloqueio` (ExecutarManutencaoModal) só define `erroChecklist`/`erroAssinatura`; `Toast.jsx` exporta `clearToasts`; o wizard limpa toasts em cada `step` e no unmount. Estilo `.modal-relatorio-form .form-erro` (caixa vermelha, ícone «!», `scroll-margin-top`).
- Cabeçalho/rodapé do wizard: `.wizard-head` + `.wizard-close` (×); `.wizard-footer-cancel` oculto ≤480 px; `.wizard-btn-prev` só ícone; `.wizard-btn-next` flex 1; `.wizard-footer--final` para Gravar/Enviar.
- Checklist elevador: `ChecklistElevadorPonto.jsx` com `detalhePedido` + `.checklist-detalhe-toggle`; grelha 2 colunas em `.checklist-item-btns--elevador`.
- Reparação: `ExecutarReparacaoModal.jsx` sem «Cancelar» no rodapé; CSS ≤600 px `height: 100dvh`; `Reparacoes.css` exclui `.modal-exec-rep` da regra de rodapé em coluna.
- Admin-only: `AgendaCompletaRefreshButton` em Dashboard/Manutenções e «Selecionar» em Manutenções. Cartão mobile: «Editar» directo quando é a única acção; badge «5d atraso / em 10d».
- Layout: `.sidebar-backdrop { bottom: nav-height }`; `.offline-banner--ready` pílula fixa `pointer-events: none`; `.bnav-item` 12 px.
- Mínimos: `@media (pointer: coarse)` inputs 16 px `!important` (dentro do bloco ≤1024 px do `index.css`); `clamp(0.75rem, 2.2vw, 0.88rem)` nos títulos de modais.

**Não feito / a decidir:** teste manual offline real (os screenshots offline do Playwright saem em branco por limitação do `goto` sem rede — seguir `docs/TESTE-OFFLINE-MANUAL.md`); ponto 5 da avaliação anterior (execução em lote) continua por analisar.

---

## 6) Política de limpeza documental

- Conteúdo redundante deve ser removido ou substituído por referência ao documento canónico.
- Conteúdo obsoleto deve ser reescrito com estado atual ou marcado explicitamente como histórico.
- Antes de criar novo `.md`, validar se o tema já existe num documento canónico.
