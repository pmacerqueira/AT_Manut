# AT_Manut — Insights e Roadmap de Desenvolvimento

> Documento de referência para o desenvolvimento contínuo do AT_Manut.
> Baseado em pesquisa de casos de sucesso em aplicações de manutenção industrial, CMMS (Computerized Maintenance Management Systems) e UX para equipas no terreno.
> Última revisão: 2026-02-23

---

## 1. Contexto e posicionamento

O AT_Manut é uma aplicação web de gestão de manutenção destinada às equipas da Navel-Açores, Lda. Os utilizadores actuam **no terreno** com equipamentos industriais e máquinas, por vezes em condições adversas:

- Conectividade instável ou inexistente
- Mãos sujas ou com luvas
- Pressão de tempo (avaria a parar produção)
- Perfis tecnológicos variados — desde técnicos experientes a operadores com pouco à-vontade digital

A pesquisa de mercado confirma que **esta combinação é o maior desafio** nas aplicações CMMS mobile e que as soluções mais bem-sucedidas partilham um conjunto claro de princípios.

---

## 2. O que as melhores apps de manutenção fazem bem

### 2.1 Offline-first (funcionar sem internet)

**Problema real:** Técnicos a trabalhar em caves, armazéns com estruturas metálicas, zonas industriais remotas ou no exterior perdem ligação. Se a app não funcionar offline, o técnico abandona-a e volta ao papel.

**Casos de sucesso documentados:**
- **BuildLog** (construção): funciona 100% offline com IndexedDB — cria relatórios, fotos, GPS sem internet. Sincroniza automaticamente ao reconectar.
- **TechGrid / Android field app** (automóvel e maquinaria pesada): testado em parques de caravanas no Alasca com 3G e em armazéns com dead zones. Solução: dois modos — *Graceful Fallback* (continua se a ligação cair a meio) e *Planned Offline* (pré-carrega fichas e checklists antes de sair para o terreno).

**Para o AT_Manut — estado actual (v1.4.0):**
- ✅ `localStorage` garante persistência básica — dados não se perdem ao fechar o browser
- ✅ **Cache local implementado** (`localCache.js`) — dados do servidor em cache até 30 dias, carregados offline se não houver ligação
- ✅ **Fila de sincronização implementada** (`syncQueue.js`) — operações offline enfileiradas e processadas ao reconectar
- ✅ **OfflineBanner** — indicador visual com 4 estados (offline, pendentes, a sincronizar, online)
- 🔜 **Próximo passo:** Service Worker para cache de assets (CSS, JS, imagens) — app abre mesmo offline em primeira visita
- 🔜 **Futuro:** Sincronização com Supabase para multi-dispositivo e dados partilhados

```
Estado actual (v1.4.0):
  localStorage (dados) + sessionStorage (autenticação)
  + localCache.js (dados servidor em cache offline)
  + syncQueue.js (fila de mutações offline → sync automático ao reconectar)
  + OfflineBanner (indicador visual)

Próximo passo:  Service Worker (cache de assets → app 100% offline)
Futuro:         Supabase Realtime + RLS (multi-dispositivo, dados partilhados)
```

### 2.2 Simplicidade radical — 2-3 toques para qualquer tarefa

**Problema real:** Técnicos no terreno não têm paciência (nem tempo) para menus aninhados. Se precisar de mais de 3 toques para registar uma avaria, a app é abandonada.

**Princípios das apps mais adoptadas:**
- DIMO Maint: "sem formação necessária" — interface tão óbvia que qualquer técnico usa no primeiro dia
- TRACTIAN: registo de ordem de trabalho em menos de 30 segundos via QR code
- Fabriq: botões grandes, cores contrastantes, sem terminologia técnica de software

**Para o AT_Manut — fluxo actual:**
```
Registar manutenção: Dashboard → Manutenções → Nova → [preencher form] → Guardar
Passos: 4 + preenchimento
```

**Oportunidade:** Botão de acção rápida no Dashboard — "Nova Manutenção Urgente" ou "Reportar Avaria" que leva directamente ao form com campos mínimos (máquina + descrição).

### 2.3 QR Code para identificação de máquinas

**Problema real:** Técnicos perdem tempo a procurar a máquina certa na lista quando chegam ao piso de fábrica.

