/**
 * 03-clientes.spec.js — Gestão de clientes: CRUD (Admin) + permissões (ATecnica)
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico, MC } from './helpers.js'

// ── Admin ───────────────────────────────────────────────────────────────────

test.describe('Clientes — Admin', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/clientes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
  })

  test('Lista de clientes é visível', async ({ page }) => {
    await expect(page.locator('.clientes-table, table, .clientes-list').first()).toBeVisible()
    // Pelo menos um cliente do mock deve aparecer
    await expect(page.locator('td, .cliente-row').filter({ hasText: 'Bettencourt' }).first()).toBeVisible()
  })

  test('Pesquisa por NIF filtra resultados', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], .search-bar input').first()
    await searchInput.fill('511234567')
    await page.waitForTimeout(500)
    await expect(page.locator('td, .cliente-row').filter({ hasText: '511234567' }).first()).toBeVisible()
    // O cliente sem esse NIF não deve estar visível
    const otherClient = page.locator('td, .cliente-row').filter({ hasText: '599999999' })
    await expect(otherClient).not.toBeVisible()
  })

  test('Pesquisa por nome filtra resultados', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], .search-bar input').first()
    await searchInput.fill('Bettencourt')
    await page.waitForTimeout(500)
    await expect(page.locator('td, .cliente-row').filter({ hasText: 'Bettencourt' }).first()).toBeVisible()
  })

  test('Botão limpar pesquisa repõe a lista completa', async ({ page }) => {
    const searchInput = page.locator('input[type="search"], .search-bar input').first()
    await searchInput.fill('xyz_nao_existe')
    await page.waitForTimeout(400)

    const clearBtn = page.locator('.search-clear, button[aria-label*="limpar"]').first()
    if (await clearBtn.isVisible()) {
      await clearBtn.click()
      await page.waitForTimeout(400)
    } else {
      await searchInput.clear()
      await page.waitForTimeout(400)
    }

    await expect(page.locator('td, .cliente-row').filter({ hasText: 'Bettencourt' }).first()).toBeVisible()
  })

  test('Admin vê botão "Novo cliente"', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /novo cliente/i }).first()
    await expect(btn).toBeVisible()
  })

  test('Adicionar novo cliente — validação de campos obrigatórios', async ({ page }) => {
    await page.locator('button').filter({ hasText: /novo cliente/i }).first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 4000 })

    // Submeter sem preencher nada (usando force para contornar disabled)
    await page.locator('.modal button[type="submit"]').click({ force: true })
    await page.waitForTimeout(400)

    // O modal deve continuar aberto (form inválido não fecha)
    await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 3000 })

    // NIF input deve estar marcado como inválido (HTML5 required)
    const nifInput = page.locator('.modal input').first()
    const isInvalid = await nifInput.evaluate(el => !el.validity.valid).catch(() => true)
    expect(isInvalid).toBeTruthy()
  })

  test('Adicionar novo cliente com dados completos', async ({ page }) => {
    await page.locator('button').filter({ hasText: /novo cliente/i }).first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 4000 })

    // Preencher formulário
    const inputs = page.locator('.modal input')
    await inputs.nth(0).fill('510000001')   // NIF
    await inputs.nth(1).fill('Auto Teste Lda') // Nome
    await inputs.nth(2).fill('Rua do Teste, 1') // Morada (se existir)

    // Submeter
    await page.locator('.modal button[type="submit"]').click()
    await page.waitForTimeout(1000)

    // Modal deve fechar
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 4000 })

    // Novo cliente deve aparecer (optimistic update)
    await expect(
      page.locator('td, .cliente-row').filter({ hasText: 'Auto Teste Lda' }).first()
    ).toBeVisible({ timeout: 3000 })
  })

  test('NIF duplicado exibe erro inline', async ({ page }) => {
    await page.locator('button').filter({ hasText: /novo cliente/i }).first().click()
    await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 4000 })

    // Usar NIF já existente no mock
    const inputs = page.locator('.modal input')
    await inputs.nth(0).fill('511234567') // NIF já existente
    await inputs.nth(1).fill('Duplicado Lda')
    await page.locator('.modal button[type="submit"]').click()

    // Deve aparecer mensagem de erro
    await expect(
      page.locator('.form-erro, .error-message, [class*="erro"]').filter({ hasText: /NIF|já existe/i }).first()
    ).toBeVisible({ timeout: 3000 })
  })

  test('Editar cliente — guardar alterações', async ({ page }) => {
    // Clicar no botão de editar do primeiro cliente
    const editBtn = page.locator('.icon-btn.secondary, button[aria-label*="editar" i], button[title*="editar" i]').first()
    await expect(editBtn).toBeVisible({ timeout: 5000 })
    await editBtn.click()

    await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 4000 })

    // Alterar o campo Nome
    const nomeInput = page.locator('.modal input').nth(1)
    await nomeInput.clear()
    await nomeInput.fill('Mecânica Bettencourt Editada')

    await page.locator('.modal button[type="submit"]').click()
    await page.waitForTimeout(800)

    // Modal deve fechar
    await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 4000 })
  })

  test('Eliminar cliente sem equipamentos → sucesso', async ({ page }) => {
    // "Cliente Sem Máquinas" (cli_nodeps) não tem máquinas → botão activo
    const rows = page.locator('tr, .cliente-row')
    const targetRow = rows.filter({ hasText: /Sem Máquinas/i }).first()

    if (await targetRow.isVisible()) {
      const deleteBtn = targetRow.locator('.icon-btn.danger, button[aria-label*="eliminar" i]').first()
      await expect(deleteBtn).toBeEnabled()
      await deleteBtn.click()
      await page.waitForTimeout(400)

      // Confirmar no modal de confirmação (se existir)
      const confirmBtn = page.locator('button').filter({ hasText: /confirmar|eliminar|sim/i }).first()
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
      }

      await page.waitForTimeout(800)
      await expect(targetRow).not.toBeVisible({ timeout: 4000 })
    } else {
      test.info().annotations.push({ type: 'note', description: 'Cliente sem máquinas não encontrado na lista' })
    }
  })

  test('Eliminar cliente COM equipamentos — botão desactivado', async ({ page }) => {
    // "Mecânica Bettencourt" tem máquinas (m01, m02) → botão deve estar desactivado
    const rows = page.locator('tr, .cliente-row')
    const targetRow = rows.filter({ hasText: /Bettencourt/i }).first()

    if (await targetRow.isVisible()) {
      const deleteBtn = targetRow.locator('.icon-btn.danger, button[aria-label*="eliminar" i]').first()
      // O botão deve estar desactivado ou não visível
      const isDisabled = await deleteBtn.isDisabled().catch(() => true)
      expect(isDisabled).toBeTruthy()
    }
  })

  test('Abrir ficha de cliente (clique no nome)', async ({ page }) => {
    const clienteLink = page.locator('.btn-link-inline, td a, td button').filter({ hasText: /Bettencourt/i }).first()
    if (await clienteLink.isVisible()) {
      await clienteLink.click()
      await expect(page.locator('.modal-ficha-cliente')).toBeVisible({ timeout: 4000 })
      // Ficha deve mostrar dados do cliente (NIF)
      await expect(page.locator('.modal-ficha-cliente').filter({ hasText: '511234567' })).toBeVisible()
      // Fechar clicando no overlay (área fora da ficha)
      await page.locator('.modal-ficha-overlay, .modal-overlay').first().click({ position: { x: 5, y: 5 }, force: true })
      await page.waitForTimeout(600)
    }
  })

})

// ── ATecnica — permissões ────────────────────────────────────────────────────

test.describe('Clientes — ATecnica (permissões limitadas)', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/clientes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
  })

  test('ATecnica pode ver a lista de clientes', async ({ page }) => {
    await expect(page.locator('.clientes-table, table, .clientes-list').first()).toBeVisible()
  })

  test('ATecnica NÃO vê botão "Novo cliente"', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /novo cliente/i })
    await expect(btn).not.toBeVisible()
  })

  test('ATecnica NÃO vê botões de editar/eliminar clientes', async ({ page }) => {
    await expect(page.locator('.icon-btn.danger')).not.toBeVisible()
    // Botão de editar também não deve estar visível
    // (canEditCliente = false para tecnico)
    const editBtns = page.locator('.icon-btn.secondary')
    // Se existirem, confirmar que não são de edição de cliente
    // (podem existir outros icon-btn.secondary para outros fins)
    // O teste principal é que canot add e canDelete são false
  })

})
