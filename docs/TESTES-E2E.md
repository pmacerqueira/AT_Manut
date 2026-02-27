# AT_Manut — Suite de Testes E2E (Playwright)

> 447 testes automatizados cobrindo todos os fluxos, perfis de utilizador, funcionalidades e performance.
> Última revisão: 2026-02-26 — v1.9.7

---

## Sumário da suite

| Ficheiro | Testes | Cobertura |
|----------|--------|-----------|
| `01-auth.spec.js` | 7 | Login, logout, sessão, redirecionamentos |
| `02-dashboard.spec.js` | 14 | Cards KPI, "O meu dia", alertas badge, navegação |
| `03-clientes.spec.js` | 15 | CRUD clientes, pesquisa, validação de email |
| `04-manutencoes.spec.js` | 23 | Listagem, filtros, execução, validações, permissões |
| `05-montagem.spec.js` | 5 | Fluxo completo montagem, assinatura, periódicas |
| `06-agendamento.spec.js` | 10 | Formulário, validações, fluxo completo |
| `07-permissions.spec.js` | 26 | RBAC Admin vs ATecnica, rotas protegidas |
| `08-equipamentos-categorias.spec.js` | 17 | Equipamentos, categorias CRUD inline, calendário |
| `09-edge-cases.spec.js` | 20 | Fotos, assinatura, modais, mobile, estado vazio |
| `10-etapas-evolucao.spec.js` | 48 | Vista "O meu dia", alertas badge, QR Code etiqueta, Histórico PDF |
| `11-blocos-abc.spec.js` | 40 | Email clientes, config alertas, reagendamento, modal proactivo |
| `12-v170-features.spec.js` | 42 | Pesquisa global, Leitor QR, Modo campo, Métricas, localStorage |
| `13-performance.spec.js` | 14 | Render com 240 registos, KPIs volumosos, pesquisa, filtros, limiares de tempo |
| `14-kaeser-features.spec.js` | 31 | Funcionalidades Kaeser — importação e visualização |
| `15-kaeser-pdf-import.spec.js` | 18 | Importação de PDF Kaeser — extracção e validação de dados |
| `16-reparacoes.spec.js` | 42 | Reparações base: listagem, filtros, criar, fluxo multi-dia, relatório, ISTOBAL mensal |
| `17-reparacoes-avancado.spec.js` | 69 | Reparações avançado: permissões, fotos, email, mobile, offline, estados vazios, peças |
| `18-import-saft-clientes.spec.js` | 6 | Importação SAF-T: modal, validação ficheiro, preview, importação completa, 2ª importação (ignorar) |
| **Total** | **447** | **100% dos fluxos da aplicação + escalabilidade** |

> **Specs 01–09** (127 testes): cobertura base do núcleo da aplicação.
> **Specs 10–11** (88 testes): funcionalidades v1.5–v1.6 (alertas, QR, histórico, Blocos A+B+C).
> **Spec 12** (42 testes): funcionalidades v1.7.0 (pesquisa, leitor QR, modo campo, métricas, localStorage).
> **Spec 13** (14 testes): performance e escalabilidade com dataset `mock-large.js` (240 registos realistas).
> **Specs 14–15** (49 testes): importação e funcionalidades Kaeser.
> **Specs 16–17** (111 testes): módulo Reparações — base + avançado (permissões, responsividade, offline).
> **Spec 18** (6 testes): importação SAF-T de clientes — modal, validação, preview, importação completa, modo ignorar.

---

## Pré-requisitos

```powershell
# Servidor de desenvolvimento a correr (terminal separado)
npm run dev    # http://localhost:5173

# Instalar browsers Playwright (apenas na primeira vez)
npx playwright install chromium
```

---

## Executar os testes

```powershell
# Suite completa
npx playwright test tests/e2e/

# Specs específicos
npx playwright test tests/e2e/16-reparacoes.spec.js tests/e2e/17-reparacoes-avancado.spec.js --reporter=list

# Com output detalhado
npx playwright test tests/e2e/ --reporter=list

# Modo UI interactivo (debugging)
npx playwright test --ui

# Ver relatório HTML após execução
npx playwright show-report

# Filtrar por grupo de testes
npx playwright test --grep "RA-8|RA-9" --reporter=list
```

