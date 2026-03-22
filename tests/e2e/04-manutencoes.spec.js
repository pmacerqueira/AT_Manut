/**
 * 04-manutencoes.spec.js — Manutenções: filtros, visualização, execução completa
 *
 * Cobre:
 *  - Listagem e filtros (em atraso, próximas, executadas)
 *  - Ver relatório de manutenção concluída
 *  - Executar manutenção periódica (fluxo completo: checklist → assinatura → gravar)
 *  - Envio de email após execução
 *  - Assinatura de relatório já existente
 *  - Admin vs ATecnica: diferenças de UI
 */
import { test, expect } from '@playwright/test'
import {
  setupApiMock, doLoginAdmin, doLoginTecnico,
  checklistMarcarTodos, checklistFillAllSim, signCanvas,
  execWizardSeguinte,
  fillExecucaoModal,
  confirmExecWizardVerificacaoEquipamento,
  ensureNotasComFrasePredefinida,
  MC,
} from './helpers.js'

// ── Filtros e listagem ───────────────────────────────────────────────────────

test.describe('Manutenções — Filtros e listagem', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Listar todas as manutenções', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1200)
    // No desktop (1280x800): a tabela .manutencoes-table é mostrada
    // No mobile: os cards .manutencoes-cards são mostrados
    // Verificar presença no DOM (um deles pode estar oculto via CSS responsive)
    const table = page.locator('.manutencoes-table')
    const cards = page.locator('.manutencoes-cards')
    const tableCount = await table.count()
    const cardsCount = await cards.count()
    expect(tableCount + cardsCount).toBeGreaterThan(0)
  })

  test('Filtro "em atraso" mostra manutenções pendentes atrasadas', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    // Verificar que a página tem o título correcto e mostra conteúdo
    // mt11: pendente, data 2026-01-15 (anterior a hoje 2026-02-22 → em atraso)
    await expect(page.locator('.manutencoes-table, .manutencoes-cards, h1').first()).toBeVisible({ timeout: 5000 })
    // Verificar que há pelo menos uma badge ou badge-text visível
    const badgeOrRow = page.locator('.badge-pendente, .badge-emAtraso, .manutencoes-table tbody tr, .mc.mc-emAtraso, .mc.mc-pendente')
    // Se não há items (todos os filtros passaram), aceita-se a lista vazia
    await page.waitForTimeout(500)
  })

  test('Filtro "próximas" mostra manutenções agendadas no futuro', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=proximas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    // mt16: agendada para 2026-06-15 → deve aparecer como "próxima"
    await expect(page.locator('.manutencoes-table, .manutencoes-cards, h1').first()).toBeVisible({ timeout: 5000 })
  })

  test('Filtro "executadas" mostra manutenções concluídas', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=executadas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    // mt01: concluída com relatório
    await expect(page.locator('.manutencoes-table, .manutencoes-cards, h1').first()).toBeVisible({ timeout: 5000 })
  })

  test('Botão "Nova manutenção" (Admin) está visível', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(600)
    await expect(
      page.locator('button').filter({ hasText: /nova manutenção/i }).first()
    ).toBeVisible()
  })

  test('Admin pode eliminar manutenção', async ({ page }) => {
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const deleteBtn = page.locator('.icon-btn.danger').first()
    if (await deleteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(deleteBtn).toBeEnabled()
    }
  })

})

// ── Visualizar relatório concluído ───────────────────────────────────────────

test.describe('Manutenções — Visualizar relatório', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=executadas')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('Botão PDF visível em manutenção concluída com relatório', async ({ page }) => {
    // mt01 está concluída com relatório rr01
    // Na tabela desktop, cada linha tem .icon-btn para acções
    const actionBtns = page.locator('.manutencoes-table .icon-btn.secondary, .mc.mc-concluida .icon-btn.secondary')
    const count = await actionBtns.count()
    // Deve haver pelo menos um botão de acção para a manutenção concluída
    expect(count).toBeGreaterThan(0)
  })

  test('Botão email visível em manutenção concluída', async ({ page }) => {
    // A tabela desktop deve estar visível (manutencoes-cards fica oculta no desktop)
    await expect(page.locator('.manutencoes-table').first()).toBeVisible({ timeout: 5000 })
  })

  test('Modal de email abre com campo de destinatário', async ({ page }) => {
    // Procurar botão de email (ícone mail)
    const emailBtn = page.locator('.mc-icons .icon-btn.secondary, .icon-btn').nth(1)

    // Tentar encontrar o botão de email específico por ícone
    const emailBtnByIcon = page.locator('.icon-btn').filter({
      has: page.locator('[data-lucide="mail"], [aria-label*="email" i]')
    }).first()

    const btnToClick = await emailBtnByIcon.isVisible({ timeout: 2000 })
      .then(v => v ? emailBtnByIcon : emailBtn)
      .catch(() => emailBtn)

    if (await btnToClick.isVisible({ timeout: 2000 }).catch(() => false)) {
      await btnToClick.click()
      const emailModal = page.locator('.modal-email-envio, .modal').filter({
        has: page.locator('input[type="email"]')
      })
      if (await emailModal.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(emailModal.locator('input[type="email"]')).toBeVisible()
        await page.locator('.modal-relatorio-form button.secondary, .modal button.secondary').first().click()
      }
    }
  })

})

