/**
 * execDraft.js — rascunho automático do assistente de execução de manutenção.
 *
 * Guarda no dispositivo (IndexedDB) o que o técnico já preencheu — checklist,
 * notas, fotos, passo — para repor se a página for fechada, recarregada ou
 * descartada pelo telemóvel a meio do trabalho. Nunca vai para o servidor.
 *
 * Chave: id da manutenção. Um rascunho só é reposto se a assinatura `sig`
 * (estado do relatório guardado) ainda for a mesma: se o relatório foi
 * entretanto gravado noutro dispositivo, o rascunho é descartado.
 *
 * Fallback sem IndexedDB: localStorage, sem fotos (para não rebentar a quota).
 */
import { createKvStore } from './idbKv.js'

const DB_NAME = 'atm_exec_drafts_v1'
const LS_PREFIX = 'atm_exec_draft_'
/** Rascunhos com mais de 14 dias são lixo: a visita já aconteceu ou foi reagendada. */
export const DRAFT_TTL_MS = 14 * 24 * 3600 * 1000

const kv = createKvStore(DB_NAME, 'drafts')

function lsKey(manutencaoId) {
  return LS_PREFIX + String(manutencaoId)
}

function semFotos(draft) {
  return {
    ...draft,
    fotos: [],
    form: draft?.form ? { ...draft.form, fotoChapa: '' } : draft?.form,
    fotosOmitidas: true,
  }
}

/** Devolve true se o rascunho é válido para a assinatura de bootstrap actual. */
export function draftAplicavel(draft, sigActual, agora = Date.now()) {
  if (!draft || typeof draft !== 'object') return false
  if (!draft.ts || agora - draft.ts > DRAFT_TTL_MS) return false
  if (draft.sig !== sigActual) return false
  return !!draft.form
}

export async function saveExecDraft(manutencaoId, draft) {
  if (manutencaoId == null || manutencaoId === '') return false
  const payload = { ...draft, ts: draft?.ts ?? Date.now() }
  try {
    await kv.set(String(manutencaoId), payload)
    try { localStorage.removeItem(lsKey(manutencaoId)) } catch { /* ignore */ }
    return true
  } catch {
    try {
      localStorage.setItem(lsKey(manutencaoId), JSON.stringify(semFotos(payload)))
      return true
    } catch {
      return false
    }
  }
}

export async function loadExecDraft(manutencaoId) {
  if (manutencaoId == null || manutencaoId === '') return null
  try {
    const fromIdb = await kv.get(String(manutencaoId))
    if (fromIdb) return fromIdb
  } catch { /* fallback */ }
  try {
    const raw = localStorage.getItem(lsKey(manutencaoId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function clearExecDraft(manutencaoId) {
  if (manutencaoId == null || manutencaoId === '') return
  try { await kv.del(String(manutencaoId)) } catch { /* ignore */ }
  try { localStorage.removeItem(lsKey(manutencaoId)) } catch { /* ignore */ }
}

/** Limpa rascunhos expirados (chamado uma vez por arranque). */
export async function purgeExpiredExecDrafts(agora = Date.now()) {
  let removidos = 0
  try {
    const keys = await kv.keys()
    for (const k of keys) {
      const d = await kv.get(k)
      if (!d?.ts || agora - d.ts > DRAFT_TTL_MS) {
        await kv.del(k)
        removidos++
      }
    }
  } catch { /* ignore */ }
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith(LS_PREFIX)) continue
      try {
        const d = JSON.parse(localStorage.getItem(k) || 'null')
        if (!d?.ts || agora - d.ts > DRAFT_TTL_MS) {
          localStorage.removeItem(k)
          removidos++
        }
      } catch {
        localStorage.removeItem(k)
      }
    }
  } catch { /* ignore */ }
  return removidos
}
