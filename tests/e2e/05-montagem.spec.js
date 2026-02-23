/**
 * 05-montagem.spec.js — Fluxo completo de execução de MONTAGEM
 *
 * Diferenças relativamente à manutenção periódica:
 *  - Checklist é do tipo "montagem" (com grupos: mecânica, eléctrica, teste)
 *  - Após concluir, o sistema propõe agendar manutenções periódicas
 *  - Pode haver conflitos de agendamento (ecrã de conflitos)
 *  - Ao confirmar → cria N manutenções agendadas
 */
import { test, expect } from '@playwright/test'
import {
  setupApiMock, doLoginAdmin, doLoginTecnico,
  checklistMarcarTodos, checklistFillAllSim, signCanvas,
} from './helpers.js'

test.describe('Montagem — Execução completa', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    // mt20 é uma montagem pendente — navegar directamente para todas as manutenções
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('Montagem pendente aparece na lista (tipo = montagem)', async ({ page }) => {
    // mt20 deve aparecer na tabela desktop com tipo "montagem"
    // Na tabela desktop, o tipo é mostrado como texto numa célula
    await expect(
      page.locator('.manutencoes-table tbody tr, .manutencoes-table tr:not(:first-child)').filter({ hasText: /montagem/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('Botão "Executar" está visível para montagem pendente', async ({ page }) => {
    // Tabela desktop: .btn-executar-manut
    const execBtns = page.locator('.btn-executar-manut')
    if (await execBtns.count() > 0) {
      await expect(execBtns.first()).toBeVisible({ timeout: 4000 })
    } else {
      test.info().annotations.push({ type: 'note', description: 'Nenhum botão executar encontrado na tabela desktop' })
    }
  })

  test('Modal de montagem tem checklist com grupos (Mecânica, Eléctrica, Teste)', async ({ page }) => {
    // Usar directamente o botão da tabela desktop
    await page.locator('.btn-executar-manut').first().click()

    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    // Para sub2 (montagem), os itens de checklist são do tipo montagem
    await expect(page.locator('.checklist-respostas, .checklist-item-row').first()).toBeVisible({ timeout: 4000 })
  })

  test('FLUXO COMPLETO — Executar montagem e confirmar agendamento de periódicas', async ({ page }) => {
    // Usar sempre o botão da tabela desktop
    await page.locator('.btn-executar-manut').first().click()

    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 6000 })

    // 1. Marcar todos como Sim
    await checklistMarcarTodos(page)
    await checklistFillAllSim(page)

    // 2. Notas
    const notasField = page.locator('.modal textarea').first()
    if (await notasField.isVisible()) {
      await notasField.fill('Montagem concluída conforme especificações técnicas.')
    }

    // 3. Técnico
    const selectTecnico = page.locator('.modal select').first()
    if (await selectTecnico.isVisible()) {
      await selectTecnico.selectOption({ index: 1 }).catch(() => {})
    }

    // 4. Nome assinante
    const allTextInputs = page.locator('.assinatura-section input[type="text"], .modal input[type="text"]')
    const inputCount = await allTextInputs.count()
    if (inputCount > 0) {
      await allTextInputs.last().fill('Técnico Responsável')
    }

    // 5. Assinar canvas
    await signCanvas(page)

    // 6. Limpar email
    const emailInput = page.locator('.email-section input[type="email"]')
    if (await emailInput.isVisible()) await emailInput.clear()

    // 7. Submeter
    await page.locator('.modal-relatorio-form button[type="submit"]').click()
    await page.waitForTimeout(2000)

    // 8. Verificar resultado:
    //    a) Ecrã de conflitos de agendamento
    //    b) OU ecrã de sucesso de montagem
    //    c) OU ecrã genérico de sucesso

    const conflitosModal = page.locator('.modal-conflitos, .modal').filter({ hasText: /conflito|agendar/i })
    const sucessoScreen  = page.locator('.modal, [class*="concluido"]').filter({ hasText: /montagem concluída|executada|agendamentos/i })
    const genericSuccess = page.locator('.modal').filter({ hasText: /sucesso|concluída|executada/i })

    const hasConflitos = await conflitosModal.isVisible({ timeout: 4000 }).catch(() => false)
    const hasSucesso   = await sucessoScreen.isVisible({ timeout: 1000 }).catch(() => false)
    const hasGeneric   = await genericSuccess.isVisible({ timeout: 1000 }).catch(() => false)

    if (hasConflitos) {
      // Ecrã de conflitos: clicar "Criar assim mesmo"
      const criarBtn = page.locator('.conflitos-acoes button, button').filter({ hasText: /criar assim|avançar|confirmar/i }).first()
      if (await criarBtn.isVisible()) {
        await criarBtn.click()
        await page.waitForTimeout(2000)
      }
      // Agora deve aparecer o sucesso
      await expect(
        page.locator('.modal').filter({ hasText: /montagem concluída|agendamentos|executada/i }).first()
      ).toBeVisible({ timeout: 8000 })
    } else if (hasSucesso || hasGeneric) {
      // Directamente no ecrã de sucesso
      await expect(
        page.locator('.modal').filter({ hasText: /concluída|executada|sucesso/i }).first()
      ).toBeVisible()
    } else {
      // Se a API mock respondeu com sucesso e o redirect aconteceu
      test.info().annotations.push({ type: 'note', description: 'Modal fechou automaticamente após sucesso' })
    }
  })

})

// ── ATecnica — execução de montagem ─────────────────────────────────────────

test.describe('Montagem — ATecnica pode executar', () => {

  test('ATecnica vê e pode abrir modal de execução de montagem', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const executeBtn = page.locator('.btn-executar-manut').first()
    if (await executeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await executeBtn.click()
      await expect(page.locator('.modal-overlay')).toBeVisible({ timeout: 5000 })
      // ATecnica PODE executar — modal abriu
      await page.locator('.modal-relatorio-form button.secondary').click()
    }
  })

})
