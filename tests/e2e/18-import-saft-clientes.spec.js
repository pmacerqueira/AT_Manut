/**
 * 18-import-saft-clientes.spec.js — Importação SAF-T de clientes (Admin)
 *
 * Testa o fluxo completo: abrir modal, seleccionar ficheiro JSON,
 * pré-visualização, confirmar importação, verificar clientes na lista.
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'
import { setupApiMock, loginAdminSemAlertas, expectToast } from './helpers.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FIXTURE_PATH = path.join(__dirname, '..', 'fixtures', 'clientes-import-test.json')

test.describe('Importação SAF-T de clientes', () => {

  test.beforeEach(async ({ page }) => {
    await loginAdminSemAlertas(page, { path: '/clientes' })
  })

  test('Admin vê botão "Importar SAF-T"', async ({ page }) => {
    const btn = page.locator('button').filter({ hasText: /importar saf-t/i }).first()
    await expect(btn).toBeVisible()
  })

  test('Abrir modal de importação e ver instruções', async ({ page }) => {
    await page.locator('button').filter({ hasText: /importar saf-t/i }).first().click()
    await expect(page.locator('.modal-import')).toBeVisible({ timeout: 6000 })
    await expect(page.locator('.modal-import').filter({ hasText: /importar clientes|saf-t/i })).toBeVisible()
    await expect(page.locator('#import-json-input, .modal-import input[type="file"]')).toBeAttached()
  })

  test('Seleccionar ficheiro com estrutura inválida exibe erro', async ({ page }) => {
    await page.locator('button').filter({ hasText: /importar saf-t/i }).first().click()
    await expect(page.locator('.modal-import')).toBeVisible({ timeout: 6000 })

    const invalidPath = path.join(__dirname, '..', 'fixtures', 'invalid-import.json')
    await page.locator('#import-json-input').first().setInputFiles(invalidPath)
    await page.waitForTimeout(1000)

    // Deve mostrar erro (estrutura inválida — deve ser array com nif)
    await expect(page.locator('.modal-import .form-erro')).toBeVisible({ timeout: 4000 })
  })

  test('Seleccionar ficheiro JSON válido mostra pré-visualização', async ({ page }) => {
    await page.locator('button').filter({ hasText: /importar saf-t/i }).first().click()
    await expect(page.locator('.modal-import')).toBeVisible({ timeout: 6000 })

    await page.locator('#import-json-input').first().setInputFiles(FIXTURE_PATH)
    await page.waitForTimeout(1200)

    // Deve mostrar estatísticas (novos, existentes, total)
    await expect(page.locator('.import-preview')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.import-stat-num').first()).toBeVisible({ timeout: 3000 })
  })

  test('Importação completa — clientes aparecem na lista', async ({ page }) => {
    await page.locator('button').filter({ hasText: /importar saf-t/i }).first().click()
    await expect(page.locator('.modal-import')).toBeVisible({ timeout: 6000 })

    await page.locator('#import-json-input').first().setInputFiles(FIXTURE_PATH)
    // Aguardar preview (FileReader é assíncrono)
    await expect(page.locator('.import-preview')).toBeVisible({ timeout: 10000 })
    await page.waitForTimeout(800)

    // Clicar em Importar — segundo botão (Cancelar=0, Importar=1)
    const importBtn = page.locator('.modal-import .form-actions button').nth(1)
    await expect(importBtn).toBeVisible({ timeout: 5000 })
    await expect(importBtn).toBeEnabled({ timeout: 3000 })
    await importBtn.click()

    // Toast de sucesso (spinner 800ms + toast)
    await expectToast(page, /importação concluída|novos|actualizados|ignorados/i, 12000)

    // Modal deve fechar
    await expect(page.locator('.modal-import')).not.toBeVisible({ timeout: 4000 })

    // Clientes importados devem aparecer na lista
    await expect(
      page.locator('td, .cliente-row').filter({ hasText: 'Cliente E2E Import Test Lda' }).first()
    ).toBeVisible({ timeout: 5000 })
    await expect(
      page.locator('td, .cliente-row').filter({ hasText: 'Segundo Cliente E2E Import' }).first()
    ).toBeVisible({ timeout: 3000 })
  })

  test('Importar mesmo ficheiro 2ª vez — modo Ignorar: clientes existentes ignorados', async ({ page }) => {
    // 1ª importação
    await page.locator('button').filter({ hasText: /importar saf-t/i }).first().click()
    await expect(page.locator('.modal-import')).toBeVisible({ timeout: 6000 })
    await page.locator('#import-json-input').first().setInputFiles(FIXTURE_PATH)
    await expect(page.locator('.import-preview')).toBeVisible({ timeout: 8000 })
    await page.locator('.modal-import .form-actions button').nth(1).click()
    await expectToast(page, /importação concluída/i, 10000)
    await page.waitForTimeout(1500)

    // 2ª importação (mesmo ficheiro, modo Ignorar)
    await page.locator('button').filter({ hasText: /importar saf-t/i }).first().click()
    await expect(page.locator('.modal-import')).toBeVisible({ timeout: 6000 })
    await page.locator('#import-json-input').first().setInputFiles(FIXTURE_PATH)
    await page.waitForTimeout(1200)

    // Preview deve mostrar "0 novos" e "2 já existem"
    await expect(page.locator('.modal-import').filter({ hasText: /0.*novos|já existem/i })).toBeVisible({ timeout: 5000 })

    await page.locator('.modal-import button').filter({ hasText: /^Importar.*clientes$/i }).first().click()
    await expectToast(page, /ignorados|0 novos/i, 10000)
  })
})