**Solução adoptada pelas melhores apps:**
Colar um QR code em cada máquina. O técnico aponta a câmara → abre a ficha da máquina directamente → regista manutenção ou avaria.

**Para o AT_Manut:**
- Gerar QR codes para cada máquina (a partir do ID interno)
- Adicionar leitura de QR code na app (API `BarcodeDetector` ou biblioteca `jsQR`)
- Imprimir etiquetas para colocar nas máquinas

### 2.4 Captura de fotos/vídeos

**Problema real:** "A máquina fez um barulho estranho" não é suficiente para o técnico sénior diagnosticar remotamente. Uma foto ou vídeo de 5 segundos é.

**Para o AT_Manut:**
- Adicionar campo de foto no registo de manutenção/avaria
- Compressão automática antes do upload (evitar ficheiros grandes)
- Armazenar no Supabase Storage (já configurado no navel-site)

### 2.5 Voz como entrada de dados

**Problema real:** Com as mãos sujas ou com luvas, digitar é difícil.

**Para o AT_Manut:**
- API `SpeechRecognition` (nativa nos browsers modernos — Chrome, Safari iOS 14.5+)
- Botão de microfone nos campos de texto (descrição da avaria, notas)
- Transcrição automática → o técnico fala, a app escreve

### 2.6 Interface de alto contraste para uso no exterior

**Problema real:** Ecrãs sob luz solar directa são praticamente ilegíveis com contrastes baixos.

**Para o AT_Manut:**
- Verificar rácios de contraste WCAG (mínimo 4.5:1 para texto normal)
- Considerar modo "Outdoor" com fundo branco e texto preto muito escuro
- O tema escuro actual pode ser difícil de ler sob sol directo

---

## 3. Funcionalidades prioritárias por fase

### Fase A — Melhorias imediatas (0-1 mês)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| A1 | **Service Worker básico** — cache de assets, app funciona offline | Alto | Médio |
| A2 | **Botão de acção rápida** no Dashboard ("Nova Manutenção" / "Reportar Avaria") | Alto | Baixo |
| A3 | **Áreas de toque ≥44px** em todos os botões e controlos | Médio | Baixo |
| A4 | **Responsividade em landscape** — tabelas e cards ajustam-se ao rodar | Alto | Médio |
| A5 | **Indicação de estado offline** — aviso visual quando sem internet | Médio | Baixo |

### Fase B — Funcionalidades de campo (1-3 meses)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| B1 | **QR Code por máquina** — geração + leitura via câmara | Alto | Médio |
| B2 | **Captura de foto** no registo de manutenção/avaria | Alto | Médio |
| B3 | **Entrada por voz** nos campos de texto (SpeechRecognition API) | Médio | Médio |
| B4 | **Notificações push** para manutenções preventivas (Web Push API) | Alto | Alto |
| B5 | **PWA instalável** — ícone no ecrã inicial do telemóvel | Alto | Médio |

### Fase C — Inteligência e integração (3-6 meses)

| # | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| C1 | **Sincronização com backend** (Supabase) — dados partilhados entre utilizadores | Muito Alto | Alto |
| C2 | **Histórico de avarias por máquina** — padrões e frequência | Alto | Médio |
| C3 | **Calendário de manutenção preventiva** — alertas automáticos por periodicidade | Alto | Alto |
| C4 | **Dashboard de métricas** — MTBF, MTTR, disponibilidade por máquina | Médio | Alto |
| C5 | **Exportação para PDF** de ordens de trabalho individuais | Médio | Médio |

---

## 4. UX para utilizadores com pouco conhecimento digital

### Princípios a aplicar no AT_Manut

**1. Linguagem simples e directa**
- Evitar termos técnicos de software ("sincronizar", "submeter", "validar")
- Usar acções concretas: "Guardar", "Enviar", "Apagar", "Fechar"
- Labels descritivos: "Máquina avariada" em vez de "Equipamento com falha"

**2. Feedback imediato e claro**
- Todo o gesto deve ter resposta visual em < 100ms
- Erros com mensagem humana: "Não foi possível guardar. Verifica a tua ligação à internet." (não: "HTTP 500 Internal Server Error")
- Sucesso com reforço positivo: "✓ Manutenção registada com sucesso"

**3. Recuperação de erros óbvia**
- Botão "Cancelar" sempre visível ao lado de "Guardar"
- Confirmação antes de apagar: "Tens a certeza que queres apagar esta manutenção?"
- Nunca perder dados preenchidos num form por erro técnico

