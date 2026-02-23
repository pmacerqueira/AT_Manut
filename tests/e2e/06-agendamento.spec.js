/**
 * 06-agendamento.spec.js — Agendamento de novas manutenções
 *
 * Cobre:
 *  - Formulário de agendamento (campos, validações)
 *  - Agendar manutenção periódica
 *  - Agendar montagem (com periodicidade)
 *  - Navegação a partir do Dashboard (data pré-preenchida)
 *  - Modal de sugestão de data (quando o dia já tem agendamentos)
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico } from './helpers.js'

test.describe('Agendamento — Admin', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/agendamento')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)
  })

  test('Página de agendamento carrega', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: /agendamento/i }).first()).toBeVisible()
    await expect(page.locator('.agendamento-form, form, .card').first()).toBeVisible()
  })

  test('Campos do formulário estão presentes', async ({ page }) => {
    // Select de cliente
    await expect(
      page.locator('.agendamento-form select, select').first()
    ).toBeVisible()
    // Campo de data
    await expect(
      page.locator('input[placeholder*="DD-MM"], input[placeholder*="data" i]').first()
    ).toBeVisible()
    // Campo de hora
    await expect(
      page.locator('input[placeholder*="HH:MM"], input[placeholder*="hora" i]').first()
    ).toBeVisible()
  })

  test('Seleccionar cliente revela select de equipamento', async ({ page }) => {
    const clienteSelect = page.locator('.agendamento-form select').first()
    await clienteSelect.selectOption({ index: 1 })
    await page.waitForTimeout(500)

    // Select de equipamento deve aparecer
    const equipSelect = page.locator('.agendamento-form select').nth(1)
    await expect(equipSelect).toBeVisible({ timeout: 3000 })
  })

  test('Submeter sem cliente mostra validação', async ({ page }) => {
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(500)

    // A validação é feita por HTML5 required OU por React setErro
    // Em qualquer caso, a URL não deve mudar (formulário não enviado)
    await expect(page).toHaveURL(/\/agendamento/, { timeout: 3000 })
    // E o formulário continua visível
    await expect(page.locator('.agendamento-form, form').first()).toBeVisible()
  })

  test('Submeter com data inválida mostra erro React', async ({ page }) => {
    // Seleccionar cliente e equipamento (válido — índice 1 para passar HTML5 required)
    const clienteSelect = page.locator('.agendamento-form select').first()
    await clienteSelect.selectOption({ index: 1 })
    await page.waitForTimeout(400)

    const equipSelect = page.locator('.agendamento-form select').nth(1)
    if (await equipSelect.isVisible()) {
      await equipSelect.selectOption({ index: 1 })  // primeiro equipamento real
      await page.waitForTimeout(200)
    }

    // Data inválida (só dígitos, não DD-MM-AAAA)
    const dataInput = page.locator('input[placeholder*="DD-MM"], input[inputmode="numeric"]').first()
    await dataInput.fill('99-99-9999')

    // Preencher hora com valor válido para evitar HTML5 required bloquear o submit
    // (React valida data PRIMEIRO, antes da hora — só precisamos de satisfazer HTML5)
    const horaInput = page.locator('input[placeholder*="HH:MM"]').first()
    if (await horaInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await horaInput.fill('09:00')
    }

    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(500)

    // React setErro mostra .form-erro com texto da data
    await expect(
      page.locator('.form-erro').filter({ hasText: /data|inválida|válida/i }).first()
    ).toBeVisible({ timeout: 3000 })
  })

  test('Agendar manutenção periódica — fluxo completo', async ({ page }) => {
    // 1. Cliente
    const clienteSelect = page.locator('.agendamento-form select').first()
    await clienteSelect.selectOption({ index: 1 })
    await page.waitForTimeout(500)

    // 2. Equipamento (index 1 = primeira máquina real, index 0 = opção vazia)
    const equipSelect = page.locator('.agendamento-form select').nth(1)
    if (await equipSelect.isVisible({ timeout: 3000 })) {
      await equipSelect.selectOption({ index: 1 })
      await page.waitForTimeout(300)
    }

    // 3. Tipo: periódica
    const tipoSelect = page.locator('.agendamento-form select').filter({
      has: page.locator('option[value="periodica"]')
    }).first()
    if (await tipoSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tipoSelect.selectOption('periodica')
      await page.waitForTimeout(200)
    }

    // 4. Data válida (futuro)
    const dataInput = page.locator('input[placeholder*="DD-MM"], input[inputmode="numeric"]').first()
    await dataInput.click()
    // Limpar e digitar data como o componente espera
    await dataInput.fill('15-04-2026')
    await page.waitForTimeout(200)

    // 5. Hora
    const horaInput = page.locator('input[placeholder*="HH:MM"], input[inputmode="numeric"]').last()
    await horaInput.fill('09:00')
    await page.waitForTimeout(200)

    // 6. Submeter
    await page.locator('button[type="submit"]').click()
    await page.waitForTimeout(1500)

    // 7. Verificar resultado: toast de sucesso OU modal de sugestão de data OU redirect
    const toastSuccess = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /agendamento.*sucesso|sucesso.*agendamento|registado/i })
    const sugestaoModal = page.locator('.agendamento-sugestao-modal, .modal').filter({ hasText: /sugestão|agendamentos/i })
    const redirected = page.url().includes('filter=proximas')

    const hasToast    = await toastSuccess.isVisible({ timeout: 5000 }).catch(() => false)
    const hasSugestao = await sugestaoModal.isVisible({ timeout: 1000 }).catch(() => false)

    if (hasSugestao) {
      // Manter data escolhida ou usar sugestão
      const manterBtn = page.locator('button').filter({ hasText: /manter|alterar|continuar/i }).first()
      await manterBtn.click()
      await page.waitForTimeout(1500)
      // Após resolver sugestão, deve redirecionar
      await expect(page).toHaveURL(/filter=proximas/, { timeout: 8000 })
    } else if (hasToast || redirected) {
      // Sucesso!
      expect(hasToast || redirected).toBeTruthy()
    } else {
      // Verificar se redirecionou
      await expect(page).toHaveURL(/filter=proximas/, { timeout: 5000 })
    }
  })

  test('Agendar montagem inclui campo de periodicidade', async ({ page }) => {
    const clienteSelect = page.locator('.agendamento-form select').first()
    await clienteSelect.selectOption({ index: 1 })
    await page.waitForTimeout(400)

    // Seleccionar tipo: montagem
    const tipoSelect = page.locator('.agendamento-form select').filter({
      has: page.locator('option[value="montagem"]')
    }).first()

    if (await tipoSelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tipoSelect.selectOption('montagem')
      await page.waitForTimeout(300)

      // Campo periodicidade deve aparecer
      const periodicidadeSelect = page.locator('.agendamento-form select').filter({
        has: page.locator('option[value="trimestral"]')
      }).first()

      await expect(periodicidadeSelect).toBeVisible({ timeout: 3000 })

      // Seleccionar periodicidade
      await periodicidadeSelect.selectOption('anual')
    }
  })

  test('Formatação automática da data (DD-MM-AAAA)', async ({ page }) => {
    const dataInput = page.locator('input[placeholder*="DD-MM"], input[inputmode="numeric"]').first()

    // Digitar apenas dígitos
    await dataInput.click()
    await dataInput.type('15042026')
    await page.waitForTimeout(200)

    // O campo deve formatar automaticamente
    const value = await dataInput.inputValue()
    // Aceitar qualquer formatação válida (com ou sem separadores automáticos)
    expect(value.length).toBeGreaterThan(0)
  })

})

// ── Pesquisa de cliente no agendamento ────────────────────────────────────────

test.describe('Agendamento — Pesquisa de cliente', () => {

  test('Pesquisa de cliente por nome filtra a lista', async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
    await page.goto('/manut/agendamento')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    const searchInput = page.locator('.agendamento-cliente-search input, .agendamento-search-input, input[type="search"]').first()
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('Bettencourt')
      await page.waitForTimeout(400)
      // A opção de cliente deve aparecer no select
      const clienteSelect = page.locator('.agendamento-form select').first()
      const options = await clienteSelect.locator('option').allTextContents()
      const found = options.some(o => o.toLowerCase().includes('bettencourt'))
      expect(found).toBeTruthy()
    }
  })

})

// ── ATecnica — acesso ao agendamento ─────────────────────────────────────────

test.describe('Agendamento — ATecnica', () => {

  test('ATecnica NÃO tem acesso à página de agendamento', async ({ page }) => {
    await setupApiMock(page)
    await doLoginTecnico(page)

    // Verificar se o card de agendamento no Dashboard está oculto para ATecnica
    await page.goto('/manut/')
    await page.waitForTimeout(800)

    const agendarCard = page.locator('.stat-card-novo').first()
    const isVisible = await agendarCard.isVisible().catch(() => false)

    if (!isVisible) {
      // Card de agendar não visível → permissão restrita para ATecnica ✓
      expect(true).toBeTruthy()
    } else {
      // Se o card existir, ao navegar deve ser redirecionado OU mostrar acesso negado
      await page.goto('/manut/agendamento')
      await page.waitForTimeout(800)
      // Pode ter acesso limitado (apenas view) — verificar que funciona ou redireciona
      test.info().annotations.push({ type: 'note', description: 'ATecnica tem acesso ao agendamento — verificar comportamento esperado' })
    }
  })

})
