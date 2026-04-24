/**
 * logger.js — Sistema de log persistente AT_Manut
 * ═══════════════════════════════════════════════
 *
 * Baseado em melhores práticas de logging estruturado para SPAs (2026):
 *  - Structured logging: cada entrada é um objecto com campos consistentes
 *  - Session correlation: sessionId gerado por sessão de browser
 *  - User context: userId capturado da sessão de autenticação
 *  - Route context: URL/rota registada em cada entrada
 *  - App version: versão da app por entrada (facilita diagnóstico pós-deploy)
 *  - Deduplicação: erros iguais em ≤5s não são duplicados
 *  - Gestão por bytes: garante que o log não esgota o localStorage
 *  - Níveis: action | info | warn | error | fatal
 *  - Retenção: últimos 60 dias, máx. ~600 KB
 *
 * Quando registar cada nível:
 *   action — operação do utilizador concluída (CRUD, login, envio email)
 *   info   — eventos do sistema (arranque, actualização versão)
 *   warn   — avisos e casos marginais: dados inesperados, UI em fallback, relatórios inexistentes
 *   error  — operação falhou (rede, API) mas a app continua
 *   fatal  — crash React (ErrorBoundary), erro irrecuperável
 *
 * Casos marginais a registar com logger.warn (diagnóstico):
 *   - Ver manutenção sem relatório (Dashboard) — utilizador abriu ficha agendada
 *   - Modal relatório aberto sem dados (Manutencoes) — relatório não encontrado
 *   - Qualquer path em que se mostre fallback/placeholder por dados em falta
 *
 * Uso rápido:
 *   import { logger } from '../utils/logger'
 *
 *   logger.action('Clientes', 'addCliente', 'Cliente "XPTO Lda." adicionado', { nif: '...' })
 *   logger.warn ('Dashboard', 'viewManutencaoSemRelatorio', 'Manutenção sem relatório visualizada', { manutencaoId })
 *   logger.error ('emailService', 'send', 'Falha de rede', { status: 503 })
 *   logger.fatal ('App', 'crash', 'ErrorBoundary activado', { stack: '...' })
 */

import { STORAGE, SESSION } from '../config/storageKeys'
import { atmLogReceiverUrl } from '../config/apiBase'
import { EMAIL_CONFIG } from '../config/emailConfig'

// ── Configuração ──────────────────────────────────────────────────────────────

const STORAGE_KEY       = STORAGE.LOG
const MAX_DAYS          = 60
const MAX_BYTES         = 2_000_000   // 2 MB — localStorage tem ~5-10 MB por origem
const DEDUP_MS          = 5_000       // não repete a mesma mensagem em 5 segundos
const FLUSH_BATCH_SIZE  = 20          // envia para o servidor após N entradas acumuladas
const LOG_ENDPOINT      = '/api/log-receiver.php'
const LOG_AUTH_TOKEN    = EMAIL_CONFIG.AUTH_TOKEN
const FLUSH_PENDING_KEY = STORAGE.LOG_PENDING_FLUSH
const APP_VERSION  = (() => {
  try { return localStorage.getItem(STORAGE.APP_VERSION) || '?' } catch { return '?' }
})()

// ── Session ID (por sessão de browser; reset ao fechar o tab) ─────────────────

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION.SESSION_ID)
    if (!id) {
      id = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      sessionStorage.setItem(SESSION.SESSION_ID, id)
    }
    return id
  } catch { return 'unknown' }
}

// ── Contexto de utilizador (lê JWT sem criar dependência circular) ───────────
// O AuthContext usa atm_api_token (sessionStorage); extraímos username ou sub para identificar o user.

function getCurrentUser() {
  try {
    const token = sessionStorage.getItem(SESSION.API_TOKEN)
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.username || payload.sub || null
  } catch { return null }
}

// ── Helpers de storage ────────────────────────────────────────────────────────

function readLog() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeLog(entries) {
  const json = JSON.stringify(entries)
  try {
    localStorage.setItem(STORAGE_KEY, json)
  } catch {
    // Storage cheio: tenta guardar apenas a metade mais recente
    try {
      const half = entries.slice(-Math.floor(entries.length / 2))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(half))
    } catch { /* falha silenciosa */ }
  }
}

// ── Poda de entradas antigas e por tamanho ────────────────────────────────────

