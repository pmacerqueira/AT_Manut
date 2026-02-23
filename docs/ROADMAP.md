# AT_Manut — Roadmap de Evolução

> Documento de planeamento estratégico e histórico de implementação.
> Última revisão: 2026-02-23 — v1.6.2

---

## Estado actual (v1.6.2) — O que está implementado

| Área | Detalhe | Versão |
|------|---------|--------|
| Gestão de clientes | CRUD completo + email obrigatório + badge "Sem email" | v1.6.0 |
| Gestão de equipamentos | Hierarquia Categoria→Subcategoria→Máquina | v1.0 |
| QR Code por máquina | Etiqueta 90×50mm com logo Navel, impressão, Escape para fechar | v1.5.0 + v1.6.2 |
| Histórico PDF por máquina | Todos os relatórios da máquina num único PDF | v1.5.0 |
| Manutenções | Registo, execução com checklist+assinatura+fotos, filtros | v1.0 |
| Reagendamento automático | Após execução periódica, recalcula próximas manutenções (2 anos) | v1.6.0 |
| Alertas de conformidade — badge | Card pulsante "Em atraso" quando >7 dias de atraso | v1.5.0 |
| Alertas de conformidade — modal | Modal proactivo ao Admin com manutenções próximas, por cliente | v1.6.0 |
| Dias de aviso configurável | Definições → "Alertas de conformidade" → dias antes do vencimento | v1.6.0 |
| Lembretes por email | Email automático ao cliente X dias antes do vencimento | v1.6.0 |
| Relatórios PDF | Geração PDF individual + envio por email | v1.0 |
| Calendário | Visualização mensal com feriados dos Açores | v1.0 |
| Agendamento | Formulário com validação de data/hora e feriados | v1.0 |
| Vista "O meu dia" | Dashboard filtrado por técnico autenticado + data | v1.5.0 |
| Autenticação JWT | Admin / ATecnica, sessão por janela, roles separados | v1.0 |
| Offline-first | Cache localStorage, fila de sync, OfflineBanner | v1.3.0 |
| PWA instalável | Ícone no ecrã inicial, manifest, ícones optimizados | v1.4.1 |
| Suite de testes E2E | 88 testes Playwright (11 specs) | v1.6.2 |
| Log de sistema | Acções, erros, eventos de autenticação | v1.0 |
| Breadcrumbs | Navegação hierárquica contextual | v1.2.0 |
| Responsividade | Mobile/tablet/landscape optimizado | v1.2.0 |

---

## Histórico de versões principais

### v1.6.x — Blocos A+B+C (Conformidade e Alertas)
**Implementado:** Fevereiro 2026

**Bloco A — Email e configuração:**
- Email do cliente obrigatório (validação JS, badge "Sem email" nos que faltam)
- Remoção do atributo HTML `required` do campo email para permitir validação customizada
- Secção "Alertas de conformidade" nas Definições (apenas Admin)
- Configuração de "Dias de aviso" (1–60, default 7), persistida em `atm_config_alertas`

**Bloco B — Reagendamento automático:**
- Após execução de manutenção periódica: `recalcularPeriodicasAposExecucao` recalcula todas as manutenções futuras da máquina (próximos 2 anos)
- Cálculo a partir da data de conclusão do último relatório (montagem ou periódica)
- Função em `DataContext.jsx`, chamada por `ExecutarManutencaoModal.jsx`

**Bloco C — Modal proactivo de alertas:**
- `AlertaProactivoModal.jsx`: aparece ao Admin no Dashboard com manutenções próximas do prazo
- Agrupado por cliente, com indicação de clientes sem email
- "Fechar" — fecha sem marcar; "Dispensar hoje" — não volta a aparecer no próprio dia
- Envio de lembrete por email directamente do modal
- Persistência de dismiss: `atm_alertas_dismiss` em `localStorage`
- Correcção de bug em `toggleExpand`: `!(prev[nif] ?? true)` para colapso correcto na primeira interacção

**Correcções v1.6.1/v1.6.2:**
- `QrEtiquetaModal.jsx`: handler de Escape adicionado (UX fix + fix de 3 testes E2E)
- `helpers.js` (testes): data `mt20` movida para isolamento correcto entre specs
- `playwright.config.js`: `baseURL` corrigido para `http://localhost:5173`
- E2E total: 88 testes a passar

