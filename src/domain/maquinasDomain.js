/**
 * maquinasDomain — equipamentos / máquinas (regras puras).
 */

export function buildNovaMaquina(m, id = String(Date.now())) {
  const { clienteId, ...rest } = m
  return {
    ...rest,
    id,
    clienteId: m.clienteId ?? m.clienteNif,
    clienteNif: m.clienteNif ?? clienteId,
    documentos: m.documentos ?? [],
  }
}

export function mergeMaquinaInList(maquinas, id, data) {
  return maquinas.map(m => (String(m.id) === String(id) ? { ...m, ...data } : m))
}

export function removeMaquinaFromList(maquinas, id) {
  return maquinas.filter(m => m.id !== id)
}

export function collectMaquinaCascadeIds({ manutencoes, reparacoes, maquinaId }) {
  const maqManutIds = manutencoes.filter(m => m.maquinaId === maquinaId).map(m => m.id)
  const maqRepIds = reparacoes.filter(r => r.maquinaId === maquinaId).map(r => r.id)
  return { maqManutIds, maqRepIds }
}

/**
 * Insere ou substitui documento na lista local da máquina (dedupe por upload signature).
 */
export function resolveDocumentoInsert(maquina, doc, idSeed = Date.now()) {
  const snapshotDocs = (maquina.documentos ?? []).map(d => ({ ...d }))
  const docs = [...(maquina.documentos ?? [])]
  const sigName = doc.uploadFileName
  const sigSize = doc.uploadFileSize
  const hasSig =
    sigName != null &&
    String(sigName).trim() !== '' &&
    typeof sigSize === 'number' &&
    sigSize >= 0

  if (hasSig) {
    const idx = docs.findIndex(
      d =>
        d.tipo === doc.tipo &&
        d.uploadFileName === sigName &&
        Number(d.uploadFileSize) === Number(sigSize),
    )
    if (idx !== -1) {
      const docId = docs[idx].id
      docs[idx] = { ...docs[idx], ...doc, id: docId }
      return {
        nextMaq: { ...maquina, documentos: docs },
        docId,
        replaced: true,
        snapshotDocs,
      }
    }
  }

  const docId = `doc${idSeed}`
  return {
    nextMaq: { ...maquina, documentos: [...docs, { ...doc, id: docId }] },
    docId,
    replaced: false,
    snapshotDocs,
  }
}

export function resolveDocumentoRemove(maquina, docId) {
  return {
    ...maquina,
    documentos: (maquina.documentos ?? []).filter(d => String(d.id) !== String(docId)),
  }
}
