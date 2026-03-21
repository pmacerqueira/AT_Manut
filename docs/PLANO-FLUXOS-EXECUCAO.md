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
- `src/context/DataContext.jsx` — `scheduleSyncProximaParaMaquinas`, `recalcularPeriodicasAposExecucao`.
- `src/components/ExecutarManutencaoModal.jsx` — fluxo de execução / criar hoje / escolha múltipla.
- `src/pages/Manutencoes.jsx` — `executar`, `editar`, `maquinaId`, filtros.

---

*Última actualização: alinhada às entregas v1.16.6 (Fase A — núcleo).*
