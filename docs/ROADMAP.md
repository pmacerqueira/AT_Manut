# AT_Manut — Roadmap de Evolução

> Baseado na auditoria de responsividade (v1.2.0), pesquisa de mercado CMMS 2025/2026
> e análise das necessidades das equipas de manutenção no terreno.
> Última revisão: 2026-02-23

---

## Estado actual (v1.4.0)

A app está funcional, com offline-first implementado e cobertura de testes completa:

| Área | Estado |
|---|---|
| Gestão de clientes | ✅ Completo |
| Gestão de equipamentos (hierarquia Cat→Sub→Máq) | ✅ Completo |
| Registo e acompanhamento de manutenções | ✅ Completo |
| Execução com checklist + fotos + assinatura | ✅ Completo |
| Relatórios PDF + email | ✅ Completo |
| Calendário e agendamento | ✅ Completo |
| PWA instalável + ícone no ecrã | ✅ Completo |
| Service Worker (cache offline básico) | ✅ Presente (`public/sw.js`) |
| Responsividade mobile/tablet/landscape | ✅ Optimizado (v1.2.0) |
| Logs de sistema | ✅ Completo |
| Indicador offline/online + banner visual | ✅ Implementado (v1.3.0) |
| Cache local de dados (offline-first) | ✅ Implementado (v1.3.0) |
| Fila de sincronização offline | ✅ Implementado (v1.3.0) |
| Suite de testes E2E (137 testes Playwright) | ✅ Implementado (v1.4.0) |

---

## Fase 1 — Campo: o que os técnicos precisam hoje
**Horizonte: 1-2 meses · Impacto imediato para utilizadores no terreno**

### F1.1 — Indicador de estado offline/online ✅ IMPLEMENTADO (v1.3.0)
~~**Porquê:** Técnicos em armazéns, caves e zonas industriais perdem ligação sem saber.~~

**Implementado:** `OfflineBanner.jsx` com 4 estados visuais (offline, pendentes, a sincronizar, online). Cache local de dados (`localCache.js`) e fila de sincronização offline (`syncQueue.js`) — operações feitas sem internet são enviadas automaticamente ao reconectar.

---

### F1.2 — Botão de acção rápida no Dashboard ("Nova Manutenção Urgente")
**Porquê:** O fluxo actual para registar uma manutenção urgente é:
`Dashboard → Manutenções → Nova → preencher form → Guardar` (4+ passos)

As melhores apps CMMS (TRACTIAN, DIMO Maint) permitem registar em < 30 segundos.

**O que fazer:**
- Botão proeminente no Dashboard: `⚡ Avaria / Manutenção Urgente`
- Abre um form simplificado com apenas 3 campos: **Máquina** (autocomplete) + **Descrição** + **Foto (opcional)**
- Guarda como `tipo: Emergência, estado: Pendente`
- Depois o admin completa os detalhes

---

### F1.3 — Filtro de "As minhas manutenções hoje"
**Porquê:** ATecnica abre a app e quer saber imediatamente *o que tem para fazer hoje* — não toda a lista.

**O que fazer:**
- Nova vista rápida no Dashboard: "Hoje" com lista das manutenções do dia corrente para o utilizador autenticado
- Alternativa: separador no topo da lista de Manutenções: `Hoje (2)` | `Esta semana (5)` | `Todas`

---

### F1.4 — Melhorar a captura de fotos
**Porquê:** Actualmente as fotos são adicionadas dentro do modal de execução, que é uma operação secundária. Em campo, o técnico quer tirar a foto com a câmara traseira do telemóvel.

**O que fazer:**
- Botão "Câmara" específico para câmara traseira: `<input accept="image/*" capture="environment" />`
- Compressão automática antes de guardar (max 800px, qualidade 0.85) para não encher o `localStorage`
- Preview da foto com possibilidade de retirar antes de confirmar

