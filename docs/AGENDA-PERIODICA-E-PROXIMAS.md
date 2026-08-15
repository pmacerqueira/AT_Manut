# Agenda periódica e «próximas manutenções» — regras canónicas

> **Fonte de verdade** para evitar lapsos como AUTO ELGE Jul/2026 (v1.17.8–1.17.9).  
> Última revisão: 2026-08-15.

---

## 1. Três camadas (não confundir)

| Camada | Onde | Função |
|--------|------|--------|
| **Agenda (BD)** | `manutencoes` abertas + `maquinas.proximaManut` | Slots reais para técnicos (Manutenções → Próximas / Em atraso) |
| **Recálculo** | `agendaDomain.js` → `recalcularPeriodicasNoEstado`, `sincronizarAgendaCompleta` | Regenera cadeia periódica após execução ou sync global |
| **Documento (PDF/email)** | `relatorioManutencaoPayload.js` → `buildProximasManutencoesManutencao` | Lista «Próximas manutenções» no relatório |

**Invariante (desde v1.17.9):** para manutenção **concluída**, PDF/email **espelham** a agenda aberta (`listProximasAgendaPeriodicas`), não uma fórmula isolada.

**Excepção:** wizard / pré-visualização **antes** de concluir → `computarProximasDatas()` (estimativa a partir da data de execução do formulário).

---

## 2. Geração de slots futuros (`agendaDomain.js`)

### Entrada
- `dataBaseIso` = data da **última execução** (não a data de hoje)
- `hojeStr` = hoje (Açores) — filtra slots passados **com regra de atraso**
- `diasOcupados` = dias com manutenções `pendente`/`agendada` (todas as máquinas) → evita colisões no mesmo dia

### Regra `deveIncluirSlotPeriodicoAntesDeHoje` (v1.17.8+)

| Situação | Comportamento |
|----------|----------------|
| Slot ≥ hoje | Criar |
| 1.º slot após execução, atraso ≤ 1 período (ex. Jul em falta após Abr) | **Criar** (aparece em «Em atraso») |
| 1.º slot, atraso > 1 período (âncora antiga) | Saltar, avançar no loop |
| 2.º+ slot passado | Saltar |

**Lapso histórico (v1.16.69–1.17.7):** `if (iso < hojeStr) continue` cego → «Sincronizar agenda» depois de Jul passado **apagava** Jul e saltava para Out.

### Quando recalcular
- `ExecutarManutencaoModal` / `BulkExecutarModal` — ao concluir periódica
- Admin edit — ao gravar periódica concluída
- `sincronizarAgendaCompleta` — botão «Sincronizar agenda» (Dashboard / Manutenções)

### Coerência ficha ↔ agenda
Após recálculo: `maquinas.proximaManut` = `minDataManutencaoAberta(maquinaId, manutencoes)` (`proximaManutAgenda.js`).

### Auditoria de lapsos
- **Domínio:** `src/domain/agendaAuditDomain.js` — buracos entre concluídas, saltos na agenda aberta, slots que sync criaria, `proximaManut` desalinhada.
- **Admin:** Definições → «Auditoria da agenda periódica».
- **CLI:** `node scripts/audit-agenda-gaps.mjs` (exit 1 se houver anomalias; `--json` para export).
- **CLI cadeia 2026+:** `node scripts/audit-2026-cadeia-manutencoes.mjs` — 1.ªs execuções do ano, próximas abertas e paridade com sync simulado (exit 1 se anomalias; `--json`).

---

## 3. PDF e email (`relatorioManutencaoPayload.js`)

### Data de execução (corpo do relatório)
Ordem: `rel.dataCriacao` → `rel.dataAssinatura` → `manutencao.data`.

Deve coincidir com a data real da intervenção (ex. **31/07/2026**, não ano errado).

### Próximas manutenções (página final PDF / tabela email)

```js
buildProximasManutencoesManutencao({ relatorio, manutencao, maquina, manutencoes })
```

1. Se `manutencao.status === 'concluida'` **e** existem slots abertos na agenda → usar **`listProximasAgendaPeriodicas`** (até 12).
2. Senão → **`computarProximasDatas(dataExec, periodicidade)`** (pré-visualização / montagem / fallback).

**Callers obrigados a passar `manutencoes`:** `Manutencoes.jsx`, `Clientes.jsx`, `ExecutarManutencaoModal.jsx`, `EnviarEmailModal.jsx`, `emailService.js` (via email args).

**Lapso histórico (v1.17.8):** só `computarProximasDatas` → datas diferentes da agenda (ex. 29/10 vs 04/11 por conflitos entre elevadores do mesmo cliente).

---

## 4. Numeração de relatórios (API PHP)

**Nunca usar `COUNT(*)+1`** — gera colisões se há buracos na série (ex. `2026.MP.00098` duplicado).

Usar **`atm_proximo_numero_relatorio_sequencial()`** em `data.php` (`MAX` do sufixo + 1), alinhado a `proximoNumeroRelatorioSequencial` no frontend.

Scripts one-off (ex. `scripts/seed-elge-jul2026.mjs`) devem **atribuir número explicitamente** com `proximoNumeroRelatorioSequencial`.

---

## 5. Checklist de verificação (pós-alteração)

1. **Unitários:** `npm run test:unit` — incluir `agendaDomain.test.js`, `agendaProximasParity.test.js`, `relatorioManutencaoPayload.test.js`.
2. **Paridade manual:** para uma máquina concluída, comparar:
   - `maquinas.proximaManut`
   - 1.ª linha aberta em Manutenções → Próximas
   - 1.ª data em PDF «Próximas manutenções agendadas»
3. **Sync tardia:** simular `dataBaseIso` = execução trimestral recente + `hojeStr` no mês seguinte → deve existir slot em atraso ≤ 1 período.
4. **Dois equipamentos mesmo cliente:** 1.º slot pode diferir 1 dia (resolução de conflito) — normal.

---

## 6. Ficheiros canónicos

| Ficheiro | Responsabilidade |
|----------|------------------|
| `src/domain/agendaDomain.js` | Geração e recálculo de slots |
| `src/utils/proximaManutAgenda.js` | Próxima aberta, lista para PDF |
| `src/utils/relatorioManutencaoPayload.js` | Payload PDF/email |
| `src/utils/diasUteis.js` | `computarProximasDatas` (fallback) |
| `src/context/slices/manutencoesSlice.js` | Persistência recálculo |
| `servidor-cpanel/api/data.php` | Numeração relatórios |
| `tests/unit/agendaProximasParity.test.js` | Regressões AUTO ELGE |

---

## 7. Incidente AUTO ELGE (2026-08-15) — lições

1. Trimestre Jul/2026 não aparecia → sync tardia saltava slot passado.
2. PDF mostrava Out/2026 genérico → não espelhava agenda com conflitos resolvidos.
3. Script seed falhou em relatório → `COUNT(*)` no PHP vs série com buracos.

**Correcções:** v1.17.8 (agenda), v1.17.9 (PDF paridade), v1.17.10 (PHP MAX+1, testes, doc).

---

*Ver também:* `docs/PLANO-FLUXOS-EXECUCAO.md`, `.cursor/rules/at-manut-workflow.mdc` (secção Próximas Manutenções).