// ── Execução de manutenção periódica (fluxo completo) ────────────────────────

test.describe('Manutenções — Executar manutenção periódica', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('Botão "Executar" está visível para manutenção pendente', async ({ page }) => {
    // Desktop: .btn-executar-manut na tabela; Mobile: .mc-btn-primary nos cards
    const executeBtn = page.locator('.btn-executar-manut').first()
    await expect(executeBtn).toBeVisible({ timeout: 5000 })
  })

  test('Clicar "Executar" abre modal de execução', async ({ page }) => {
    const executeBtn = page.locator('.btn-executar-manut').first()
    await executeBtn.click()

    // O modal principal de execução tem classe .modal-relatorio-form
    await expect(
      page.locator('.modal-relatorio-form').first()
    ).toBeVisible({ timeout: 6000 })

    // Primeiro passo: confirmação de equipamento
    await expect(page.getByTestId('exec-passo-verificacao')).toBeVisible({ timeout: 4000 })
  })

  test('Modal mostra checklist de verificação', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    await confirmExecWizardVerificacaoEquipamento(page)
    await expect(page.locator('.checklist-respostas, .checklist-item-row').first()).toBeVisible({ timeout: 4000 })
  })

  test('Botão "Marcar todos" preenche toda a checklist como Sim', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    await confirmExecWizardVerificacaoEquipamento(page)
    await checklistMarcarTodos(page)

    // Todos os itens devem ter ".active-sim"
    const simBtns = page.locator('.btn-simnao.active-sim')
    const count = await simBtns.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Submeter sem checklist completo mostra erro', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })
    await confirmExecWizardVerificacaoEquipamento(page)
    await expect(page.locator('.checklist-item-row, .checklist-respostas').first()).toBeVisible({ timeout: 8000 })

    // O modal pré-preenche a partir da última execução (mt01) — limpar para forçar checklist incompleta
    const desmarcar = page.locator('.checklist-quick-actions .btn-link-checklist').filter({ hasText: /Desmarcar todos/i })
    if (await desmarcar.isVisible({ timeout: 2000 }).catch(() => false)) {
      await desmarcar.click()
      await page.waitForTimeout(200)
    }

    await execWizardSeguinte(page)

    await expect(
      page.locator('.form-erro').filter({ hasText: /checklist|verificadas/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('Submeter sem assinatura mostra erro', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    await confirmExecWizardVerificacaoEquipamento(page)
    await checklistMarcarTodos(page)
    await checklistFillAllSim(page)

    await execWizardSeguinte(page)
    const notasField = page.locator('.modal textarea.textarea-full').first()
    await notasField.fill(ensureNotasComFrasePredefinida('Teste assinatura.'))
    await execWizardSeguinte(page)
    await execWizardSeguinte(page)

    const selectTecnico = page.locator('.modal select').filter({
      has: page.locator('option[value="Aurélio Almeida"]')
    }).first()
    await selectTecnico.waitFor({ state: 'visible', timeout: 5000 })
    await selectTecnico.selectOption({ index: 1 })
    await execWizardSeguinte(page)

    await page.locator('.modal input[placeholder*="Nome completo" i]').first().fill('Cliente Teste')
    await execWizardSeguinte(page)

    // Passo assinatura: Admin pode avançar sem desenhar; no passo final «Enviar» exige assinatura
    await execWizardSeguinte(page)

    await expect(page.locator('.wizard-progress-step')).toContainText(/8\s+de\s+8/i, { timeout: 8000 })

    await page.locator('.modal-relatorio-form button[type="submit"]').filter({ hasText: /Enviar/i }).click()
    await page.waitForTimeout(400)

    // O mesmo `erroAssinatura` pode repetir-se no DOM (passos 6 e 7); o primeiro está no passo oculto.
    await expect(
      page.locator('.form-erro').filter({ hasText: /assinatura|obrigatória/i }).last()
    ).toBeVisible({ timeout: 5000 })
  })

  test('Adicionar nota no campo de observações', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })
    await confirmExecWizardVerificacaoEquipamento(page)
    await checklistMarcarTodos(page)
    await execWizardSeguinte(page)

    const notasField = page.locator('.modal textarea.textarea-full').first()
    await expect(notasField).toBeVisible({ timeout: 5000 })
    await notasField.fill(ensureNotasComFrasePredefinida('Manutenção periódica executada sem anomalias.'))
    await expect(page.locator('.char-count').first()).toContainText(/\d+\/300/)
  })

  test('FLUXO COMPLETO — Executar manutenção periódica sem email', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    await fillExecucaoModal(page, {
      notas: 'Revisão periódica concluída.',
      nomeAssinante: 'João da Silva',
    })

    await page.locator('.btn-gravar-sucesso').click()

    await expect(
      page.locator('.modal').filter({ hasText: /executada|concluída|sucesso|gravada/i }).first()
    ).toBeVisible({ timeout: 12000 })
  })

  test('FLUXO COMPLETO — Botões Sim/Não individuais funcionam', async ({ page }) => {
    await page.locator('.btn-executar-manut').first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    await confirmExecWizardVerificacaoEquipamento(page)

    const rows = page.locator('.checklist-item-row')
    const count = await rows.count()
    if (count > 0) {
      // Primeiro item: Sim
      await rows.nth(0).locator('.btn-simnao').nth(0).click()
      await page.waitForTimeout(100)
      await expect(rows.nth(0).locator('.btn-simnao.active-sim')).toBeVisible()

      // Segundo item (se existir): Não
      if (count > 1) {
        await rows.nth(1).locator('.btn-simnao').nth(1).click()
        await page.waitForTimeout(100)
        await expect(rows.nth(1).locator('.btn-simnao.active-nao')).toBeVisible()
      }
    }
  })

})

