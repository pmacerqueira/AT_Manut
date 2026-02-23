# AT_Manut — Roadmap de Evolução

> Documento de planeamento estratégico e histórico de implementação.
> Última revisão: 2026-02-23 — v1.7.0

---

## Estado actual (v1.7.0) — O que está implementado

| Área | Detalhe | Versão |
|------|---------|--------|
| Gestão de clientes | CRUD completo + email obrigatório + badge "Sem email" | v1.6.0 |
| Gestão de equipamentos | Hierarquia Categoria→Subcategoria→Máquina | v1.0 |
| QR Code por máquina — geração | Etiqueta 90×50mm com logo Navel, impressão | v1.5.0 |
| QR Code por máquina — leitura | Modal com câmara (`@zxing/browser`), abre ficha directamente | v1.7.0 |
| Histórico PDF por máquina | Todos os relatórios da máquina num único PDF | v1.5.0 |
| Manutenções | Registo, execução com checklist+assinatura+fotos, filtros | v1.0 |
| Reagendamento automático | Após execução periódica, recalcula próximas manutenções (2 anos) | v1.6.0 |
| Alertas de conformidade — badge | Card pulsante "Em atraso" quando >7 dias de atraso | v1.5.0 |
| Alertas de conformidade — modal | Modal proactivo ao Admin com manutenções próximas, por cliente | v1.6.0 |
| Alertas automáticos — cron job | PHP/cron no cPanel envia lembretes diariamente às 08:00 | v1.6.2 |
| Dias de aviso configurável | Definições → "Alertas de conformidade" → dias antes do vencimento | v1.6.0 |
| Lembretes por email | Email ao cliente X dias antes + resumo diário ao Admin | v1.6.0 |
| Pesquisa global | Ctrl+K — pesquisa instantânea em clientes, equipamentos, manutenções | v1.7.0 |
| Dashboard de métricas (KPIs) | Taxa de cumprimento, gráficos semanais/mensais, top clientes atraso | v1.7.0 |
| Modo campo | Alto contraste para uso exterior, toggle em Definições | v1.7.0 |
| Backup/restauro de dados | Exportação JSON + importação com validação em Definições | v1.6.0 |
| Indicador de armazenamento | Barra de uso do localStorage com alerta em Definições | v1.7.0 |
| Relatórios PDF | Geração PDF individual + envio por email | v1.0 |
| Calendário | Visualização mensal com feriados dos Açores | v1.0 |
| Agendamento | Formulário com validação de data/hora e feriados | v1.0 |
| Vista "O meu dia" | Dashboard filtrado por técnico autenticado + data | v1.5.0 |
| Autenticação JWT | Admin / ATecnica, sessão por janela, roles separados | v1.0 |
| Offline-first | Cache localStorage, fila de sync, OfflineBanner | v1.3.0 |
| PWA instalável | Ícone no ecrã inicial, manifest, ícones optimizados | v1.4.1 |
| Suite de testes E2E | 230+ testes Playwright (12 specs) | v1.7.0 |
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

## Histórico v1.7.0 — Etapas 5-9 (Campo + Produtividade + KPIs)
**Implementado:** Fevereiro 2026

- **Etapa 5 — Leitor QR Code via câmara:** `QrReaderModal.jsx` com `@zxing/browser`; preferência câmara traseira mobile; navega directamente para ficha da máquina ao ler QR da app; `Equipamentos.jsx` recebe `?maquina=ID` para abrir automaticamente a subcategoria
- **Etapa 6 — Dashboard KPIs:** `kpis.js` com funções de cálculo; `Metricas.jsx` com cards de resumo, taxa de cumprimento circular, gráfico de linha mensal, gráfico de barras 8 semanas, top clientes em atraso; `recharts` como biblioteca de gráficos
- **Etapa 7 — Pesquisa global:** `PesquisaGlobal.jsx`; `Ctrl+K` global; pesquisa simultânea em clientes/equipamentos/manutenções; navegação por teclado (↑↓ Enter Esc); debounce 200ms
- **Etapa 8 — Modo campo:** `.modo-campo` em `index.css`; toggle em Definições; persiste em `atm_modo_campo`; indicador "☀ MODO CAMPO" na sidebar
- **Etapa 9 — Indicador de armazenamento:** barra de progresso de uso do localStorage em Definições; alerta automático acima de 70%

