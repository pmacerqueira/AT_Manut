/**
 * Helpers puros do assistente de execução de manutenção.
 * Extraídos de ExecutarManutencaoModal.jsx (v1.16.85) — sem estado nem JSX.
 */

export const STEP_LABELS_BASE = ['Confirmação', 'Checklist', 'Observações', 'Fotografias', 'Técnico', 'Cliente', 'Assinatura', 'Finalizar']
export const STEP_LABELS_KAESER = ['Confirmação', 'Horas e fase KAESER', 'Consumíveis', 'Checklist', 'Observações', 'Fotografias', 'Técnico', 'Cliente', 'Assinatura', 'Finalizar']

export function sanitizarPecasRelatorio(pecasUsadas) {
  return pecasUsadas.map(p => {
    const q = Math.max(0, Number(p.quantidadeUsada ?? p.quantidade ?? 0))
    return { ...p, quantidade: q, quantidadeUsada: q, usado: q > 0 }
  })
}

export const QUICK_NOTES_DEFAULT = [
  'Equipamento em bom estado geral',
  'Desgaste normal, dentro do esperado',
  'Necessita acompanhamento na próxima visita',
  'Requer melhor limpeza e conservação',
  'Necessita de melhor sinalética de segurança',
  'Sem observações adicionais',
]

/** Já não se oferece no assistente. Mantém-se só para partir notas antigas concatenadas. */
const NOTAS_RAPIDAS_RETIRADAS = [
  'Alinhamento verificado e corrigido',
  'Filtros substituídos conforme plano',
  'Peça substituída preventivamente',
  'Cliente informado de anomalia',
  'Ruído anormal detetado — monitorizar',
  'Lubrificação efetuada em todos os pontos',
]

export function getQuickNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem('atm_quick_notes') || 'null')
    if (Array.isArray(stored) && stored.length > 0) {
      return stored
        .map(n => {
          if (n === 'Ruído anormal detetado — monitorizar') return 'Requer melhor limpeza e conservação'
          if (n === 'Lubrificação efetuada em todos os pontos') return 'Necessita de melhor sinalética de segurança'
          return n
        })
        .filter(n => !NOTAS_RAPIDAS_RETIRADAS.includes(n))
    }
  } catch { /* fallback */ }
  return QUICK_NOTES_DEFAULT
}

/** Respostas da checklist: API pode devolver object ou JSON em string (cache/offline). */
export function normalizarChecklistRespostasMap(raw) {
  if (raw == null || raw === '') return {}
  let o = raw
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return {}
  return o
}

export const OBSERVACOES_TEXTO_LIVRE_MIN = 24

/** Observações aceites por nota rápida ou por texto livre minimamente descritivo. */
export function notasCumpremMinimoObservacoes(notas, quickNotesList) {
  const t = (notas || '').trim()
  if (!t) return false
  const list = Array.isArray(quickNotesList) && quickNotesList.length > 0 ? quickNotesList : QUICK_NOTES_DEFAULT
  if (list.some((q) => typeof q === 'string' && q.trim().length > 0 && t.includes(q))) return true
  return t.length >= OBSERVACOES_TEXTO_LIVRE_MIN && /\s/.test(t)
}

/** Mensagem vazia se as observações passam. Distingue texto curto de texto sem espaço. */
export function mensagemObservacoesInsuficientes(notas, quickNotesList) {
  const t = (notas || '').trim()
  if (!t) return 'As observações são obrigatórias. Utilize uma nota rápida ou descreva o trabalho.'
  if (notasCumpremMinimoObservacoes(t, quickNotesList)) return ''
  if (t.length >= OBSERVACOES_TEXTO_LIVRE_MIN && !/\s/.test(t)) {
    return 'Escreva as observações com um espaço entre palavras, ou toque numa nota rápida.'
  }
  return `Use uma nota rápida ou escreva pelo menos ${OBSERVACOES_TEXTO_LIVRE_MIN} caracteres descritivos.`
}

