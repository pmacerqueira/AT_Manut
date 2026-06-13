/**
 * 19-domain-agenda.spec.js — E2E para lógica de agenda (domain v1.16.92+)
 *
 * B4 — Cascata ao eliminar manutenção concluída (manutencaoDomain)
 * B5 — Recálculo pós-execução persiste delete + bulk_create no servidor
 */
import { test, expect } from '@playwright/test'
import {
  loginAdminSemAlertas,
  expandPrimeiroGrupoManutExecutadas,
  clickEliminarManutencaoOverflow,
  fillExecucaoModal,
  expectToast,
} from './helpers.js'

test.describe('Domain agenda — cascata e recálculo', () => {

  test('B4 — Eliminar concluída remove periódicas futuras da mesma máquina', async ({ page }) => {
    const apiState = { deletedManutencaoIds: [], deletedRelatorioIds: [] }
    await loginAdminSemAlertas(page, { apiState })

    await page.goto('/manut/manutencoes?filter=atraso')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
    await expect(page.locator('.manutencoes-table')).toContainText(/EV-4P|NAV-001/i)

    await page.goto('/manut/manutencoes?filter=proximas')
    await page.waitForTimeout(800)
    await expect(page.locator('.manutencoes-table').first()).toContainText(/EV-4P|NAV-001/i)

    await page.goto('/manut/manutencoes?filter=executadas')
    await page.waitForTimeout(1000)
    await expandPrimeiroGrupoManutExecutadas(page)

    const rowConcluida = page.locator('tr.exec-grupo-detail-row').first()
    await expect(rowConcluida).toBeVisible({ timeout: 8000 })
    await clickEliminarManutencaoOverflow(page, rowConcluida)

    await expect(page.locator('.modal-delete-confirm')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.modal-delete-warning')).toContainText(/2.*manutenção.*futura/i)

    await page.locator('.modal-delete-confirm button.danger').filter({ hasText: /sim, eliminar/i }).click()
    await expectToast(page, /eliminada.*2 agendamento/i)

    await expect.poll(() => {
      const ids = new Set(apiState.deletedManutencaoIds)
      return ids.has('mt01') && ids.has('mt11') && ids.has('mt16')
    }, { timeout: 10000 }).toBe(true)
    expect(apiState.deletedRelatorioIds).toContain('rr01')

    await page.goto('/manut/manutencoes?filter=proximas')
    await page.waitForTimeout(1200)
    await expect.poll(async () => {
      return page.locator('.manutencoes-table tbody tr').filter({ hasText: 'Nº Série: NAV-001' }).count()
    }, { timeout: 10000 }).toBe(0)
  })

  test('B5 — Execução periódica persiste recálculo (delete agendada + bulk_create)', async ({ page }) => {
    const apiState = { deletedManutencaoIds: [], bulkCreateManutencoes: [] }
    await loginAdminSemAlertas(page, { apiState })

    await page.goto('/manut/manutencoes?filter=pendentes')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    const btnExecutar = page.locator('.btn-executar-manut').first()
    await btnExecutar.waitFor({ state: 'visible', timeout: 8000 })
    await btnExecutar.click()
    await page.waitForTimeout(800)

    await fillExecucaoModal(page, { nomeAssinante: 'Pedro Teste', notas: 'Recálculo domain E2E.' })

    const btnGravar = page.locator('.btn-gravar-sucesso').first()
    await btnGravar.waitFor({ state: 'visible', timeout: 8000 })
    await btnGravar.click()
    await page.waitForTimeout(2500)

    await expect.poll(() => apiState.deletedManutencaoIds.includes('mt16'), { timeout: 12000 }).toBe(true)
    await expect.poll(() => (apiState.bulkCreateManutencoes?.length ?? 0) > 0, { timeout: 12000 }).toBe(true)
    expect(apiState.bulkCreateManutencoes.every(m => m.maquinaId === 'm01' && m.status === 'agendada')).toBe(true)
  })

})
