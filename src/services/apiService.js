/**
 * apiService.js — Cliente HTTP para a API REST AT_Manut
 *
 * Todas as chamadas são POST com JSON body para:
 *   https://www.navel.pt/api/data.php
 *
 * Formato do pedido:
 *   { "_t": token, "r": recurso, "action": acção, "id"?: id, "data"?: dados }
 *
 * Formato da resposta:
 *   { "ok": true,  "data": ... }   — sucesso
 *   { "ok": false, "message": "" } — erro
 */

import { logger } from '../utils/logger'

const API_URL   = 'https://www.navel.pt/api/data.php'
const TOKEN_KEY = 'atm_api_token'
const TIMEOUT_MS = 15000  // 15s — protege contra rede lenta no cPanel

// ── Token (sessionStorage: sessão termina ao fechar janela/separador) ──────────

export function getToken()         { return sessionStorage.getItem(TOKEN_KEY) ?? '' }
export function setToken(t)        { sessionStorage.setItem(TOKEN_KEY, t) }
export function clearToken()       { sessionStorage.removeItem(TOKEN_KEY) }

/** Devolve o payload do JWT sem verificar assinatura (para leitura rápida). */
export function decodeTokenPayload() {
  const t = getToken()
  if (!t) return null
  try {
    const [, p] = t.split('.')
    return JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

/** Verdade se o token existe e não expirou (verificação local, sem rede). */
export function isTokenValid() {
  const p = decodeTokenPayload()
  return p ? p.exp > Math.floor(Date.now() / 1000) : false
}

// ── Chamada base ──────────────────────────────────────────────────────────────

async function call(resource, action, { id = null, data = null, ...extra } = {}) {
  const body = { _t: getToken(), r: resource, action, ...extra }
  if (id)   body.id   = id
  if (data) body.data = data

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let resp
  try {
    resp = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Timeout: API não respondeu em ${TIMEOUT_MS / 1000}s (${resource}/${action})`)
      timeoutErr.status = 408
      logger.error('apiService', 'call', timeoutErr.message, { resource, action })
      throw timeoutErr
    }
    logger.error('apiService', 'call', `Falha de rede ao contactar API (${resource}/${action})`, { msg: err?.message })
    throw err
  } finally {
    clearTimeout(timer)
  }

  const json = await resp.json().catch(() => ({ ok: false, message: `HTTP ${resp.status}` }))
  if (!json.ok) {
    const msg = json.message ?? 'Erro desconhecido'
    if (resp.status >= 500) {
      logger.error('apiService', 'call', `API 5xx: ${msg}`, { resource, action, status: resp.status })
    } else if (resp.status >= 400 && resp.status !== 401) {
      logger.warn('apiService', 'call', `API ${resp.status}: ${msg}`, { resource, action, status: resp.status })
    }
    const err = new Error(msg)
    err.status = resp.status
    throw err
  }
  return json.data ?? null
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiLogin(username, password) {
  const body = { _t: '', r: 'auth', action: 'login', username, password }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let resp
  try {
    resp = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Timeout: servidor não respondeu ao login em ${TIMEOUT_MS / 1000}s`)
      timeoutErr.status = 408
      logger.error('apiService', 'login', timeoutErr.message, {})
      throw timeoutErr
    }
    logger.error('apiService', 'login', 'Falha de rede ao contactar API de login', { msg: err?.message })
    throw err
  } finally {
    clearTimeout(timer)
  }
  const json = await resp.json().catch(() => ({ ok: false, message: `HTTP ${resp.status}` }))
  if (!json.ok) {
    if (resp.status >= 500) {
      logger.error('apiService', 'login', `API 5xx no login: ${json.message ?? resp.status}`, { status: resp.status })
    }
    const err = new Error(json.message ?? 'Login falhado')
    err.status = resp.status
    throw err
  }
  setToken(json.data.token)
  return json.data  // { token, expiresAt, user }
}

/**
 * Chamada directa à API — usada pelo processQueue do syncQueue.
 * Exposta para não duplicar a lógica de fetch/auth/error handling.
 */
export async function apiCall(resource, action, opts = {}) {
  return call(resource, action, opts)
}

// ── CRUD genérico ─────────────────────────────────────────────────────────────

const crud = (resource) => ({
  list:        ()          => call(resource, 'list'),
  get:         (id)        => call(resource, 'get', { id }),
  create:      (data)      => call(resource, 'create', { data }),
  update:      (id, data)  => call(resource, 'update', { id, data }),
  remove:      (id)        => call(resource, 'delete', { id }),
  bulkCreate:  (data)      => call(resource, 'bulk_create', { data }),
  bulkRestore: (data)      => call(resource, 'bulk_restore', { data }),
})

// ── Recursos ──────────────────────────────────────────────────────────────────

export const apiClientes       = crud('clientes')
export const apiCategorias     = crud('categorias')
export const apiSubcategorias  = crud('subcategorias')
export const apiChecklistItems = crud('checklistItems')
export const apiMaquinas       = crud('maquinas')
export const apiManutencoes         = crud('manutencoes')
export const apiRelatorios          = crud('relatorios')
export const apiReparacoes          = crud('reparacoes')
export const apiRelatoriosReparacao = crud('relatoriosReparacao')

/** Logs do servidor (apenas Admin) — agrega logs de todos os utilizadores e dispositivos */
export async function apiLogsList(days = 30) {
  return call('logs', 'list', { days })
}

// ── Utilitário: fetch paralelo de todos os recursos ───────────────────────────

export async function fetchTodosOsDados() {
  const [
    clientes,
    categorias,
    subcategorias,
    checklistItems,
    maquinas,
    manutencoes,
    relatorios,
    reparacoes,
    relatoriosReparacao,
  ] = await Promise.all([
    apiClientes.list(),
    apiCategorias.list(),
    apiSubcategorias.list(),
    apiChecklistItems.list(),
    apiMaquinas.list(),
    apiManutencoes.list(),
    apiRelatorios.list(),
    apiReparacoes.list(),
    apiRelatoriosReparacao.list(),
  ])
  return { clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios, reparacoes, relatoriosReparacao }
}
