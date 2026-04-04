/**
 * Fumo responsivo — viewports alinhados a Samsung Galaxy S10 (~360×800 CSS px)
 * e A11 / tablet estreito (~800×1200). Não substitui testes funcionais completos.
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin } from './helpers.js'

test.describe('Responsivo — telemóvel estreito (≈ S10 / A11)', () => {
  test.use({ viewport: { width: 360, height: 800 } })

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('barra inferior e menu abre sidebar', async ({ page }) => {
    await page.goto('/manut/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('.layout-loading')).toBeHidden({ timeout: 25000 })
    await expect(page.locator('.bottom-nav')).toBeVisible({ timeout: 5000 })
    // Último controlo da barra: botão «Menu» (ítens anteriores são NavLink <a>)
    await page.locator('.bottom-nav').locator('button').last().click()
    await expect(page.locator('.sidebar.sidebar-open')).toBeVisible()
    await expect(page.locator('.sidebar .nav-link').filter({ hasText: 'Clientes' })).toBeVisible()
  })

  test('Manutenções: lista em cartões (não tabela)', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await expect(page.locator('.manutencoes-table')).not.toBeVisible()
    await expect(page.locator('.manutencoes-cards')).toBeVisible()
    const primeiro = page.locator('.manutencoes-cards .mc').first()
    await expect(primeiro).toBeVisible({ timeout: 8000 })
  })

  test('Clientes: lista em cartões', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await expect(page.locator('.clientes-mobile-lista')).toBeVisible()
    await expect(page.locator('.clientes-table')).not.toBeVisible()
  })
})

test.describe('Responsivo — tablet retrato (≈ Tab / phablet)', () => {
  test.use({ viewport: { width: 800, height: 1200 } })

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('barra inferior visível abaixo de 1024px', async ({ page }) => {
    await page.goto('/manut/')
    await page.waitForLoadState('domcontentloaded')
    await expect(page.locator('.bottom-nav')).toBeVisible({ timeout: 8000 })
  })

  test('Calendário: grelha visível', async ({ page }) => {
    await page.goto('/manut/calendario')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(500)
    await expect(
      page.locator('.calendar-grid, .cal-grid, [class*="calendar"]').first(),
    ).toBeVisible({ timeout: 8000 })
  })
})
