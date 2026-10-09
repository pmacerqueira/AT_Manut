# Plano de execução — Fluxos canónicos e redução de redundâncias (AT_Manut)

Documento vivo: decisões de produto acordadas com o Pedro Cerqueira (Navel) e fases técnicas para elevar consistência, UX (incl. tablets Samsung / campo) e manutenibilidade.

## Princípios

1. **Uma regra canónica por conceito** — ex.: primeira intervenção “aberta” = função única na agenda (`minDataManutencaoAberta` / `listManutencoesAbertasOrdenadas`), não cópias em modais.
2. **Sem criação silenciosa de `manutencoes`** — qualquer nova linha exige confirmação explícita do utilizador.
3. **Hábito único para executar** — a execução do relatório/checklist arranca preferencialmente a partir de **Manutenções** (lista filtrada), não de atalhos opacos em **Equipamentos**.
4. **Mobile / tablet** — percurso curto, estado do processo legível (títulos, hints, sem “labirintos” de botões equivalentes).

## Decisões de produto (2026-03)

| # | Tema | Decisão |
|---|------|--------|
| 1 | Sem manutenção aberta no equipamento | Permitir botão explícito **«Criar intervenção para hoje»** com **confirmação** (não auto-create). |
| 2 | Botão «Executar» em Equipamentos | **Remover**; substituir por **«Ver próximas / Manutenções»** com filtro por máquina (`?filter=proximas&maquinaId=`). |
| 3 | Calendário | Incluir **Executar** na mesma onda que a segurança do modal (navegação `?executar=`). |
| 4 | Este plano | **Persistido no repo** (`docs/PLANO-FLUXOS-EXECUCAO.md`) e referenciado no `CHANGELOG` quando fases forem fechadas. |

## Reflexão UX (tablets / ATecnica)

Objetivo: **mínimo percurso** sem **redundâncias** que façam perder o contexto (“onde estou no fluxo?”). Recomendações:

- **Um ecrã = uma intenção principal** (ex.: Calendário = visão temporal; Manutenções próximas = trabalhar hoje).
- **Atalhos** só quando reutilizam o **mesmo** código e a **mesma** regra de negócio (ex.: `executar=` na URL).
- **Copy curta** em botões críticos («Próximas deste equipamento» em vez de «Ir»).
- Revisão periódica de **touch targets** (min. 44px) e hierarquia visual nos ecrãs já responsivos (`Calendario`, `Manutencoes`, modais).

## Técnico no terreno — regras do assistente (v1.17.31)

| Regra | Comportamento |
|---|---|
| **Rascunho automático** | Tudo o que o técnico preenche fica guardado no dispositivo (IndexedDB `atm_exec_drafts_v1`) e é reposto ao reabrir a **mesma** manutenção, se o relatório/checklist não mudou entretanto e tiver ≤ 14 dias. Faixa «Rascunho das HH:MM recuperado» com «Começar de novo». **Cancelar** guarda, não apaga. Apaga-se ao concluir. Correcção pelo Admin não usa rascunho. |
| **Um toque por ponto** | Não existe «Marcar todos» nem «Sem anomalia nos pontos aplicáveis» em nenhuma categoria. Elevador: atalho «Executado, sem anomalia» só nos pontos correntes; nos **pontos de segurança** responde-se à execução e à observação em separado (linha destacada). |
| **Sem pré-preenchimento em elevadores** | As respostas da visita anterior não vêm marcadas — cada ponto é uma decisão desta visita. As outras categorias mantêm o pré-preenchimento com indicação visível. |
| **«Na última visita»** | Painel no passo 1: data/há N dias, técnico, n.º do relatório, anomalias (descrição + recomendação), documentos em falta, pontos por fazer e motivo, fora de serviço, reparação pedida, contador, primeiras notas. Sem histórico: «Primeira intervenção registada neste equipamento.» |
| **Por enviar** | Fila offline em IndexedDB `atm_sync_queue_v1`; Dashboard «O meu dia» lista «Guardado neste telemóvel, por enviar ao servidor» por equipamento/cliente, com «Sincronizar agora». |
| **Execução em lote** | Exclusiva do Admin; por analisar em conjunto (ponto 5 da avaliação). |

## Telemóvel e tablet — regras do assistente (v1.17.32)