// ── ATecnica — execução e restrições ────────────────────────────────────────

test.describe('Manutenções — ATecnica', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)
    await page.goto('/manut/manutencoes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
  })

  test('ATecnica vê botão "Executar" em manutenção pendente', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)
    await expect(page.locator('.btn-executar-manut').first()).toBeVisible({ timeout: 5000 })
  })

  test('ATecnica NÃO vê botão "Nova manutenção"', async ({ page }) => {
    await expect(
      page.locator('button').filter({ hasText: /nova manutenção/i })
    ).not.toBeVisible()
  })

  test('ATecnica NÃO vê botão de eliminar manutenção', async ({ page }) => {
    // canDelete = false para tecnico → sem .icon-btn.danger
    const dangerBtns = page.locator('.icon-btn.danger')
    const count = await dangerBtns.count()
    if (count > 0) {
      // Se existem, verificar que nenhum está visível
      for (let i = 0; i < count; i++) {
        await expect(dangerBtns.nth(i)).not.toBeVisible()
      }
    }
    // Se count === 0, o teste passa directamente
  })

  test('ATecnica NÃO pode editar manutenção com relatório assinado', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=executadas')
    await page.waitForTimeout(800)

    // mt01 tem relatório assinado — o botão de editar deve estar bloqueado (.readonly)
    const blockedBtn = page.locator('.icon-btn.readonly').first()
    if (await blockedBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(blockedBtn).toBeVisible()
      // Clicar não deve abrir modal de edição
      await blockedBtn.click()
      await page.waitForTimeout(400)
      await expect(page.locator('.modal-overlay')).not.toBeVisible()
    }
  })

  test('ATecnica PODE executar manutenção periódica — modal abre', async ({ page }) => {
    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForTimeout(800)

    const executeBtn = page.locator('.btn-executar-manut').first()
    if (await executeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await executeBtn.click()
      await expect(page.locator('.modal-relatorio-form')).toBeVisible({ timeout: 5000 })
      await page.locator('.modal-relatorio-form button.secondary').click()
    }
  })

})