function prune(entries) {
  const cutoff = Date.now() - MAX_DAYS * 24 * 60 * 60 * 1000
  let fresh = entries.filter(e => e.ts >= cutoff)

  // Se ultrapassar o limite de bytes, remove as mais antigas até caber
  while (fresh.length > 0 && JSON.stringify(fresh).length > MAX_BYTES) {
    fresh = fresh.slice(Math.ceil(fresh.length * 0.1))  // remove 10% das mais antigas
  }

  return fresh
}

// ── Deduplicação ──────────────────────────────────────────────────────────────
// Evita que o mesmo erro seja registado dezenas de vezes em poucos segundos.

const _lastSeen = {}  // { key: timestamp }

function isDuplicate(level, component, action, message) {
  if (level === 'action' || level === 'info') return false  // acções nunca são dedup
  const key = `${level}|${component}|${action}|${message}`
  const last = _lastSeen[key]
  if (last && Date.now() - last < DEDUP_MS) return true
  _lastSeen[key] = Date.now()
  return false
}

function hashString(input = '') {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h).toString(36)
}

function pickStack(details) {
  if (!details || typeof details !== 'object') return ''
  const stack = details.stack || details.errorStack || details.errStack
  return typeof stack === 'string' ? stack : ''
}

function parseFailureLocation(stackText) {
  if (!stackText) return ''
  const lines = stackText.split('\n').map(s => s.trim()).filter(Boolean)
  const candidate = lines.find(line => line.includes('http') || line.includes('.js:') || line.includes('.jsx:') || line.includes('.ts:'))
  if (!candidate) return ''
  const cleaned = candidate.replace(/^at\s+/, '')
  return cleaned.slice(0, 220)
}

function inferFailureMode(level, action, message, details) {
  const msg = String(message || '').toLowerCase()
  const status = Number(details?.status || 0)
  if (status === 0) return 'network'
  if (status === 401) return 'auth_expired'
  if (status === 403) return 'forbidden'
  if (status === 404) return msg.includes('recurso desconhecido') ? 'api_unknown_resource' : 'not_found'
  if (status === 408) return 'timeout'
  if (status === 409) return 'conflict'
  if (status === 422) return 'validation'
  if (status >= 500) return 'server_error'
  if (msg.includes('failed to fetch') || msg.includes('falha de rede') || msg.includes('networkerror')) return 'network'
  if (msg.includes('recurso desconhecido')) return 'api_unknown_resource'
  if (String(action || '').toLowerCase().includes('login')) return 'auth'
  return level === 'warn' ? 'warning' : 'unknown'
}

function enrichDetails(level, component, action, message, details) {
  if (!details || typeof details !== 'object') return details
  const stackText = pickStack(details)
  const failureLocation = parseFailureLocation(stackText)
  const failureMode = inferFailureMode(level, action, message, details)
  const fingerprintBase = [
    level,
    component,
    action,
    failureMode,
    details?.resource || '',
    details?.status || '',
    String(message || '').slice(0, 120),
  ].join('|')
  return {
    ...details,
    failureMode,
    ...(failureLocation ? { failureLocation } : {}),
    failureFingerprint: hashString(fingerprintBase),
  }
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Regista uma entrada no log.
 *
 * Campos automáticos em cada entrada:
 *   ts        — timestamp Unix (ms)
 *   sessionId — ID único da sessão de browser
 *   userId    — ID do utilizador autenticado (ou null)
 *   route     — pathname actual (/manut/clientes, etc.)
 *   version   — versão da app
 *   level     — 'action' | 'info' | 'warn' | 'error' | 'fatal'
 *   component — ficheiro/componente que gerou a entrada (ex: 'Clientes')
 *   action    — nome da operação (ex: 'removeCliente')
 *   message   — descrição legível
 *   details   — objecto de dados extra (opcional; evitar dados sensíveis)
 *
 * @param {'action'|'info'|'warn'|'error'|'fatal'} level
 * @param {string} component
 * @param {string} action
 * @param {string} message
 * @param {object|null} [details]
 */
export function logEntry(level, component, action, message, details = null) {
  if (isDuplicate(level, component, action, message)) return

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isMobile = /mobile|android|iphone|ipad|webos|blackberry|iemobile/i.test(ua)

  const enriched = enrichDetails(level, component, action, message, details)

  const entry = {
    ts:        Date.now(),
    sessionId: getSessionId(),
    userId:    getCurrentUser(),
    route:     typeof window !== 'undefined' ? window.location.pathname : '?',
    version:   APP_VERSION,
    mobile:    isMobile,
    level,
    component,
    action,
    message,
    ...(enriched ? { details: enriched } : {}),
  }

  const current = prune(readLog())
  current.push(entry)
  writeLog(current)

  // Erros, fatais e acções são enviados ao servidor em batch
  if (level === 'error' || level === 'fatal' || level === 'warn' || level === 'action') {
    _queueForFlush(entry)
  }
}

/** Atalhos por nível */
export const logger = {
  /** Acção do utilizador concluída (ex: cliente adicionado, email enviado) */
  action: (component, action, message, details) =>
    logEntry('action', component, action, message, details),

  /** Evento informativo do sistema (ex: arranque, versão actualizada) */
  info: (component, action, message, details) =>
    logEntry('info', component, action, message, details),

  /** Aviso — algo inesperado mas não bloqueante (ex: data no passado) */
  warn: (component, action, message, details) =>
    logEntry('warn', component, action, message, details),

  /** Erro recuperável — operação falhou mas a app continua (ex: erro de rede) */
  error: (component, action, message, details) =>
    logEntry('error', component, action, message, details),

  /** Erro irrecuperável — ErrorBoundary ou crash total da app */
  fatal: (component, action, message, details) =>
    logEntry('fatal', component, action, message, details),
}

// ── Leitura e gestão (para o painel de Logs) ──────────────────────────────────

/** Devolve todas as entradas activas, da mais recente para a mais antiga. */
export function getLog() {
  return prune(readLog()).reverse()
}

/** Apaga todo o log. */
export function clearLog() {
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* */ }
}

