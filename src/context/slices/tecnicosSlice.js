/**
 * tecnicosSlice — CRUD de técnicos (extraído do DataContext).
 */
import {
  buildNovoTecnico,
  sortTecnicosByNome,
  mergeTecnicoUpdate,
  removeTecnicoFromList,
  findTecnicoByNome,
} from '../../domain/tecnicosDomain'
import { persistViaApi } from '../../domain/crudPersistDomain'

/**
 * @param {object} deps
 * @param {() => object[]} deps.getTecnicos
 * @param {import('react').Dispatch<import('react').SetStateAction<object[]>>} deps.setTecnicos
 * @param {Function} deps.persist
 * @param {typeof import('../../utils/logger').logger} deps.logger
 */
export function createTecnicosHandlers({ getTecnicos, setTecnicos, persist, logger }) {
  const getTecnicoByNome = (nome) => findTecnicoByNome(getTecnicos(), nome)

  const addTecnico = async (t) => {
    const novo = buildNovoTecnico(t)
    setTecnicos(prev => sortTecnicosByNome([...prev, novo]))
    try {
      await persistViaApi(persist, {
        resource: 'tecnicos',
        runWithApi: api => api.create(novo),
        queueDescriptor: { resource: 'tecnicos', action: 'create', data: novo },
        rollback: () => setTecnicos(prev => prev.filter(x => x.id !== novo.id)),
        throwOnFailure: true,
      })
    } catch (err) {
      setTecnicos(prev => prev.filter(x => x.id !== novo.id))
      logger.error('DataContext', 'addTecnico', err?.message || 'Falha ao criar técnico', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
    logger.action('DataContext', 'addTecnico', `Técnico "${novo.nome}" criado`, { id: novo.id })
    return novo.id
  }

  const updateTecnico = async (id, data) => {
    const before = getTecnicos()
    setTecnicos(prev => mergeTecnicoUpdate(prev, id, data))
    try {
      await persistViaApi(persist, {
        resource: 'tecnicos',
        runWithApi: api => api.update(id, data),
        queueDescriptor: { resource: 'tecnicos', action: 'update', data: { id, ...data } },
        rollback: () => setTecnicos(before),
        throwOnFailure: true,
      })
    } catch (err) {
      setTecnicos(before)
      logger.error('DataContext', 'updateTecnico', err?.message || 'Falha ao actualizar técnico', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
    logger.action('DataContext', 'updateTecnico', `Técnico "${data.nome || id}" actualizado`, { id })
  }

  const removeTecnico = async (id) => {
    const before = getTecnicos()
    setTecnicos(prev => removeTecnicoFromList(prev, id))
    try {
      await persistViaApi(persist, {
        resource: 'tecnicos',
        runWithApi: api => api.delete(id),
        queueDescriptor: { resource: 'tecnicos', action: 'delete', data: { id } },
        rollback: () => setTecnicos(before),
        throwOnFailure: true,
      })
    } catch (err) {
      setTecnicos(before)
      logger.error('DataContext', 'removeTecnico', err?.message || 'Falha ao eliminar técnico', { stack: err?.stack?.slice(0, 300) })
      throw err
    }
    logger.action('DataContext', 'removeTecnico', 'Técnico removido', { id })
  }

  return { getTecnicoByNome, addTecnico, updateTecnico, removeTecnico }
}
