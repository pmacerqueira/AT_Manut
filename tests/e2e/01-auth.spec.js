/**
 * 01-auth.spec.js — Autenticação: login, logout, validação, sessão
 */
import { test, expect } from '@playwright/test'
import { setupApiMock, doLoginAdmin, doLoginTecnico } from './helpers.js'

test.describe('Autenticação', () => {

  test.beforeEach(async ({ page }) => {
    await setupApiMock(page)
  })

  // ── Login ───────────────────────────────────────────────────────────────────

  test('Admin login com credenciais válidas', async ({ page }) => {
    await page.goto('/manut/login')
    await page.locator('input').first().fill('Admin')
    await page.locator('input[type="password"]').fill('admin123')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 12000 })

    // Dashboard deve estar visível
    await expect(page.locator('h1, .dashboard-title, .page-title').first()).toBeVisible()

    // JWT deve estar em sessionStorage com a chave correcta
    const token = await page.evaluate(() => sessionStorage.getItem('atm_api_token'))
    expect(token).toBeTruthy()
  })

  test('ATecnica login com credenciais válidas', async ({ page }) => {
    await page.goto('/manut/login')
    await page.locator('input').first().fill('ATecnica')
    await page.locator('input[type="password"]').fill('tecnico123')
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 12000 })

    const token = await page.evaluate(() => sessionStorage.getItem('atm_api_token'))
    expect(token).toBeTruthy()
  })

  test('Login com password errada exibe mensagem de erro', async ({ page }) => {
    await page.goto('/manut/login')
    await page.locator('input').first().fill('Admin')
    await page.locator('input[type="password"]').fill('wrong')
    await page.locator('button[type="submit"]').click()

    // Deve permanecer na página de login
    await expect(page).toHaveURL(/login/, { timeout: 5000 })

    // Mensagem de erro inline (não Toast)
    await expect(
      page.locator('[class*="error"], [class*="erro"], .login-error, p.error, .form-erro')
        .filter({ hasText: /incorretos|password|credenciais/i })
        .first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('Login com campos vazios — botão submit está desactivado', async ({ page }) => {
    await page.goto('/manut/login')
    // O botão está desactivado quando os campos estão vazios (disabled={!username || !password})
    await expect(page.locator('button[type="submit"]')).toBeDisabled({ timeout: 3000 })
  })

  // ── Logout ──────────────────────────────────────────────────────────────────

  test('Logout redireciona para login e limpa sessão', async ({ page }) => {
    await doLoginAdmin(page)

    // Botão de logout no sidebar desktop: .btn-logout
    const logoutBtn = page.locator('.btn-logout').first()
    await expect(logoutBtn).toBeVisible({ timeout: 5000 })
    await logoutBtn.click()

    await expect(page).toHaveURL(/login/, { timeout: 8000 })

    // Token deve ter sido removido de sessionStorage
    const token = await page.evaluate(() => sessionStorage.getItem('atm_api_token'))
    expect(token).toBeNull()
  })

  // ── Protecção de rota ───────────────────────────────────────────────────────

  test('Acesso directo ao Dashboard sem autenticação redireciona para login', async ({ page }) => {
    // Navegar para uma página qualquer primeiro (para ter contexto de sessionStorage)
    await page.goto('/manut/login')
    await page.waitForLoadState('domcontentloaded')
    // Agora limpar sessionStorage com segurança
    await page.evaluate(() => sessionStorage.clear())
    // Tentar aceder ao Dashboard directamente
    await page.goto('/manut/')
    await expect(page).toHaveURL(/login/, { timeout: 8000 })
  })

  test('Após login, aceder a /login redireciona para Dashboard', async ({ page }) => {
    await doLoginAdmin(page)
    await page.goto('/manut/login')
    // Deve redirecionar para Dashboard (já autenticado)
    await expect(page).toHaveURL(/\/manut\/?$/, { timeout: 8000 })
  })

})