---

### v1.5.x — Etapas 1–4 do Roadmap
**Implementado:** Fevereiro 2026

- **Etapa 1:** Vista "O meu dia" no Dashboard — lista filtrada por técnico + data
- **Etapa 2:** Alertas de conformidade — card pulsante + sub-texto com dias de atraso
- **Etapa 3:** QR Code por máquina — etiqueta 90×50mm, logo Navel, impressão
- **Etapa 4:** Histórico completo em PDF por máquina — `gerarHtmlHistoricoMaquina.js`

---

### v1.4.x — Testes E2E + PWA
- Suite Playwright: 9 specs, 137 testes (specs 01–09)
- Logotipo Navel na sidebar
- Ícones PWA optimizados

---

### v1.3.x — Offline-first
- `localCache.js` — cache de dados do servidor (TTL 30 dias)
- `syncQueue.js` — fila de operações offline
- `OfflineBanner.jsx` — indicador visual de conectividade

---

### v1.2.x — Responsividade
- Auditoria e optimização mobile/tablet/landscape
- Breadcrumbs de navegação

---

### v1.0–v1.1 — Núcleo da aplicação
- CRUD Clientes, Equipamentos, Manutenções, Categorias
- Execução com checklist, assinatura digital, fotos
- Relatório PDF + email
- Calendário + Agendamento
- Logs de sistema

---

## O que ainda está por fazer (Backlog)

### Fase 2 — Produtividade (próximo sprint)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| F2.1 | **Notificações push** (Web Push API) — manutenções a vencer em 3 dias | Alto | Alto |
| F2.2 | **Entrada por voz** nos campos de texto (SpeechRecognition API, `pt-PT`) | Médio | Médio |
| F2.3 | **Modo campo** — alto contraste para uso ao sol (toggle nas Definições) | Médio | Baixo |
| F2.4 | **Alerta de espaço** — aviso quando localStorage ultrapassa 70% da quota | Baixo | Baixo |
| F2.5 | **Leitura de QR** via câmara — `BarcodeDetector` API ou `@zxing/browser` | Alto | Médio |

### Fase 3 — Inteligência (horizonte 6-12 meses)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| F3.1 | **Dashboard de métricas** — MTBF, taxa de cumprimento, gráficos `recharts` | Médio | Alto |
| F3.2 | **Realtime multi-dispositivo** — Supabase Realtime (WebSockets) | Alto | Alto |
| F3.3 | **App nativa** — Capacitor (iOS + Android, notificações push nativas) | Alto | Muito alto |

> **Nota sobre Supabase:** A sincronização multi-dispositivo já funciona via PHP/MySQL — qualquer dispositivo autenticado lê os mesmos dados. O que não existe é actualizações automáticas sem refrescar. Para a equipa actual, não é problema prático. Reavaliar quando houver múltiplas equipas em simultâneo.

---

## O que nos distingue dos CMMS pequenos

- **Offline-first funcional** — dados em cache, fila de sync, banner de estado
- **Assinatura digital do cliente** — capturada no momento da execução
- **Email + PDF automáticos** — gerados e enviados sem intervenção manual
- **QR Code com etiqueta** — 90×50mm, logo Navel, prontos a colar nas máquinas
- **Reagendamento automático** — calcula próximos 2 anos após cada execução
- **Alertas proactivos** — modal ao Admin com manutenções próximas, agrupadas por cliente
- **88 testes E2E** — cobertura total de fluxos e perfis de utilizador
- **Dois perfis bem separados** — Admin com poderes totais, ATecnica restrito ao essencial

---

## Referências de mercado

| Produto | URL | Relevância |
|---------|-----|------------|
| TRACTIAN Mobile CMMS | tractian.com | QR code, fotos, mobile-first — redução 40% tempo campo |
| DIMO Maint | dimomaint.com | "Sem formação necessária", vista pessoal, voz |
| Fabriq Frontline | fabriq.tech | Operadores sem formação digital, 3 toques máximo |
| UpKeep CMMS | upkeep.com | Alertas preventivos, histórico por activo |
| Limble CMMS | limblecmms.com | Conformidade, peças, relatórios de auditoria |
| MaintainX | getmaintainx.com | Multi-utilizador real-time, ordens de trabalho |

---

*Última actualização: 2026-02-23 — v1.6.2*
