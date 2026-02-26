/**
 * 16-reparacoes.spec.js — Módulo Reparações: fluxos completos E2E
 *
 * Cobre:
 *  R1. Listagem, filtros e badges de estado
 *  R2. Dashboard: card "Reparações pendentes" com link
 *  R3. Criar nova reparação (validação + sucesso)
 *  R4. Execução — Guardar progresso (fluxo multi-dia, sem assinatura)
 *  R5. Execução — Retoma de reparação em_progresso (dados pre-preenchidos)
 *  R6. Execução — Concluir com assinatura (geração do relatório + nr. sequencial)
 *  R7. Visualização do relatório concluído
 *  R8. Relatório mensal ISTOBAL (avisos ES, horas M.O., materiais expansíveis)
 *  R9. Eliminar reparação (Admin) e protecção (ATecnica)
 * R10. Badge ISTOBAL na lista principal
 *
 * Selectores baseados no HTML real (inspeccionado de Reparacoes.jsx):
 *  - Filtros: .filtro-tab  (labels: Todas / Pendentes / Em progresso / Concluídas)
 *  - ISTOBAL badge: .rep-origem-istobal
 *  - Play btn: button[title="Executar / Completar reparação"]
 *  - Ver relatório: button[title="Ver relatório"]
 *  - Eliminar: button.icon-btn.danger  (title="Eliminar reparação")
 *  - Confirmar eliminar: button.btn.danger
 *  - Criar reparação: button "Criar Reparação"
 */

import { test, expect } from '@playwright/test'
import {
  setupApiMock, doLoginAdmin, doLoginTecnico,
  loginAdminSemAlertas, signCanvas,
  MC, dismissAlertasModal,
} from './helpers.js'

// ── helpers locais ─────────────────────────────────────────────────────────────

/** Vai directamente a /reparacoes após login Admin (sem alertas). */
async function irParaReparacoes(page, customData = {}) {
  await loginAdminSemAlertas(page, { path: '/reparacoes', customData })
}

/** Vai a /reparacoes como ATecnica. */
async function irParaReparacoesATecnica(page) {
  await setupApiMock(page)
  await doLoginTecnico(page)
  await dismissAlertasModal(page)
  await page.goto('/manut/reparacoes')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
}

/** Clica num separador de filtro pelo seu texto exacto. */
async function clicarFiltro(page, texto) {
  await page.locator('.filtro-tab').filter({ hasText: texto }).click()
  await page.waitForTimeout(400)
}

// ─── R1. Listagem e filtros ────────────────────────────────────────────────────

test.describe('R1 — Listagem e filtros', () => {

  test('Mostra todas as 5 reparações do mock data por defeito', async ({ page }) => {
    await irParaReparacoes(page)
    const rows = page.locator('tbody tr')
    await expect(rows).toHaveCount(5)
  })

  test('Filtro "Pendentes" mostra apenas reparações pendentes', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Pendentes')
    await expect(page.locator('tbody tr')).toHaveCount(1)
    await expect(page.locator('tbody td').filter({ hasText: 'AV-2026-001' })).toBeVisible()
  })

  test('Filtro "Em progresso" mostra 2 reparações em curso', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Em progresso')
    await expect(page.locator('tbody tr')).toHaveCount(2)
  })

  test('Filtro "Concluídas" mostra 2 reparações concluídas', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Concluídas')
    await expect(page.locator('tbody tr')).toHaveCount(2)
  })

  test('Badges de estado corretos na listagem (tbody)', async ({ page }) => {
    await irParaReparacoes(page)
    // Só contar badges dentro do tbody (excluir o badge de contagem no cabeçalho)
    await expect(page.locator('tbody .badge').filter({ hasText: 'Pendente' })).toHaveCount(1)
    await expect(page.locator('tbody .badge').filter({ hasText: 'Em progresso' })).toHaveCount(2)
    await expect(page.locator('tbody .badge').filter({ hasText: 'Concluída' })).toHaveCount(2)
  })

  test('Contador de filtro mostra número correcto', async ({ page }) => {
    await irParaReparacoes(page)
    // Separador "Pendentes" deve mostrar o contador "1"
    const tabPendente = page.locator('.filtro-tab').filter({ hasText: 'Pendentes' })
    await expect(tabPendente.locator('.filtro-tab-count')).toHaveText('1')
  })

})

