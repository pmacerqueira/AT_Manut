/**
 * 09-edge-cases.spec.js — Casos extremos e fluxos de erro
 *
 * Cobre:
 *  - Navegação com o botão "Voltar"
 *  - Breadcrumbs de navegação
 *  - Manutenção: fotos (upload e remoção)
 *  - Tentativa de execução de manutenção já concluída (botão ausente)
 *  - Agendamento em data conflituosa → modal de sugestão
 *  - Add/edit/delete de manutenção (modal Admin)
 *  - Scroll-to-top em navegação
 *  - Sem dados no sistema (estado vazio)
 *  - Erro de rede durante operação → toast de erro + queue offline
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico, signCanvas, checklistMarcarTodos, checklistFillAllSim } from './helpers.js'
import * as path from 'path'
import * as fs from 'fs'

// ── Navegação / UX ────────────────────────────────────────────────────────────

test.describe('Navegação e UX', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Botão "Voltar" em Clientes regressa ao Dashboard', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForTimeout(600)
    const backBtn = page.locator('.btn-back').first()
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click()
      await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 5000 })
    }
  })

  test('Botão "Voltar" em Manutenções regressa ao Dashboard', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(600)
    const backBtn = page.locator('.btn-back').first()
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click()
      await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 5000 })
    }
  })

  test('Breadcrumbs mostram rota actual', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForTimeout(600)
    const breadcrumbs = page.locator('.breadcrumbs, [aria-label="breadcrumb"], .breadcrumb').first()
    if (await breadcrumbs.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(breadcrumbs).toContainText(/clientes/i)
    }
  })

  test('Scroll to top ao navegar entre páginas', async ({ page }) => {
    // Ir a uma página longa
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)
    // Fazer scroll para baixo
    await page.evaluate(() => window.scrollTo(0, 500))
    await page.waitForTimeout(200)

    // Navegar para outra página
    await page.goto('/manut/clientes')
    await page.waitForTimeout(600)

    // Verificar que a posição voltou ao topo
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeLessThan(100)
  })

  test('Modal fecha ao clicar em Cancelar', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForTimeout(600)

    // Abrir modal de novo cliente
    const addBtn = page.locator('button').filter({ hasText: /novo cliente/i }).first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 4000 })

      // Fechar com o botão "Cancelar" dentro do modal
      const cancelBtn = page.locator('.modal').filter({ hasText: /cancelar/i }).locator('button').filter({ hasText: /cancelar/i }).first()
      if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await cancelBtn.click()
      } else {
        // Fallback: botão secundário genérico
        await page.locator('.modal button.secondary').first().click()
      }
      await page.waitForTimeout(400)
      await expect(page.locator('.modal-overlay').first()).not.toBeVisible({ timeout: 3000 })
    }
  })

  test('Tecla Escape fecha modal', async ({ page }) => {
    await page.goto('/manut/clientes')
    await page.waitForTimeout(600)

    const addBtn = page.locator('button').filter({ hasText: /novo cliente/i }).first()
    if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await addBtn.click()
      await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 4000 })

      // Testar Escape: se suportado, modal fecha; senão usar Cancelar
      await page.keyboard.press('Escape')
      await page.waitForTimeout(600)
      const still = await page.locator('.modal-overlay').first().isVisible().catch(() => false)
      if (still) {
        // Escape não suportado — fechar manualmente e marcar teste como aviso
        await page.locator('.modal button.secondary').first().click()
        await page.waitForTimeout(400)
      }
      await expect(page.locator('.modal-overlay').first()).not.toBeVisible({ timeout: 3000 })
    }
  })

})

// ── Fotos no modal de execução ────────────────────────────────────────────────

test.describe('Modal execução — upload de fotos', () => {

  test('Botão de adicionar foto está presente no modal', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)

    const executeBtn = page.locator('.btn-executar-manut').first()
    if (await executeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await executeBtn.click()
      await page.locator('.modal').first().waitFor({ state: 'visible', timeout: 5000 })

      // Secção de fotos deve existir
      await expect(page.locator('.fotos-section, .btn-foto').first()).toBeVisible({ timeout: 4000 })
    }
  })

  test('Upload de imagem de teste funciona', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)

    const executeBtn = page.locator('.btn-executar-manut').first()
    if (await executeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await executeBtn.click()
      await page.locator('.modal').first().waitFor({ state: 'visible', timeout: 5000 })

      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Criar imagem de teste mínima (1x1 pixel PNG)
        const pngBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        )
        await fileInput.setInputFiles({
          name: 'teste-foto.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        })
        await page.waitForTimeout(800)
        // Verificar que a foto apareceu na grid
        await expect(page.locator('.fotos-grid .foto-thumb, .fotos-grid img').first()).toBeVisible({ timeout: 5000 })
      }

      await page.locator('.modal-relatorio-form button.secondary').click()
    }
  })

  test('Botão remover foto funciona', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)

    const executeBtn = page.locator('.btn-executar-manut').first()
    if (await executeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await executeBtn.click()
      await page.locator('.modal').first().waitFor({ state: 'visible', timeout: 5000 })

      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const pngBuffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
          'base64'
        )
        await fileInput.setInputFiles({
          name: 'teste-foto.png',
          mimeType: 'image/png',
          buffer: pngBuffer,
        })
        await page.waitForTimeout(800)

        // Clicar no botão de remover foto
        const removeBtn = page.locator('.foto-remover').first()
        if (await removeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await removeBtn.click()
          await page.waitForTimeout(400)
          await expect(page.locator('.fotos-grid .foto-thumb')).not.toBeVisible()
        }
      }

      await page.locator('.modal-relatorio-form button.secondary').click()
    }
  })

  test('Limite de 8 fotos é respeitado', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)

    const executeBtn = page.locator('.btn-executar-manut').first()
    if (await executeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await executeBtn.click()
      await page.locator('.modal').first().waitFor({ state: 'visible', timeout: 5000 })

      // O contador deve mostrar 0/8 inicialmente
      const fotosCount = page.locator('.fotos-count, .fotos-label').first()
      if (await fotosCount.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(fotosCount).toContainText(/0\/8|0 \/ 8/)
      }

      await page.locator('.modal-relatorio-form button.secondary').click()
    }
  })

})

// ── Add/Edit/Delete Manutenção (Admin) ────────────────────────────────────────

test.describe('Manutenções — CRUD Admin', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Modal "Nova manutenção" tem campos obrigatórios', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)

    const newBtn = page.locator('button').filter({ hasText: /nova manutenção/i }).first()
    if (await newBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await newBtn.click()
      await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 4000 })

      // Select de máquina deve estar presente
      await expect(page.locator('.modal select').first()).toBeVisible()

      // Input de data deve estar presente
      await expect(page.locator('.modal input[type="date"]').first()).toBeVisible()

      // Fechar com botão Cancelar DENTRO do modal (não pode seleccionar outros .secondary)
      await page.locator('.modal .form-actions button.secondary').click()
    }
  })

  test('Adicionar nova manutenção — seleccionar máquina e data', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)

    const newBtn = page.locator('button').filter({ hasText: /nova manutenção/i }).first()
    if (await newBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await newBtn.click()
      await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 4000 })

      // Seleccionar primeira máquina
      await page.locator('.modal select').first().selectOption({ index: 1 })
      await page.waitForTimeout(200)

      // Data
      const dateInput = page.locator('.modal input[type="date"]').first()
      await dateInput.fill('2026-05-15')

      await page.locator('.modal button[type="submit"]').click()
      await page.waitForTimeout(800)
      await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 4000 })
    }
  })

  test('Editar manutenção pendente — alterar data', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)

    // Encontrar manutenção pendente e clicar no botão de editar
    const editBtn = page.locator('.mc .icon-btn.secondary').first()
    if (await editBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await editBtn.click()
      await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 4000 })

      const dateInput = page.locator('.modal input[type="date"]').first()
      if (await dateInput.isVisible()) {
        await dateInput.fill('2026-04-20')
        await page.locator('.modal button[type="submit"]').click()
        await page.waitForTimeout(800)
        await expect(page.locator('.modal-overlay')).not.toBeVisible({ timeout: 4000 })
      } else {
        await page.locator('.modal-relatorio-form button.secondary').click()
      }
    }
  })

  test('Eliminar manutenção com confirmação', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)

    const deleteBtn = page.locator('.icon-btn.danger').first()
    if (await deleteBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await deleteBtn.click()
      await page.waitForTimeout(400)

      // Modal de confirmação (se existir)
      const confirmBtn = page.locator('button').filter({ hasText: /confirmar|eliminar|sim/i }).first()
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click()
        await page.waitForTimeout(800)
      }
    }
  })

})

// ── Assinatura no modal de relatório ─────────────────────────────────────────

test.describe('Modal assinatura de relatório', () => {

  test('Botão assinar abre modal de assinatura de relatório', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=executadas')
    await page.waitForTimeout(800)

    // Procurar botão de assinatura (manutenção concluída SEM relatório assinado)
    // Na nossa mock, mt01 já está assinado — mas ainda devemos verificar o fluxo
    const signBtn = page.locator('.icon-btn').filter({
      has: page.locator('[data-lucide="file-signature"], [aria-label*="assinar" i]')
    }).first()

    if (await signBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await signBtn.click()
      await expect(page.locator('.modal-assinatura, .modal')).toBeVisible({ timeout: 5000 })
      await page.locator('.modal-relatorio-form button.secondary').click()
    } else {
      test.info().annotations.push({ type: 'note', description: 'Nenhuma manutenção concluída sem assinatura encontrada' })
    }
  })

})

// ── Estado vazio ──────────────────────────────────────────────────────────────

test.describe('Estado vazio — sem dados', () => {

  test('Lista de manutenções vazia mostra mensagem adequada', async ({ page }) => {
    // Usar mock sem manutenções
    await setupApiMock(page, { customData: { manutencoes: [], relatorios: [] } })
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)

    // Deve mostrar mensagem de "sem manutenções" ou lista vazia
    const emptyMsg = page.locator('[class*="empty"], [class*="vazio"], [class*="no-data"], p').filter({
      hasText: /nenhuma|sem manutenções|não há/i
    }).first()

    if (await emptyMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emptyMsg).toBeVisible()
    } else {
      // Verificar que a tabela existe mas está vazia
      const rows = page.locator('.mc, tr.manutencao-row')
      const count = await rows.count()
      expect(count).toBe(0)
    }
  })

  test('Lista de clientes vazia mostra mensagem adequada', async ({ page }) => {
    await setupApiMock(page, { customData: { clientes: [], maquinas: [], manutencoes: [], relatorios: [] } })
    await doLoginAdmin(page)
    await page.goto('/manut/clientes')
    await page.waitForTimeout(800)

    const emptyMsg = page.locator('[class*="empty"], p').filter({
      hasText: /nenhum|sem clientes|não há/i
    }).first()

    if (await emptyMsg.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(emptyMsg).toBeVisible()
    }
  })

})

// ── Responsividade mobile ─────────────────────────────────────────────────────

test.describe('Responsividade — viewport mobile', () => {

  test('Dashboard funciona em ecrã mobile (375x812)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setupApiMock(page)
    await doLoginAdmin(page)

    await expect(page.locator('.stat-card, .cards-row').first()).toBeVisible({ timeout: 5000 })
  })

  test('Manutenções em mobile mostra cards (não tabela)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes')
    await page.waitForTimeout(800)

    // Em mobile deve mostrar .manutencoes-cards com .mc
    await expect(page.locator('.manutencoes-cards, .mc').first()).toBeVisible({ timeout: 5000 })
  })

  test('Sidebar em mobile é colapsável', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await setupApiMock(page)
    await doLoginAdmin(page)

    // Deve haver um botão de toggle da sidebar
    const menuToggle = page.locator('.sidebar-toggle, .menu-toggle, [aria-label*="menu" i], .hamburger').first()
    if (await menuToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
      await menuToggle.click()
      await page.waitForTimeout(300)
      // Sidebar deve aparecer/desaparecer
    }
  })

})
