# AT_Manut — Insights de Desenvolvimento e Estado Técnico

> Referência sobre decisões de arquitectura, estado actual e próximos passos técnicos.
> Última revisão: 2026-02-23 — v1.6.2

---

## 1. Contexto e posicionamento

O AT_Manut é uma aplicação web PWA de gestão de manutenção destinada às equipas da Navel-Açores, Lda. Os utilizadores actuam no terreno com equipamentos industriais, por vezes em condições adversas:

- Conectividade instável ou inexistente
- Mãos sujas ou com luvas
- Pressão de tempo
- Perfis tecnológicos variados

---

## 2. Arquitectura actual (v1.6.2)

```
Fonte de verdade:  PHP + MySQL no cPanel
Cache offline:     localStorage (atm_*) via localCache.js (TTL 30 dias)
Autenticação:      JWT em sessionStorage (sessão por janela)
Sync offline:      syncQueue.js → processado ao reconectar
Alertas:           AlertaProactivoModal + atm_config_alertas + atm_alertas_dismiss
PWA:               manifest.json + ícones optimizados (installable)
```

### O que funciona bem
- **Multi-dispositivo:** qualquer dispositivo autenticado lê/escreve os mesmos dados MySQL
- **Offline-first:** dados em cache, operações enfileiradas, banner de estado visual
- **Conformidade:** alertas proactivos ao Admin, email automático ao cliente, badge de conformidade
- **Automação:** reagendamento automático após cada execução (próximos 2 anos)
- **QR Code:** etiqueta 90×50mm pronta a colar nas máquinas

### O que ainda não temos
- **Actualizações em tempo real** — se Admin cria manutenção no computador, ATecnica só vê ao refrescar (não é problema prático para equipa pequena)
- **Leitura de QR via câmara** — geração implementada, leitura não
- **Notificações push** — Web Push API não implementada
- **Service Worker** — app não funciona completamente offline na primeira visita (sem cache de assets)

---

## 3. O que as melhores apps CMMS fazem que ainda não fazemos

### Simplicidade radical — 2-3 toques para qualquer tarefa
**Estado actual:** 4+ toques para registar manutenção. **Oportunidade:** botão de acção rápida no Dashboard.

### Leitura QR via câmara
**Estado actual:** só geração. **Próximo passo:** `BarcodeDetector` API (nativa Chrome Android) ou `@zxing/browser`.

### Entrada por voz
**Oportunidade:** `SpeechRecognition` API (nativa Chrome/Safari iOS 14.5+) nos campos de notas.

### Alto contraste para exterior
**Oportunidade:** toggle "Modo campo" nas Definições — fundo branco, texto escuro.

---

## 4. Backlog técnico por fase

### Fase 2 — Imediata (0-3 meses)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| F2.1 | **Leitura QR via câmara** — `BarcodeDetector` ou `@zxing/browser` | Alto | Médio |
| F2.2 | **Notificações push** — Web Push API, manutenções a vencer em 3 dias | Alto | Alto |
| F2.3 | **Entrada por voz** — `SpeechRecognition` em campos de notas | Médio | Médio |
| F2.4 | **Modo campo** — alto contraste, toggle nas Definições | Médio | Baixo |
| F2.5 | **Service Worker** — cache de assets para app 100% offline | Médio | Médio |

```bash
# Dependências para leitura QR
npm install @zxing/browser --save
# OU usar BarcodeDetector API nativa (sem instalação)

# Para Service Worker
npm install vite-plugin-pwa --save-dev
```

### Fase 3 — Médio prazo (3-12 meses)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| F3.1 | **Dashboard de métricas** — MTBF, taxa de cumprimento, recharts | Médio | Alto |
| F3.2 | **Realtime multi-dispositivo** — Supabase Realtime (WebSockets) | Alto | Alto |
| F3.3 | **App nativa** — Capacitor (iOS + Android) | Alto | Muito alto |

> **Nota sobre Supabase:** Reavaliar quando houver múltiplas equipas em simultâneo ou quando o tamanho dos dados (fotos base64 no MySQL) começar a ser um problema.

---

## 5. UX para utilizadores com pouco conhecimento digital

### Já implementado (v1.6.2)
- Layouts diferentes para mobile (cards) vs. desktop (tabela)
- Botões com área de toque ≥ 44px (WCAG 2.5.5)
- Confirmação antes de apagar
- Toast centrado com feedback imediato
- Indicadores de estado por cores (verde/laranja/vermelho)
- PWA instalável no ecrã inicial
- Indicador offline/online com banner
- Cache local + fila de sincronização
- QR codes para identificação de máquinas no terreno
- Breadcrumbs de navegação

### A implementar
- Alto contraste para uso no exterior (F2.4)
- Entrada por voz para evitar digitação (F2.3)
- Leitura QR para eliminar busca manual (F2.1)

---

## 6. Métricas de sucesso

| Métrica | Como medir | Objectivo |
|---------|-----------|-----------|
| Tempo para registar 1 manutenção | Cronometrar com técnico | < 60 segundos |
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