---

## Arquitectura dos testes

### `helpers.js` — utilitários partilhados

```js
import {
  setupApiMock, doLoginAdmin, doLoginTecnico,
  loginAdminSemAlertas, dismissAlertasModal,
  getInputByLabel, SELETOR_BOTAO_EDITAR, MC
} from './helpers.js'

// Interceptar API com dados mock (isola testes do servidor real)
await setupApiMock(page)
await setupApiMock(page, { customData: { maquinas: [] } })  // dados customizados
await setupApiMock(page, { failFetch: true })                // simular offline

// Login
await doLoginAdmin(page)
await doLoginTecnico(page)

// Login Admin SEM modal de alertas (preferir em specs gerais)
await loginAdminSemAlertas(page, { path: '/' })
await loginAdminSemAlertas(page, { path: '/reparacoes' })
await loginAdminSemAlertas(page, { path: '/reparacoes', customData: { reparacoes: [] } })

// Reparações — helpers específicos
await irParaReparacoes(page)              // login + navegar para /reparacoes
await abrirModalExecucaoPendente(page)    // clica "Executar" na 1ª reparação pendente
await preencherTecnico(page)              // preenche campo técnico no modal de execução
await signCanvas(page, canvasLocator)     // assina o canvas de assinatura

// Assertar Toast
await expectToast(page, /texto/, 5000)
```

### Padrões de selectors (evitar flakiness)

| Situação | Evitar | Preferir |
|----------|--------|----------|
| Botão Editar | `.icon-btn.secondary` (pode apanhar Relatório frota) | `SELETOR_BOTAO_EDITAR` ou `button[title="Editar"]` |
| Campo de formulário | `input.nth(1)` (ordem pode mudar) | `getInputByLabel(page, 'Nome do Cliente')` |
| Modal de alertas | Deixar aparecer (bloqueia interacção) | `dismissAlertasModal(page)` ou `loginAdminSemAlertas()` |
| Múltiplos botões iguais (empty-state) | `.filter({ hasText: '...' }).click()` | `.filter({ hasText: '...' }).first().click()` |
| Route handler sequencial | `route.continue()` (vai para rede real) | `route.fallback()` (passa ao handler anterior) |

### Dados mock (`MC` — Mock Constants)

```js
MC = {
  clientes: [ /* 4 clientes: ISTOBAL Portugal, Mecânica Bettencourt, Frigorífico Açores, outro */ ],
  maquinas: [ /* 7 máquinas */ ],
  manutencoes: [ /* manutenções com mt20 em Abril para não activar alertas */ ],
  relatorios: [ /* relatórios de manutenção */ ],
  categorias: [...], subcategorias: [...], checklistItems: [...],
  // Reparações
  reparacoes: [
    { id: 'rep01', status: 'pendente', origem: 'manual', ... },
    { id: 'rep02', status: 'em_progresso', origem: 'manual', ... },
    { id: 'rep03', status: 'concluida', origem: 'manual', ... },
    { id: 'rep04', status: 'concluida', origem: 'istobal', numeroAviso: 'ES-20260201-004', ... },
    { id: 'rep05', status: 'em_progresso', origem: 'istobal', numeroAviso: 'ES-20260218-005', ... },
  ],
  relatoriosReparacao: [
    { id: 'rr-rep03', reparacaoId: 'rep03', numeroRelatorio: '2026.RP.00001', pecasUsadas: [{referencia: 'SENS-NTC-01', ...}], ... },
    { id: 'rr-rep04', reparacaoId: 'rep04', numeroRelatorio: '2026.RP.00002', pecasUsadas: [{referencia: 'IST-PUMP-HP', ...}], ... },
    { id: 'rr-rep05', reparacaoId: 'rep05', trabalhoRealizado: 'Sensor de posição diagnosticado...', ... }, // rascunho
  ],
}
```

---

## Cobertura — Módulo Reparações (specs 16 e 17)

### Spec 16 — Reparações Base (42 testes)

**R1 — Listagem e filtros:**
- Mostra todas as reparações (mock data) por defeito
- Filtros Pendentes, Em progresso, Concluídas funcionam correctamente
- Badges de estado correctos em `tbody` (não confundir com badges de cabeçalho)
- Contador de filtro mostra número correcto

