# Questionário — Sugestão de fase (horas + anual) e planos por marca

**Como usar no Cursor**

- Marca as opções trocando `[ ]` por `[x]` nas linhas que escolheres.
- Se quiseres usar **Plan mode** do Cursor: abre o Composer / Agent e escolhe **Plan** (ou o modo de plano disponível na tua versão), depois indica: *“Seguir decisões em `docs/PLANO-QUESTIONARIO-SUGESTAO-MANUT.md`”*.
- Campos **Outro:** preenche na mesma linha ou abaixo.

---

## A — Referência temporal (“1 ano” / calendário)

**A1.** O que conta como “passou um ano” para a regra *anual mínima*?

- [ ] **A1a** — 365 dias (ou 366 em ano bissexto) desde `ultimaManutencaoData`
- [ ] **A1b** — 12 meses civis (mesmo dia do mês)
- [ ] **A1c** — Alinhado à `periodicidadeManut` da máquina (anual = 1 ano; semestral = 6 meses; etc.)
- [ ] **A1d** — Data da **próxima** manutenção agendada (`proximaManut`) como referência principal
- [ ] **A1e** — Outro: 

**A2.** Se `ultimaManutencaoData` estiver vazia ou claramente errada:

- [ ] **A2a** — Não sugerir por calendário; só por horas / posição manual
- [ ] **A2b** — Usar data da **primeira montagem** ou primeira manutenção concluída na BD
- [ ] **A2c** — O técnico **confirma** a data de referência no 1.º passo
- [ ] **A2d** — Outro: 

---

## B — O que é “última manutenção” para o cálculo

**B1.** Para Δhoras e para “passou um ano”, a referência deve ser:

- [ ] **B1a** — Última manutenção **concluída** (qualquer tipo)
- [ ] **B1b** — Só manutenções **periódicas** concluídas
- [ ] **B1c** — Só manutenções com **relatório** (checklist/assinatura ou equivalente)
- [ ] **B1d** — Outro: 

**B2.** Se a última intervenção foi **sem** registo de horas no relatório / ficha:

- [ ] **B2a** — Assumir `horasUltima` = último valor conhecido na **ficha** (`horasServicoAcumuladas`)
- [ ] **B2b** — Não calcular Δhoras; mostrar aviso e pedir confirmação manual da fase
- [ ] **B2c** — Admin obrigatório a corrigir ficha antes de sugerir
- [ ] **B2d** — Outro: 

---

## C — Horas: totais vs serviço

**C1.** A regra “intervalo do plano” deve usar principalmente:

- [ ] **C1a** — Só **horas de serviço**
- [ ] **C1b** — Só **horas totais** (contador geral)
- [ ] **C1c** — O que o plano do fabricante indicar por modelo (escolher no equipamento)
- [ ] **C1d** — Outro: 

**C2.** Se só uma das duas leituras existir no equipamento:

- [ ] **C2a** — Exigir sempre as duas no passo “contadores”
- [ ] **C2b** — Uma basta; a outra opcional
- [ ] **C2c** — Outro: 

---

## D — KAESER: horas + ciclo A/B/C/D

**D1.** Sugestão por **horas** deve basear-se em:

- [ ] **D1a** — **Δh desde a última manutenção** vs um **único** passo base (ex.: 3000 h)
- [ ] **D1b** — Δh vs **intervalos diferentes** por tipo (A/B/C/D)
- [ ] **D1c** — Contador **absoluto** mapeado ao ciclo, só como fallback
- [ ] **D1d** — Outro: 

**D2.** Quando **calendário** sugere tipo X e **horas** sugerem tipo Y:

- [ ] **D2a** — Mostrar **as duas** sugestões; o técnico escolhe
- [ ] **D2b** — Prioridade fixa: **calendário** primeiro
- [ ] **D2c** — Prioridade fixa: **horas** primeiro
- [ ] **D2d** — Prioridade: o que **excedeu o limiar** primeiro
- [ ] **D2e** — Outro: 

**D3.** O avanço de `posicaoKaeser` após gravar deve:

- [ ] **D3a** — Sempre refletir o **tipo que o técnico escolheu** (com alinhamento ao ciclo)
- [ ] **D3b** — Só avançar se o técnico marcar “confirmo alinhamento com plano oficial”
- [ ] **D3c** — Admin pode corrigir `posicaoKaeser` sem reexecutar relatório
- [ ] **D3d** — Outro: 

---

## E — Primeira execução / dados incompletos

**E1.** Equipamento novo ou sem histórico fiável:

- [ ] **E1a** — Sem sugestão automática de fase; só após 1.ª conclusão
- [ ] **E1b** — Sugestão só por **horas actuais** (absoluto)
- [ ] **E1c** — Sugestão = **posição inicial** na ficha (ex. Ano 1 / Tipo A)
- [ ] **E1d** — Outro: 

---

## F — Outras marcas e planos (futuro)

**F1.** Onde vivem intervalos (horas + regra anual) para não-KAESER?

