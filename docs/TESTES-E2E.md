# AT_Manut — Suite de Testes E2E (Playwright)

> 88 testes automatizados cobrindo todos os fluxos, perfis de utilizador e funcionalidades.
> Última revisão: 2026-02-23 — v1.6.2

---

## Sumário da suite

| Ficheiro | Testes | Cobertura |
|----------|--------|-----------|
| `01-auth.spec.js` | 8 | Login, logout, sessão, redirecionamentos |
| `02-dashboard.spec.js` | 10 | Cards KPI, "O meu dia", alertas badge, navegação |
| `03-clientes.spec.js` | 12 | CRUD clientes, pesquisa, validação de email |
| `04-manutencoes.spec.js` | 27 | Listagem, filtros, execução, validações, permissões |
| `05-montagem.spec.js` | 5 | Fluxo completo montagem, assinatura, periódicas |
| `06-agendamento.spec.js` | 10 | Formulário, validações, fluxo completo |
| `07-permissions.spec.js` | 20 | RBAC Admin vs ATecnica, rotas protegidas |
| `08-equipamentos-categorias.spec.js` | 18 | Equipamentos, categorias CRUD inline, calendário |
| `09-edge-cases.spec.js` | 27 | Fotos, assinatura, modais, mobile, estado vazio |
| `10-etapas-evolucao.spec.js` | 48 | Vista "O meu dia", alertas badge, QR Code, Histórico PDF |
| `11-blocos-abc.spec.js` | 40 | Email clientes, config alertas, reagendamento, modal proactivo |
| **Total** | **225** | **100% dos fluxos da aplicação** |

> **Nota:** Os specs 01–09 (137 testes base) e os specs 10–11 (88 testes de evolução) formam a suite completa. Os specs 10–11 são os mais relevantes para as funcionalidades recentes (v1.5–v1.6).

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

# Specs específicos (mais rápido para validar funcionalidades recentes)
npx playwright test tests/e2e/10-etapas-evolucao.spec.js tests/e2e/11-blocos-abc.spec.js

# Com output detalhado
npx playwright test tests/e2e/ --reporter=list

# Modo UI interactivo (debugging)
npx playwright test --ui

# Ver relatório HTML após execução
npx playwright show-report

# Filtrar por nome de teste
npx playwright test tests/e2e/ -g "QR Code"
```

---

## Arquitectura dos testes

### `helpers.js` — utilitários partilhados

```js
import { setupApiMock, doLoginAdmin, doLoginTecnico, MC } from './helpers.js'

// Interceptar API com dados mock (isola testes do servidor real)
await setupApiMock(page)
await setupApiMock(page, { customData: MC_COM_ALERTA })  // dados customizados

// Login
await doLoginAdmin(page)
await doLoginTecnico(page)

// Preencher modal de execução de manutenção
await fillExecucaoModal(page)

// Assertar Toast (ephemeral — usar com cautela)
await expectToast(page, /texto/, 5000)
```

### Dados mock (`MC` — Mock Constants)

```js
MC = {
  clientes: [
    { id: 'c01', nif: '501234567', nome: 'Mecânica Bettencourt', email: 'bet@bett.pt' },
    { id: 'c02', nif: '502345678', nome: 'Frigorífico Açores', email: '' }  // sem email
  ],
  maquinas: [
    { id: 'm01', clienteId: 'c01', marca: 'Otis', modelo: 'GeN2', periodicidadeManut: 'anual' },
    { id: 'm02', clienteId: 'c02', marca: 'Schindler', modelo: '3300' }
  ],
  manutencoes: [
    { id: 'mt10', maquinaId: 'm01', tipo: 'periodica', status: 'pendente', data: '2026-02-15' },
    { id: 'mt15', maquinaId: 'm01', tipo: 'periodica', status: 'pendente', data: '...' },
    { id: 'mt20', maquinaId: 'm02', tipo: 'montagem',  status: 'pendente', data: '2026-04-01' }
    // mt20 afastado para não activar modal de alertas nos testes do spec 10
  ],
  // + categorias, subcategorias, checklist, relatorios
}
```

### `MC_COM_ALERTA` — dados para testes de alertas (spec 11)

Estende `MC` com:
- `c02` sem email → testa badge "Sem email"
- `mt_prox1`, `mt_prox2` com datas a 3-4 dias → activam o modal proactivo
- `mt20` em Abril → não activa alertas, mantém isolamento

### Helpers de autenticação para alertas (spec 11)

```js
// Login como Admin COM modal de alertas visível
async function loginAdminComAlertas(page, customData = MC_COM_ALERTA) {
  await setupApiMock(page, { customData })
  await doLoginAdmin(page)
  await page.evaluate(() => {
    localStorage.removeItem('atm_alertas_dismiss')
    localStorage.setItem('atm_config_alertas', JSON.stringify({ diasAviso: 7 }))
  })
  await page.goto('/manut/')  // re-navegar para useEffect disparar
  await page.waitForTimeout(1500)
}

