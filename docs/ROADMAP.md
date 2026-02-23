# AT_Manut — Roadmap de Evolução

> Baseado na auditoria de responsividade (v1.2.0), pesquisa de mercado CMMS 2025/2026,
> análise das necessidades das equipas de manutenção no terreno e refinamento estratégico (v1.4.1).
> Última revisão: 2026-02-23

---

## Estado actual (v1.4.1)

A app está funcional, com offline-first implementado, logotipo actualizado e cobertura de testes completa:

| Área | Estado |
|---|---|
| Gestão de clientes | ✅ Completo |
| Gestão de equipamentos (hierarquia Cat→Sub→Máq) | ✅ Completo |
| Registo e acompanhamento de manutenções | ✅ Completo |
| Execução com checklist + fotos + assinatura | ✅ Completo |
| Relatórios PDF + email | ✅ Completo |
| Calendário e agendamento | ✅ Completo |
| PWA instalável + ícone no ecrã | ✅ Completo |
| Responsividade mobile/tablet/landscape | ✅ Optimizado (v1.2.0) |
| Logs de sistema | ✅ Completo |
| Indicador offline/online + banner visual | ✅ Implementado (v1.3.0) |
| Cache local de dados (offline-first) | ✅ Implementado (v1.3.0) |
| Fila de sincronização offline | ✅ Implementado (v1.3.0) |
| Suite de testes E2E — 137 testes Playwright | ✅ Implementado (v1.4.0) |
| Logotipo Navel na sidebar | ✅ Implementado (v1.4.1) |

---

## O que já temos que poucos CMMS pequenos têm

Antes de planear o próximo passo, vale a pena reconhecer o que já distingue o AT_Manut:

- **Offline-first funcional** — dados em cache, fila de sync, banner de estado
- **Assinatura digital do cliente** — capturada no momento da execução
- **Email + PDF automáticos** — gerados e enviados sem intervenção manual
- **137 testes E2E** — cobertura total de fluxos e perfis de utilizador
- **Dois perfis bem separados** — Admin com poderes totais, ATecnica restrito ao essencial

---

## Próximas 5 etapas (ordem de prioridade)

### Etapa 1 — Vista "O meu dia" para o ATecnica
**Esforço:** Baixo · **Impacto:** Alto · **Horizonte:** Imediato

O técnico abre a app de manhã e quer saber **o que tem para fazer hoje** — sem filtrar nada, sem ver a lista completa. Os melhores CMMS (DIMO Maint, UpKeep, MaintainX) têm uma vista pessoal com as manutenções do dia do utilizador autenticado.

**O que fazer:**
- Dashboard personalizado para ATecnica: "Tens 2 manutenções agendadas para hoje"
- Lista filtrada por técnico atribuído + data = hoje/esta semana
- Acesso direto ao botão "Executar" a partir desta vista
- O Admin continua a ver a visão global

**Porquê agora:** Uso diário imediato. 1-2 dias de trabalho. Elimina o maior atrito no início do dia do técnico.

---

### Etapa 2 — Alertas de conformidade — manutenções em atraso
**Esforço:** Baixo · **Impacto:** Alto (legal/regulatório) · **Horizonte:** Imediato

Elevadores em Portugal têm obrigações legais de manutenção periódica (DGAE/ASAE). O Dashboard já mostra "Em atraso" mas não **alerta ativamente**. Isto protege juridicamente a Navel e os seus clientes.

**O que fazer:**
- Badge vermelho pulsante no card "Em atraso" do Dashboard quando há registos com >7 dias de atraso
- Destaque visual nas manutenções em atraso na lista (borda vermelha, ícone de alerta)
- Futuramente: email automático ao Admin quando uma manutenção ultrapassa o prazo por X dias

**Porquê agora:** Risco legal real. Os dados já existem — é apenas uma camada de alertas visuais em cima do que já está.

---

### Etapa 3 — QR Code por máquina
**Esforço:** Médio · **Impacto:** Alto no terreno · **Horizonte:** Próximo sprint

