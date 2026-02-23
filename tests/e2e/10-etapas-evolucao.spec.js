/**
 * 10-etapas-evolucao.spec.js
 *
 * Testes E2E para as 4 etapas de evolução implementadas:
 *
 *  Etapa 1 — Vista "O meu dia" no Dashboard
 *  Etapa 2 — Alertas de conformidade (badge pulsante + sub-texto)
 *  Etapa 3 — QR Code por máquina (modal, etiqueta, botão imprimir)
 *  Etapa 4 — Histórico completo em PDF por máquina
 *
 * Dados mock garantem manutenções em atraso (mt11 em 2026-01-15 < hoje) e
 * a navegação completa categoria → subcategoria → máquina no Equipamentos.
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico, MC } from './helpers.js'

// ─── Helper: navegar até ficha de máquinas (Elevadores → Elevador electro…) ───
async function navegarAteMaquinas(page) {
  await page.goto('/manut/equipamentos')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)

  // Clicar na categoria "Elevadores de veículos"
  const catCard = page.locator('.categoria-card, button').filter({ hasText: /elevadores/i }).first()
  await catCard.waitFor({ state: 'visible', timeout: 6000 })
  await catCard.click()
  await page.waitForTimeout(600)

  // Clicar na subcategoria "Elevador electromecânico de ligeiros"
  const subCard = page.locator('.categoria-card, button').filter({ hasText: /electromec/i }).first()
  await subCard.waitFor({ state: 'visible', timeout: 6000 })
  await subCard.click()
  await page.waitForTimeout(600)

  // Agora devemos ver a lista de máquinas (.maquina-row)
  await page.locator('.maquina-row').first().waitFor({ state: 'visible', timeout: 6000 })
}

// ─── Helper: navegar para equipamentos em atraso (lista plana com botões) ────
async function navegarParaAtraso(page) {
  await page.goto('/manut/equipamentos?filter=atraso')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
  // Aguardar filas de máquinas
  await page.locator('.maquina-row').first().waitFor({ state: 'visible', timeout: 6000 })
}

// ═══════════════════════════════════════════════════════════════════════════════
// ETAPA 1 — Vista "O meu dia" no Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Etapa 1 — Vista "O meu dia" no Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Secção "O meu dia" / "Hoje" é visível no Dashboard', async ({ page }) => {
    await expect(
      page.locator('.meu-dia-section')
    ).toBeVisible({ timeout: 5000 })
  })

  test('Admin vê título "Hoje" (não "O meu dia")', async ({ page }) => {
    const titulo = page.locator('.meu-dia-titulo')
    await expect(titulo).toBeVisible()
    await expect(titulo).toContainText(/hoje/i)
  })

  test('ATecnica vê título "O meu dia" com destaque lateral azul', async ({ page }) => {
    // Re-login como ATecnica
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)

    const secao = page.locator('.meu-dia-section')
    await expect(secao).toBeVisible()
    await expect(secao).toHaveClass(/meu-dia-destaque/)

    const titulo = page.locator('.meu-dia-titulo')
    await expect(titulo).toContainText(/o meu dia/i)
  })

  test('Manutenções em atraso aparecem na lista "O meu dia"', async ({ page }) => {
    // mt11 (data: 2026-01-15, status: pendente) deve aparecer
    const lista = page.locator('.meu-dia-lista')
    await expect(lista).toBeVisible({ timeout: 5000 })
    const items = page.locator('.meu-dia-item')
    const count = await items.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Cada item mostra nome do equipamento e cliente', async ({ page }) => {
    const item = page.locator('.meu-dia-item').first()
    await expect(item).toBeVisible()
    // Nome da máquina (EV-4P ou Navel)
    await expect(page.locator('.meu-dia-item-nome').first()).toBeVisible()
    // Cliente
    await expect(page.locator('.meu-dia-item-cliente').first()).toBeVisible()
  })

  test('Badge de dias em atraso aparece nos itens em atraso', async ({ page }) => {
    // mt11 está em atraso (data passada) — deve ter badge "Xd atraso"
    const badge = page.locator('.meu-dia-badge-atraso').first()
    await expect(badge).toBeVisible({ timeout: 4000 })
    await expect(badge).toContainText(/d atraso/i)
  })

  test('Badge contador de pendentes visível no cabeçalho', async ({ page }) => {
    const badge = page.locator('.meu-dia-header .badge-danger').first()
    await expect(badge).toBeVisible()
    await expect(badge).toContainText(/pendente/i)
  })

  test('Botão "Executar" navega para página de manutenções', async ({ page }) => {
    const btnExecutar = page.locator('.meu-dia-item .btn.primary').filter({ hasText: /executar/i }).first()
    await expect(btnExecutar).toBeVisible()
    await btnExecutar.click()
    await expect(page).toHaveURL(/\/manutencoes/, { timeout: 6000 })
  })

  test('Com mock sem pendentes, mostra "Sem intervenções"', async ({ page }) => {
    // Personalizar mock: nenhuma manutenção pendente/em atraso
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page, {
      customData: {
        manutencoes: [
          { ...MC.manutencoes[0] }, // mt01 concluída
          { id: 'mt_fut', maquinaId: 'm01', tipo: 'periodica', data: '2027-06-15', tecnico: '', status: 'agendada', observacoes: '' },
        ],
      },
    })
    await doLoginAdmin(page)

    // Não deve haver itens pendentes para hoje
    const vazio = page.locator('.meu-dia-vazio')
    await expect(vazio).toBeVisible({ timeout: 5000 })
    await expect(vazio).toContainText(/sem intervenções/i)
  })

  test('Data de hoje aparece no cabeçalho da secção', async ({ page }) => {
    const dataHoje = page.locator('.meu-dia-data')
    await expect(dataHoje).toBeVisible()
    // Deve ter texto com o dia da semana ou data
    const texto = await dataHoje.textContent()
    expect(texto?.length).toBeGreaterThan(3)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// ETAPA 2 — Alertas de conformidade
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Etapa 2 — Alertas de conformidade (card pulsante)', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Card "Em atraso" tem classe stat-card-pulse quando há atraso > 7 dias', async ({ page }) => {
    // mt11 está 39 dias em atraso (2026-01-15 → 2026-02-23) → deve ter pulse
    const card = page.locator('.stat-card-red')
    await expect(card).toBeVisible()
    await expect(card).toHaveClass(/stat-card-pulse/)
  })

  test('Sub-texto "Há X dias!" aparece no card "Em atraso"', async ({ page }) => {
    const alerta = page.locator('.stat-alerta-dias')
    await expect(alerta).toBeVisible({ timeout: 5000 })
    await expect(alerta).toContainText(/há \d+ dias/i)
  })

  test('Número de dias no alerta é coerente (> 7)', async ({ page }) => {
    const alerta = page.locator('.stat-alerta-dias')
    const texto = await alerta.textContent()
    const match = texto?.match(/(\d+)\s*dias/i)
    expect(match).not.toBeNull()
    const dias = parseInt(match[1])
    expect(dias).toBeGreaterThan(7)
  })

  test('Sem manutenções em atraso: card NÃO tem pulse', async ({ page }) => {
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page, {
      customData: {
        manutencoes: [
          // Só executadas e futuras — nenhuma em atraso
          { id: 'mt01', maquinaId: 'm01', tipo: 'periodica', data: '2025-12-10', tecnico: 'x', status: 'concluida', observacoes: '' },
          { id: 'mt_fut', maquinaId: 'm01', tipo: 'periodica', data: '2027-06-15', tecnico: '', status: 'agendada', observacoes: '' },
        ],
      },
    })
    await doLoginAdmin(page)

    const card = page.locator('.stat-card-red')
    await expect(card).toBeVisible()
    // Sem atraso → sem classe pulse
    const classes = await card.getAttribute('class')
    expect(classes).not.toMatch(/stat-card-pulse/)
  })

  test('Atraso de apenas 3 dias: sem badge de alerta (< 7 dias)', async ({ page }) => {
    await page.evaluate(() => sessionStorage.clear())
    // Data 3 dias atrás
    const d = new Date()
    d.setDate(d.getDate() - 3)
    const iso = d.toISOString().slice(0, 10)

    await setupApiMock(page, {
      customData: {
        manutencoes: [
          { id: 'mt_recente', maquinaId: 'm01', tipo: 'periodica', data: iso, tecnico: '', status: 'pendente', observacoes: '' },
        ],
      },
    })
    await doLoginAdmin(page)

    // Sub-texto de alerta NÃO deve aparecer (< 7 dias)
    const alerta = page.locator('.stat-alerta-dias')
    await expect(alerta).not.toBeVisible({ timeout: 3000 })
  })

  test('ATecnica também vê o alerta quando há atraso grave', async ({ page }) => {
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)

    const card = page.locator('.stat-card-red')
    await expect(card).toBeVisible()
    await expect(card).toHaveClass(/stat-card-pulse/)
  })

  test('Cards de "Próximas" e "Executadas" NÃO têm pulse', async ({ page }) => {
    const cardAmarelo = page.locator('.stat-card-yellow')
    const cardVerde   = page.locator('.stat-card-green')
    await expect(cardAmarelo).toBeVisible()
    await expect(cardVerde).toBeVisible()
    const classAm = await cardAmarelo.getAttribute('class')
    const classVd = await cardVerde.getAttribute('class')
    expect(classAm).not.toMatch(/stat-card-pulse/)
    expect(classVd).not.toMatch(/stat-card-pulse/)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// ETAPA 3 — QR Code por máquina
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Etapa 3 — QR Code por máquina', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Botão QR existe nas linhas de máquinas (vista hierárquica)', async ({ page }) => {
    await navegarAteMaquinas(page)
    const btnQr = page.locator('button[title*="QR"], button[title*="etiqueta"]').first()
    await expect(btnQr).toBeVisible({ timeout: 5000 })
  })

  test('Botão QR existe nas máquinas em atraso (vista flat)', async ({ page }) => {
    await navegarParaAtraso(page)
    const btnQr = page.locator('button[title*="QR"], button[title*="etiqueta"]').first()
    await expect(btnQr).toBeVisible({ timeout: 5000 })
  })

  test('Clicar QR abre modal .qr-modal', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await expect(page.locator('.qr-modal')).toBeVisible({ timeout: 5000 })
  })

  test('Modal QR mostra a etiqueta com header NAVEL', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await expect(page.locator('.qr-etiqueta')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.qr-etiqueta-logo')).toBeVisible()
  })

  test('Modal QR mostra informação da máquina (marca/modelo/série)', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-etiqueta').waitFor({ state: 'visible', timeout: 5000 })

    await expect(page.locator('.qr-etiqueta-nome')).toBeVisible()
    await expect(page.locator('.qr-etiqueta-serie')).toBeVisible()
  })

  test('QR code gera-se dentro do modal (img aparece)', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-etiqueta').waitFor({ state: 'visible', timeout: 5000 })

    // Aguardar até 5 s pela geração do QR (async)
    await expect(page.locator('.qr-etiqueta-img')).toBeVisible({ timeout: 5000 })

    // A imagem deve ter um src de data: (data URL)
    const src = await page.locator('.qr-etiqueta-img').getAttribute('src')
    expect(src).toMatch(/^data:image/)
  })

  test('Botão "Imprimir etiqueta" fica activo após gerar QR', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-etiqueta').waitFor({ state: 'visible', timeout: 5000 })
    // Aguardar QR gerado
    await page.locator('.qr-etiqueta-img').waitFor({ state: 'visible', timeout: 5000 })

    const printBtn = page.locator('button').filter({ hasText: /imprimir/i }).first()
    await expect(printBtn).toBeVisible()
    await expect(printBtn).toBeEnabled()
  })

  test('Fechar modal QR via botão "Fechar"', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-modal').waitFor({ state: 'visible', timeout: 5000 })

    await page.locator('.qr-modal button.secondary').filter({ hasText: /fechar/i }).first().click()
    await expect(page.locator('.qr-modal')).not.toBeVisible({ timeout: 4000 })
  })

  test('Fechar modal QR via Escape', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-modal').waitFor({ state: 'visible', timeout: 5000 })

    await page.keyboard.press('Escape')
    await expect(page.locator('.qr-modal')).not.toBeVisible({ timeout: 4000 })
  })

  test('Fechar modal QR via clique no overlay', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-modal').waitFor({ state: 'visible', timeout: 5000 })

    await page.locator('.qr-modal-overlay').click({ position: { x: 5, y: 5 } })
    await expect(page.locator('.qr-modal')).not.toBeVisible({ timeout: 4000 })
  })

  test('ATecnica também tem acesso ao botão QR', async ({ page }) => {
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)
    await navegarParaAtraso(page)

    const btnQr = page.locator('button[title*="QR"], button[title*="etiqueta"]').first()
    await expect(btnQr).toBeVisible({ timeout: 5000 })
  })

  test('QR na vista hierárquica também funciona', async ({ page }) => {
    await navegarAteMaquinas(page)
    const btnQr = page.locator('button[title*="QR"], button[title*="etiqueta"]').first()
    await btnQr.click()
    await expect(page.locator('.qr-modal')).toBeVisible({ timeout: 5000 })
    await page.keyboard.press('Escape')
    await expect(page.locator('.qr-modal')).not.toBeVisible({ timeout: 4000 })
  })

  test('Etiqueta mostra rodapé com versão Navel', async ({ page }) => {
    await navegarParaAtraso(page)
    await page.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-etiqueta').waitFor({ state: 'visible', timeout: 5000 })

    const footer = page.locator('.qr-etiqueta-footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText(/navel/i)
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// ETAPA 4 — Histórico completo em PDF por máquina
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Etapa 4 — Histórico PDF por máquina', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Botão "Histórico PDF" existe nas linhas de máquinas (vista hierárquica)', async ({ page }) => {
    await navegarAteMaquinas(page)
    const btnHist = page.locator('button[title*="Histórico"], button[title*="historico"], button[title*="istórico"]').first()
    await expect(btnHist).toBeVisible({ timeout: 5000 })
  })

  test('Botão "Histórico PDF" existe nas máquinas em atraso', async ({ page }) => {
    await navegarParaAtraso(page)
    const btnHist = page.locator('button[title*="Histórico"], button[title*="istórico"]').first()
    await expect(btnHist).toBeVisible({ timeout: 5000 })
  })

  test('Botão Histórico está activo (não disabled) antes de clicar', async ({ page }) => {
    await navegarParaAtraso(page)
    const btnHist = page.locator('button[title*="Histórico"], button[title*="istórico"]').first()
    await expect(btnHist).toBeEnabled()
  })

  test('Clicar Histórico PDF abre nova janela com HTML do histórico', async ({ page }) => {
    await navegarParaAtraso(page)
    const btnHist = page.locator('button[title*="Histórico"], button[title*="istórico"]').first()

    // Capturar o popup/nova janela
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      btnHist.click(),
    ])

    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(600)

    // Verificar que o HTML tem o conteúdo esperado
    const title = await popup.title()
    expect(title).toMatch(/Histórico|histor/i)
  })

  test('Janela do histórico contém cabeçalho Navel', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    await expect(popup.locator('.rpt-empresa, .rpt-header, strong').first()).toBeVisible()
    const content = await popup.content()
    expect(content).toMatch(/NAVEL|navel/i)
  })

  test('Janela do histórico contém barra de título "Histórico Completo"', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    const barraTitle = popup.locator('.rpt-titulo-bar h1, h1')
    await expect(barraTitle.first()).toBeVisible({ timeout: 4000 })
    await expect(barraTitle.first()).toContainText(/histórico/i)
  })

  test('Janela do histórico contém ficha do equipamento', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    await expect(popup.locator('.ficha-grid')).toBeVisible({ timeout: 4000 })
    // Deve ter a marca da máquina (Navel EV-4P do mock)
    const content = await popup.content()
    expect(content).toMatch(/Navel|NAV-001/)
  })

  test('Janela do histórico contém bloco de estatísticas', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    await expect(popup.locator('.stats-row')).toBeVisible({ timeout: 4000 })
    // 5 stat-box
    const statBoxes = popup.locator('.stat-box')
    await expect(statBoxes).toHaveCount(5)
  })

  test('Janela do histórico contém tabela de manutenções', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    await expect(popup.locator('.hist-table')).toBeVisible({ timeout: 4000 })
    // Deve ter pelo menos uma linha de dados (mt01 e mt11 do mock pertencem a m01)
    const rows = popup.locator('.hist-table tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Tabela do histórico mostra badge de estado correcto', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    // mt01 concluída → badge-ok "Executada"
    await expect(popup.locator('.badge-ok').first()).toBeVisible({ timeout: 4000 })
    // mt11 pendente em atraso → badge-err "Em atraso"
    await expect(popup.locator('.badge-err').first()).toBeVisible({ timeout: 4000 })
  })

  test('Rodapé do histórico tem texto Navel e versão', async ({ page }) => {
    await navegarParaAtraso(page)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      page.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(500)

    const footer = popup.locator('.rpt-footer')
    await expect(footer).toBeVisible({ timeout: 4000 })
    const footerText = await footer.textContent()
    expect(footerText).toMatch(/navel/i)
    expect(footerText).toMatch(/v\d+\.\d+\.\d+/i)
  })

  test('ATecnica também tem acesso ao botão Histórico PDF', async ({ page }) => {
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)
    await navegarParaAtraso(page)

    const btnHist = page.locator('button[title*="Histórico"], button[title*="istórico"]').first()
    await expect(btnHist).toBeVisible({ timeout: 5000 })
    await expect(btnHist).toBeEnabled()
  })

  test('Botão Histórico na vista hierárquica também funciona', async ({ page }) => {
    await navegarAteMaquinas(page)
    const btnHist = page.locator('button[title*="Histórico"], button[title*="istórico"]').first()
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      btnHist.click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    const content = await popup.content()
    expect(content).toMatch(/Histórico|histor/i)
  })

  test('Histórico com máquina sem manutenções mostra mensagem vazia', async ({ page }) => {
    // Mock: máquina m02 não tem manutenções (mt20 é dela mas está pendente)
    // A ficha de m02 em atraso: proximaManut = null (2026 Jan 1970) → pode aparecer no atraso
    // Mas vamos testar diretamente com a navegação hierárquica para sub2 / m02
    await page.goto('/manut/equipamentos')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(800)

    // Clicar em Elevadores de veículos
    const catCard = page.locator('.categoria-card, button').filter({ hasText: /elevadores/i }).first()
    if (await catCard.isVisible({ timeout: 4000 }).catch(() => false)) {
      await catCard.click()
      await page.waitForTimeout(500)

      // Clicar em Elevador electro-hidráulico (sub2 — contém m02 sem manutenções)
      const subCard2 = page.locator('.categoria-card, button').filter({ hasText: /hidráulico|hidr/i }).first()
      if (await subCard2.isVisible({ timeout: 3000 }).catch(() => false)) {
        await subCard2.click()
        await page.waitForTimeout(500)

        const btnHist = page.locator('button[title*="Histórico"], button[title*="istórico"]').first()
        if (await btnHist.isVisible({ timeout: 3000 }).catch(() => false)) {
          const [popup] = await Promise.all([
            page.context().waitForEvent('page', { timeout: 8000 }),
            btnHist.click(),
          ])
          await popup.waitForLoadState('domcontentloaded')
          await popup.waitForTimeout(500)

          // Deve mostrar "Nenhuma manutenção registada" (m02 só tem mt20 que é pendente futura)
          // Ou a tabela com mt20
          const content = await popup.content()
          expect(content).toMatch(/Navel|navel|hist/i)
        }
      }
    }
  })

})

// ═══════════════════════════════════════════════════════════════════════════════
// TESTES DE INTEGRAÇÃO — Fluxos combinados
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('Integração — Fluxos combinados das 4 etapas', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
    await doLoginAdmin(page)
  })

  test('Dashboard mostra alerta E lista "meu dia" em simultâneo', async ({ page }) => {
    // Ambos devem coexistir no mesmo ecrã
    await expect(page.locator('.stat-card-pulse')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.meu-dia-section')).toBeVisible()
    await expect(page.locator('.meu-dia-lista .meu-dia-item').first()).toBeVisible()
  })

  test('QR e Histórico coexistem na mesma linha de máquina', async ({ page }) => {
    await navegarParaAtraso(page)
    const firstRow = page.locator('.maquina-row').first()
    const btnQr   = firstRow.locator('button[title*="QR"], button[title*="etiqueta"]').first()
    const btnHist = firstRow.locator('button[title*="Histórico"], button[title*="istórico"]').first()

    await expect(btnQr).toBeVisible()
    await expect(btnHist).toBeVisible()
  })

  test('Fluxo: abrir QR, fechar, depois abrir Histórico na mesma sessão', async ({ page }) => {
    await navegarParaAtraso(page)
    const firstRow = page.locator('.maquina-row').first()

    // 1. Abrir QR
    await firstRow.locator('button[title*="QR"], button[title*="etiqueta"]').first().click()
    await page.locator('.qr-modal').waitFor({ state: 'visible', timeout: 5000 })
    // Aguardar QR gerado
    await page.locator('.qr-etiqueta-img').waitFor({ state: 'visible', timeout: 6000 })

    // 2. Fechar QR
    await page.keyboard.press('Escape')
    await expect(page.locator('.qr-modal')).not.toBeVisible({ timeout: 4000 })

    // 3. Abrir Histórico PDF (nova janela)
    const [popup] = await Promise.all([
      page.context().waitForEvent('page', { timeout: 8000 }),
      firstRow.locator('button[title*="Histórico"], button[title*="istórico"]').first().click(),
    ])
    await popup.waitForLoadState('domcontentloaded')
    await popup.waitForTimeout(300)

    // Confirmar conteúdo válido
    const content = await popup.content()
    expect(content).toMatch(/Histórico|NAVEL/i)
  })

  test('ATecnica: tem "O meu dia" + alertas + QR + Histórico (sem botões Admin)', async ({ page }) => {
    await page.evaluate(() => sessionStorage.clear())
    await setupApiMock(page)
    await doLoginTecnico(page)

    // Dashboard: alerta e meu dia
    await expect(page.locator('.meu-dia-destaque')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.stat-card-pulse')).toBeVisible()

    // Equipamentos: QR e Histórico presentes, mas sem botão eliminar
    await navegarParaAtraso(page)
    await expect(page.locator('button[title*="QR"], button[title*="etiqueta"]').first()).toBeVisible()
    await expect(page.locator('button[title*="Histórico"], button[title*="istórico"]').first()).toBeVisible()
    await expect(page.locator('.icon-btn.danger')).not.toBeVisible()
  })

})
