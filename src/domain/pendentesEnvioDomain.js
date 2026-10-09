/**
 * pendentesEnvioDomain — traduz itens da fila offline em linhas legíveis
 * para o técnico («Compressor KAESER — AUTO ELGE · relatório»), agrupadas por equipamento.
 *
 * Lógica pura. Recebe `queueItems()` (sem payload) e as listas do DataContext.
 */

const ROTULO_RECURSO = {
  relatorios: 'relatório',
  manutencoes: 'manutenção',
  maquinas: 'ficha do equipamento',
  reparacoes: 'reparação',
  relatoriosReparacao: 'relatório de reparação',
  clientes: 'cliente',
}

function idEq(a, b) {
  return a != null && b != null && String(a) === String(b)
}

/**
 * @param {Array<{resource:string, action:string, id?:string|null, dataId?:string|null, manutencaoId?:string|null, maquinaId?:string|null}>} itens
 * @param {{ manutencoes?: Array, maquinas?: Array, clientes?: Array, reparacoes?: Array }} ctx
 * @returns {Array<{ chave: string, titulo: string, detalhe: string, n: number }>}
 */
export function descreverPendentesPorEnviar(itens, ctx = {}) {
  const manutencoes = ctx.manutencoes || []
  const maquinas = ctx.maquinas || []
  const clientes = ctx.clientes || []
  const reparacoes = ctx.reparacoes || []
  const grupos = new Map()

  for (const it of itens || []) {
    let maquinaId = it.maquinaId ?? null
    const alvoId = it.id ?? it.dataId ?? null

    if (it.resource === 'relatorios' || it.resource === 'manutencoes') {
      const mid = it.resource === 'relatorios' ? it.manutencaoId : alvoId
      const m = manutencoes.find(x => idEq(x.id, mid))
      if (m) maquinaId = m.maquinaId
    } else if (it.resource === 'reparacoes' || it.resource === 'relatoriosReparacao') {
      const rid = it.resource === 'reparacoes' ? alvoId : (it.manutencaoId ?? it.dataId)
      const r = reparacoes.find(x => idEq(x.id, rid))
      if (r) maquinaId = r.maquinaId
    } else if (it.resource === 'maquinas') {
      maquinaId = alvoId
    }

    const maq = maquinaId != null ? maquinas.find(x => idEq(x.id, maquinaId)) : null
    const cli = maq ? clientes.find(c => c.nif === maq.clienteNif) : null
    const chave = maq ? `maq:${maq.id}` : `res:${it.resource}`
    const titulo = maq
      ? `${maq.marca ?? ''} ${maq.modelo ?? ''}`.trim() || 'Equipamento'
      : (ROTULO_RECURSO[it.resource] ? ROTULO_RECURSO[it.resource].charAt(0).toUpperCase() + ROTULO_RECURSO[it.resource].slice(1) : it.resource)

    const g = grupos.get(chave) || { chave, titulo, cliente: cli?.nome || '', recursos: new Set(), n: 0 }
    g.recursos.add(ROTULO_RECURSO[it.resource] || it.resource)
    g.n += 1
    grupos.set(chave, g)
  }

  return [...grupos.values()].map(g => ({
    chave: g.chave,
    titulo: g.titulo,
    detalhe: [g.cliente, [...g.recursos].join(', ')].filter(Boolean).join(' · '),
    n: g.n,
  }))
}
