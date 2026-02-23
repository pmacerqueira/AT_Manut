# AT_Manut — Suite de Testes E2E (Playwright)

> Documentação da infra-estrutura de testes end-to-end implementada na v1.4.0.
> 137 testes automatizados cobrindo todos os fluxos e perfis de utilizador.
> Última revisão: 2026-02-23

---

## Sumário

| Ficheiro | Testes | Cobertura |
|---|---|---|
| `01-auth.spec.js` | 8 | Login, logout, sessão, redirecionamentos |
| `02-dashboard.spec.js` | 10 | Cards KPI, calendário, painel de dia, navegação |
| `03-clientes.spec.js` | 12 | CRUD clientes, ficha, pesquisa |
| `04-manutencoes.spec.js` | 27 | Listagem, filtros, execução, validações, permissões |
| `05-montagem.spec.js` | 5 | Fluxo completo montagem, assinatura, periódicas |
| `06-agendamento.spec.js` | 10 | Formulário, validações, fluxo completo |
| `07-permissions.spec.js` | 20 | RBAC Admin vs ATecnica, rotas protegidas |
| `08-equipamentos-categorias.spec.js` | 18 | Equipamentos, categorias CRUD inline, calendário |
| `09-edge-cases.spec.js` | 27 | Fotos, assinatura, modais, mobile, estado vazio |
| **Total** | **137** | **100% dos fluxos da aplicação** |

---

## Pré-requisitos

```powershell
# Servidor de desenvolvimento a correr
npm run dev    # http://localhost:5173

# Instalar browsers Playwright (apenas na primeira vez)
npx playwright install chromium
```

---

## Executar os testes

```powershell
# Toda a suite
npx playwright test tests/e2e/

# Ficheiro específico
npx playwright test tests/e2e/04-manutencoes.spec.js

# Com output detalhado
npx playwright test tests/e2e/ --reporter=list

# Modo UI interactivo (recomendado para debugging)
npx playwright test --ui

# Ver relatório HTML (após execução)
npx playwright show-report
```

---

## Arquitectura dos testes

### Mock de API (`helpers.js`)

Todos os testes usam `page.route()` para interceptar chamadas a `**/api/data.php` e responder com dados controlados (`MC` — mock constants). Isto garante:
- **Isolamento** — testes não dependem de servidor real
- **Velocidade** — sem latência de rede
- **Determinismo** — dados sempre iguais, testes reproduzíveis

```js
// Exemplo de uso em qualquer spec:
import { setupApiMock, doLoginAdmin } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await setupApiMock(page)   // intercepta API com dados mock
  await doLoginAdmin(page)   // injeta JWT mock em sessionStorage
})
```

### Autenticação mock

```js
// helpers.js — gera JWT mock sem servidor
function makeMockJWT(role) {
  const payload = { sub: role === 'admin' ? '1' : '2', role, username: role }
  const encoded = btoa(JSON.stringify(payload))
  return `mock.${encoded}.mock`
}

// Login Admin
await page.evaluate(token => {
  sessionStorage.setItem('atm_api_token', token)
}, makeMockJWT('admin'))
```

### Dados mock (`MC`)

Os dados mock incluem:
- 2 clientes (`MC.clientes`)
- 2 máquinas (`MC.maquinas`)
- 3 manutenções: 1 pendente, 1 periódica, 1 concluída (`MC.manutencoes`)
- 1 relatório concluído (`MC.relatorios`)
- 1 categoria e 1 subcategoria (`MC.categorias`, `MC.subcategorias`)
- 3 itens de checklist (`MC.checklist`)

---

## Perfis de utilizador testados

### Admin
- Acesso total a todos os painéis e operações
- Pode criar, editar e eliminar manutenções, clientes, equipamentos, categorias
- Acesso a Definições (backup/restauro), Logs do sistema
- Pode executar manutenções (Admin e ATecnica)

### ATecnica
- Pode executar manutenções e ver relatórios concluídos
- Pode ver o calendário
- **Não pode** aceder a Definições nem Logs
- **Não pode** eliminar manutenções, clientes ou equipamentos
- **Não pode** aceder ao agendamento (redirecionado)

