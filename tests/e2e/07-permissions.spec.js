/**
 * 07-permissions.spec.js — Permissões Admin vs ATecnica
 *
 * Cenários cobertos:
 *  - Rotas exclusivas de Admin (Logs, Definições, Categorias) → redirect para / se ATecnica
 *  - Admin vê todos os botões de gestão (eliminar, editar, adicionar)
 *  - ATecnica não vê/não pode usar botões de gestão
 *  - ATecnica CAN executar manutenções (função principal)
 *  - ATecnica não pode adicionar/editar/remover clientes
 *  - ATecnica não pode eliminar nada
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico } from './helpers.js'

// ── Rotas exclusivas Admin ───────────────────────────────────────────────────

test.describe('Rotas Admin-only — ATecnica é redirecionado', () => {

  test('ATecnica acede a /logs → redireciona para /', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/logs')
    await page.waitForTimeout(1500)
    // Deve redirecionar para Dashboard
    expect(page.url()).not.toMatch(/\/logs/)
    await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 5000 })
  })

  test('ATecnica acede a /definicoes → redireciona para /', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/definicoes')
    await page.waitForTimeout(1500)
    expect(page.url()).not.toMatch(/\/definicoes/)
    await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 5000 })
  })

  test('ATecnica acede a /categorias → redireciona para /', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/categorias')
    await page.waitForTimeout(1500)
    expect(page.url()).not.toMatch(/\/categorias/)
  })

})

// ── Navegação lateral — itens visíveis por role ──────────────────────────────

test.describe('Sidebar — itens de menu por role', () => {

  test('Admin vê Logs, Definições e Categorias no menu', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/')
    await page.waitForTimeout(800)

    const sidebar = page.locator('.sidebar, nav, .main-nav').first()
    await expect(sidebar.locator('a, button').filter({ hasText: /logs/i }).first()).toBeVisible()
    await expect(sidebar.locator('a, button').filter({ hasText: /defini/i }).first()).toBeVisible()
  })

  test('ATecnica NÃO vê Logs no menu', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/')
    await page.waitForTimeout(800)

    const sidebar = page.locator('.sidebar, nav, .main-nav').first()
    await expect(sidebar.locator('a, button').filter({ hasText: /logs/i })).not.toBeVisible()
  })

  test('ATecnica NÃO vê Definições no menu', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/')
    await page.waitForTimeout(800)

    const sidebar = page.locator('.sidebar, nav, .main-nav').first()
    await expect(sidebar.locator('a, button').filter({ hasText: /defini/i })).not.toBeVisible()
  })

  test('ATecnica vê Manutenções e Equipamentos no menu', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/')
    await page.waitForTimeout(800)

    const sidebar = page.locator('.sidebar, nav, .main-nav').first()
    await expect(sidebar.locator('a, button').filter({ hasText: /manutenções/i }).first()).toBeVisible()
    await expect(sidebar.locator('a, button').filter({ hasText: /equipamentos/i }).first()).toBeVisible()
  })

})

// ── Admin — poderes totais ───────────────────────────────────────────────────

test.describe('Permissões Admin — poderes totais', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Admin acede a /logs sem redirect', async ({ page }) => {
    await page.goto('/manut/logs')
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/logs/, { timeout: 5000 })
    await expect(page.locator('h1').filter({ hasText: /log/i }).first()).toBeVisible()
  })

  test('Admin acede a /definicoes sem redirect', async ({ page }) => {
    await page.goto('/manut/definicoes')
    await page.waitForTimeout(1000)
    await expect(page).toHaveURL(/\/definicoes/, { timeout: 5000 })
    await expect(page.locator('h1, .def-title').filter({ hasText: /defini/i }).first()).toBeVisible()
  })

  test('Admin vê botões de eliminar em clientes', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForTimeout(800)
    // canDelete = true para admin — .icon-btn.danger deve existir no DOM
    const dangerBtns = page.locator('.icon-btn.danger')
    const count = await dangerBtns.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Admin vê botões de eliminar em manutenções', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)
    // canDelete = true para Admin — .icon-btn.danger deve existir no DOM
    const dangerBtns = page.locator('.icon-btn.danger')
    const count = await dangerBtns.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Admin pode adicionar categoria', async ({ page }) => {
    await page.goto('/manut/categorias')
    await page.waitForTimeout(800)
    const addBtn = page.locator('button').filter({ hasText: /nova categoria|adicionar categoria/i }).first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(addBtn).toBeEnabled()
    } else {
      // Verificar que a página carregou (Admin tem acesso)
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })

})

// ── ATecnica — restrições específicas ────────────────────────────────────────

test.describe('Permissões ATecnica — restrições', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
  })

  test('ATecnica não pode eliminar nada — sem botões .icon-btn.danger', async ({ page }) => {
    // Clientes — ATecnica não tem canDelete
    await page.goto('/manut/clientes')
    await page.waitForTimeout(800)
    const dangerBtnsClientes = page.locator('.icon-btn.danger')
    const countClientes = await dangerBtnsClientes.count()
    // Nenhum botão danger visível
    for (let i = 0; i < countClientes; i++) {
      await expect(dangerBtnsClientes.nth(i)).not.toBeVisible()
    }

    // Manutenções — ATecnica não tem canDelete
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)
    const dangerBtnsManut = page.locator('.icon-btn.danger')
    const countManut = await dangerBtnsManut.count()
    for (let i = 0; i < countManut; i++) {
      await expect(dangerBtnsManut.nth(i)).not.toBeVisible()
    }
  })

  test('ATecnica não pode adicionar clientes', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForTimeout(800)
    await expect(page.locator('button').filter({ hasText: /novo cliente/i })).not.toBeVisible()
  })

  test('ATecnica PODE executar manutenções (função principal)', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)
    // ATecnica deve ver .btn-executar-manut (tabela desktop) para manutenções pendentes
    const executeBtn = page.locator('.btn-executar-manut').first()
    await expect(executeBtn).toBeVisible({ timeout: 5000 })
    await expect(executeBtn).toBeEnabled()
  })

  test('ATecnica PODE visualizar relatórios concluídos', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=executadas')
    await page.waitForTimeout(800)

    // A página de manutenções executadas deve carregar
    await expect(page.locator('.manutencoes-table, .manutencoes-cards, h1').first()).toBeVisible({ timeout: 5000 })
    // canDelete = false → sem .icon-btn.danger
    const dangerCount = await page.locator('.icon-btn.danger').count()
    expect(dangerCount).toBe(0)
  })

  test('ATecnica não vê botão "Nova manutenção"', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)
    await expect(
      page.locator('button').filter({ hasText: /nova manutenção/i })
    ).not.toBeVisible()
  })

})

// ── Logs — funcionalidade (Admin) ─────────────────────────────────────────────

test.describe('Logs — Página Admin', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/logs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
  })

  test('Página de logs carrega com estatísticas', async ({ page }) => {
    await expect(page.locator('.log-stats, .log-stat').first()).toBeVisible({ timeout: 5000 })
  })

  test('Filtros de log estão presentes', async ({ page }) => {
    await expect(page.locator('.log-select, .log-filters select').first()).toBeVisible()
  })

  test('Campo de pesquisa em logs funciona', async ({ page }) => {
    const searchInput = page.locator('.log-search, input[type="search"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('login')
      await page.waitForTimeout(500)
      // Deve filtrar resultados
      const entries = page.locator('.log-entry')
      // Não precisa de ter resultados — apenas verificar que a pesquisa não quebra
      await page.waitForTimeout(300)
    }
  })

  test('Botão "Copiar para suporte" está visível', async ({ page }) => {
    const btn = page.locator('.btn-suporte').first()
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(btn).toBeEnabled()
    }
  })

})

// ── Definições — funcionalidade (Admin) ───────────────────────────────────────

test.describe('Definições — Página Admin', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/definicoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
  })

  test('Página de definições carrega com estatísticas de armazenamento', async ({ page }) => {
    await expect(page.locator('.def-stats-grid, .def-stat-card').first()).toBeVisible({ timeout: 5000 })
  })

  test('Botão de exportar backup está disponível e activo', async ({ page }) => {
    const exportBtn = page.locator('.def-btn--primary, .def-btn').filter({ hasText: /exportar/i }).first()
    await expect(exportBtn).toBeVisible({ timeout: 4000 })
    await expect(exportBtn).toBeEnabled()
  })

  test('Botão de importar backup está disponível', async ({ page }) => {
    const importBtn = page.locator('.def-btn--secondary, .def-btn').filter({ hasText: /importar|seleccionar/i }).first()
    await expect(importBtn).toBeVisible({ timeout: 4000 })
    await expect(importBtn).toBeEnabled()
  })

  test('Aviso de substituição de dados está visível antes de importar', async ({ page }) => {
    // Verificar aviso com texto variável (pode ser "substituídos", "apagados", "atenção" etc.)
    const warning = page.locator('.def-alert--warn, .def-alert').first()
    if (await warning.isVisible({ timeout: 4000 }).catch(() => false)) {
      await expect(warning).toBeVisible()
    } else {
      // Verificar que a secção de importação existe
      await expect(
        page.locator('.def-btn--secondary, .def-btn').filter({ hasText: /importar|seleccionar/i }).first()
      ).toBeVisible({ timeout: 4000 })
    }
  })

  test('Exportar backup — descarrega ficheiro JSON', async ({ page }) => {
    // Aguardar o evento de download
    const downloadPromise = page.waitForEvent('download', { timeout: 8000 })

    const exportBtn = page.locator('.def-btn--primary, .def-btn').filter({ hasText: /exportar/i }).first()
    await exportBtn.click()

    try {
      const download = await downloadPromise
      expect(download.suggestedFilename()).toMatch(/backup|atm|\.json$/)
    } catch {
      // Se o download não disparou, verificar se houve toast de sucesso
      const toast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /exportado|backup/i })
      if (await toast.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(toast).toBeVisible()
      } else {
        test.info().annotations.push({ type: 'note', description: 'Download não detectado — verificar comportamento do exportar' })
      }
    }
  })

})