**Código de base:**
```jsx
// Forçar câmara traseira em mobile
<input
  type="file"
  accept="image/*"
  capture="environment"
  onChange={handleFotoCapture}
/>

// Compressão com Canvas API (sem dependências)
function comprimirFoto(file, maxWidth = 800, quality = 0.85) {
  return new Promise(resolve => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}
```

---

### F1.5 — QR Code por máquina
**Porquê:** O técnico chega à máquina e perde tempo a procurá-la na lista.
Com QR code, aponta a câmara e abre directamente a ficha da máquina.

**O que fazer:**
- Em `Equipamentos.jsx` (ficha da máquina): botão "Gerar QR Code" → abre modal com QR code para imprimir/partilhar
- QR code codifica o ID da máquina + URL da app
- Leitura: botão "Escanear QR" na página principal ou Dashboard → câmara → navega para a máquina

**Dependências:**
```bash
npm install qrcode        # geração (Node + browser)
npm install @zxing/browser  # leitura (browser, câmara)
# OU usar BarcodeDetector API nativa (Chrome Android)
```

**Geração:**
```jsx
import QRCode from 'qrcode'

async function gerarQRMaquina(maquinaId) {
  const url = `${window.location.origin}/manut/maquina/${maquinaId}`
  return await QRCode.toDataURL(url, { width: 256, margin: 2 })
}
```

---

## Fase 2 — Produtividade e comunicação
**Horizonte: 2-4 meses · Reduzir burocracia, aumentar visibilidade**

### F2.1 — Notificações push (Web Push API)
**Porquê:** Técnicos não abrem a app proactivamente. A app deve avisar quando há manutenções preventivas a vencer.

**O que fazer:**
- Solicitar permissão de notificação na primeira abertura (ou ao clicar em "Activar alertas")
- Service Worker envia notificação quando:
  - Manutenção vence em 3 dias
  - Manutenção está em atraso
  - Admin atribuiu manutenção urgente
- Compatibilidade: Chrome Android (completo), iOS Safari 16.4+ (parcial — só quando PWA instalada)

**Limitação importante:** Requer backend para enviar notificações quando a app está fechada.
Alternativa sem backend: verificar na abertura da app e mostrar badge no ícone.

---

### F2.2 — Entrada por voz nos campos de texto
**Porquê:** Com mãos sujas ou luvas, digitar é difícil.
A SpeechRecognition API é nativa nos browsers modernos.

**O que fazer:**
- Botão de microfone nos campos de texto (observações, descrição de avaria)
- Suporte PT-PT: `new SpeechRecognition(); recognition.lang = 'pt-PT'`
- Feedback visual enquanto grava

**Código de base:**
```jsx
function useSpeechInput(onResult) {
  const start = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-PT'
    recognition.onresult = e => onResult(e.results[0][0].transcript)
    recognition.start()
  }
  return { start, supported: !!(window.SpeechRecognition || window.webkitSpeechRecognition) }
}
```

---

### F2.3 — Relatório rápido em PDF por máquina (histórico completo)
**Porquê:** Clientes e auditores pedem o histórico de uma máquina. Actualmente só há relatório por manutenção.

**O que fazer:**
- Na ficha da máquina: botão "Histórico completo em PDF"
- PDF com: dados da máquina + tabela de todas as manutenções + última assinatura
- Usar a infra de `gerarPdfRelatorio.js` já existente

---

### F2.4 — Exportação periódica automática (backup)
**Porquê:** O `localStorage` tem limite (~10MB). Ao atingir o limite, a app pode falhar silenciosamente.

**O que fazer:**
- Verificar o uso do `localStorage` ao arrancar (já existe na página Definições)
- Alertar quando ultrapassar 70% do espaço disponível
- Sugerir exportação automática se o último backup tiver mais de 7 dias
- Adicionar botão "Activar backup automático" — usa `setInterval` para exportar semanalmente

---

