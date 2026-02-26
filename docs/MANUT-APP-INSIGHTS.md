# AT_Manut — Insights de Desenvolvimento e Estado Técnico

> Referência sobre decisões de arquitectura, estado actual e próximos passos técnicos.
> Última revisão: 2026-02-26 — v1.9.3

---

## 1. Contexto e posicionamento

O AT_Manut é uma aplicação web PWA de gestão de manutenção e reparações destinada às equipas da Navel-Açores, Lda. Os utilizadores actuam no terreno com equipamentos industriais, por vezes em condições adversas:

- Conectividade instável ou inexistente
- Mãos sujas ou com luvas
- Pressão de tempo
- Perfis tecnológicos variados

---

## 2. Arquitectura actual (v1.9.3)

```
Fonte de verdade:  PHP + MySQL no cPanel
Cache offline:     localStorage (atm_*) via localCache.js (TTL 30 dias)
Autenticação:      JWT em sessionStorage (sessão por janela)
Sync offline:      syncQueue.js → processado ao reconectar (optimistic update)
Alertas:           AlertaProactivoModal + atm_config_alertas + atm_alertas_dismiss
PWA:               manifest.json + ícones optimizados (installable)
```

### O que funciona bem
- **Multi-dispositivo:** qualquer dispositivo autenticado lê/escreve os mesmos dados MySQL
- **Offline-first:** dados em cache, operações enfileiradas (optimistic), banner de estado visual
- **Conformidade:** alertas proactivos ao Admin, email automático ao cliente, badge de conformidade
- **Automação:** reagendamento automático após cada execução periódica (próximos 2 anos)
- **QR Code:** etiqueta 90×50mm pronta a colar + leitura via câmara
- **Reparações:** fluxo multi-dia completo com fotos, peças, assinatura e relatório ISTOBAL
- **Testes:** 441 testes E2E a 100% — offline, mobile, permissões, performance cobertas

### O que ainda não temos
- **Actualizações em tempo real** — se Admin cria manutenção no computador, ATecnica só vê ao refrescar (não é problema prático para equipa pequena)
- **Notificações push** — Web Push API não implementada (cron diário de email existe como alternativa)
- **Valores de custo/venda em reparações** — estrutura de peças existe; falta camada de preços para faturação interna

---

## 3. Módulo Reparações — decisões de design

### Fluxo multi-dia
A distinção entre "Guardar progresso" (sem assinatura, `em_progresso`) e "Concluir" (com assinatura, `concluida`) permite que o técnico registe trabalho parcial ao longo de vários dias sem bloquear o relatório final.

### ISTOBAL — fluxo de negócio
- **ISTOBAL fábrica (Espanha):** fornecedor de máquinas, envia avisos por email `isat@istobal.com`
- **ISTOBAL Portugal (Portugal):** subsidiária portuguesa, é quem fatura os serviços prestados
- Avisos chegam no formato ES-XXXXXXXX-NNN → Navel executa → relatório individual → resumo mensal faturado à ISTOBAL Portugal, Lda.
- O relatório mensal no botão "Mensal ISTOBAL" serve de base para a fatura mensal

### Peças usadas (sem preços)
Por deliberação, os relatórios ao cliente nunca mostram preços de custo ou venda. As peças registadas (referência + descrição + quantidade) servem para controlo interno e para a fase de faturação, que ocorre externamente à aplicação.

### Rodapé em relatórios
Todos os relatórios de reparação incluem `APP_FOOTER_TEXT` (`Navel-Açores, Lda — Todos os direitos reservados · v{versão}`) implementado via `.rel-footer` em `Reparacoes.jsx`.

---

## 4. Backlog técnico por fase

### Fase imediata (v2.x)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| P1 | **Notificações push** — Web Push API, manutenções a vencer em 3 dias | Alto | Alto |
| P2 | **Entrada por voz** — `SpeechRecognition` em campos de notas | Médio | Médio |
| P3 | **Relatório executivo PDF** — visão da frota para apresentar ao cliente | Médio | Médio |
| P4 | **Valores de custo/venda em reparações** — camada interna de preços | Alto | Médio |

### Fase média (v3.x)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| M1 | **Realtime multi-dispositivo** — Supabase Realtime (WebSockets) | Alto | Alto |
| M2 | **App nativa** — Capacitor (iOS + Android) | Alto | Muito alto |
| M3 | **Actualização automática multi-tab** — BroadcastChannel API | Baixo | Baixo |

---

## 5. UX para utilizadores com pouco conhecimento digital

### Já implementado (v1.9.3)
- Layouts diferentes para mobile (cards) vs. desktop (tabela)
- Botões com área de toque ≥ 44px (WCAG 2.5.5)
- Confirmação antes de apagar
- Toast centrado com feedback imediato
- Indicadores de estado por cores (verde/laranja/vermelho)
- PWA instalável no ecrã inicial
- Indicador offline/online com banner
- Cache local + fila de sincronização (optimistic update)
- QR codes para identificação de máquinas no terreno
- Leitor QR via câmara (abre ficha directamente)
- Breadcrumbs de navegação
- Alto contraste para uso no exterior (Modo campo)
- Pesquisa global Ctrl+K
- Assinatura digital no próprio dispositivo

---

## 6. Métricas de sucesso

| Métrica | Como medir | Objectivo |
|---------|-----------|-----------|
| Tempo para registar 1 manutenção | Cronometrar com técnico | < 60 segundos |
| Tempo para criar + executar 1 reparação | Cronometrar com técnico | < 2 minutos |
| Taxa de registos completos | Analisar dados no localStorage | > 90% completos |
| Erros críticos/semana | `atm_log` filtrado por `fatal/error` | 0 erros críticos |
| Uso mobile vs. desktop | Analisar user-agent (futuro) | > 60% mobile |

---

## 7. Referências e leituras recomendadas

- [CMMS UI/UX Design Guide — Aufait UX](https://www.aufaitux.com/blog/cmms-ui-ux-design/)
- [Offline-First Android App for Field Inspections — TechGrid](https://techgrid.media/interviews/sync-or-fail-inside-an-offline-first-android-app-built-for-field-inspections/)
- [TRACTIAN Mobile CMMS](https://tractian.com/en/solutions/cmms/mobile-app)
- [Fabriq — Mobile App for Frontline Workers](https://fabriq.tech/en/feature-mobile-app/)
- [PWA 2025 Field Guide — GothArtech](https://gothartech.com/en/insights/pwa-2025)
