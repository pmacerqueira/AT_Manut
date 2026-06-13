/**
 * marcasSlice — CRUD de marcas (extraído do DataContext).
 */
import {
  normalizeMarca,
  shouldRetryMarcaCreateWithId,
  findMarcaByNomeIgnoreCase,
  buildNovaMarca,
  mergeMarcaInList,
  replaceMarcaIdInList,
  removeMarcaFromList,
  isLegacyLocalMarcaId,
  buildMarcaApiPayload,
  resolvePersistedMarcaId,
  sortMarcasByNome,
} from '../../domain/marcasDomain'

/**
 * @param {object} deps
 * @param {() => object[]} deps.getMarcas
 * @param {import('react').Dispatch<import('react').SetStateAction<object[]>>} deps.setMarcas
 * @param {typeof import('../../utils/logger').logger} deps.logger
 */
export function createMarcasHandlers({ getMarcas, setMarcas, logger }) {
  const addMarca = async (m) => {
    const nome = (m?.nome ?? '').trim()
    if (!nome) return null

    const existing = findMarcaByNomeIgnoreCase(getMarcas(), nome)
    if (existing?.id != null) return existing.id

    const tempId = `tmp_mk_${Date.now()}`
    const novo = buildNovaMarca(m, tempId)

    setMarcas(prev => sortMarcasByNome([...prev, novo]))

    try {
      const { apiMarcas } = await import('../../services/apiService')
      const payload = buildMarcaApiPayload(novo)
      let created
      try {
        created = await apiMarcas.create(payload)
      } catch (err) {
        if (!shouldRetryMarcaCreateWithId(err)) throw err
        const retryId = `mk${Date.now()}`
        created = await apiMarcas.create({ ...payload, id: retryId })
      }

      const persisted = normalizeMarca({
        ...novo,
        ...(created || {}),
        id: resolvePersistedMarcaId(created, tempId),
      })

      setMarcas(prev => prev
        .map(x => String(x.id) === String(tempId) ? persisted : x)
        .sort((a, b) => (a.nome ?? '').localeCompare((b.nome ?? ''), 'pt')))

      return persisted.id
    } catch (err) {
      setMarcas(prev => removeMarcaFromList(prev, tempId))
      logger.error('DataContext', 'addMarca', err?.message || 'Falha ao criar marca', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
  }

  const updateMarca = async (id, data) => {
    const before = getMarcas()
    const atual = before.find(m => String(m.id) === String(id))
    const merged = normalizeMarca({ ...(atual || {}), ...(data || {}) })
    setMarcas(prev => mergeMarcaInList(prev, id, merged))

    try {
      const { apiMarcas } = await import('../../services/apiService')
      let targetId = id

      if (isLegacyLocalMarcaId(id)) {
        const remote = await apiMarcas.list().catch(() => [])
        const remoteByName = (remote || []).find(x =>
          String(x?.nome || '').trim().toLowerCase() === String(merged?.nome || '').trim().toLowerCase(),
        )

        if (remoteByName?.id != null) {
          targetId = remoteByName.id
          await apiMarcas.update(targetId, data)
        } else {
          const payloadCreate = buildMarcaApiPayload(merged)
          let created
          try {
            created = await apiMarcas.create(payloadCreate)
          } catch (err) {
            if (!shouldRetryMarcaCreateWithId(err)) throw err
            const retryId = `mk${Date.now()}`
            created = await apiMarcas.create({ ...payloadCreate, id: retryId })
          }
          targetId = resolvePersistedMarcaId(created, id)
        }
      } else {
        await apiMarcas.update(id, data)
      }

      if (String(targetId) !== String(id)) {
        setMarcas(prev => replaceMarcaIdInList(prev, id, targetId))
      }
    } catch (err) {
      setMarcas(before)
      logger.error('DataContext', 'updateMarca', err?.message || 'Falha ao atualizar marca', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
  }

  return { addMarca, updateMarca }
}