**4. Onboarding progressivo**
- Primeira vez que o utilizador abre a app: tour de 3 ecrãs a mostrar as 3 acções principais
- Dicas inline nos campos menos óbvios (ex: "Descreve o problema encontrado")

**5. Consistência visual**
- Mesmas cores para as mesmas acções em toda a app
  - Verde / primário = acção principal (guardar, confirmar)
  - Cinza = cancelar/voltar
  - Vermelho = eliminar / aviso crítico
- Ícones sempre acompanhados de texto (nunca ícone sozinho)

---

## 5. Considerações técnicas para mobile (AT_Manut específico)

### Stack actual (v1.4.0)
```
React 19 + Vite + React Router (basename /manut)
localStorage para persistência + cache offline (atm_cache_v1) + fila sync (atm_sync_queue)
sessionStorage para autenticação (JWT — sessão termina ao fechar janela)
Playwright para testes E2E (137 testes automatizados)
```

### Adicionar Service Worker (PWA básica)

Adicionar ao `vite.config.js`:
```bash
npm install vite-plugin-pwa --save-dev
```

```js
// vite.config.js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: 'AT Manut — Navel',
        short_name: 'AT Manut',
        description: 'Gestão de manutenção industrial',
        theme_color: '#b90211',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/manut/',
        icons: [
          { src: '/manut/logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/manut/logo.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ]
}
```

Resultado: app instalável no ecrã inicial do telemóvel, funciona offline para assets.

### Indicação de estado de conectividade

```jsx
// src/components/OfflineBanner.jsx
import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  if (online) return null

  return (
    <div style={{ background: '#b90211', color: '#fff', textAlign: 'center', padding: '8px', fontSize: '0.9rem' }}>
      ⚠ Sem ligação à internet — os dados são guardados localmente
    </div>
  )
}
```

### QR Code — geração (por máquina)

```bash
npm install qrcode --save
```

```jsx
import QRCode from 'qrcode'

async function gerarQR(maquinaId) {
  const url = `${window.location.origin}/manut/maquinas/${maquinaId}`
  return await QRCode.toDataURL(url, { width: 200 })
}
```

### QR Code — leitura (câmara)

```bash
npm install @zxing/library --save
```

---

## 6. Métricas de sucesso para medir o impacto

Quando implementar novas funcionalidades, medir:

| Métrica | Como medir | Objectivo |
|---|---|---|
| Tempo para registar 1 manutenção | Cronometrar manualmente com técnico | < 60 segundos |
| Taxa de registos completos vs. incompletos | Analisar dados no localStorage | > 90% completos |
| Erros reportados por utilizador/semana | Log de erros no `atm_log` | 0 erros críticos |
| Uso em mobile vs. desktop | Adicionar user-agent ao log | > 60% mobile |
| Satisfação subjectiva | Pergunta simples ao técnico após uso | "Fácil" ou "Muito fácil" |

---

## 7. Referências e leituras recomendadas

- [CMMS UI/UX Design Guide — Aufait UX](https://www.aufaitux.com/blog/cmms-ui-ux-design/)
- [Designing Mobile Apps for Field Teams: Offline-First — Medium](https://medium.com/@mrsikandar08/designing-mobile-apps-for-field-teams-offline-first-ux-and-on-device-intelligence-4194ab9f2279)
- [Mobile QA: Improving UX for Field Service Technicians — STM](https://www.softwaretestingmagazine.com/knowledge/mobile-qa-improving-ux-for-field-service-technicians/)
- [Building a Cutting-Edge CMMS Mobile App — iMaintain](https://imaintain.uk/building-a-cutting-edge-cmms-mobile-app-in-2025-with-imaintains-expert-guide/)
- [Offline-First Android App for Field Inspections — TechGrid](https://techgrid.media/interviews/sync-or-fail-inside-an-offline-first-android-app-built-for-field-inspections/)
- [PWA 2025 Field Guide — GothArtech](https://gothartech.com/en/insights/pwa-2025)
- [TRACTIAN Mobile CMMS](https://tractian.com/en/solutions/cmms/mobile-app)
- [Fabriq — Mobile App for Frontline Workers](https://fabriq.tech/en/feature-mobile-app/)