/**
 * Divide notas do relatório em linhas (uma nota rápida ou parágrafo por linha).
 * Com `\n` explícito faz split; legado sem separador tenta partir notas rápidas conhecidas.
 * @param {string} notas
 * @param {string[]|null|undefined} [quickNotesList]
 * @returns {string[]}
 */
export function linhasNotasRelatorio(notas, quickNotesList) {
  const raw = String(notas ?? '').trim()
  if (!raw) return []

  if (/\r?\n/.test(raw)) {
    return raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  }

  const list = [...(Array.isArray(quickNotesList) && quickNotesList.length > 0
    ? quickNotesList
    : QUICK_NOTES_DEFAULT
  ), ...NOTAS_RAPIDAS_RETIRADAS].filter(q => typeof q === 'string' && q.trim())
  if (list.length === 0) return [raw]

  const byLen = [...list].sort((a, b) => b.length - a.length)
  const parts = []
  let remaining = raw

  while (remaining.length > 0) {
    const prefixMatch = byLen.find(q => remaining.startsWith(q))
    if (prefixMatch) {
      parts.push(prefixMatch)
      remaining = remaining.slice(prefixMatch.length)
      continue
    }

    let bestIdx = -1
    let bestNote = null
    for (const q of byLen) {
      const idx = remaining.indexOf(q)
      if (idx === -1) continue
      if (bestIdx === -1 || idx < bestIdx || (idx === bestIdx && q.length > bestNote.length)) {
        bestIdx = idx
        bestNote = q
      }
    }

    if (bestNote !== null && bestIdx >= 0) {
      if (bestIdx > 0) {
        const free = remaining.slice(0, bestIdx).trim()
        if (free) parts.push(free)
      }
      parts.push(bestNote)
      remaining = remaining.slice(bestIdx + bestNote.length)
      continue
    }

    const tail = remaining.trim()
    if (tail) parts.push(tail)
    break
  }

  return parts.filter(Boolean)
}

/** Texto normalizado com uma nota por linha (PDF/email). */
export function notasRelatorioParaTexto(notas, quickNotesList) {
  return linhasNotasRelatorio(notas, quickNotesList).join('\n')
}

/** Snapshot estável para comparar se o utilizador alterou o assistente (cancelar com confirmação). */
export function snapshotExecCancelState({
  form,
  fotos,
  emailDestinatario,
  assinaturaFeita,
  step,
  confirmaEquipamentoSerie,
  adminEdit,
  hasPreviewPdf,
  kaeserPecasDirty,
}) {
  const cr = form?.checklistRespostas || {}
  const checklist = Object.keys(cr).sort().reduce((acc, k) => {
    acc[k] = cr[k]
    return acc
  }, {})
  const pecasNorm = (form?.pecasUsadas || []).map(p => ({
    id: p.id,
    codigoArtigo: p.codigoArtigo ?? '',
    descricao: p.descricao ?? '',
    quantidadeUsada: Number(p.quantidadeUsada ?? p.quantidade ?? 0),
    usado: !!p.usado,
    unidade: p.unidade || 'PÇ',
  }))
  const fotosNorm = (fotos || []).map(f => f.id || f.preview || f.name || '').join('|')
  return JSON.stringify({
    checklist,
    notas: form?.notas || '',
    horasServico: form?.horasServico || '',
    tecnico: form?.tecnico || '',
    nomeAssinante: form?.nomeAssinante || '',
    tipoManutKaeser: form?.tipoManutKaeser || '',
    pecas: pecasNorm,
    dataRealizacao: form?.dataRealizacao || '',
    adminStatus: form?.adminStatus || '',
    adminDataAgendada: form?.adminDataAgendada || '',
    adminDataExecucao: form?.adminDataExecucao || '',
    limparAssinatura: !!form?.limparAssinatura,
    fotos: fotosNorm,
    email: emailDestinatario || '',
    assinaturaFeita: !!assinaturaFeita,
    step,
    confirmaEquipamentoSerie: !!confirmaEquipamentoSerie,
    adminEdit: !!adminEdit,
    preview: !!hasPreviewPdf,
    kaeserPecasDirty: !!kaeserPecasDirty,
  })
}