**R2 — Dashboard:**
- Card de reparações visível com ligação para a página

**R3 — Criar nova reparação:**
- Botão "Nova Reparação" abre modal
- Validação de campos obrigatórios
- Criar reparação válida fecha modal + toast de sucesso
- ATecnica também pode criar

**R4 — Guardar progresso (fluxo multi-dia):**
- Reparação pendente tem botão "Executar"
- Modal de execução abre
- "Guardar progresso" sem assinatura fecha modal + toast
- Reparação em progresso não tem botão "Ver relatório"

**R5 — Retoma de reparação em progresso:**
- Abrir reparação em progresso pré-preenche dados guardados (trabalho realizado parcial)
- Relatório parcial existente carregado correctamente

**R6 — Concluir com assinatura:**
- Sem assinatura: botão "Concluir" mostra erro
- Fluxo completo: preencher + assinar + concluir gera relatório

**R7 — Ver relatório concluído:**
- Reparações concluídas têm botão "Ver relatório"
- Modal mostra número de relatório, horas M.O., materiais usados, botão "Enviar email"

**R8 — Relatório mensal ISTOBAL:**
- Botão "Mensal ISTOBAL" visível no cabeçalho
- Modal abre com título ISTOBAL
- Mostra avisos ES- do mês corrente
- Coluna H. M.O.; card "Horas M.O. (faturar)"
- Linha com materiais tem badge de contagem; expandir mostra sub-tabela sem preços
- Navegação entre meses (via `aria-label` nos botões); título `.mensal-titulo` actualiza
- Botão "Imprimir / Exportar" visível no footer

**R9 — Eliminar reparação:**
- Admin tem botão "Eliminar"; ATecnica não tem
- Confirmar → remove da lista; Cancelar → mantém

**R10 — Badges ISTOBAL:**
- Badge `.rep-origem-istobal` visível nas reparações ISTOBAL
- Coluna "Aviso" mostra número ES-

---

### Spec 17 — Reparações Avançado (69 testes)

**RA-1 — Permissões Admin vs ATecnica (12 testes):**
- Admin: botões Eliminar, "Nova Reparação", "Mensal ISTOBAL", campo data histórica
- ATecnica: SEM Eliminar, COM "Nova Reparação", COM "Mensal ISTOBAL" (leitura), SEM data histórica
- ATecnica: PODE criar, executar, guardar progresso
- Reparações visíveis na sidebar para ATecnica

**RA-2 — Fluxo multi-dia realista (4 testes):**
- Dia 1: criar reparação e guardar progresso parcial
- Dia 2: retomar reparação em_progresso, adicionar materiais e concluir
- Reparação concluída aparece no filtro "Concluídas"

**RA-3 — Fotos no modal de execução (7 testes):**
- Secção de fotos presente (botão `.foto-add`)
- Upload PNG: foto aparece na grid
- Botão remover: foto eliminada da grid
- Contador 0/8 inicialmente
- Múltiplas fotos adicionadas sequencialmente
- Limite de 8 fotos respeitado — toast de aviso ao exceder
- Fotos guardadas no progresso recarregadas ao retomar

**RA-4 — Envio de email após conclusão (5 testes):**
- Admin: ecrã de conclusão mostra email Admin automático
- Reparação ISTOBAL: tag ISTOBAL no ecrã de conclusão
- Cliente com email na ficha: tag Cliente no ecrã de conclusão
- Campo de email manual não aparece se cliente tem email
- Botão "Enviar email" abre modal com campo de destinatário

**RA-5 — Relatório concluído: conteúdo e estrutura (6 testes):**
- Relatório mostra dados da máquina (marca, modelo, nº série, localização)
- Relatório mostra dados do cliente (nome, NIF)
- Nº sequencial no formato `AAAA.RP.NNNNN`
- Assinante e data de assinatura presentes
- Materiais usados com código e quantidade
- Rodapé Navel com versão da app

**RA-6 — Responsividade mobile 375×812 (7 testes):**
- Página carrega sem overflow horizontal
- Filtros visíveis e clicáveis em mobile
- Tabela com scroll horizontal sem quebrar layout
- Modal "Nova Reparação" abre e é usável
- Modal de execução é scrollável
- Sidebar: menu Reparações acessível em mobile

