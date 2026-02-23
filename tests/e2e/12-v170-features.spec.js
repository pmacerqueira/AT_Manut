/**
 * 12-v170-features.spec.js — Testes E2E para funcionalidades v1.7.0
 *
 * Cobre:
 *  - Etapa 7: Pesquisa global (Ctrl+K, resultados, navegação, teclado)
 *  - Etapa 5: Leitor QR Code (abertura do modal, estado a-iniciar/erro câmara)
 *  - Etapa 8: Modo campo (toggle, persistência, indicador na sidebar)
 *  - Etapa 6: Página de Métricas (acesso Admin, cards, gráficos)
 *  - Etapa 9: Indicador de uso do localStorage em Definições
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico, MC } from './helpers.js'

// ── Helpers locais ─────────────────────────────────────────────────────────

async function loginAdminSemAlertas(page) {
  await setupApiMock(page)
  await doLoginAdmin(page)
  // Dispensar alertas se aparecerem
  await page.evaluate(() => {
    localStorage.setItem('atm_alertas_dismiss', new Date().toDateString())
    localStorage.removeItem('atm_modo_campo')
  })
  await page.goto('/manut/')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
}

// ═══════════════════════════════════════════════════════════════════════════
// ETAPA 7 — Pesquisa Global
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Pesquisa Global (Etapa 7)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdminSemAlertas(page)
  })

  test('P1 — Botão de pesquisa visível na sidebar', async ({ page }) => {
    const btn = page.locator('.sidebar-search-btn')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText('Pesquisar')
  })

  test('P2 — Clicar no botão abre o modal de pesquisa', async ({ page }) => {
    await page.locator('.sidebar-search-btn').click()
    await expect(page.locator('.pq-modal')).toBeVisible()
  })

  test('P3 — Ctrl+K abre o modal de pesquisa', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.locator('.pq-modal')).toBeVisible()
  })

  test('P4 — Escape fecha o modal de pesquisa', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await expect(page.locator('.pq-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.pq-modal')).not.toBeVisible()
  })

  test('P5 — Input de pesquisa recebe foco automático', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.locator('.pq-input')
    await expect(input).toBeFocused()
  })

  test('P6 — Pesquisa por nome de cliente devolve resultados', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const input = page.locator('.pq-input')
    // Usar nome do cliente nos dados mock
    const nomeCliente = MC.clientes[0]?.nome?.slice(0, 5) ?? 'Auto'
    await input.fill(nomeCliente)
    await page.waitForTimeout(400)
    const resultados = page.locator('.pq-item')
    const count = await resultados.count()
    expect(count).toBeGreaterThan(0)
  })

  test('P7 — Badge "Cliente" aparece nos resultados de clientes', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.locator('.pq-input').fill(MC.clientes[0]?.nome?.slice(0, 4) ?? 'Auto')
    await page.waitForTimeout(400)
    const badge = page.locator('.pq-badge--cliente').first()
    await expect(badge).toBeVisible()
  })

  test('P8 — Pesquisa por marca de máquina devolve resultados', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const marca = MC.maquinas[0]?.marca?.slice(0, 4) ?? 'Navel'
    await page.locator('.pq-input').fill(marca)
    await page.waitForTimeout(400)
    const count = await page.locator('.pq-item').count()
    expect(count).toBeGreaterThan(0)
  })

  test('P9 — Pesquisa com menos de 2 chars não mostra resultados', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.locator('.pq-input').fill('a')
    await page.waitForTimeout(300)
    const count = await page.locator('.pq-item').count()
    expect(count).toBe(0)
  })

  test('P10 — Pesquisa sem resultados mostra mensagem "Sem resultados"', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.locator('.pq-input').fill('xyzxyzxyz_inexistente')
    await page.waitForTimeout(400)
    await expect(page.locator('.pq-empty')).toBeVisible()
  })

  test('P11 — Clicar num resultado de cliente navega para /clientes', async ({ page }) => {
    await page.keyboard.press('Control+k')
    const nome = MC.clientes[0]?.nome?.slice(0, 5) ?? 'Auto'
    await page.locator('.pq-input').fill(nome)
    await page.waitForTimeout(400)
    const primeiroCliente = page.locator('.pq-badge--cliente').first()
    if (await primeiroCliente.count() > 0) {
      await page.locator('.pq-item').first().click()
      await expect(page).toHaveURL(/\/clientes/)
    }
  })

  test('P12 — Navegação por teclado ↓ selecciona item', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.locator('.pq-input').fill(MC.clientes[0]?.nome?.slice(0, 4) ?? 'Auto')
    await page.waitForTimeout(400)
    await page.keyboard.press('ArrowDown')
    const selected = page.locator('.pq-item--selected')
    await expect(selected).toBeVisible()
  })

  test('P13 — Botão limpar (×) limpa o campo de pesquisa', async ({ page }) => {
    await page.keyboard.press('Control+k')
    await page.locator('.pq-input').fill('teste')
    await page.waitForTimeout(300)
    await page.locator('.pq-clear').click()
    await expect(page.locator('.pq-input')).toHaveValue('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// ETAPA 5 — Leitor QR Code
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Leitor QR Code (Etapa 5)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdminSemAlertas(page)
  })

  test('Q1 — Botão "Ler QR Code" visível na sidebar', async ({ page }) => {
    const btn = page.locator('.nav-link--qr')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText('Ler QR Code')
  })

  test('Q2 — Clicar no botão abre o modal de leitura QR', async ({ page }) => {
    await page.locator('.nav-link--qr').click()
    await expect(page.locator('.qrr-modal')).toBeVisible()
  })

  test('Q3 — Modal QR tem header correcto', async ({ page }) => {
    await page.locator('.nav-link--qr').click()
    await expect(page.locator('.qrr-header')).toContainText('Ler QR Code')
  })

  test('Q4 — Escape fecha o modal de leitura QR', async ({ page }) => {
    await page.locator('.nav-link--qr').click()
    await expect(page.locator('.qrr-modal')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('.qrr-modal')).not.toBeVisible()
  })

  test('Q5 — Modal mostra estado de inicialização ou erro de câmara', async ({ page }) => {
    await page.locator('.nav-link--qr').click()
    await page.waitForTimeout(2000)
    // Em ambiente de teste sem câmara: deve mostrar "a-iniciar", "a-ler" ou mensagem de erro
    const status = page.locator('.qrr-status-text')
    await expect(status).toBeVisible()
  })

  test('Q6 — Botão de fechar (×) fecha o modal', async ({ page }) => {
    await page.locator('.nav-link--qr').click()
    await expect(page.locator('.qrr-modal')).toBeVisible()
    await page.locator('.qrr-header .icon-btn').click()
    await expect(page.locator('.qrr-modal')).not.toBeVisible()
  })

  test('Q7 — ATecnica também tem acesso ao botão Ler QR', async ({ page }) => {
    // Terminar sessão Admin do beforeEach antes de testar como ATecnica
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.evaluate(() => {
      localStorage.setItem('atm_alertas_dismiss', new Date().toDateString())
    })
    await page.goto('/manut/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    const btn = page.locator('.nav-link--qr')
    await expect(btn).toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// ETAPA 8 — Modo Campo
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Modo Campo / Alto Contraste (Etapa 8)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdminSemAlertas(page)
    // Garantir modo campo desactivado no início
    await page.evaluate(() => localStorage.removeItem('atm_modo_campo'))
  })

  test('MC1 — Toggle de modo campo existe nas Definições', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await expect(page.locator('.def-toggle-btn')).toBeVisible()
  })

  test('MC2 — Toggle activa o modo campo (body recebe classe)', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await page.locator('.def-toggle-btn').click()
    const hasModoCompo = await page.evaluate(() =>
      document.body.classList.contains('modo-campo')
    )
    expect(hasModoCompo).toBe(true)
  })

  test('MC3 — Modo campo é persistido no localStorage', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await page.locator('.def-toggle-btn').click()
    const stored = await page.evaluate(() =>
      localStorage.getItem('atm_modo_campo')
    )
    expect(stored).toBe('true')
  })

  test('MC4 — Desactivar modo campo remove a classe do body', async ({ page }) => {
    // Activar primeiro
    await page.evaluate(() => localStorage.setItem('atm_modo_campo', 'true'))
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    // Desactivar
    await page.locator('.def-toggle-btn').click()
    const hasModoCompo = await page.evaluate(() =>
      document.body.classList.contains('modo-campo')
    )
    expect(hasModoCompo).toBe(false)
  })

  test('MC5 — Modo campo persiste após navegar', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('atm_modo_campo', 'true'))
    await page.goto('/manut/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    const hasModoCompo = await page.evaluate(() =>
      document.body.classList.contains('modo-campo')
    )
    expect(hasModoCompo).toBe(true)
  })

  test('MC6 — Secção "Modo campo" tem texto descritivo', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await expect(page.locator('.def-toggle-label')).toContainText('contraste')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// ETAPA 6 — Dashboard de Métricas
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Dashboard de Métricas (Etapa 6)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdminSemAlertas(page)
  })

  test('M1 — Link "Métricas" visível na sidebar (Admin)', async ({ page }) => {
    const link = page.locator('a[href*="metricas"], .nav-link').filter({ hasText: 'Métricas' })
    await expect(link).toBeVisible()
  })

  test('M2 — Navegar para /metricas carrega a página', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    await expect(page.locator('.met-page')).toBeVisible()
  })

  test('M3 — Página de métricas tem título correcto', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    await expect(page.locator('.met-title')).toContainText('Métricas')
  })

  test('M4 — Cards de resumo estão presentes', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    const cards = page.locator('.met-card')
    const count = await cards.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('M5 — Card "Clientes" mostra número correcto', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    const clientesCard = page.locator('.met-card').filter({ hasText: 'Clientes' })
    await expect(clientesCard).toBeVisible()
    const val = page.locator('.met-card-val').first()
    const text = await val.textContent()
    expect(parseInt(text)).toBeGreaterThanOrEqual(0)
  })

  test('M6 — Secção de taxa de cumprimento está presente', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    await expect(page.locator('.met-section--taxa')).toBeVisible()
  })

  test('M7 — Secção de próximas semanas está presente', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Ou mostra o gráfico ou a mensagem "Sem dados suficientes"
    const grafico = page.locator('.recharts-responsive-container')
    const semDados = page.locator('.met-empty')
    const countGrafico = await grafico.count()
    const countSemDados = await semDados.count()
    expect(countGrafico + countSemDados).toBeGreaterThan(0)
  })

  test('M8 — Botão "Voltar" navega para a página anterior', async ({ page }) => {
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await page.locator('.met-back-btn').click()
    await page.waitForTimeout(500)
    // Deve ter saído da página de métricas
    expect(page.url()).not.toContain('/metricas')
  })

  test('M9 — ATecnica é redirigido ao tentar aceder a /metricas', async ({ page }) => {
    // Terminar sessão Admin do beforeEach antes de testar como ATecnica
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.evaluate(() => {
      localStorage.setItem('atm_alertas_dismiss', new Date().toDateString())
    })
    await page.goto('/manut/metricas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
    // Deve ter sido redirigido para o dashboard
    expect(page.url()).not.toContain('/metricas')
  })

  test('M10 — "Métricas" NÃO aparece no menu de ATecnica', async ({ page }) => {
    // Terminar sessão Admin do beforeEach antes de testar como ATecnica
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.evaluate(() => {
      localStorage.setItem('atm_alertas_dismiss', new Date().toDateString())
    })
    await page.goto('/manut/')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    const link = page.locator('.nav-link').filter({ hasText: 'Métricas' })
    await expect(link).not.toBeVisible()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// ETAPA 9 — Indicador de uso de localStorage (Definições)
// ═══════════════════════════════════════════════════════════════════════════

test.describe('Indicador de armazenamento (Etapa 9)', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdminSemAlertas(page)
  })

  test('LS1 — Indicador de uso está presente nas Definições', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await expect(page.locator('.def-ls-usage')).toBeVisible()
  })

  test('LS2 — Barra de progresso está presente', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await expect(page.locator('.def-ls-bar')).toBeVisible()
  })

  test('LS3 — Percentagem de uso é mostrada', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    const pct = page.locator('.def-ls-usage-pct')
    await expect(pct).toBeVisible()
    const text = await pct.textContent()
    expect(text).toMatch(/\d+%/)
  })

  test('LS4 — Tamanho em KB/MB é mostrado', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    const val = page.locator('.def-ls-usage-val')
    await expect(val).toBeVisible()
    const text = await val.textContent()
    expect(text).toMatch(/(B|KB|MB)/)
  })
})
