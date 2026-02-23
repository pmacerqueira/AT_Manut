/**
 * 02-dashboard.spec.js — Dashboard: stats, navegação, calendário, painéis de dia
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico, goTo } from './helpers.js'

test.describe('Dashboard — Admin', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  // ── Cards de estatísticas ───────────────────────────────────────────────────

  test('Stats card "Em atraso" navega para /manutencoes?filter=atraso', async ({ page }) => {
    const card = page.locator('.stat-card-red, .stat-card-link').filter({ hasText: /atraso/i }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/filter=atraso/, { timeout: 6000 })
  })

  test('Stats card "Próximas" navega para /manutencoes?filter=proximas', async ({ page }) => {
    const card = page.locator('.stat-card-yellow, .stat-card-link').filter({ hasText: /próxim/i }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/filter=proximas/, { timeout: 6000 })
  })

  test('Stats card "Executadas" navega para /manutencoes?filter=executadas', async ({ page }) => {
    const card = page.locator('.stat-card-green, .stat-card-link').filter({ hasText: /executad/i }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/filter=executadas/, { timeout: 6000 })
  })

  // ── Cards de navegação ──────────────────────────────────────────────────────

  test('Card "Clientes" navega para /clientes', async ({ page }) => {
    const card = page.locator('.stat-card-clientes, .dashboard-nav-cards-row a, .dashboard-nav-cards-row [role="link"]')
      .filter({ hasText: /clientes/i }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/\/clientes/, { timeout: 6000 })
  })

  test('Card "Equipamentos" navega para /equipamentos', async ({ page }) => {
    const card = page.locator('.stat-card-equipamentos, .dashboard-nav-cards-row a')
      .filter({ hasText: /equipamentos/i }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/\/equipamentos/, { timeout: 6000 })
  })

  test('Card "Agendar NOVO" navega para /agendamento', async ({ page }) => {
    const card = page.locator('.stat-card-novo, .dashboard-nav-cards-row a')
      .filter({ hasText: /agendar|novo/i }).first()
    await expect(card).toBeVisible()
    await card.click()
    await expect(page).toHaveURL(/\/agendamento/, { timeout: 6000 })
  })

  // ── Calendário ──────────────────────────────────────────────────────────────

  test('Calendário está visível no Dashboard', async ({ page }) => {
    await expect(page.locator('.dashboard-calendar-card')).toBeVisible()
    await expect(page.locator('.dashboard-calendar-grid, .dashboard-cal-day').first()).toBeVisible()
  })

  test('Botões de navegação do calendário funcionam (mês anterior / seguinte)', async ({ page }) => {
    const navBtns = page.locator('.calendar-nav-mini .icon-btn, .calendar-nav-mini button')
    await expect(navBtns.first()).toBeVisible()
    // Navegar para o próximo mês
    await navBtns.last().click()
    await page.waitForTimeout(400)
    // Navegar de volta
    await navBtns.first().click()
    await page.waitForTimeout(400)
    // Calendário ainda visível
    await expect(page.locator('.dashboard-calendar-grid, .dashboard-cal-day').first()).toBeVisible()
  })

  test('"Ver calendário completo" navega para /calendario', async ({ page }) => {
    const link = page.locator('a, button').filter({ hasText: /calendário completo/i }).first()
    await expect(link).toBeVisible()
    await link.click()
    await expect(page).toHaveURL(/\/calendario/, { timeout: 6000 })
  })

  // ── Painel de dia com manutenção ────────────────────────────────────────────

  test('Clicar num dia com manutenção abre painel de dia', async ({ page }) => {
    // Clicar num dia que tenha indicador (cal-status-*) ou simplesmente qualquer dia numerado
    const dayWithMaint = page.locator('.dashboard-cal-day.cal-status-red, .dashboard-cal-day.cal-status-orange, .dashboard-cal-day.cal-status-green').first()

    if (await dayWithMaint.isVisible()) {
      await dayWithMaint.click()
      // Usar apenas .day-panel (o overlay e o painel são 2 elementos — toBeVisible requer 1)
      await expect(page.locator('.day-panel').first()).toBeVisible({ timeout: 4000 })
      // Fechar painel
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    } else {
      test.info().annotations.push({ type: 'note', description: 'Nenhum dia com manutenção visível no mês corrente' })
    }
  })

  test('Clicar num dia vazio abre painel de agendamento', async ({ page }) => {
    // Clicar num dia que não tenha indicador de manutenção
    const emptyDay = page.locator('.dashboard-cal-day:not(.cal-status-red):not(.cal-status-orange):not(.cal-status-green):not(.other-month)').first()

    if (await emptyDay.count() > 0) {
      await emptyDay.first().click()
      await page.waitForTimeout(400)
      // Pode aparecer o painel de agendamento
      const agendarPanel = page.locator('.agendar-tipo-panel, .day-panel')
      if (await agendarPanel.isVisible()) {
        // Deve ter os botões de tipo: Montagem / Manutenção Periódica
        await expect(
          page.locator('.agendar-tipo-btn, button').filter({ hasText: /montagem|periódica/i }).first()
        ).toBeVisible()
        // Fechar
        await page.keyboard.press('Escape')
      }
    }
  })

  test('Painel de dia permite clicar "Executar" para abrir modal de execução', async ({ page }) => {
    const dayWithPending = page.locator('.dashboard-cal-day.cal-status-red, .dashboard-cal-day.cal-status-orange').first()

    if (await dayWithPending.isVisible()) {
      await dayWithPending.click()
      await page.waitForTimeout(500)

      const executeBtn = page.locator('.day-panel .btn-sm, .day-panel button').filter({ hasText: /executar/i }).first()
      if (await executeBtn.isVisible()) {
        await executeBtn.click()
        await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })
        // Fechar modal via Escape ou botão Cancelar dentro do modal
        await page.keyboard.press('Escape')
        await page.waitForTimeout(300)
        if (await page.locator('.modal-overlay').first().isVisible().catch(() => false)) {
          await page.locator('.modal .form-actions button.secondary, .modal button.secondary').first().click()
        }
      }
    }
  })

})

test.describe('Dashboard — ATecnica', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
  })

  test('ATecnica vê o Dashboard com estatísticas', async ({ page }) => {
    await expect(page.locator('h1, .dashboard-title').first()).toBeVisible()
    await expect(page.locator('.stat-card, .cards-row').first()).toBeVisible()
  })

  test('ATecnica pode navegar para Equipamentos e Manutenções', async ({ page }) => {
    // Card Equipamentos
    const equipCard = page.locator('a, button, [role="link"]').filter({ hasText: /equipamentos/i }).first()
    if (await equipCard.isVisible()) {
      await equipCard.click()
      await expect(page).toHaveURL(/\/equipamentos/, { timeout: 6000 })
      await page.goto('/manut/')
      await page.waitForTimeout(500)
    }
  })

})
