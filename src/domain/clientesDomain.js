/**
 * clientesDomain — entidade cliente (regras puras).
 */

export function buildNovoCliente(c, idSeed = Date.now()) {
  const nif = String(c.nif).trim()
  return { ...c, id: `cli${idSeed}`, nif }
}

export function clienteExistsByNif(clientes, nif) {
  const key = String(nif).trim()
  return clientes.some(cli => cli.nif === key)
}

export function findClienteByNif(clientes, nif) {
  return clientes.find(c => c.nif === nif)
}

export function mergeClienteUpdate(clientes, nif, data) {
  return clientes.map(c => (c.nif === nif ? { ...c, ...data } : c))
}

export function removeClienteFromList(clientes, nif) {
  return clientes.filter(c => c.nif !== nif)
}

export function clienteRecordId(cli) {
  return cli?.id ?? cli?.nif
}

/** IDs de entidades relacionadas ao eliminar um cliente (cascata local). */
export function collectClienteCascadeIds({ maquinas, manutencoes, reparacoes, nif }) {
  const maqIds = maquinas
    .filter(m => m.clienteNif === nif || m.clienteId === nif)
    .map(m => m.id)
  const manutIds = manutencoes
    .filter(m => maqIds.includes(m.maquinaId))
    .map(m => m.id)
  const repIds = reparacoes
    .filter(r => maqIds.includes(r.maquinaId))
    .map(r => r.id)
  return { maqIds, manutIds, repIds }
}