A TRACTIAN reporta redução de **40% no tempo de trabalho de campo** só com QR codes. O técnico chega à máquina, aponta a câmara → abre direto a ficha e o botão "Executar". Elimina completamente o passo de procurar na lista — especialmente valioso com 20+ máquinas em vários clientes.

**O que fazer:**
- Botão "Gerar QR Code" na ficha de cada máquina → modal com QR para imprimir/partilhar
- QR codifica o ID da máquina + URL da app (`/manut/equipamentos?maquina=ID`)
- Leitura via câmara: botão "Escanear" no Dashboard ou barra de pesquisa
- Etiquetas para colar nas máquinas (impressão A4 ou térmica)

**Dependências:**
```bash
npm install qrcode           # geração QR (browser + Node)
npm install @zxing/browser   # leitura QR via câmara
# OU usar BarcodeDetector API nativa (Chrome Android)
```

---

### Etapa 4 — Histórico completo em PDF por máquina
**Esforço:** Médio · **Impacto:** Profissional e comercial · **Horizonte:** 1-2 meses

Quando um cliente pede o registo histórico de um elevador para uma inspeção, auditoria ou venda de imóvel, hoje é necessário exportar relatório a relatório. Um único botão **"Histórico completo"** gera um PDF profissional com todas as manutenções da máquina — diferenciador comercial real que a Navel pode apresentar como valor acrescentado.

**O que fazer:**
- Botão "Histórico completo em PDF" na ficha da máquina (Equipamentos)
- PDF com: dados da máquina + cliente + tabela de todas as manutenções (data, técnico, tipo, estado) + última assinatura
- Reutilizar a infra de `gerarPdfRelatorio.js` já existente
- Cabeçalho e rodapé Navel (já implementado no `send-email.php`)

**Porquê agora:** Valor comercial imediato. Diferencia a Navel de concorrentes que só têm relatórios individuais.

---

### Etapa 5 — Atualizações em tempo real (Supabase Realtime)
**Esforço:** Alto · **Impacto:** Médio · **Horizonte:** 3-6 meses

> **Nota importante:** A sincronização multi-dispositivo **já está assegurada** pelo backend PHP + MySQL no cPanel. O `localStorage` é apenas cache offline — qualquer dispositivo que abra a app lê os mesmos dados do mesmo servidor. Não há problema de dados separados por dispositivo.

O que **não existe** ainda é actualização automática em tempo real: se o Admin criar uma manutenção no computador, o técnico só a vê quando refrescar a app manualmente. Para uma equipa pequena, isto raramente é um problema prático.

**O que o Supabase acrescentaria:**
- Actualizações em tempo real via WebSockets (sem refrescar)
- Armazenamento de fotos no servidor em vez de base64 no MySQL
- Potencialmente melhor escalabilidade a longo prazo

**Recomendação:** Manter o PHP/MySQL actual enquanto a equipa for pequena. Reavaliar quando houver múltiplas equipas em simultâneo no terreno ou quando o tamanho dos dados (fotos) começar a ser um problema.

---

## Resumo de prioridades

| # | Etapa | Impacto | Esforço | Quando |
|---|---|---|---|---|
| 1 | Vista "O meu dia" para ATecnica | 🔴 Alto | 🟢 Baixo | **Imediato** |
| 2 | Alertas de conformidade (atraso) | 🔴 Alto (legal) | 🟢 Baixo | **Imediato** |
| 3 | QR Code por máquina | 🔴 Alto (campo) | 🟡 Médio | **Próximo sprint** |
| 4 | Histórico PDF por máquina | 🟡 Médio (comercial) | 🟡 Médio | **1-2 meses** |
| 5 | Atualizações em tempo real (Supabase) | 🟡 Médio (nice-to-have) | 🔴 Alto | **3-6 meses** |

---

## Fase 2 — Produtividade e comunicação
*(após as 5 etapas prioritárias)*

### F2.1 — Notificações push (Web Push API)
- Manutenções preventivas a vencer em 3 dias
- Compatibilidade: Chrome Android (completo), iOS Safari 16.4+ (só PWA instalada)
- Requer backend para notificações com app fechada

