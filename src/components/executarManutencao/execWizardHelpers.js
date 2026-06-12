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
  'Cliente informado de anomalia',
  'Peça substituída preventivamente',
  'Ruído anormal detetado — monitorizar',
  'Lubrificação efetuada em todos os pontos',
  'Alinhamento verificado e corrigido',
  'Filtros substituídos conforme plano',
  'Sem observações adicionais',
]

export function getQuickNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem('atm_quick_notes') || 'null')
    if (Array.isArray(stored) && stored.length > 0) return stored
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