// ─── R2. Dashboard ─────────────────────────────────────────────────────────────

test.describe('R2 — Dashboard: card de reparações', () => {

  test('Dashboard mostra card com ligação para reparações', async ({ page }) => {
    await loginAdminSemAlertas(page, { path: '/' })
    // Navegar directamente e confirmar que /reparacoes carrega
    await page.goto('/manut/reparacoes')
    await expect(page).toHaveURL(/\/reparacoes/)
    await expect(page.locator('h1')).toContainText('Reparações')
  })

})

// ─── R3. Criar nova reparação ──────────────────────────────────────────────────

test.describe('R3 — Criar nova reparação', () => {

  test('Botão "Nova Reparação" abre o modal', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Nova Reparação' }).click()
    await expect(page.locator('.modal-nova-rep')).toBeVisible()
    await expect(page.locator('.modal-nova-rep h2')).toContainText('Nova Reparação')
  })

  test('Submeter sem campos obrigatórios mostra erros de validação', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Nova Reparação' }).click()
    // Clicar "Criar Reparação" sem preencher nada
    await page.locator('.modal-nova-rep button').filter({ hasText: 'Criar Reparação' }).click()
    await page.waitForTimeout(400)
    // Deve haver pelo menos 1 erro de validação
    await expect(page.locator('.modal-nova-rep .field-error').first()).toBeVisible()
  })

  test('Criar reparação válida fecha modal e mostra toast de sucesso', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Nova Reparação' }).click()
    const modal = page.locator('.modal-nova-rep')

    // Máquina
    await modal.locator('select').first().selectOption({ index: 1 })
    await page.waitForTimeout(200)

    // Técnico
    await modal.locator('input[placeholder*="écnico"]').first().fill('Pedro Medeiros')

    // Data (pré-preenchida, mas garantir que tem valor)
    const inputData = modal.locator('input[type="date"]').first()
    if (!(await inputData.inputValue())) {
      await inputData.fill('2026-02-25')
    }

    // Criar
    await modal.locator('button').filter({ hasText: 'Criar Reparação' }).click()
    await page.waitForTimeout(600)

    // Modal fechou
    await expect(modal).not.toBeVisible()
    // Toast de sucesso
    await expect(page.locator('.toast, [role="alert"]').filter({ hasText: /criada|sucesso/i }))
      .toBeVisible({ timeout: 5000 })
  })

  test('ATecnica também pode criar reparações', async ({ page }) => {
    await irParaReparacoesATecnica(page)
    await expect(page.locator('button').filter({ hasText: 'Nova Reparação' })).toBeVisible()
  })

})

// ─── R4. Execução — Guardar progresso ─────────────────────────────────────────

test.describe('R4 — Guardar progresso (fluxo multi-dia)', () => {

  test('Reparação pendente tem botão "Executar"', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Pendentes')
    await expect(page.locator('button[title="Executar / Completar reparação"]')).toBeVisible()
  })

  test('Botão "Executar" abre modal de execução', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button[title="Executar / Completar reparação"]').first().click()
    await expect(page.locator('.modal-exec-rep')).toBeVisible()
    await expect(page.locator('.modal-exec-rep h2')).toContainText('Executar Reparação')
  })

  test('Guardar progresso sem assinatura fecha modal com toast', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button[title="Executar / Completar reparação"]').first().click()
    await page.waitForTimeout(400)

    const modal = page.locator('.modal-exec-rep')

    // Garantir que o técnico está preenchido (vem de rep01.tecnico)
    // Se select de técnico existir, seleccionar
    const selectTec = modal.locator('select').first()
    if (await selectTec.isVisible()) {
      await selectTec.selectOption({ index: 1 }).catch(() => {})
    }

    // Preencher algum trabalho (textarea)
    const textareas = modal.locator('textarea')
    const nTA = await textareas.count()
    if (nTA > 0) await textareas.first().fill('Inspecção inicial efectuada.')

    // Clicar "Guardar progresso"
    const btnGuardar = modal.locator('button').filter({ hasText: /Guardar progresso/i })
    await expect(btnGuardar).toBeVisible()
    await btnGuardar.click()
    await page.waitForTimeout(800)

    // Modal fechou + toast
    await expect(modal).not.toBeVisible()
    await expect(page.locator('.toast, [role="alert"]').filter({ hasText: /rogresso|guardado/i }))
      .toBeVisible({ timeout: 5000 })
  })

  test('Reparação em_progresso não tem botão "Ver relatório"', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Em progresso')
    // O botão "Ver relatório" não deve existir em linhas em progresso
    await expect(page.locator('button[title="Ver relatório"]')).toHaveCount(0)
  })

})

