/**
 * Painel da visita do elevador (v1.17.37) em telemóvel e tablet.
 * Confirma os botões novos, a pergunta obrigatória e que o modal não transborda.
 */
import { test, expect } from '@playwright/test'
import {
  loginAdminSemAlertas,
  confirmExecWizardVerificacaoEquipamento,
  checklistMarcarTodos,
  execWizardSeguinte,
  ensureNotasComFrasePredefinida,
  preencherFuncaoAssinanteElevador,
} from './helpers.js'

const ITENS = [
  { id: 'rx1', subcategoriaId: 'sub1', ordem: 1, texto: 'Marcação CE' },
  { id: 'rx2', subcategoriaId: 'sub1', ordem: 2, texto: 'Manual de instruções' },
  { id: 'rx3', subcategoriaId: 'sub1', ordem: 3, texto: 'Declaração de conformidade' },
  { id: 'rx4', subcategoriaId: 'sub1', ordem: 4, texto: 'Registo de intervenções' },
  { id: 'rx5', subcategoriaId: 'sub1', ordem: 5, texto: 'Verificar alimentação elétrica e dispositivos de segurança' },
  { id: 'rx6', subcategoriaId: 'sub1', ordem: 6, texto: 'Verificar nível de óleo da central hidráulica' },
  { id: 'rx7', subcategoriaId: 'sub1', ordem: 7, texto: 'Verificar o funcionamento dos componentes do circuito hidráulico - válvulas reguladoras de pressão e de caudal' },
  { id: 'rx8', subcategoriaId: 'sub1', ordem: 8, texto: 'Verificar cilindros hidráulicos' },
  { id: 'rx9', subcategoriaId: 'sub1', ordem: 9, texto: 'Verificar suportes de carga' },
  { id: 'rx10', subcategoriaId: 'sub1', ordem: 10, texto: 'Verificar sistemas de fins de curso e atuadores' },
  { id: 'rx11', subcategoriaId: 'sub1', ordem: 11, texto: 'Verificar trancas de segurança e o seu bom funcionamento' },
  { id: 'rx12', subcategoriaId: 'sub1', ordem: 12, texto: 'Verificar e afinar a sincronização por cabos de aço dos movimentos das colunas' },
]

async function medir(page) {
  return page.evaluate(() => {
    const modal = document.querySelector('.modal-relatorio-form')
    const grelha = document.querySelector('.checklist-item-btns--elevador')
    const select = document.querySelector('.notas-correcao select, .funcao-recebe select')
    const estoura = []
    if (modal) {
      for (const el of modal.querySelectorAll('*')) {
        if (el.clientWidth > 40 && el.scrollWidth > el.clientWidth + 4) {
          estoura.push(`${el.className || el.tagName} ${el.scrollWidth}>${el.clientWidth}`)
          if (estoura.length >= 6) break
        }
      }
    }
    return {
      largura: window.innerWidth,
      doc: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      modal: modal ? modal.scrollWidth - modal.clientWidth : -1,
      colunas: grelha ? getComputedStyle(grelha).gridTemplateColumns.split(' ').length : 0,
      fonteSelect: select ? parseFloat(getComputedStyle(select).fontSize) : 0,
      estoura,
    }
  })
}

test('painel do elevador cabe no telemóvel e no tablet', async ({ page }) => {
  test.setTimeout(120000)
  await loginAdminSemAlertas(page, {
    path: '/manutencoes',
    customData: { checklistItems: ITENS },
  })

  for (const vp of [
    { width: 390, height: 844, colunas: 2, cancelar: false },
    { width: 768, height: 1024, colunas: 3, cancelar: true },
  ]) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.goto('/manut/manutencoes')
    await page.locator('button.mc-btn-primary').filter({ hasText: 'Executar' }).first().click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'visible' })

    await confirmExecWizardVerificacaoEquipamento(page)
    await expect(page.getByText('Tem de estar visível na chapa de identificação do elevador')).toBeVisible()
    await expect(page.getByRole('button', { name: 'OK / Analisado' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Não Existente' }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: 'Não Disponibilizado - Gerido pelo Cliente' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ilegível' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Não Aplicável' }).first()).toBeVisible()

    const trancas = page.locator('.checklist-item-row', { hasText: 'trancas de segurança' })
    await expect(trancas).toHaveClass(/checklist-item-row--seguranca/)
    const valvulas = page.locator('.checklist-item-row', { hasText: 'válvulas reguladoras' })
    await expect(valvulas).not.toHaveClass(/checklist-item-row--seguranca/)

    const docGrupo = page.getByRole('group', { name: 'Documento 1' })
    await expect(docGrupo.getByRole('button', { name: 'Não Aplicável' })).toHaveCount(0)

    const checklist = await medir(page)
    expect(checklist.doc, `transbordo da página a ${vp.width}px: ${checklist.estoura.join(' | ')}`).toBeLessThanOrEqual(1)
    expect(checklist.modal).toBeLessThanOrEqual(1)
    expect(checklist.colunas).toBe(vp.colunas)
    expect(checklist.estoura, checklist.estoura.join(' | ')).toEqual([])

    const cancelar = page.locator('.wizard-footer-cancel')
    if (vp.cancelar) await expect(cancelar).toBeVisible()
    else await expect(cancelar).toBeHidden()

    await checklistMarcarTodos(page)
    await execWizardSeguinte(page)

    const pergunta = page.getByText('Foi realizada alguma correção ou reparação relevante nesta manutenção preventiva?')
    await expect(pergunta).toBeVisible()
    await expect(pergunta).not.toContainText('*')
    const selectNotas = page.locator('.notas-correcao select')
    await expect(selectNotas).toBeVisible()
    const notas = await medir(page)
    expect(notas.fonteSelect).toBeGreaterThanOrEqual(16)
    expect(notas.doc).toBeLessThanOrEqual(1)
    expect(notas.estoura, notas.estoura.join(' | ')).toEqual([])

    await selectNotas.selectOption('nao')
    await page.locator('.modal textarea.textarea-full').first().fill(ensureNotasComFrasePredefinida(''))
    await execWizardSeguinte(page)
    await execWizardSeguinte(page)

    const selectTecnico = page.locator('.modal select').filter({
      has: page.locator('option[value="Aurélio Almeida"]'),
    }).first()
    await selectTecnico.waitFor({ state: 'visible', timeout: 8000 })
    await selectTecnico.selectOption({ index: 1 })
    await execWizardSeguinte(page)

    await page.locator('.modal input[placeholder*="Nome completo" i]').first().fill('Cliente Teste')
    const funcao = page.locator('.funcao-recebe select')
    await expect(funcao).toBeVisible()
    await preencherFuncaoAssinanteElevador(page)
    await expect(funcao).toHaveValue('Chefe de oficina')
    const cliente = await medir(page)
    expect(cliente.fonteSelect).toBeGreaterThanOrEqual(16)
    expect(cliente.doc).toBeLessThanOrEqual(1)
    expect(cliente.estoura, cliente.estoura.join(' | ')).toEqual([])

    await page.locator('button[aria-label="Sair do assistente"]').click()
    await page.locator('.modal-overlay').first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {})
    await page.evaluate(() => indexedDB.deleteDatabase('atm_exec_drafts_v1'))
  }
})