### F2.5 — Modo de alto contraste / "Modo campo"
**Porquê:** Ecrãs sob luz solar directa são difíceis de ler. O tema escuro actual é pior que um tema claro em outdoor.

**O que fazer:**
- Toggle "Modo campo" nas Definições: troca para fundo branco/cinza claro, texto muito escuro
- Guardar em `localStorage` como preferência
- Activação rápida: toque longo (long press) no logo da sidebar

**Implementação:**
```jsx
// Adicionar ao body
document.body.classList.toggle('theme-outdoor', isOutdoor)
```
```css
body.theme-outdoor {
  --color-bg: #f0f4f8;
  --color-bg-card: #ffffff;
  --color-bg-elevated: #e5eaf0;
  --color-text: #111827;
  --color-text-muted: #374151;
  --color-border: #cbd5e1;
}
```

---

## Fase 3 — Inteligência e integração
**Horizonte: 4-8 meses · Transformar a app num sistema de apoio à decisão**

### F3.1 — Sincronização multi-dispositivo (Supabase)
**Porquê:** Actualmente os dados ficam em `localStorage` de um só dispositivo.
Se o técnico muda de telemóvel, perde tudo. Se admin e técnico usam tablets diferentes, vêem dados diferentes.

**O que fazer:**
- Migrar armazenamento de `localStorage` → Supabase (já configurado no navel-site)
- Manter `localStorage` como cache para offline
- Sync automático ao reconectar (queue de operações offline)
- RLS (Row Level Security): Admin vê tudo, ATecnica vê só as suas manutenções

**Arquitectura:**
```
localStorage (cache offline)
    ↕ sync ao conectar
Supabase (PostgreSQL + Realtime)
    ↕ subscriptions
Todos os dispositivos em tempo real
```

**Tabelas Supabase a criar:**
```sql
clientes, categorias, subcategorias, maquinas,
manutencoes, relatorios, checklists, logs_sistema
```

---

### F3.2 — Dashboard de métricas (KPIs de manutenção)
**Porquê:** Actualmente o Dashboard mostra contagens simples (Em atraso / Próximas / Executadas).
Para gestão, interessa perceber tendências e fiabilidade dos equipamentos.

**Métricas a adicionar:**
- **MTBF** (Mean Time Between Failures) por equipamento/cliente
- **Taxa de cumprimento** (manutenções executadas vs. planeadas por mês)
- **Equipamentos mais problemáticos** (mais avarias/atrasos)
- **Técnico mais produtivo** (mais manutenções executadas)
- **Gráfico mensal** de manutenções (linha do tempo: eixo X = meses, eixo Y = contagem)

**Implementação:** Gráficos com `recharts` (React, leve, sem SVG manual)
```bash
npm install recharts
```

---

### F3.3 — Histórico de avarias por máquina com padrões
**Porquê:** Certas máquinas avariam sempre pela mesma razão (desgaste de componente, uso abusivo). A app deve detectar estes padrões e alertar.

**O que fazer:**
- Na ficha da máquina: frequência de avarias por tipo
- Alerta: "Esta máquina teve 3 avarias do mesmo tipo nos últimos 6 meses — considerar substituição do componente X"
- Sugestão automática de peças de substituição com base no histórico

---

### F3.4 — Calendário de manutenção preventiva inteligente
**Porquê:** Actualmente o agendamento é manual. Para equipamentos com intervalos definidos (ex: cada 6 meses), a app devia propor as datas automaticamente.

**O que fazer:**
- Ao marcar manutenção como concluída, oferecer: "Agendar próxima para [data sugerida]?"
- Cálculo automático baseado no intervalo da subcategoria
- Alerta 30 dias antes da data prevista
- Vista anual das manutenções preventivas planeadas

---

### F3.5 — App nativa (React Native / Capacitor)
**Porquê:** PWA tem limitações em iOS (notificações push, câmara, sensores).
Uma app nativa (via Capacitor, que reutiliza o código React existente) remove estas limitações.

