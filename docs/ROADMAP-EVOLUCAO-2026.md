# AT_Manut — Análise de Potencial e Roadmap de Evolução 2026

> Documento estratégico para decisão das próximas etapas de desenvolvimento.
> Baseado no estado actual v1.9.7 (Fevereiro 2026).

---

## 1. Análise do potencial da aplicação

### Pontos fortes actuais

| Dimensão | Estado | Potencial |
|----------|--------|-----------|
| **Base técnica** | React 19, Vite, PWA, offline-first | Solidez para escalar; stack moderna |
| **Cobertura E2E** | 447 testes em 18 specs | Regressão controlada; refactoring seguro |
| **Módulos maduros** | Clientes, Equipamentos, Manutenções, Reparações | Núcleo completo para operação diária |
| **Integrações** | ISTOBAL (webhook), Kaeser (PDF), SAF-T (Gestor.32) | Ecossistema alargado; dados centralizados |
| **UX em campo** | Modo campo, QR Code, assinatura digital, fotos | Adequado a técnicos em instalações |
| **Dois perfis** | Admin / ATecnica com RBAC | Segurança e auditoria |

### Oportunidades de evolução

1. **Dados de faturação** — Peças usadas em reparações já têm estrutura; falta camada de preços (custo/venda) para faturação automática.
2. **Relatório executivo** — KPIs existentes (taxa cumprimento, top atrasos) podem gerar PDF executivo para apresentar ao cliente.
3. **Notificações push** — Service Worker já existe (PWA); Web Push API permitiria alertas em tempo real sem depender do cron.
4. **Entrada por voz** — SpeechRecognition API (pt-PT) útil em ambiente de campo com luvas.
5. **Multi-técnico** — Registar 2+ técnicos numa manutenção/reparação (equipas maiores).
6. **App nativa** — Capacitor (iOS/Android) quando >5 técnicos ou necessidade de notificações push nativas.

### Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Dependência de um desenvolvedor | Documentação detalhada; testes E2E como rede de segurança |
| Dados em cPanel/MySQL | Backup automático; considerar migração para Supabase/PostgreSQL a longo prazo |
| Complexidade crescente | Manter specs E2E actualizados; modularizar por domínio |

---

## 2. Roadmap refinado — Próximas etapas

### Etapa 1 — Estabilização (v1.9.8) — 1–2 dias
**Objectivo:** Garantir que v1.9.7 está 100% estável em produção.

| Acção | Prioridade | Notas |
|-------|------------|-------|
| Executar suite E2E completa e corrigir falhas | Alta | Especialmente spec 18 (importação) |
| Build final + deploy cPanel | Alta | dist_upload.zip |
| Verificar importação SAF-T em produção | Alta | Testar com ficheiro real |
| Tag Git v1.9.7 | Média | Histórico de versões |

---

### Etapa 2 — Melhorias incrementais (v1.10.0) — 1–2 semanas
**Objectivo:** Pequenas melhorias de valor imediato sem alterar arquitectura.

| # | Funcionalidade | Impacto | Esforço | Decisão |
|---|----------------|---------|---------|---------|
| 2.1 | **Actualização multi-tab** — BroadcastChannel API para sincronizar dados entre abas abertas | Baixo | Baixo | Recomendado |
| 2.2 | **Relatório executivo PDF** — visão da frota para cliente (baseado em KPIs) | Médio | Médio | Avaliar necessidade |
| 2.3 | **Valores custo/venda em peças** — fase de faturação (invisível no relatório cliente) | Alto | Médio | Backlog prioritário |
| 2.4 | **E2E: botões Pré-visualizar e Ver/Guardar PDF** em reparações | Baixo | Baixo | Recomendado |

---

### Etapa 3 — Notificações e produtividade (v2.0) — 2–4 semanas
**Objectivo:** Alertas em tempo real e entrada por voz.

| # | Funcionalidade | Impacto | Esforço | Decisão |
|---|----------------|---------|---------|---------|
| 3.1 | **Web Push** — notificações de manutenções a vencer em 3 dias | Alto | Alto | Avaliar licença/Workbox |
| 3.2 | **Entrada por voz** — SpeechRecognition em campos de texto (pt-PT) | Médio | Médio | Útil em campo |
| 3.3 | **Multi-técnico** — 2+ técnicos por manutenção/reparação | Médio | Médio | Quando equipa crescer |

---

### Etapa 4 — Escalabilidade (horizonte 6–12 meses)
**Objectivo:** Preparar para crescimento.

| # | Funcionalidade | Impacto | Esforço | Decisão |
|---|----------------|---------|---------|---------|
| 4.1 | **App nativa** — Capacitor (iOS + Android) | Alto | Muito alto | Quando >5 técnicos |
| 4.2 | **Migração backend** — Supabase ou PostgreSQL dedicado | Médio | Alto | Se cPanel limitar |
| 4.3 | **API pública** — webhooks de saída para integrações | Baixo | Médio | Se parceiros precisarem |

---

## 3. Decisão passo-a-passo recomendada

### Imediato (esta semana)
1. **Concluir v1.9.7** — Corrigir falhas E2E do spec 18 se existirem; build + deploy.
2. **Validar importação SAF-T** — Testar em produção com ficheiro real de clientes.
3. **Commit + tag** — `git tag v1.9.7` e push para GitHub.

### Curto prazo (próximas 2 semanas)
1. **Etapa 2.1** — BroadcastChannel para multi-tab (baixo esforço, valor visível).
2. **Etapa 2.4** — E2E para botões PDF em reparações (cobertura completa).
3. **Avaliar 2.3** — Valores em peças: confirmar necessidade com utilizadores.

### Médio prazo (1–2 meses)
1. **Etapa 2.3** — Se aprovado: camada de preços em peças para faturação.
2. **Etapa 2.2** — Relatório executivo PDF (se houver pedidos de clientes).
3. **Etapa 3.2** — Entrada por voz (se técnicos reportarem dificuldade em campo).

### Longo prazo (6+ meses)
1. **Etapa 3.1** — Web Push (quando prioridade de alertas em tempo real aumentar).
2. **Etapa 4.1** — App nativa (quando equipa de campo >5 técnicos).

---

## 4. Métricas de sucesso

| Métrica | Actual | Meta v2.0 |
|---------|--------|-----------|
| Testes E2E a passar | ~440 | 100% |
| Tempo de build | ~60s | <90s |
| Cobertura de fluxos críticos | Alta | Mantida |
| Tempo de deploy (cPanel) | ~5 min | <10 min |

---

## 5. Resumo executivo

A aplicação AT_Manut está **madura e estável** para operação diária. O módulo Reparações (incluindo ISTOBAL, relatórios, assinaturas, email) está completo e testado. A importação SAF-T de clientes foi corrigida e integrada.

**Próximo passo imediato:** Estabilizar v1.9.7, validar em produção, e decidir entre:
- **Opção A** — Manter modo conservador: apenas correcções e pequenas melhorias (Etapa 2.1, 2.4).
- **Opção B** — Avançar com faturação (Etapa 2.3) se houver necessidade de negócio.
- **Opção C** — Investir em notificações push (Etapa 3.1) se alertas em tempo real forem prioritários.

---

*Documento criado: 2026-02-26 — v1.9.7*