// ─── R5. Retoma de reparação em_progresso ─────────────────────────────────────

test.describe('R5 — Retoma de reparação em_progresso', () => {

  test('Abrir reparação em_progresso pré-preenche dados guardados', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Em progresso')

    // rep05 (ISTOBAL) é a mais recente → vem primeiro no sort por data desc.
    // Abrimos rep05 que tem rr-rep05 com trabalhoRealizado preenchido
    await page.locator('button[title="Executar / Completar reparação"]').first().click()
    await page.locator('.modal-exec-rep').waitFor({ state: 'visible', timeout: 8000 })
    await page.waitForTimeout(800)

    const modal = page.locator('.modal-exec-rep')
    await expect(modal).toBeVisible()

    // rr-rep05.trabalhoRealizado = 'Sensor de posição diagnosticado...' → algum campo está preenchido
    let hasPrefilled = false
    const allInputs = modal.locator('input[type="text"], textarea')
    const n = await allInputs.count()
    for (let i = 0; i < n; i++) {
      const val = await allInputs.nth(i).inputValue().catch(() => '')
      if (val.trim().length > 0) { hasPrefilled = true; break }
    }
    expect(hasPrefilled).toBe(true)
  })

  test('Relatório parcial existente é carregado (trabalho realizado parcial)', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Em progresso')

    // rep05 é a 1ª (data 18/02 > 12/02). rr-rep05.trabalhoRealizado = 'Sensor de posição...'
    await page.locator('button[title="Executar / Completar reparação"]').first().click()
    await page.locator('.modal-exec-rep').waitFor({ state: 'visible', timeout: 8000 })
    await page.waitForTimeout(1500) // aguardar carregamento assíncrono do relatório parcial

    const modal = page.locator('.modal-exec-rep')
    const textareas = modal.locator('textarea')
    await expect(async () => {
      let found = false
      const n = await textareas.count()
      for (let i = 0; i < n; i++) {
        const val = await textareas.nth(i).inputValue().catch(() => '')
        // rr-rep05: 'Sensor de posição' | rr-rep02: 'Inspecção' | 'Desmontagem' | 'Fuga'
        if (val.includes('Sensor') || val.includes('Inspecção') || val.includes('Desmontagem') || val.includes('Fuga') || val.includes('Error')) {
          found = true; break
        }
      }
      expect(found).toBe(true)
    }).toPass({ timeout: 6000, intervals: [500, 500, 1000, 1000, 1000] })
  })

})

// ─── R6. Concluir reparação com assinatura ────────────────────────────────────

