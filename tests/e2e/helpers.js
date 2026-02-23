/**
 * helpers.js — Utilitários partilhados para todos os testes E2E AT_Manut
 *
 * Inclui:
 *  - Mock da API REST (intercepção de rede, sem chamadas reais)
 *  - Criação de JWT falso para Admin e ATecnica
 *  - Dados mock (clientes, máquinas, manutenções, relatórios)
 *  - Acções comuns: login, preenchimento de checklist, assinatura canvas
 */

import { expect } from '@playwright/test'

// ── Mock JWT ─────────────────────────────────────────────────────────────────

export function makeMockJWT(role) {
  const payload = {
    sub:      role === 'admin' ? 'user_admin' : 'user_tecnico',
    username: role === 'admin' ? 'Admin'      : 'ATecnica',
    nome:     role === 'admin' ? 'Administrador' : 'Técnico Navel',
    role,
    exp: Math.floor(Date.now() / 1000) + 7200,
  }
  const b64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64}.fakesig`
}

export const ADMIN_TOKEN   = makeMockJWT('admin')
export const TECNICO_TOKEN = makeMockJWT('tecnico')

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const MC = {
  clientes: [
    {
      id: 'cli1', nif: '511234567', nome: 'Mecânica Bettencourt Lda',
      morada: 'Rua do Mercado, 12', codigoPostal: '9500-050',
      localidade: 'Ponta Delgada', telefone: '296281234',
      email: 'geral@mecanicabettencourt.pt',
    },
    {
      id: 'cli_nodeps', nif: '599999999', nome: 'Cliente Sem Máquinas',
      morada: 'Rua X', codigoPostal: '9500-000',
      localidade: 'Ponta Delgada', telefone: '', email: '',
    },
  ],
  categorias: [
    { id: 'cat1', nome: 'Elevadores de veículos',  intervaloTipo: 'anual' },
    { id: 'cat2', nome: 'Compressores',              intervaloTipo: 'trimestral' },
  ],
  subcategorias: [
    { id: 'sub1', categoriaId: 'cat1', nome: 'Elevador electromecânico de ligeiros' },
    { id: 'sub2', categoriaId: 'cat1', nome: 'Elevador electro-hidráulico de 2 colunas' },
  ],
  checklistItems: [
    // Periódica sub1 (3 itens para simplificar testes)
    { id: 'ch1', subcategoriaId: 'sub1', ordem: 1, texto: 'Marcação CE e conformidade do equipamento' },
    { id: 'ch2', subcategoriaId: 'sub1', ordem: 2, texto: 'Manual de instruções em português disponível' },
    { id: 'ch3', subcategoriaId: 'sub1', ordem: 3, texto: 'Dispositivos de segurança em funcionamento' },
    // Montagem sub2 (3 itens)
    { id: 'ch2m01', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'mecanica', ordem: 1, texto: 'Colunas verticais e paralelas entre si' },
    { id: 'ch2m02', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'electrica', ordem: 2, texto: 'Ligação eléctrica conforme especificações' },
    { id: 'ch2m03', subcategoriaId: 'sub2', tipo: 'montagem', grupo: 'teste', ordem: 3, texto: 'Teste final de subida e descida' },
  ],
  maquinas: [
    {
      id: 'm01', clienteNif: '511234567', subcategoriaId: 'sub1',
      periodicidadeManut: 'anual', marca: 'Navel', modelo: 'EV-4P',
      numeroSerie: 'NAV-001', anoFabrico: 2021, documentos: [],
      proximaManut: '2026-01-15', ultimaManutencaoData: '2025-12-10',
    },
    {
      id: 'm02', clienteNif: '511234567', subcategoriaId: 'sub2',
      periodicidadeManut: 'anual', marca: 'Navel', modelo: 'EH-2C',
      numeroSerie: 'NAV-002', anoFabrico: 2025, documentos: [],
      proximaManut: null, ultimaManutencaoData: null,
    },
  ],
  manutencoes: [
    // mt01: concluída com relatório (assinado)
    {
      id: 'mt01', maquinaId: 'm01', tipo: 'periodica',
      data: '2025-12-10', tecnico: 'Aurélio Almeida',
      status: 'concluida', observacoes: 'Revisão anual OK.',
    },
    // mt11: pendente em atraso — para executar nos testes
    {
      id: 'mt11', maquinaId: 'm01', tipo: 'periodica',
      data: '2026-01-15', tecnico: '',
      status: 'pendente', observacoes: 'Em atraso.',
    },
    // mt16: agendada (próxima)
    {
      id: 'mt16', maquinaId: 'm01', tipo: 'periodica',
      data: '2026-06-15', tecnico: 'Aldevino Costa',
      status: 'agendada', observacoes: '',
    },
    // mt20: montagem pendente
    {
      id: 'mt20', maquinaId: 'm02', tipo: 'montagem',
      data: '2026-03-01', tecnico: '',
      status: 'pendente', observacoes: '',
    },
  ],
  relatorios: [
    {
      id: 'rr01', manutencaoId: 'mt01',
      numeroRelatorio: '2025.MP.00001',
      dataCriacao:   '2025-12-10T09:00:00.000Z',
      dataAssinatura:'2025-12-10T11:00:00.000Z',
      tecnico: 'Aurélio Almeida',
      nomeAssinante: 'João Bettencourt',
      assinadoPeloCliente: true,
      assinaturaDigital: null,
      checklistRespostas: { ch1: 'sim', ch2: 'sim', ch3: 'sim' },
      notas: 'Tudo em conformidade.',
      fotos: [],
      ultimoEnvio: '2025-12-10T12:00:00.000Z',
    },
  ],
}

// ── Mock API ──────────────────────────────────────────────────────────────────

/**
 * Interceta todas as chamadas a /api/data.php e responde com dados mock.
 * @param {Page}   page
 * @param {object} opts
 *   failFetch    — se true, os list/get falham (para testes offline)
 *   customData   — substitui MC parcialmente
 */
export async function setupApiMock(page, { failFetch = false, customData = {} } = {}) {
  const data = { ...MC, ...customData }

  await page.route('**/api/data.php', async (route) => {
    const body = route.request().postDataJSON()
    const { r: resource, action } = body ?? {}

    // ── Auth: login ──
    if (resource === 'auth' && action === 'login') {
      if (body.password === 'wrong') {
        await route.fulfill({
          status: 401, contentType: 'application/json',
          body: JSON.stringify({ ok: false, message: 'Utilizador ou password incorretos.' }),
        })
        return
      }
      const isAdmin = (body.username ?? '').toLowerCase().includes('admin')
      const role    = isAdmin ? 'admin'   : 'tecnico'
      const nome    = isAdmin ? 'Administrador' : 'Técnico Navel'
      const uname   = isAdmin ? 'Admin'   : 'ATecnica'
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          data: {
            token: makeMockJWT(role),
            expiresAt: new Date(Date.now() + 7200000).toISOString(),
            user: { id: role + '1', username: uname, nome, role },
          },
        }),
      })
      return
    }

    // ── Simular falha de rede ──
    if (failFetch && ['list', 'get'].includes(action)) {
      await route.abort('failed')
      return
    }

    // ── list ──
    if (action === 'list') {
      const rows = data[resource] ?? []
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ ok: true, data: rows }),
      })
      return
    }

    // ── create / update / delete / bulk_create / bulk_restore ──
    await route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, data: body?.data ?? {} }),
    })
  })
}

// ── Login via UI ──────────────────────────────────────────────────────────────

export async function doLogin(page, { username = 'Admin', password = 'admin123' } = {}) {
  await page.goto('/manut/login')
  await page.waitForLoadState('domcontentloaded')
  await page.locator('input').first().fill(username)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL(/\/manut\/?$/, { timeout: 12000 })
  // Dispensar modal PWA se aparecer
  await page.locator('button:has-text("Entendi")').click().catch(() => {})
  await page.waitForTimeout(1500)
}

export async function doLoginAdmin(page)   { return doLogin(page, { username: 'Admin',    password: 'admin123' }) }
export async function doLoginTecnico(page) { return doLogin(page, { username: 'ATecnica', password: 'tecnico123' }) }

// ── Acções no checklist ───────────────────────────────────────────────────────

/** Marca todos os itens do checklist como "Sim" via botão "Marcar todos". */
export async function checklistMarcarTodos(page) {
  const btn = page.locator('.btn-link-checklist').first()
  if (await btn.isVisible()) {
    await btn.click()
    await page.waitForTimeout(300)
  }
}

/** Marca todos os itens individualmente como "Sim" (fallback se não houver "Marcar todos"). */
export async function checklistFillAllSim(page) {
  const rows = page.locator('.checklist-item-row')
  const count = await rows.count()
  for (let i = 0; i < count; i++) {
    const simBtn = rows.nth(i).locator('.btn-simnao').first()
    if (await simBtn.isVisible()) await simBtn.click()
    await page.waitForTimeout(80)
  }
}

// ── Assinatura digital (canvas) ───────────────────────────────────────────────

/** Desenha uma linha no canvas de assinatura para o marcar como "feita". */
export async function signCanvas(page) {
  const canvas = page.locator('.assinatura-canvas')
  await canvas.waitFor({ state: 'visible', timeout: 8000 })

  // Rolar o canvas para dentro do viewport — pode estar no fundo de um modal scrollável
  await canvas.scrollIntoViewIfNeeded()
  await page.waitForTimeout(300) // deixar scroll assentar

  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas de assinatura não encontrado')

  // Simular stroke de assinatura com mouse events
  await page.mouse.move(box.x + 30,  box.y + 60)
  await page.mouse.down()
  await page.mouse.move(box.x + 80,  box.y + 40, { steps: 10 })
  await page.mouse.move(box.x + 140, box.y + 70, { steps: 10 })
  await page.mouse.move(box.x + 200, box.y + 50, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(500)

  // Verificar que assinatura foi registada (não fatal — tenta mas continua)
  const ok = await page.locator('.assinatura-ok').isVisible({ timeout: 2000 }).catch(() => false)
  if (!ok) {
    // Tentar novamente com abordagem alternativa via dispatchEvent
    await canvas.dispatchEvent('mousedown', { clientX: box.x + 40, clientY: box.y + 50, buttons: 1 })
    await canvas.dispatchEvent('mousemove', { clientX: box.x + 120, clientY: box.y + 60, buttons: 1 })
    await canvas.dispatchEvent('mouseup',   { clientX: box.x + 120, clientY: box.y + 60 })
    await page.waitForTimeout(400)
  }
}

// ── Preencher formulário de execução de manutenção ────────────────────────────

/**
 * Executa o fluxo completo de preenchimento do modal de execução:
 * 1. Marcar todos checklist
 * 2. Seleccionar técnico
 * 3. Preencher nome assinante
 * 4. Assinar canvas
 * 5. (opcional) email
 */
export async function fillExecucaoModal(page, {
  tecnico       = 'Aurélio Almeida',
  nomeAssinante = 'Cliente Teste',
  email         = '',
} = {}) {
  // 1. Checklist
  await checklistMarcarTodos(page)
  // Fallback: marcar individualmente se "Marcar todos" não existir
  await checklistFillAllSim(page)

  // 2. Técnico
  const selectTecnico = page.locator('.assinatura-section select, select').filter({
    has: page.locator('option[value="Aurélio Almeida"], option[value="Paulo Medeiros"]')
  }).first()
  if (await selectTecnico.isVisible()) {
    await selectTecnico.selectOption({ label: tecnico }).catch(() =>
      selectTecnico.selectOption({ index: 1 })
    )
  }

  // 3. Nome assinante
  const inputNome = page.locator('.assinatura-section input[type="text"], input[placeholder*="signat"], input[placeholder*="nome"]').first()
  if (await inputNome.isVisible()) {
    await inputNome.fill(nomeAssinante)
  }

  // 4. Assinatura canvas
  await signCanvas(page)

  // 5. Email (opcional)
  if (email) {
    const inputEmail = page.locator('.email-section input[type="email"]')
    if (await inputEmail.isVisible()) await inputEmail.fill(email)
  }
}

// ── Navegar para secção ───────────────────────────────────────────────────────

export async function goTo(page, section) {
  const links = {
    dashboard:    '/',
    clientes:     '/clientes',
    categorias:   '/categorias',
    equipamentos: '/equipamentos',
    manutencoes:  '/manutencoes',
    agendamento:  '/agendamento',
    calendario:   '/calendario',
    logs:         '/logs',
    definicoes:   '/definicoes',
  }
  await page.goto(`/manut${links[section]}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(800)
}

// ── Fechar modal ──────────────────────────────────────────────────────────────

export async function closeModal(page) {
  // Tentar fechar via Escape (mais fiável que procurar botão específico)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  // Se ainda aberto, tentar clicar no overlay
  const overlay = page.locator('.modal-overlay').first()
  if (await overlay.isVisible().catch(() => false)) {
    await overlay.click({ position: { x: 10, y: 10 } }).catch(() => {})
    await page.waitForTimeout(300)
  }
}

// ── Verificar Toast ───────────────────────────────────────────────────────────

export async function expectToast(page, text, timeout = 6000) {
  await expect(
    page.locator(`.toast, [class*="toast"], [role="alert"]`).filter({ hasText: text })
  ).toBeVisible({ timeout })
}