| Regra | Comportamento |
|---|---|
| **Bloqueio inline, sem toast** | Qualquer validação que impeça «Seguinte»/«Gravar» aparece numa caixa vermelha no topo do passo (`.form-erro`) com scroll até lá. O assistente fecha todos os toasts ao mudar de passo e ao sair (`clearToasts`). |
| **Rodapé numa fila** (≤480 px) | `[‹] [Seguinte ———]`; último passo `[‹] [Gravar] [Enviar]`. «Cancelar» só no desktop/tablet — no telemóvel sai-se pelo **×** do cabeçalho (`aria-label="Sair do assistente"`, mesmo diálogo de confirmação/rascunho). |
| **Checklist elevador compacta** | Botões em 2 colunas (3 no tablet). Pontos correntes: atalho «Executado, sem anomalia» + «Responder em detalhe» (abre os grupos feito/observado; abrem sozinhos se já houver resposta fora do atalho). Pontos de segurança: grupos sempre visíveis. |
| **Modal de reparação** | Ecrã inteiro no telemóvel, rodapé fixo `[👁] [Guardar progresso] / [Concluir e assinar]`; sem «Cancelar» (× no cabeçalho). |
| **Só o que o técnico precisa** | «Sincronizar agenda» e «Selecionar» (lote) são Admin-only. Cartão com uma única acção mostra «Editar» directo. Badge «5d atraso / Hoje / em 10d». |
| **Foto da chapa: câmara ou galeria** (v1.17.34) | Passo 1 e reparação têm «Tirar foto da chapa» e «Galeria». Da câmara fica cópia em Transferências; da galeria não. Em ambos a imagem é reduzida por `comprimirFotoParaRelatorio` (≤1200 px, ~200–320 KB) — um original de 11,6 MB passa a ~194 KB. |
| **Mínimos de leitura/toque** | Campos ≥ 16 px em ecrãs tácteis (sem zoom iOS); texto ≥ 12 px; barra verde de prontidão como pílula flutuante que não bloqueia toques; «Menu» da barra inferior fecha o menu lateral. |

## Fases técnicas

### Fase A — Executar seguro (P0) — *fechada em v1.16.6*

- [x] `listManutencoesAbertasOrdenadas` / `candidatosMesmaDataMinimaAberta` (`proximaManutAgenda.js`).
- [x] Modal: sem auto-`addManutencao`; ecrã **sem intervenção aberta** + confirmação para criar hoje; ecrã **várias com mesma data mínima** (escolha).
- [x] Equipamentos: sem “Executar”; botão **Próximas** → `manutencoes?filter=proximas&maquinaId=`.
- [x] Calendário: ícone Executar / Continuar → `manutencoes?filter=proximas&executar=`.
- [x] Manutenções: query `maquinaId` + filtro + banner “Mostrar todas”.

### Fase B — PATCH `proximaManut` / duplicações (P1)

- [ ] Inventário de `updateMaquina` com `proximaManut` fora do `DataContext`.
- [ ] Remover escritas redundantes no modal de conclusão onde `scheduleSync` + recalc já cobrem.

### Fase C — Copy e navegação (P1)

- [ ] Tooltips: Agendar vs Nova manutenção vs Calendário.
- [ ] Admin: nota de atalho «equipamento canónico em Equipamentos».

### Fase D — Documentação e E2E (P2)

- [ ] `docs/FLUXOS-CANONICOS.md` (tabela tarefa → rota → atalhos).
- [ ] E2E: 0/1/N abertas; mesma data mínima; criar hoje com confirmação.
- [ ] Regra em `.cursor/rules`: proibido `addManutencao` implícito sem confirmação no fluxo de execução.

### Fase E — Opcional

- [ ] Telemetria `logger.action` com `origem` ao abrir execução.
- [ ] QR / pesquisa global alinhados ao mesmo helper de navegação.

## Referências de código

- `src/utils/proximaManutAgenda.js` — regras de agenda “aberta”.
- `src/domain/agendaDomain.js` — geração/recálculo de slots periódicos (`deveIncluirSlotPeriodicoAntesDeHoje`).
- `docs/AGENDA-PERIODICA-E-PROXIMAS.md` — paridade agenda ↔ PDF/email.
- `src/context/DataContext.jsx` — `scheduleSyncProximaParaMaquinas`, `recalcularPeriodicasAposExecucao`.
- `src/components/ExecutarManutencaoModal.jsx` — fluxo de execução / criar hoje / escolha múltipla.
- `src/pages/Manutencoes.jsx` — `executar`, `editar`, `maquinaId`, filtros.

---

*Última actualização: alinhada às entregas v1.16.6 (Fase A — núcleo).*