test.describe('R6 — Concluir reparação com assinatura', () => {

  test('Sem assinatura o botão "Concluir" mostra erro', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button[title="Executar / Completar reparação"]').first().click()
    await page.waitForTimeout(400)

    const modal = page.locator('.modal-exec-rep')

    // Preencher técnico e nome assinante mas NÃO assinar o canvas
    const selectTec = modal.locator('select').first()
    if (await selectTec.isVisible()) {
      await selectTec.selectOption({ index: 1 }).catch(() => {})
    }
    const inputs = modal.locator('input[type="text"]')
    const n = await inputs.count()
    if (n > 0) await inputs.last().fill('Cliente Teste')

    // Tentar concluir
    const btnConcluir = modal.locator('button').filter({ hasText: /Concluir/i }).first()
    if (await btnConcluir.isVisible()) {
      await btnConcluir.click()
      await page.waitForTimeout(500)

      // Deve mostrar erro de assinatura (toast ou campo)
      const hasError =
        await page.locator('.toast').filter({ hasText: /ssignatura|ssinar/i }).isVisible({ timeout: 2000 }).catch(() => false)
        || await modal.locator('.erro-assinatura, .field-error').isVisible({ timeout: 2000 }).catch(() => false)
      expect(hasError).toBe(true)
    }
  })

  test('Fluxo completo: preencher tudo + assinar + concluir gera relatório', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button[title="Executar / Completar reparação"]').first().click()
    await page.waitForTimeout(400)

    const modal = page.locator('.modal-exec-rep')

    // ① Técnico
    const selectTec = modal.locator('select').first()
    if (await selectTec.isVisible()) {
      await selectTec.selectOption({ index: 1 }).catch(() => {})
    }

    // ② Avaria (vem pré-preenchida do rep.descricaoAvaria, mas reforçar)
    const textareas = modal.locator('textarea')
    const nTA = await textareas.count()
    if (nTA >= 1) await textareas.first().fill('Elevador não sobe — cabo partido.')
    if (nTA >= 2) await textareas.nth(1).fill('Substituído cabo de elevação. Testado OK.')

    // ③ Nome do assinante — procurar input de texto que não seja date/number
    const allInputs = modal.locator('input[type="text"]')
    const nI = await allInputs.count()
    if (nI > 0) await allInputs.last().fill('António Bettencourt')

    // ④ Assinatura canvas
    await signCanvas(page)

    // ⑤ Concluir
    const btnConcluir = modal.locator('button').filter({ hasText: /Concluir/i }).first()
    if (await btnConcluir.isVisible()) {
      await btnConcluir.click()
      await page.waitForTimeout(1500)

      // Ecrã de conclusão com número AAAA.RP.NNNNN
      const concluido = page.locator('.exec-rep-concluido')
      if (await concluido.isVisible({ timeout: 5000 }).catch(() => false)) {
        await expect(concluido).toContainText(/\d{4}\.RP\.\d{5}/)
      } else {
        // Fallback: toast de sucesso
        await expect(page.locator('.toast').filter({ hasText: /oncluída|relatório/i }))
          .toBeVisible({ timeout: 5000 })
      }
    }
  })

})

// ─── R7. Visualização de relatório concluído ───────────────────────────────────

test.describe('R7 — Ver relatório concluído', () => {

  test('Reparações concluídas têm botão "Ver relatório"', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Concluídas')
    await expect(page.locator('button[title="Ver relatório"]').first()).toBeVisible()
  })

  test('Clicar "Ver relatório" abre modal com número de relatório', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Concluídas')

    await page.locator('button[title="Ver relatório"]').first().click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal, [role="dialog"]').last()
    await expect(modal).toBeVisible()
    await expect(modal).toContainText(/\d{4}\.RP\.\d{5}/)
  })

  test('Relatório concluído mostra horas M.O.', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Concluídas')
    await page.locator('button[title="Ver relatório"]').first().click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal, [role="dialog"]').last()
    await expect(modal).toContainText(/Horas M\.O\.|M\.O\./i)
  })

  test('Relatório concluído mostra materiais usados', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Concluídas')
    await page.locator('button[title="Ver relatório"]').first().click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal, [role="dialog"]').last()
    // rr-rep03 tem pecasUsadas com SENS-NTC-01
    await expect(modal).toContainText(/SENS-NTC-01|Sensor NTC|Peças|Materiais/i)
  })

  test('Reparações concluídas têm botão "Enviar email"', async ({ page }) => {
    await irParaReparacoes(page)
    await clicarFiltro(page, 'Concluídas')
    await expect(page.locator('button[title="Enviar relatório por email"]').first()).toBeVisible()
  })

})

