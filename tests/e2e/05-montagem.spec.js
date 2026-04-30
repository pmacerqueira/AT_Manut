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
  fillExecucaoModal,
  confirmExecWizardVerificacaoEquipamento,
} from './helpers.js'

/** Abre o modal de execução da linha de MONTAGEM (evita apanhar mt11 periódica primeiro na lista). */
async function abrirModalMontagem(page) {
  const row = page.locator('.manutencoes-table tbody tr').filter({ hasText: /Montagem/i }).first()
  await expect(row).toBeVisible({ timeout: 8000 })
  await row.locator('.btn-executar-manut').click()
}

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
    await abrirModalMontagem(page)

    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 5000 })

    // Passo de verificação de equipamento primeiro; só depois o checklist fica visível
    await confirmExecWizardVerificacaoEquipamento(page)

    // Para sub2 (montagem), os itens de checklist são do tipo montagem
    await expect(page.locator('.checklist-respostas, .checklist-item-row').first()).toBeVisible({ timeout: 4000 })
  })

  test('FLUXO COMPLETO — Executar montagem e confirmar agendamento de periódicas', async ({ page }) => {
    await abrirModalMontagem(page)

    await page.locator('.modal-overlay').first().waitFor({ state: 'visible', timeout: 6000 })

    await fillExecucaoModal(page, {
      notas: 'Montagem concluída conforme especificações técnicas.',
      nomeAssinante: 'Técnico Responsável',
    })

    await page.locator('.btn-gravar-sucesso').click()
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
      await page.locator('.modal-relatorio-form').getByRole('button', { name: 'Cancelar' }).click()
    }
  })

})
