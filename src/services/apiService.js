/**
 * apiService.js — Cliente HTTP para a API REST AT_Manut
 *
 * Todas as chamadas são POST com JSON body para data.php (ver `config/apiBase.js`).
 *
 * Formato do pedido:
 *   { "_t": token, "r": recurso, "action": acção, "id"?: id, "data"?: dados }
 *
 * Formato da resposta:
 *   { "ok": true,  "data": ... }   — sucesso
 *   { "ok": false, "message": "" } — erro
 */

import { logger } from '../utils/logger'
import { SESSION } from '../config/storageKeys'
import { API_TIMEOUT_MS, API_TIMEOUT_BULK_MS } from '../config/limits'
import { atmDataPhpUrl, atmNavelDocDownloadUrl, atmNavelDocUploadUrl } from '../config/apiBase'

const API_URL = atmDataPhpUrl()
const TOKEN_KEY = SESSION.API_TOKEN

function apiFailureMode(status, msg = '') {
  const text = String(msg || '').toLowerCase()
  if (status === 0) return 'network'
  if (status === 401) return 'auth_expired'
  if (status === 403) return 'forbidden'
  if (status === 404) return text.includes('recurso desconhecido') ? 'api_unknown_resource' : 'not_found'
  if (status === 408) return 'timeout'
  if (status === 409) return 'conflict'
  if (status === 422) return 'validation'
  if (status >= 500) return 'server_error'
  if (text.includes('failed to fetch') || text.includes('falha de rede')) return 'network'
  return 'unknown'
}

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
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

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
      const timeoutErr = new Error(`Timeout: API não respondeu em ${API_TIMEOUT_MS / 1000}s (${resource}/${action})`)
      timeoutErr.status = 408
      logger.error('apiService', 'call', timeoutErr.message, {
        resource, action, status: 408, failureMode: 'timeout', endpoint: API_URL, method: 'POST', stack: timeoutErr.stack,
      })
      throw timeoutErr
    }
    logger.error('apiService', 'call', `Falha de rede ao contactar API (${resource}/${action})`, {
      resource, action, status: 0, failureMode: 'network', endpoint: API_URL, method: 'POST', msg: err?.message, stack: err?.stack,
    })
    throw err
  } finally {
    clearTimeout(timer)
  }

  const json = await resp.json().catch(() => ({ ok: false, message: `HTTP ${resp.status}` }))
  if (!json.ok) {
    const msg = json.message ?? 'Erro desconhecido'
    const status = resp.status || 0
    if (json.code === 'TECNICO_HORARIO_RESTRITO') {
      try {
        window.dispatchEvent(new CustomEvent('atm:tecnico-horario-restrito', { detail: { message: msg } }))
      } catch { /* */ }
    }
    const failureMode = apiFailureMode(status, msg)
    if (resp.status >= 500) {
      logger.error('apiService', 'call', `API 5xx: ${msg}`, {
        resource, action, status, failureMode, endpoint: API_URL, method: 'POST',
      })
    } else if (resp.status >= 400 && resp.status !== 401) {
      logger.warn('apiService', 'call', `API ${resp.status}: ${msg}`, {
        resource, action, status, failureMode, endpoint: API_URL, method: 'POST',
      })
    }
    const err = new Error(msg)
    err.status = resp.status
    if (json.code) err.code = json.code
    throw err
  }
  return json.data ?? null
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function apiLogin(username, password) {
  const form = new URLSearchParams()
  form.set('_t', '')
  form.set('r', 'auth')
  form.set('action', 'login')
  form.set('username', username)
  form.set('password', password)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

  let resp
  try {
    resp = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body:    form.toString(),
      signal:  controller.signal,
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error(`Timeout: servidor não respondeu ao login em ${API_TIMEOUT_MS / 1000}s`)
      timeoutErr.status = 408
      logger.error('apiService', 'login', timeoutErr.message, {
        status: 408, failureMode: 'timeout', endpoint: API_URL, method: 'POST', stack: timeoutErr.stack,
      })
      throw timeoutErr
    }
    logger.error('apiService', 'login', 'Falha de rede ao contactar API de login', {
      status: 0, failureMode: 'network', endpoint: API_URL, method: 'POST', msg: err?.message, stack: err?.stack,
    })
    throw err
  } finally {
    clearTimeout(timer)
  }
  const json = await resp.json().catch(() => ({ ok: false, message: `HTTP ${resp.status}` }))
  if (!json.ok) {
    if (resp.status >= 500) {
      logger.error('apiService', 'login', `API 5xx no login: ${json.message ?? resp.status}`, {
        status: resp.status,
        failureMode: apiFailureMode(resp.status, json.message),
        endpoint: API_URL,
        method: 'POST',
      })
    }
    const err = new Error(json.message ?? 'Login falhado')
    err.status = resp.status
    if (json.code) err.code = json.code
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
  list:        (opts = {}) => call(resource, 'list', opts),
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
export const apiMarcas         = crud('marcas')
export const apiManutencoes         = crud('manutencoes')
export const apiRelatorios          = crud('relatorios')
export const apiReparacoes          = crud('reparacoes')
export const apiRelatoriosReparacao = crud('relatoriosReparacao')
export const apiTecnicos           = crud('tecnicos')

const _pecasPlanoCrud = crud('pecasPlano')
/** Plano de consumíveis por máquina (MySQL). `replaceMaquina` só Admin no servidor. */
export const apiPecasPlano = {
  list:         _pecasPlanoCrud.list,
  get:          _pecasPlanoCrud.get,
  create:       _pecasPlanoCrud.create,
  update:       _pecasPlanoCrud.update,
  remove:       _pecasPlanoCrud.remove,
  bulkCreate:   _pecasPlanoCrud.bulkCreate,
  bulkRestore:  _pecasPlanoCrud.bulkRestore,
  replaceMaquina: (maquinaId, items) =>
    call('pecasPlano', 'replace_maquina', {
      data: { maquinaId, items },
      timeoutMs: API_TIMEOUT_BULK_MS,
    }),
}

export async function apiUploadMarcaLogo({ dataUrl, brandName }) {
  return call('uploads', 'brand_logo', {
    data: { dataUrl, brandName },
  })
}

/** PDF técnico do equipamento (Admin) — gravado em /uploads/machine-docs/ */
export async function apiUploadMachinePdf({ dataUrl, maquinaId, replacePath = null }) {
  const data = { dataUrl, maquinaId }
  if (replacePath) data.replacePath = replacePath
  return call('uploads', 'machine_pdf', { data })
}

/** Foto técnica do equipamento (Admin/Técnico) — gravada em /uploads/machine-photos/ */
export async function apiUploadMachinePhoto({ dataUrl, maquinaId, equipamentoNome, numeroSerie, capturedAt }) {
  return call('uploads', 'machine_photo', {
    data: { dataUrl, maquinaId, equipamentoNome, numeroSerie, capturedAt },
  })
}

/** Logs do servidor (apenas Admin) — agrega logs de todos os utilizadores e dispositivos */
export async function apiLogsList(days = 30) {
  return call('logs', 'list', { days })
}

// ── Biblioteca NAVEL (documentos-api.php via proxy em data.php + scripts dedicados) ──

export async function apiDocumentosBibliotecaSearch(payload) {
  return call('documentosBiblioteca', 'search', { data: payload && typeof payload === 'object' ? payload : {} })
}

export async function apiDocumentosBibliotecaMachineLinksGet(path) {
  return call('documentosBiblioteca', 'machine_links_get', { data: { path } })
}

export async function apiDocumentosBibliotecaMachineLinksSet(payload) {
  return call('documentosBiblioteca', 'machine_links_set', { data: payload && typeof payload === 'object' ? payload : {} })
}

export async function apiDocumentosBibliotecaUploadFolderForMaquina(maquinaId) {
  return call('documentosBiblioteca', 'upload_folder_for_maquina', {
    data: { maquinaId: String(maquinaId) },
  })
}

/**
 * Upload de ficheiro para a pasta AT já resolvida no servidor.
 * @param {object} opts
 * @param {string} opts.path — ex.: Assistencia Tecnica/Cat/Sub
 * @param {File} opts.file
 * @param {string} [opts.documentType] — MANUAL_UTILIZADOR | MANUAL_TECNICO | PLANO_MANUTENCAO | OUTROS
 * @param {string} [opts.taxonomyNodeId]
 * @param {string} [opts.versionLabel]
 * @param {string} [opts.notes]
 * @param {string} [opts.maquinaId] — obrigatório: o servidor confirma que path = pasta AT deste equipamento
 * @param {string[]} [opts.linkMachineIds] — ids de equipamentos AT a associar
 */
export async function apiDocumentosBibliotecaUploadMultipart(opts) {
  const fd = new FormData()
  fd.append('_t', getToken())
  fd.append('path', opts.path || '')
  fd.append('maquinaId', String(opts.maquinaId || ''))
  fd.append('file', opts.file)
  if (opts.documentType) fd.append('documentType', opts.documentType)
  if (opts.taxonomyNodeId) fd.append('taxonomyNodeId', String(opts.taxonomyNodeId))
  if (opts.versionLabel) fd.append('versionLabel', opts.versionLabel)
  if (opts.notes) fd.append('notes', opts.notes)
  if (opts.linkMachineIds && opts.linkMachineIds.length) {
    fd.append('linkMachineIds', JSON.stringify(opts.linkMachineIds.map(String)))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS * 5)

  let resp
  try {
    resp = await fetch(atmNavelDocUploadUrl(), {
      method: 'POST',
      body: fd,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }

  const json = await resp.json().catch(() => ({}))
  if (!resp.ok) {
    const err = new Error(json.message || json.error || `HTTP ${resp.status}`)
    err.status = resp.status
    throw err
  }
  if (json.ok === false) {
    const err = new Error(json.message || json.error || 'Upload biblioteca falhou')
    err.status = resp.status
    throw err
  }
  return json
}

/**
 * Download via proxy (JWT no JSON). Devolve Blob.
 */
export async function apiDocumentosBibliotecaDownloadBlob(path, inline = true) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS * 3)
  let resp
  try {
    resp = await fetch(atmNavelDocDownloadUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        _t: getToken(),
        path,
        inline,
      }),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    const err = new Error(errText || `Download falhou (${resp.status})`)
    err.status = resp.status
    throw err
  }
  return resp.blob()
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
  // Recursos opcionais durante migração: se a tabela ainda não existir no backend,
  // não bloqueia a app — usa lista vazia e mantém funcionamento actual.
  let marcas = []
  try {
    marcas = await apiMarcas.list()
  } catch (err) {
    logger.warn('apiService', 'fetchTodosOsDados', 'Falha ao listar marcas (continuar com fallback)', {
      resource: 'marcas', action: 'list', status: err?.status || 0,
      failureMode: apiFailureMode(err?.status || 0, err?.message), msg: err?.message, endpoint: API_URL,
    })
    marcas = []
  }
  let tecnicos = []
  try {
    tecnicos = await apiTecnicos.list()
  } catch (err) {
    logger.warn('apiService', 'fetchTodosOsDados', 'Falha ao listar tecnicos (continuar com fallback)', {
      resource: 'tecnicos', action: 'list', status: err?.status || 0,
      failureMode: apiFailureMode(err?.status || 0, err?.message), msg: err?.message, endpoint: API_URL,
    })
    tecnicos = []
  }
  let pecasPlano = []
  try {
    pecasPlano = await apiPecasPlano.list()
  } catch (err) {
    logger.warn('apiService', 'fetchTodosOsDados', 'Falha ao listar pecasPlano (continuar com fallback)', {
      resource: 'pecasPlano', action: 'list', status: err?.status || 0,
      failureMode: apiFailureMode(err?.status || 0, err?.message), msg: err?.message, endpoint: API_URL,
    })
    pecasPlano = []
  }
  return { clientes, categorias, subcategorias, checklistItems, maquinas, marcas, tecnicos, pecasPlano, manutencoes, relatorios, reparacoes, relatoriosReparacao }
}
