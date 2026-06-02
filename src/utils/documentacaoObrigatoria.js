/**
 * Cumprimento da documentação obrigatória por equipamento.
 * Fontes: documentos na ficha (MySQL), biblioteca NAVEL (associações) e plano de peças importado.
 */

export const BIBLIOTECA_TIPO_TO_FICHA = {
  PLANO_MANUTENCAO: 'plano_manutencao',
  MANUAL_UTILIZADOR: 'manual_utilizador',
  MANUAL_TECNICO: 'manual_manutencao',
  OUTROS: 'outros',
}

const FOTO_EQUIPAMENTO_TIPO = '__foto_equipamento'

function documentosFicha(maquina) {
  return (maquina?.documentos ?? []).filter(d => d.tipo && d.tipo !== FOTO_EQUIPAMENTO_TIPO)
}

function bibliotecaRowParaTipo(tipoFichaId, bibliotecaItems) {
  const bibKey = Object.entries(BIBLIOTECA_TIPO_TO_FICHA).find(([, v]) => v === tipoFichaId)?.[0]
  if (!bibKey) return null
  return (bibliotecaItems ?? []).find(r => r?.metadata?.documentType === bibKey) ?? null
}

/**
 * Resolve se um tipo obrigatório está coberto e devolve metadados para a UI.
 * @returns {{ existe: boolean, doc: object|null, source: 'ficha'|'biblioteca'|'pecas_plano'|null }}
 */
export function resolveDocumentoObrigatorio(tipoId, {
  maquina,
  bibliotecaItems = [],
  pecasPlanoCount = 0,
  pecasPlanoKaeserAbcd = false,
} = {}) {
  const docs = documentosFicha(maquina)

  if (tipoId === 'outros') {
    const doc = docs.find(d => d.tipo === 'outros')
    if (doc) return { existe: true, doc, source: 'ficha' }
    const row = bibliotecaRowParaTipo('outros', bibliotecaItems)
    if (row) {
      return {
        existe: true,
        doc: docFromBibliotecaRow(row, 'outros'),
        source: 'biblioteca',
      }
    }
    return { existe: false, doc: null, source: null }
  }

  const docFicha = docs.find(d => d.tipo === tipoId)
  if (docFicha) return { existe: true, doc: docFicha, source: 'ficha' }

  const row = bibliotecaRowParaTipo(tipoId, bibliotecaItems)
  if (row) {
    return {
      existe: true,
      doc: docFromBibliotecaRow(row, tipoId),
      source: 'biblioteca',
    }
  }

  if (tipoId === 'plano_manutencao' && pecasPlanoKaeserAbcd && pecasPlanoCount > 0) {
    return {
      existe: true,
      doc: {
        id: `pecas-plano-${maquina?.id}`,
        tipo: tipoId,
        titulo: 'Plano KAESER importado (consumíveis A–D)',
      },
      source: 'pecas_plano',
    }
  }

  if (tipoId === 'lista_pecas' && pecasPlanoCount > 0) {
    return {
      existe: true,
      doc: {
        id: `pecas-lista-${maquina?.id}`,
        tipo: tipoId,
        titulo: 'Lista de peças no plano do equipamento',
      },
      source: 'pecas_plano',
    }
  }

  return { existe: false, doc: null, source: null }
}

function docFromBibliotecaRow(row, tipoId) {
  return {
    id: `bib-${row.path}`,
    tipo: tipoId,
    titulo: row.name || row.path || 'Documento biblioteca',
    bibliotecaPath: row.path,
    url: row.publicUrl || row.url || null,
  }
}

/** Set de ids TIPOS_DOCUMENTO já cobertos (para badges / modal). */
export function tiposObrigatoriosCobertos(opts) {
  const { TIPOS_DOCUMENTO } = opts
  const ids = TIPOS_DOCUMENTO.map(t => t.id)
  const covered = new Set()
  for (const id of ids) {
    if (resolveDocumentoObrigatorio(id, opts).existe) covered.add(id)
  }
  return covered
}