### F2.2 — Entrada por voz nos campos de texto
- API `SpeechRecognition` nativa — Chrome, Safari iOS 14.5+
- Botão de microfone nos campos de descrição/notas
- Idioma: `pt-PT`

### F2.3 — Modo campo (alto contraste)
- Toggle "Modo campo" nas Definições — fundo branco, texto escuro, legível ao sol
- Activação rápida: toque longo no logo da sidebar
- Guardar preferência em `localStorage`

### F2.4 — Backup automático + alerta de espaço
- Alerta quando `localStorage` ultrapassa 70% da quota
- Sugestão de exportação se o último backup tiver >7 dias

---

## Fase 3 — Inteligência e decisão
*(horizonte 6-12 meses)*

### F3.0 — Arquitectura actual — ponto de situação

> O AT_Manut usa **PHP + MySQL no cPanel** como fonte de verdade. O `localStorage` é apenas cache offline (v1.3.0). A sincronização multi-dispositivo já funciona: qualquer dispositivo autenticado lê e escreve nos mesmos dados do servidor.
>
> O que não existe é *push* em tempo real — as alterações feitas por outro utilizador só são visíveis após refrescar. Para a equipa actual, não é um problema prático.

### F3.1 — Dashboard de métricas (KPIs de manutenção)
- MTBF (Mean Time Between Failures) por equipamento/cliente
- Taxa de cumprimento (manutenções executadas vs. planeadas)
- Equipamentos mais problemáticos
- Gráfico mensal com `recharts`

### F3.2 — Calendário de manutenção preventiva inteligente
- Ao concluir manutenção: "Agendar próxima para [data sugerida]?"
- Cálculo automático baseado no intervalo da subcategoria
- Alerta 30 dias antes da data prevista

### F3.3 — App nativa (Capacitor)
- Reutiliza 100% do código React existente
- Remove limitações PWA em iOS (notificações, câmara, sensores)
- Publicação na App Store e Google Play

---

## Princípios de UX para utilizadores com pouco conhecimento digital

### ✅ Já implementado
- Layouts diferentes para mobile (cards) vs. desktop (tabela)
- Botões com área de toque ≥ 44px (WCAG 2.5.5)
- Confirmação antes de apagar
- Feedback visual imediato (Toast centrado)
- Indicadores de status por cores (verde/laranja/vermelho)
- PWA instalável no ecrã inicial
- Indicador offline/online com banner (v1.3.0)
- Cache local + fila de sincronização (v1.3.0)
- Suite de testes E2E — 137 testes (v1.4.0)
- Logotipo Navel na sidebar (v1.4.1)

### 🔜 A implementar
- Vista pessoal "O meu dia" para ATecnica (Etapa 1)
- Alertas activos de conformidade/atraso (Etapa 2)
- QR code para eliminar busca manual de máquinas (Etapa 3)
- Histórico PDF completo por máquina (Etapa 4)
- Modo de alto contraste para uso no exterior (F2.3)
- Entrada por voz para evitar digitação (F2.2)

---

## Referências de mercado consultadas

| Produto | URL | Relevância |
|---|---|---|
| TRACTIAN Mobile CMMS | tractian.com | QR code, fotos, mobile-first — redução 40% tempo campo |
| DIMO Maint App | dimomaint.com | "Sem formação necessária", vista pessoal, voz |
| Fabriq Frontline | fabriq.tech | Operadores sem formação digital, 3 toques máximo |
| UpKeep CMMS | upkeep.com | Alertas preventivos, histórico por activo |
| Limble CMMS | limblecmms.com | Conformidade, peças, relatórios de auditoria |
| MaintainX | getmaintainx.com | Multi-utilizador real-time, ordens de trabalho |
| iMaintain CMMS Guide | imaintain.uk | Offline-first architecture |
| AufaitUX CMMS Design | aufaitux.com/blog | UX principles para CMMS |

---

*Última actualização: 2026-02-23 — v1.4.1*