---

## O que ainda está por fazer (Backlog)

### Próximo sprint (v1.8.x)

| # | Funcionalidade | Impacto | Esforço | Notas |
|---|---|---|---|---|
| N1 | **Notificações push** (Web Push API) — manutenções a vencer em 3 dias | Alto | Alto | Service Worker necessário; independente do cron |
| N2 | **Ordens de trabalho** — estado `Em progresso` com início/fim registado, tempo gasto | Alto | Médio | Melhora o MTTR, exigido por auditoria |
| N3 | **Ficha de peças/consumíveis** — registo de peças usadas em cada manutenção | Alto | Médio | Permite análise de custos por máquina |
| N4 | **Relatório executivo PDF** — visão da frota para apresentar ao cliente, baseado nos KPIs | Médio | Médio | Gerado a partir do `kpis.js` existente |
| N5 | **Entrada por voz** nos campos de texto (SpeechRecognition API, `pt-PT`) | Médio | Médio | Muito útil em ambiente de campo com luvas |

### Fase 3 — Escalabilidade (horizonte 6-12 meses)

| # | Funcionalidade | Impacto | Esforço | Notas |
|---|---|---|---|---|
| F3.1 | **Multi-técnico em manutenção** — registar 2+ técnicos numa execução | Médio | Médio | Adequado para equipas |
| F3.2 | **App nativa** — Capacitor (iOS + Android, notificações push nativas) | Alto | Muito alto | Reavaliar quando tiver >5 técnicos de campo |
| F3.3 | **Actualização automática multi-tab** — BroadcastChannel API | Baixo | Baixo | Sincronização instantânea entre abas abertas |

> **Nota sobre sincronização:** A sincronização multi-dispositivo já funciona via PHP/MySQL (cPanel) — qualquer dispositivo autenticado lê os mesmos dados em tempo real ao refrescar. O que não existe é push automático sem refrescar. Para a equipa actual (1-2 técnicos), não é problema prático.

---

## O que nos distingue dos CMMS pequenos

- **Offline-first funcional** — dados em cache, fila de sync, banner de estado
- **Assinatura digital do cliente** — capturada no momento da execução
- **Email + PDF automáticos** — gerados e enviados sem intervenção manual
- **QR Code completo** — geração de etiqueta 90×50mm + leitura via câmara
- **Reagendamento automático** — calcula próximos 2 anos após cada execução
- **Alertas proactivos + cron automático** — modal ao Admin + envio diário pelo servidor
- **Pesquisa global Ctrl+K** — encontra qualquer entidade em milissegundos
- **Dashboard KPIs executivo** — taxa de cumprimento, gráficos, top clientes em atraso
- **Modo campo** — alto contraste para técnicos ao sol
- **230+ testes E2E** — cobertura total de fluxos e perfis de utilizador
- **Dois perfis bem separados** — Admin com poderes totais, ATecnica restrito ao essencial

---

## Referências de mercado

| Produto | URL | Relevância |
|---------|-----|------------|
| TRACTIAN Mobile CMMS | tractian.com | QR code, fotos, mobile-first — redução 40% tempo campo |
| DIMO Maint | dimomaint.com | "Sem formação necessária", vista pessoal, voz |
| Fabriq Frontline | fabriq.tech | Operadores sem formação digital, 3 toques máximo |
| UpKeep CMMS | upkeep.com | Alertas preventivos, histórico por activo, ordens de trabalho |
| Limble CMMS | limblecmms.com | Conformidade, peças, relatórios de auditoria |
| MaintainX | getmaintainx.com | Multi-utilizador real-time, ordens de trabalho, custo por activo |

---

*Última actualização: 2026-02-23 — v1.7.0*