**RA-7 — Responsividade tablet 768×1024 (3 testes):**
- Tabela sem overflow
- Modal mensal ISTOBAL legível
- Canvas de assinatura funciona em tablet

**RA-8 — Offline: graceful degradation (3 testes):**
- Criar reparação offline: app continua com dados locais (optimistic update)
- Guardar progresso offline: modal fecha (estado guardado localmente)
- App mantém dados ao recarregar (localStorage cache)

**RA-9 — Estados vazios (4 testes):**
- Sem reparações: empty-state com botão "Nova Reparação"
- Filtro "Pendentes" vazio: empty-state
- Modal "Nova Reparação" sem máquinas: select com só placeholder
- Relatório mensal ISTOBAL sem avisos: mensagem "Nenhum aviso"

**RA-10 — Admin: data histórica (3 testes):**
- Admin pode definir data histórica no modal de execução
- Relatório com data histórica mostra a data correcta
- ATecnica NÃO tem campo de data histórica

**RA-11 — Peças e consumíveis (5 testes):**
- Secção de peças presente no modal
- Botão "+" adiciona nova linha
- Botão de remover elimina a linha
- Peças com código aparecem no relatório
- Linhas vazias não aparecem no relatório

**RA-12 — Checklist corretivo (2 testes):**
- Modal mostra secção de checklist quando existem itens
- Sem itens: não bloqueia a conclusão

**RA-13 — Fluxo completo ISTOBAL (5 testes):**
- Badge ISTOBAL na lista
- Aviso ES- na coluna "Aviso"
- Executar: nº aviso ES- pré-preenchido
- Relatório mensal mostra aviso ES-
- Linhas concluídas têm horas M.O. na tabela mensal

**RA-14 — Relatório mensal com dados volumosos (2 testes):**
- Modal renderiza com 20 avisos ISTOBAL sem travar (< 3s)
- Total de horas M.O. correcto com dataset volumoso

**RA-15 — Logging de acções (4 testes):**
- Criar reparação gera entrada no log
- Eliminar reparação gera entrada no log
- Página de Logs acessível ao Admin
- ATecnica não acede à página de Logs (redirecionado)

---

### Spec 18 — Importação SAF-T de clientes (6 testes)

**Cobertura:**
- Admin vê botão "Importar SAF-T"
- Abrir modal de importação e ver instruções (ficheiro JSON, input file)
- Ficheiro com estrutura inválida (object em vez de array) exibe erro `.form-erro`
- Ficheiro JSON válido mostra pré-visualização (novos, existentes, total)
- Importação completa: clientes aparecem na lista + toast de sucesso
- 2ª importação do mesmo ficheiro (modo Ignorar): toast "ignorados"

**Fixtures:** `tests/fixtures/clientes-import-test.json` (2 clientes), `invalid-import.json` (object inválido).

**Mock:** `setupApiMock` acumula clientes criados em `clientesMutable` para `list` retornar dados actualizados.

---

## Problemas técnicos documentados e resoluções

### `route.continue()` vs `route.fallback()` em testes offline (Playwright 1.58)
**Problema:** Nos testes RA-8, ao adicionar um segundo handler de route para simular escritas offline, usar `route.continue()` para as leituras envia o pedido para a rede real (não para o handler `setupApiMock` registado anteriormente). Isso impede o carregamento de dados mock, e os testes falham porque o select de máquinas fica vazio.
**Solução:** Usar `route.fallback()` para passar ao handler anterior na pilha de routes. `continue()` vai para a rede; `fallback()` vai para o próximo handler registado.

### Dois botões "Nova Reparação" quando lista vazia (strict mode)
**Problema:** Com `reparacoes: []`, a página mostra dois botões com texto "Nova Reparação" (header + empty-state). Chamar `.click()` sem `.first()` pode violar o strict mode do Playwright.
**Solução:** Usar `.filter({ hasText: '...' }).first().click()` sempre que possa existir mais do que um elemento com o mesmo texto.