// Login como Admin SEM modal de alertas (dismiss definido)
async function loginAdminSemAlertas(page) {
  await setupApiMock(page)
  await doLoginAdmin(page)
  await page.evaluate(() => {
    localStorage.setItem('atm_alertas_dismiss', new Date().toISOString().slice(0,10))
  })
}
```

---

## Cobertura por funcionalidade (specs 10 e 11)

### Spec 10 — Etapas 1–4 (48 testes)

**Etapa 1 — Vista "O meu dia":**
- Secção "O meu dia" visível no Dashboard
- Lista manutenções do técnico autenticado
- Botão "Executar" navega para Manutenções
- ATecnica vê a sua vista; Admin vê global

**Etapa 2 — Alertas de conformidade badge:**
- Card "Em atraso" tem classe `stat-card-pulse` quando >7 dias
- Sub-texto "Há X dias!" exibido
- Número de dias coerente
- Sem atraso → sem pulse
- Atraso de apenas 3 dias → sem badge (< threshold)
- ATecnica também vê o alerta

**Etapa 3 — QR Code:**
- Botão QR visível em vista hierárquica e em máquinas em atraso
- Modal `.qr-modal` abre ao clicar
- Modal mostra cabeçalho NAVEL e info da máquina (marca/modelo/série)
- QR code gerado (img aparece)
- Botão "Imprimir etiqueta" activo após gerar QR
- Fechar via botão, via overlay, via **Escape** ← corrigido em v1.6.2
- ATecnica também tem acesso ao QR
- Etiqueta tem rodapé com versão Navel
- QR em vista hierárquica funciona (com Escape)

**Etapa 4 — Histórico PDF:**
- Botão "Histórico PDF" visível em ambas as vistas
- Clique abre modal de histórico
- Modal mostra título e lista de relatórios
- Download/impressão funciona

**Integração:**
- Dashboard mostra alerta E lista "meu dia" em simultâneo
- QR e Histórico coexistem na mesma linha de máquina
- Fluxo: abrir QR, fechar, abrir Histórico na mesma sessão
- ATecnica: tem "O meu dia" + alertas + QR + Histórico (sem botões Admin)

---

### Spec 11 — Blocos A+B+C (40 testes)

**Bloco A — Email e Definições:**
- A1: Badge "Sem email" visível no cliente sem email
- A2: Campo email obrigatório no formulário de novo cliente
- A3: Erro inline ao tentar criar cliente sem email
- A4: Badge desaparece após adicionar email
- A5: Criar cliente com email — modal fecha, cliente aparece na tabela
- A6: Limpar email em edição → erro inline
- D1: Secção "Alertas de conformidade" visível nas Definições (Admin)
- D2: Valor por defeito "7 dias" no campo
- D3: Alterar para 14 dias → `localStorage.atm_config_alertas.diasAviso = 14`
- D4: Valor persiste após navegação
- D5: Valor 0 → erro de validação
- D6: Valor 61 → erro de validação
- D7: ATecnica não vê a secção de alertas nas Definições

**Bloco B — Reagendamento:**
- B1: Executar manutenção periódica → log contém `reagendarPeriodicas` ou `concluirManutencao`
- B2: Botão "Executar manutenção" visível em pendentes (desktop, `.btn-executar-manut`)
- B3: Execução de montagem NÃO mostra toast de reagendamento periódico
- B4: Máquina m01 tem `periodicidadeManut: 'anual'` (pré-condição do Bloco B)

**Bloco C — Modal proactivo:**
- C1: Modal aparece ao Admin com manutenções próximas
- C2: Modal mostra título "Alertas de conformidade"
- C3: Subtítulo com número de manutenções
- C4: Grupo do cliente com email (Bettencourt)
- C5: Grupo do cliente sem email com aviso
- C6: Itens mostram data e badge de urgência
- C7: Botão X fecha o modal
- C8: Botão "Fechar" fecha sem dispensar (reaparece ao voltar ao Dashboard)
- C9: "Dispensar hoje" guarda dismiss em `localStorage`
- C10: Após dispensar, modal não reaparece ao voltar ao Dashboard
- C11: Modal NÃO aparece para ATecnica
- C12: Modal NÃO aparece se já dispensado hoje
- C13: Modal NÃO aparece se manutenções estão fora do prazo de aviso
- C14: Email mock → botão "Enviar lembrete" funciona
- C15: Feedback de erro se email falhar (mock de falha)
- C16: Grupo de cliente é expansível/colapsável
- C17: Badge de contagem correcto por cliente
- I1–I4: Testes de integração combinados

---

## Problemas técnicos documentados e resoluções

### Modal de alertas proactivos interfere com testes do spec 10
**Problema:** A data de `mt20` em `helpers.js` estava a 2026-03-01 — exactamente no limite de 7 dias a partir de 2026-02-22. O modal de alertas activava nos testes do spec 10 que não o esperavam, bloqueando UI (botão "Executar", tecla Escape).
**Solução:** Data de `mt20` movida para 2026-04-01 nos dados mock base de `helpers.js`.

### Tecla Escape não fechava modal QR
**Problema:** `QrEtiquetaModal.jsx` não tinha handler de teclado — 3 testes do spec 10 falhavam ao pressionar Escape.
**Solução:** Adicionado `useEffect` com `document.addEventListener('keydown', ...)` que chama `onClose()` quando `e.key === 'Escape'`.

### HTML5 `required` vs. validação React em formulário de cliente
**Problema:** O atributo `required` no campo email de `Clientes.jsx` bloqueava o `handleSubmit` do React antes de este poder mostrar a mensagem de erro customizada. O browser mostrava o seu próprio popover de validação.
**Solução:** Remoção do atributo `required` do input email — a validação JS em `handleSubmit` faz a verificação e exibe `.form-erro`.

### Atributo `toggleExpand` no modal de alertas
**Problema:** `!prev[nif]` quando `prev[nif]` é `undefined` (estado inicial) avalia para `true` — o primeiro clique expandia em vez de colapsar.
**Solução:** `!(prev[nif] ?? true)` — assume que o estado inicial é "expandido", e o primeiro clique colapsa correctamente.

### Canvas de assinatura em testes E2E
**Problema:** O canvas de assinatura é sensível a timing e ao estado `assinaturaFeita`. O `page.mouse` do Playwright é pouco fiável em canvas.
**Solução:** Usar `page.evaluate()` para desenhar directamente no contexto 2D e disparar `MouseEvent` via `dispatchEvent`, garantindo que o estado de assinatura é activado.

### Chamadas reais ao servidor bloqueiam testes
**Problema:** Alguns modais (ex: `ExecutarManutencaoModal`) fazem chamadas reais a `send-email.php` quando há email do cliente. Em Playwright headless, estas chamadas pendentes bloqueiam a execução.
**Solução:** `page.route('**send-email.php**', route => route.fulfill({ status: 200, body: ... }))` no início de cada teste que execute manutenções com email.

### Sessão persistente entre testes de perfis diferentes
**Problema:** `beforeEach` com Admin pode deixar JWT no `sessionStorage`, bloqueando login como ATecnica.
**Solução:** `await page.evaluate(() => sessionStorage.clear())` antes de cada login alternativo.

### Seletores desktop vs. mobile
**Problema:** A lista de manutenções tem dois layouts no DOM (tabela desktop, cards mobile). Playwright pode resolver para o elemento escondido.
**Solução:** Usar seletores de classe específica (`.manutencoes-table tbody tr`, `.btn-executar-manut`).

---

## Configuração (`playwright.config.js`)

```js
{
  testDir: './tests',
  timeout: 30_000,           // 30 s por teste
  retries: 2,                // 2 retries em CI
  workers: 1,                // 1 worker (testes partilham browser state)
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    video: 'on-first-retry'
  }
}
```

---

## Manutenção dos testes

### Ao adicionar uma nova funcionalidade
1. Identificar o painel e as acções que cobre
2. Adicionar testes ao spec correspondente (ou criar novo numerado)
3. Atualizar `MC` em `helpers.js` se precisar de novos dados mock
4. Correr `npx playwright test tests/e2e/` para confirmar que nada quebrou

### Ao alterar seletores CSS
Os testes dependem de classes CSS. Se alterar uma classe, verificar:
- `helpers.js` — `fillExecucaoModal`, `expectToast`
- `04-manutencoes.spec.js` — `.manutencoes-table`, `.btn-executar-manut`
- `11-blocos-abc.spec.js` — `.def-alerta-row`, `.form-erro`, `.badge-sem-email`

### Ao alterar dados mock (datas)
As datas dos dados mock em `helpers.js` têm impacto no modal de alertas. Regra:
- `mt20` e outras manutenções base devem estar a **mais de 60 dias** da data actual
- Manutenções de teste de alertas devem estar em `MC_COM_ALERTA` (spec 11)

### Ao alterar lógica de validação de formulários
Verificar se campos com `required` HTML interferem com validação React.
Regra: **não usar `required` em campos com validação customizada JS** — remover o atributo e deixar o `handleSubmit` controlar.

---

*Última actualização: 2026-02-23 — v1.6.2*