/**
 * Gera um relatório de suporte pronto a copiar/colar no chat com o assistente.
 * Inclui os últimos eventos relevantes (erros, avisos, acções) da sessão actual
 * e das últimas 48h, formatados de forma clara e sem necessidade de conhecimento técnico.
 *
 * @returns {string} Texto formatado para copiar para o chat
 */
export function gerarRelatórioSuporte() {
  const entries   = prune(readLog())
  const cutoff48h = Date.now() - 48 * 60 * 60 * 1000

  // Última sessão activa
  const sessionIds = [...new Set(entries.map(e => e.sessionId))]
  const lastSession = sessionIds[sessionIds.length - 1] ?? null

  // Entradas relevantes: erros/avisos das últimas 48h + últimas 10 acções da sessão actual
  const relevantes = entries.filter(e =>
    (e.ts >= cutoff48h && (e.level === 'fatal' || e.level === 'error' || e.level === 'warn')) ||
    (e.sessionId === lastSession && e.level === 'action')
  ).slice(-40)  // max 40 linhas

  if (relevantes.length === 0) {
    return '✅ Não foram encontrados erros ou avisos nas últimas 48 horas.'
  }

  const linhas = [
    '=== RELATÓRIO DE SUPORTE — AT_Manut ===',
    `Gerado em: ${new Date().toLocaleString('pt-PT', { timeZone: 'Atlantic/Azores' })}`,
    `Versão: ${APP_VERSION}`,
    `Sessão actual: ${lastSession ?? '—'}`,
    '',
    '--- ERROS, AVISOS E CASOS MARGINAIS (últimas 48h) ---',
    '(Inclui: erros, avisos e casos em que a app mostrou fallback por dados em falta)',
    '',
  ]

  for (const e of relevantes) {
    const ts    = new Date(e.ts).toLocaleString('pt-PT', { timeZone: 'Atlantic/Azores' })
    const nivel = e.level.toUpperCase().padEnd(6)
    const loc   = `${e.component} › ${e.action}`
    const rota  = e.route ? ` [${e.route.replace('/manut', '') || '/'}]` : ''
    linhas.push(`[${nivel}] ${ts}${rota}`)
    linhas.push(`  ${loc}: ${e.message}`)
    if (e.details) {
      const det = JSON.stringify(e.details)
      linhas.push(`  Detalhes: ${det.length > 200 ? det.slice(0, 200) + '…' : det}`)
    }
    linhas.push('')
  }

  linhas.push('=== FIM DO RELATÓRIO ===')
  return linhas.join('\n')
}