**Capacitor:** Converte a web app em app iOS/Android sem reescrever o código.
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/camera @capacitor/push-notifications
npx cap init "AT Manut" "pt.navel.atmanut"
npx cap add ios
npx cap add android
```

**Vantagem:** 90% do código existente é reutilizado. A UI não muda.

---

## Resumo prioridades e estimativas de esforço

| Fase | Funcionalidade | Impacto | Esforço | Prioridade |
|---|---|---|---|---|
| F1 | ~~Indicador offline/online~~ | — | — | ✅ **v1.3.0** |
| F1 | Botão "Avaria Urgente" | 🔴 Alto | 🟡 Médio | **Próximo sprint** |
| F1 | Filtro "Hoje" no Dashboard | 🔴 Alto | 🟢 Baixo | **Próximo sprint** |
| F1 | Câmara traseira + compressão | 🟡 Médio | 🟢 Baixo | **Próximo sprint** |
| F1 | QR Code por máquina | 🟡 Médio | 🟡 Médio | **1-2 meses** |
| F2 | Entrada por voz | 🟡 Médio | 🟢 Baixo | **1-2 meses** |
| F2 | Modo campo (alto contraste) | 🟡 Médio | 🟢 Baixo | **1-2 meses** |
| F2 | Histórico PDF por máquina | 🟡 Médio | 🟡 Médio | **2-3 meses** |
| F2 | Backup automático + alerta espaço | 🔴 Alto | 🟢 Baixo | **2-3 meses** |
| F3 | Sync Supabase multi-dispositivo | 🔴 Alto | 🔴 Alto | **4-6 meses** |
| F3 | Dashboard KPIs (MTBF, taxa) | 🟡 Médio | 🟡 Médio | **4-6 meses** |
| F3 | Calendário preventivo inteligente | 🔴 Alto | 🟡 Médio | **4-6 meses** |
| F3 | App nativa (Capacitor) | 🟡 Médio | 🔴 Alto | **6-12 meses** |

---

## Princípios de UX para utilizadores com pouco conhecimento digital

Com base na pesquisa de campo (DIMO Maint, Fabriq, TRACTIAN), os princípios aplicados e a aplicar no AT_Manut:

### ✅ Já implementado
- Layouts diferentes para mobile (cards) vs. desktop (tabela)
- Botões com área de toque ≥ 44px (WCAG 2.5.5)
- Confirmação antes de apagar (dialogs)
- Feedback visual imediato (Toast de sucesso/erro)
- Indicadores visuais de status por cores (verde/laranja/vermelho)
- PWA instalável no ecrã inicial
- Indicador de estado offline/online com banner visual (v1.3.0)
- Cache local + fila de sincronização offline (v1.3.0)
- Suite de testes E2E — 137 testes Playwright (v1.4.0)

### 🔜 A implementar
- Reduzir passos para registo urgente (F1.2 — botão "Avaria Urgente")
- Filtro "Hoje" no Dashboard para ATecnica (F1.3)
- Linguagem simples e directa (rever textos de erro)
- Modo de alto contraste para uso no exterior (F2.5)
- Entrada por voz para evitar digitação (F2.2)
- QR code para eliminar busca manual de máquinas (F1.5)

---

## Referências de mercado consultadas

| Produto | URL | Relevância |
|---|---|---|
| TRACTIAN Mobile CMMS | tractian.com | QR code, fotos, mobile-first |
| DIMO Maint App | dimomaint.com | "No training required", voz |
| Fabriq Frontline | fabriq.tech | Operadores sem formação digital |
| iMaintain CMMS Guide | imaintain.uk | Offline-first architecture |
| TechGrid Field Inspection | techgrid.media | Offline para Android, heavy industry |
| BuildLog Offline | buildlogapp.com | IndexedDB, PWA, sync patterns |
| AufaitUX CMMS Design | aufaitux.com/blog | UX principles para CMMS |