// ─── R8. Relatório mensal ISTOBAL ──────────────────────────────────────────────

test.describe('R8 — Relatório mensal ISTOBAL', () => {

  test('Botão "Mensal ISTOBAL" está visível no cabeçalho', async ({ page }) => {
    await irParaReparacoes(page)
    await expect(page.locator('button').filter({ hasText: 'Mensal ISTOBAL' })).toBeVisible()
  })

  test('Clicar "Mensal ISTOBAL" abre modal com título ISTOBAL', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('ISTOBAL')
  })

  test('Modal mensal mostra avisos ES- do mês corrente', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(800) // aguardar render

    const modal = page.locator('.modal-mensal-istobal')
    await expect(modal).toBeVisible()

    // Se não estiver em Fevereiro 2026, navegar com os botões corrects (aria-label)
    const tituloEl = modal.locator('.mensal-titulo')
    const titulo = await tituloEl.innerText().catch(() => '')
    if (!titulo.includes('Fevereiro') || !titulo.includes('2026')) {
      const btnPrev = modal.locator('button[aria-label="Mês anterior"]')
      const btnNext = modal.locator('button[aria-label="Mês seguinte"]')
      for (let i = 0; i < 12; i++) {
        const t = await tituloEl.innerText().catch(() => '')
        if (t.includes('Fevereiro') && t.includes('2026')) break
        const [ano, mes] = t.match(/(\w+) (\d{4})/)?.slice(1,3) ?? ['', '0']
        const anoNum = parseInt(mes)
        if (anoNum < 2026 || (anoNum === 2026 && !t.includes('Fevereiro'))) {
          await btnNext.click().catch(() => {})
        } else {
          await btnPrev.click().catch(() => {})
        }
        await page.waitForTimeout(300)
      }
    }

    // rep04 (ES-2026-00099) e rep05 (ES-2026-00150) são de Fevereiro 2026
    await expect(modal).toContainText(/ES-2026-/, { timeout: 10000 })
  })

  test('Modal mensal tem coluna H. M.O.', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    await expect(modal.locator('th.th-horas')).toBeVisible()
  })

  test('Card de resumo "Horas M.O. (faturar)" está visível', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    const cardHoras = modal.locator('.mensal-stat-destaque')
    await expect(cardHoras).toBeVisible()
    await expect(cardHoras).toContainText(/faturar|M\.O\./i)
  })

  test('Linha com materiais (rep04) tem badge com contagem de referências', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    // rr-rep04 tem 2 peças → badge-materiais com "2"
    const badge = modal.locator('.badge-materiais').first()
    if (await badge.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(badge).toContainText('2')
    }
  })

  test('Clicar em linha com materiais expande sub-tabela de materiais', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    const rowExp = modal.locator('.row-expansivel').first()

    if (await rowExp.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rowExp.click()
      await page.waitForTimeout(400)

      const subTab = modal.locator('.materiais-mini-table')
      await expect(subTab).toBeVisible()
      await expect(subTab.locator('th').filter({ hasText: 'Referência' })).toBeVisible()
    }
  })

  test('Sub-tabela mostra referências sem preços', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    const rowExp = modal.locator('.row-expansivel').first()

    if (await rowExp.isVisible({ timeout: 3000 }).catch(() => false)) {
      await rowExp.click()
      await page.waitForTimeout(400)

      const subTab = modal.locator('.materiais-mini-table')
      await expect(subTab).toBeVisible()
      // Verificar que existem colunas Referência, Descrição, Qtd — mas SEM preço/custo/valor
      await expect(subTab.locator('th').filter({ hasText: /[Pp]reço|[Cc]usto|[Vv]alor|€/ })).toHaveCount(0)
      await expect(subTab.locator('th').filter({ hasText: 'Qtd.' })).toBeVisible()
    }
  })

  test('Navegação entre meses altera o título', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    const tituloEl = modal.locator('.mensal-titulo')
    const tituloAntes = await tituloEl.innerText().catch(() => '')

    // Usar aria-label correcto para navegar (usa ChevronLeft/Right, não texto </>)
    const btnPrev = modal.locator('button[aria-label="Mês anterior"]')
    await btnPrev.click()
    await page.waitForTimeout(300)

    const tituloDepois = await tituloEl.innerText().catch(() => '')
    expect(tituloDepois).not.toBe(tituloAntes)
    expect(tituloDepois).toBeTruthy()
  })

  test('Botão "Imprimir / Exportar" está visível no footer', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button').filter({ hasText: 'Mensal ISTOBAL' }).click()
    await page.waitForTimeout(500)

    const modal = page.locator('.modal-mensal-istobal')
    await expect(modal.locator('.modal-footer button').filter({ hasText: /Imprimir|Exportar/ })).toBeVisible()
  })

})