/** Exporta o log como ficheiro TSV (texto) — fácil de abrir no Excel. */
export function exportLogAsText() {
  const entries = prune(readLog())
  const header = 'Timestamp\tSessão\tUtilizador\tRota\tVersão\tNível\tComponente\tAcção\tMensagem\tDetalhes'
  const rows = entries.map(e => [
    new Date(e.ts).toLocaleString('pt-PT', { timeZone: 'Atlantic/Azores' }),
    e.sessionId  ?? '',
    e.userId     ?? '',
    e.route      ?? '',
    e.version    ?? '',
    e.level,
    e.component,
    e.action,
    e.message,
    e.details ? JSON.stringify(e.details) : '',
  ].join('\t'))

  _download([header, ...rows].join('\n'), `atm_log_${_today()}.txt`, 'text/plain;charset=utf-8')
}

/** Exporta o log como ficheiro JSON — para análise programática. */
export function exportLogAsJson() {
  const entries = prune(readLog())
  _download(JSON.stringify(entries, null, 2), `atm_log_${_today()}.json`, 'application/json')
}

/** Estatísticas rápidas para o painel. */
export function getLogStats() {
  const entries = prune(readLog())
  const bytes   = (() => { try { return (localStorage.getItem(STORAGE_KEY) || '').length } catch { return 0 } })()
  return {
    total:   entries.length,
    fatals:  entries.filter(e => e.level === 'fatal').length,
    errors:  entries.filter(e => e.level === 'error').length,
    warns:   entries.filter(e => e.level === 'warn').length,
    actions: entries.filter(e => e.level === 'action').length,
    bytes,
    oldest:  entries.length ? entries[0].ts : null,
    sessions: new Set(entries.map(e => e.sessionId)).size,
  }
}

// ── Flush para servidor (cPanel) ──────────────────────────────────────────────
//
// Estratégia de batching assíncrono:
//  - Acumula entradas pendentes em localStorage (FLUSH_PENDING_KEY)
//  - Envia ao servidor quando atinge FLUSH_BATCH_SIZE ou quando chamado explicitamente
//  - Nunca bloqueia a UI — erros de rede são silenciosos (os dados ficam no local)
//  - O servidor guarda num ficheiro rotativo de 20 MB em public_html/api/logs/

function getPending() {
  try { return JSON.parse(localStorage.getItem(FLUSH_PENDING_KEY) || '[]') } catch { return [] }
}
function setPending(entries) {
  try { localStorage.setItem(FLUSH_PENDING_KEY, JSON.stringify(entries)) } catch { /* */ }
}
function clearPending() {
  try { localStorage.removeItem(FLUSH_PENDING_KEY) } catch { /* */ }
}

async function _sendToServer(entries) {
  if (!entries.length) return
  if (!LOG_AUTH_TOKEN) return
  try {
    // SEM headers customizados → sem preflight OPTIONS → sem bloqueio ModSecurity
    const toB64 = (s) => btoa(unescape(encodeURIComponent(s)))
    const body = new URLSearchParams({
      auth_token_b64: toB64(LOG_AUTH_TOKEN),
      entries:        JSON.stringify(entries),
    })
    await fetch(atmLogReceiverUrl(), { method: 'POST', body, keepalive: true })
    clearPending()
  } catch (err) {
    // Rede indisponível — os dados ficam no pending para próxima oportunidade
    logEntry('warn', 'logger', 'flush', 'Falha ao enviar logs ao servidor', { msg: err?.message, n: entries.length })
  }
}

function _queueForFlush(entry) {
  const pending = [...getPending(), entry]
  setPending(pending)
  if (pending.length >= FLUSH_BATCH_SIZE) {
    _sendToServer(pending).catch(() => {/* silencioso */})
  }
}

/**
 * Envia imediatamente todas as entradas pendentes para o servidor.
 * Chamar no logout e em momentos de baixa actividade.
 */
export async function flushLogsToServer() {
  const pending = getPending()
  if (pending.length > 0) await _sendToServer(pending)
}

// ── Flush automático: tab oculta (mobile/desktop) e periodicamente ─────────────
// Garante que logs de todos os utilizadores e dispositivos chegam ao servidor
// mesmo quando o user fecha o browser sem fazer logout.
if (typeof document !== 'undefined' && typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const p = getPending()
      if (p.length > 0) _sendToServer(p).catch(() => {})
    }
  })
  window.setInterval(() => {
    const p = getPending()
    if (p.length > 0) _sendToServer(p).catch(() => {})
  }, 5 * 60 * 1000)  // a cada 5 minutos
}

// ── Helpers internos ──────────────────────────────────────────────────────────

function _today() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Atlantic/Azores', year: 'numeric', month: '2-digit', day: '2-digit' })
}

function _download(content, filename, type) {
  const blob = new Blob([content], { type })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