### Selector de badge: `tbody .badge` vs `.badge`
**Problema:** Badges de cabeçalho (ex.: contador "5" no filtro) e badges de estado nas linhas da tabela têm a mesma classe. O selector `.badge` apanha ambos.
**Solução:** Usar `tbody .badge` para limitar a linhas de dados.

### Selector de título do mensal: `.mensal-titulo` + `aria-label` nos botões
**Problema:** O selector `.mensal-nav-titulo` não existe; os botões de navegação não têm texto visível (são ícones) — usar `.textContent('>')` falha.
**Solução:** Título em `.mensal-titulo`; botões com `button[aria-label="Mês anterior"]` / `button[aria-label="Mês seguinte"]`.

### Relatório de reparação sem dados de máquina/cliente (bug de feature)
**Problema:** `RelatorioReparacaoView` não mostrava dados da máquina nem do cliente; não tinha rodapé Navel.
**Solução:** Adicionada secção `.rel-section-equipamento` com dados da máquina e cliente, e `.rel-footer` com `APP_FOOTER_TEXT`.

### Canvas de assinatura em testes E2E
**Problema:** `page.mouse` é pouco fiável em canvas; o estado `assinaturaFeita` pode não ser activado.
**Solução:** Usar `page.evaluate()` para desenhar directamente no contexto 2D e disparar `MouseEvent` via `dispatchEvent`.

### Sessão Admin persistente em testes ATecnica
**Problema:** `beforeEach` com Admin guarda JWT no `sessionStorage`; `doLoginTecnico()` pode não processar novo login.
**Solução:** `await page.evaluate(() => sessionStorage.clear())` antes de cada login alternativo.

### Modal de alertas interfere com outros testes
**Problema:** Datas próximas no mock activam o modal proactivo, bloqueando interacção noutros specs.
**Solução:** `mt20` e manutenções base a > 60 dias; alertas de teste só em `MC_COM_ALERTA` (spec 11). Usar `dismissAlertasModal(page)` ou `loginAdminSemAlertas()`.

---

## Configuração (`playwright.config.js`)

```js
{
  testDir: './tests',
  timeout: 45000,            // 45 s por teste
  retries: 1,                // 1 retry por teste falhado
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10000,    // 10 s por acção individual
    navigationTimeout: 15000,
    screenshot: 'only-on-failure',
    video: 'on-first-retry'
  }
}
```

> **Workers:** Por omissão usa 2 workers em paralelo. Para debugging: `--workers=1`.

---

## Manutenção dos testes

### Ao adicionar uma nova funcionalidade
1. Identificar o módulo e as acções que cobre
2. Adicionar testes ao spec correspondente ou criar novo spec numerado (ex.: `18-xxx.spec.js`)
3. Atualizar `MC` em `helpers.js` com novos dados mock se necessário
4. Correr `npx playwright test tests/e2e/` para confirmar que nada quebrou

### Ao alterar seletores CSS
Os testes dependem de classes CSS. Se alterar uma classe, verificar:
- `helpers.js` — `fillExecucaoModal`, `signCanvas`, `expectToast`
- `04-manutencoes.spec.js` — `.manutencoes-table`, `.btn-executar-manut`
- `11-blocos-abc.spec.js` — `.def-alerta-row`, `.form-erro`, `.badge-sem-email`
- `16-reparacoes.spec.js` — `.modal-exec-rep`, `.modal-nova-rep`, `.modal-relatorio-rep`, `.mensal-titulo`
- `17-reparacoes-avancado.spec.js` — `.foto-add`, `.fotos-grid`, `.rep-origem-istobal`

### Ao alterar dados mock (datas)
- `mt20` e manutenções base: a **> 60 dias** da data actual
- Manutenções de teste de alertas: em `MC_COM_ALERTA` (spec 11)
- Reparações: `rep04` e `rep05` devem continuar ISTOBAL com avisos ES- para os testes R8/RA-13

### Ao adicionar novo módulo de testes offline
- Usar `setupApiMock(page, { failFetch: false })` para o carregamento inicial
- Adicionar segundo route handler com `route.fallback()` (não `continue()`) para leituras
- `route.abort('failed')` para escritas
- Verificar se há múltiplos botões com o mesmo texto e usar `.first()` se necessário

---

*Última actualização: 2026-02-26 — v1.9.7*