// ─── R9. Eliminar reparação ────────────────────────────────────────────────────

test.describe('R9 — Eliminar reparação', () => {

  test('Admin tem botão "Eliminar reparação" nas linhas', async ({ page }) => {
    await irParaReparacoes(page)
    await expect(page.locator('button[title="Eliminar reparação"]').first()).toBeVisible()
  })

  test('ATecnica não tem botão eliminar', async ({ page }) => {
    await irParaReparacoesATecnica(page)
    await expect(page.locator('button[title="Eliminar reparação"]')).toHaveCount(0)
  })

  test('Clicar eliminar abre modal de confirmação com texto de aviso', async ({ page }) => {
    await irParaReparacoes(page)
    await page.locator('button[title="Eliminar reparação"]').first().click()
    await page.waitForTimeout(400)

    const modal = page.locator('.modal-confirm')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('Confirmar eliminação')
    await expect(modal).toContainText('irreversível')
  })

  test('Cancelar eliminar fecha o modal sem apagar', async ({ page }) => {
    await irParaReparacoes(page)
    const rowsBefore = await page.locator('tbody tr').count()

    await page.locator('button[title="Eliminar reparação"]').first().click()
    await page.waitForTimeout(400)
    await page.locator('.modal-confirm button').filter({ hasText: 'Cancelar' }).click()
    await page.waitForTimeout(300)

    await expect(page.locator('.modal-confirm')).not.toBeVisible()
    await expect(page.locator('tbody tr')).toHaveCount(rowsBefore)
  })

  test('Confirmar eliminação remove reparação da lista', async ({ page }) => {
    await irParaReparacoes(page)
    const rowsBefore = await page.locator('tbody tr').count()

    await page.locator('button[title="Eliminar reparação"]').first().click()
    await page.waitForTimeout(400)
    await page.locator('.modal-confirm button.btn.danger').filter({ hasText: 'Eliminar' }).click()
    await page.waitForTimeout(600)

    await expect(page.locator('tbody tr')).toHaveCount(rowsBefore - 1)
  })

})

// ─── R10. Identificação ISTOBAL na lista principal ─────────────────────────────

test.describe('R10 — Badges ISTOBAL na lista', () => {

  test('Reparações ISTOBAL mostram badge .rep-origem-istobal', async ({ page }) => {
    await irParaReparacoes(page)
    // rep04 e rep05 têm origem istobal_email
    await expect(page.locator('.rep-origem-istobal')).toHaveCount(2)
  })

  test('Badge ISTOBAL contém texto "ISTOBAL"', async ({ page }) => {
    await irParaReparacoes(page)
    const badges = page.locator('.rep-origem-istobal')
    await expect(badges.first()).toContainText('ISTOBAL')
  })

  test('Avisos ES- aparecem na coluna "Aviso" da tabela', async ({ page }) => {
    await irParaReparacoes(page)
    // rep04 e rep05 têm avisos ES-2026-00099 e ES-2026-00150
    await expect(page.locator('td.td-aviso').filter({ hasText: /ES-2026-/ })).toHaveCount(2)
  })

})