---

## Fluxos principais cobertos

### Fluxo de execução de manutenção
1. Login como Admin ou ATecnica
2. Navegar para Manutenções
3. Clicar "Executar" numa manutenção pendente
4. Modal de execução abre com checklist, horas, notas, técnico
5. Preencher todos os itens do checklist
6. Seleccionar técnico, preencher nome do assinante
7. Assinar no canvas digital
8. Submeter — modal fecha, status muda para "concluída"

### Fluxo de montagem
1. Login como Admin
2. Navegar para Manutenções → filtro "montagens"
3. Clicar "Executar" numa montagem pendente
4. Preencher checklist, técnico, assinatura
5. Submeter
6. Modal de agendamento de periódicas oferece próxima data

### Fluxo de agendamento
1. Login como Admin
2. Navegar para Agendamento
3. Seleccionar cliente → equipamento aparece
4. Escolher tipo (Periódica ou Montagem)
5. Preencher data (DD-MM-AAAA) e hora (HH:MM)
6. Submeter → redirecionado para lista com filtro "próximas"

---

## Problemas técnicos resolvidos durante o desenvolvimento

### HTML5 `required` vs. React validation
**Problema:** O atributo `required` nos campos `<select>` do modal de execução bloqueia o `handleSubmit` do React antes de este poder verificar a checklist ou a assinatura — a validação React nunca chega a correr.

**Solução:** Os testes preenchem sempre os campos `required` primeiro (técnico, nome do assinante) antes de testar a validação de outros campos.

### Seletores desktop vs. mobile
**Problema:** A lista de manutenções tem dois layouts no DOM: tabela (`.manutencoes-table`, desktop) e cards (`.manutencoes-cards`, mobile). O Playwright em modo desktop resolveria o seletor genérico para o elemento escondido primeiro.

**Solução:** Todos os testes usam seletores específicos da tabela (`.manutencoes-table tbody tr`, `.btn-executar-manut`) para garantir que o elemento visível é seleccionado.

### Sessão persistente entre testes de perfil diferente
**Problema:** Num ficheiro com `beforeEach` a fazer login como Admin, um teste que tentasse fazer login como ATecnica era redirecionado imediatamente pelo `ProtectedRoute` (já havia sessão).

**Solução:**
```js
await page.evaluate(() => sessionStorage.clear())
await doLoginTecnico(page)
```

### Assinatura digital no canvas
**Problema:** O canvas de assinatura pode estar fora do viewport visível dentro do modal com scroll. Os `mousedown`/`mousemove`/`mouseup` simulados não activavam o estado `assinaturaFeita` se o canvas não estivesse no viewport.

**Solução:** `await canvas.scrollIntoViewIfNeeded()` antes dos eventos de rato. Fallback com `dispatchEvent` se `evaluate` não detectar estado de assinatura.

---

## Configuração (`playwright.config.js`)

```js
{
  testDir: './tests',
  timeout: 30_000,           // 30 s por teste
  retries: 2,                // 2 retries em CI
  workers: 1,                // 1 worker (testes partilham estado do browser)
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

### Ao adicionar um novo componente
1. Identificar o painel e as acções que cobre
2. Adicionar testes ao ficheiro `spec.js` correspondente (ou criar novo)
3. Atualizar `helpers.js` com dados mock necessários
4. Correr `npx playwright test tests/e2e/` para confirmar que nada quebrou

### Ao alterar seletores CSS
Os testes dependem de classes CSS para localizar elementos. Se alterar uma classe, verificar:
- `helpers.js` — utilitários genéricos (`fillExecucaoModal`, `signCanvas`)
- `04-manutencoes.spec.js` — seletores de tabela e modal de execução
- `05-montagem.spec.js` — idem

### Ao alterar a lógica de validação de formulários
Verificar se os testes que testam validações React precisam de ser actualizados (podem ter campos `required` que interfiram com a ordem de validação).

---

*Criado: 2026-02-23 — v1.4.0*