- [ ] **F1a** — Só em **dados** ligados a `planoManutencaoCompressor` (configurável)
- [ ] **F1b** — Tabela **código** por `marca` + `plano` durante transição
- [ ] **F1c** — Misto: defaults em código, overrides na BD
- [ ] **F1d** — Outro: 

**F2.** Para uma marca com plano “só horas” sem ciclo de 12 anos:

- [ ] **F2a** — Mesmo pipeline UX (horas → consumíveis → checklist → …)
- [ ] **F2b** — Passo “fase” mais simples (lista de intervalos)
- [ ] **F2c** — Outro: 

---

## G — UX no modal

**G1.** No passo inicial dos compressores, mostrar **resumo** (última data, horas então, Δh, dias, limiares)?

- [ ] **G1a** — Sim, sempre visível
- [ ] **G1b** — Só em “Detalhes do cálculo” (expansível)
- [ ] **G1c** — Outro: 

**G2.** Texto da sugestão deve dizer **porque** (“anual”, “Δh ≥ …”)?

- [ ] **G2a** — Sim, sempre
- [ ] **G2b** — Sim, só em modo detalhe
- [ ] **G2c** — Não; só o tipo sugerido
- [ ] **G2d** — Outro: 

**G3.** Ao mudar o tipo A/B/C/D **depois** de editar consumíveis:

- [ ] **G3a** — Perguntar: substituir / fundir / cancelar
- [ ] **G3b** — Substituir sempre + toast
- [ ] **G3c** — Nunca auto; só “Recarregar do plano”
- [ ] **G3d** — Outro: 

---

## H — Dados e integridade

**H1.** Gravar no **relatório** para auditoria:

- [ ] **H1a** — Horas na altura da execução (reforçar o que já existe)
- [ ] **H1b** — Tipo escolhido **e** tipo **sugerido** pela app
- [ ] **H1c** — Motivo da sugestão (`anual` | `horas` | `manual` | `fallback`)
- [ ] **H1d** — Não; manter mínimo
- [ ] **H1e** — Outro: 

**H2.** Tipo diferente da sugestão:

- [ ] **H2a** — Só log interno
- [ ] **H2b** — Campo opcional “motivo da alteração”
- [ ] **H2c** — Outro: 

**H3.** Conflito ficha vs último relatório:

- [ ] **H3a** — Prioridade ao **último relatório concluído**
- [ ] **H3b** — Prioridade à **ficha**
- [ ] **H3c** — Aviso + confirmação no modal
- [ ] **H3d** — Outro: 

---

## I — Admin e edição posterior

**I1.** Admin ao **editar** relatório antigo:

- [ ] **I1a** — Pode alterar tipo/consumíveis; recalcular `posicaoKaeser` opcional
- [ ] **I1b** — Pode alterar mas **não** mexer em `posicaoKaeser` automaticamente
- [ ] **I1c** — Outro: 

**I2.** Relatório corrigido retroativamente atualiza ficha (`ultimaManutencaoData` / contadores)?

- [ ] **I2a** — Sim, se a data de execução for a mais recente
- [ ] **I2b** — Nunca automático; botão “Sincronizar ficha”
- [ ] **I2c** — Outro: 

---

## J — PDF / email

**J1.** No PDF, linha sobre “calendário vs horas”?

- [ ] **J1a** — Sim, linha curta no bloco KAESER
- [ ] **J1b** — Só se nas notas
- [ ] **J1c** — Não
- [ ] **J1d** — Outro: 

---

## K — Avisos e ajuda

**K1.** “Anual” mas Δh muito alto:

- [ ] **K1a** — Warning no modal
- [ ] **K1b** — Hint discreto
- [ ] **K1c** — Nada
- [ ] **K1d** — Outro: 

**K2.** Glossário “o que ocorrer primeiro” na app?

- [ ] **K2a** — Sim, link “?” no passo KAESER
- [ ] **K2b** — Só documentação / manual
- [ ] **K2c** — Outro: 

---

## L — Aberto (preencher texto)

- **L1.** Limiar por defeito KAESER (h entre visitas, se um único valor): 
- **L2.** Excepções legais / texto fixo Navel no relatório: 
- **L3.** Ordem de desenvolvimento (1 = primeiro): sugestão Δh+anual ___ · sugerido vs escolhido ___ · outras marcas ___

---

## Decisões provisórias já reflectidas no código (até ao questionário formal)

Versão **v1.16.21** implementa por defeito: **A1a** (365 d desde `ultimaManutencaoData`, com fallback A2b na ficha), **B1a** / **B2a**, **C1a** / **C2b**, **D1a** (Δh vs 3000 h) / **D2a** (mostrar ambas), **G1b–G3a**, **H1b–H3c**, **J1a**, **K1a** / **K2a**, **L1** = 3000 h. Campos de relatório: `tipo_manut_kaeser_sugerido`, `sugestao_fase_motivo` (`anual` \| `horas` \| `ambos` \| `manual` \| `fallback`).

*Documento gerado para decisões de produto; actualizar após respostas e antes de implementação.*
