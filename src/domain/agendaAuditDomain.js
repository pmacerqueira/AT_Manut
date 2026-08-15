/**
 * Auditoria de lapsos na agenda periódica — varrimento além do «Sincronizar agenda».
 * Detecta buracos na cadeia concluída, saltos na agenda aberta e desalinhamentos.
 */
import {
  periodicidadeEfetivaParaMaquina,
  recalcularAgendaMaquinaNoAcc,
  resolverDataExecucaoParaMaquina,
} from './agendaDomain.js'
import { INTERVALOS } from './equipamentoDomain.js'
import { minDataManutencaoAberta } from '../utils/proximaManutAgenda.js'
import { normEntityId } from '../utils/frotaReportHelpers.js'

/** Tipos de anomalia (ordenados por severidade na UI). */
export const AGENDA_AUDIT_TIPOS = {
  buraco_concluidas: {
    label: 'Buraco entre concluídas',
    severidade: 'alta',
    descricao: 'Falta um ou mais períodos entre duas manutenções já executadas.',
  },
  salto_agenda_aberta: {
    label: 'Salto na agenda aberta',
    severidade: 'alta',
    descricao: 'Entre a última execução e a 1.ª data aberta falta um trimestre/período.',
  },
  sync_slot_em_falta: {
    label: 'Sync criaria slot em atraso',
    severidade: 'media',
    descricao: '«Sincronizar agenda» geraria um slot em atraso que hoje não existe.',
  },
  proxima_desalinhada: {
    label: 'Próxima desalinhada',
    severidade: 'baixa',
    descricao: 'O campo «próxima manutenção» na ficha não coincide com a agenda.',
  },
}

const TOLERANCIA_ANTES_DIAS = 15
const TOLERANCIA_DEPOIS_DIAS = 45

export function addDaysIso(iso, dias) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

function sameMid(m, mid) {
  return normEntityId(m.maquinaId) === normEntityId(mid)
}

function clienteMap(clientes) {
  const map = new Map()
  for (const c of clientes ?? []) {
    const key = normEntityId(c.nif ?? c.id)
    if (key) map.set(key, c)
  }
  return map
}

function resolveCliente(maq, clientesByNif) {
  const key = normEntityId(maq.clienteNif ?? maq.clienteId)
  return clientesByNif.get(key) ?? null
}

function isPeriodicaRelevante(m) {
  return m.tipo !== 'montagem' && m.data
}

function concluidasOrdenadas(mid, manutencoes) {
  return manutencoes
    .filter(m => sameMid(m, mid) && m.status === 'concluida' && isPeriodicaRelevante(m))
    .sort((a, b) => a.data.localeCompare(b.data))
}

function abertasOrdenadas(mid, manutencoes) {
  return manutencoes
    .filter(m => sameMid(m, mid) && (m.status === 'agendada' || m.status === 'pendente') && isPeriodicaRelevante(m))
    .sort((a, b) => a.data.localeCompare(b.data))
}

/** Intervalos em falta entre duas datas concluídas consecutivas. */
export function detectarBuracosConcluidas(concl, intervaloDias) {
  const buracos = []
  for (let i = 1; i < concl.length; i++) {
    const prev = concl[i - 1].data
    const curr = concl[i].data
    const esperadoMin = addDaysIso(prev, intervaloDias - TOLERANCIA_ANTES_DIAS)
    const esperadoMax = addDaysIso(prev, intervaloDias + TOLERANCIA_DEPOIS_DIAS)
    if (curr >= esperadoMin && curr <= esperadoMax) continue

    const slotsEsperados = []
    let cursor = prev
    while (true) {
      const next = addDaysIso(cursor, intervaloDias)
      if (next >= curr) break
      if (next > addDaysIso(prev, intervaloDias - TOLERANCIA_ANTES_DIAS)) {
        slotsEsperados.push(next)
      }
      cursor = next
    }
    if (slotsEsperados.length === 0) continue

    buracos.push({
      de: prev,
      ate: curr,
      periodosEmFalta: slotsEsperados,
      periodosEmFaltaLabel: slotsEsperados.join(', '),
    })
  }
  return buracos
}

/** Salto entre última execução e 1.ª aberta (caso ELGE/MONTALVERNE). */
export function detectarSaltoAgendaAberta(dataExec, abertas, concl, intervaloDias) {
  const primeiraAberta = abertas[0]?.data
  if (!dataExec || !primeiraAberta) return null

  const slotEsperado = addDaysIso(dataExec, intervaloDias)
  const limiteSalto = addDaysIso(slotEsperado, TOLERANCIA_DEPOIS_DIAS)
  if (primeiraAberta <= limiteSalto) return null

  const temRegistoIntermedio = [...concl, ...abertas].some(m =>
    m.data > addDaysIso(dataExec, intervaloDias - TOLERANCIA_ANTES_DIAS) &&
    m.data < primeiraAberta,
  )
  if (temRegistoIntermedio) return null

  return {
    ultimaExec: dataExec,
    slotEsperado,
    primeiraAberta,
  }
}

/** Simula sync e detecta slot em atraso que não existe hoje. */
export function detectarSlotSyncEmFalta(acc, ctx) {
  const { acc: nextAcc, novas, recalculada } = recalcularAgendaMaquinaNoAcc(acc, ctx)
  if (!recalculada || !novas.length) return null

  const mid = ctx.maq.id
  const novasDatas = [...novas].map(n => n.data).sort()
  const primeiraNova = novasDatas[0]
  if (!primeiraNova || primeiraNova >= ctx.hojeStr) return null

  const abertas = abertasOrdenadas(mid, acc)
  const concl = concluidasOrdenadas(mid, acc)
  const jaExiste = [...abertas, ...concl].some(m => m.data === primeiraNova)
  if (jaExiste) return null

  const proxActual = minDataManutencaoAberta(mid, acc)
  return {
    slotSync: primeiraNova,
    proxActual,
    proxAposSync: minDataManutencaoAberta(mid, nextAcc),
  }
}

function baseIssue(maq, cliente) {
  return {
    maquinaId: maq.id,
    numeroSerie: maq.numeroSerie ?? '',
    modelo: [maq.marca, maq.modelo].filter(Boolean).join(' ').trim() || maq.modelo || '',
    clienteNome: cliente?.nome ?? '',
    clienteNif: normEntityId(cliente?.nif ?? cliente?.id ?? maq.clienteNif ?? maq.clienteId),
    periodicidade: maq.periodicidadeManut ?? null,
  }
}

/**
 * Audita todas as máquinas periódicas.
 * @returns {{ hojeStr: string, analisadas: number, issues: object[], resumo: object }}
 */
export function auditarAgendaPeriodica({
  maquinas = [],
  manutencoes = [],
  clientes = [],
  subcategorias = [],
  categorias = [],
  hojeStr,
  intervalos = INTERVALOS,
}) {
  const clientesByNif = clienteMap(clientes)
  const issues = []
  let analisadas = 0
  const sameMidFn = (m, mid) => sameMid(m, mid)

  for (const maq of maquinas) {
    const periodicidade = periodicidadeEfetivaParaMaquina(maq, subcategorias, categorias)
    if (!periodicidade || !intervalos[periodicidade]) continue

    const intervaloDias = intervalos[periodicidade].dias
    const concl = concluidasOrdenadas(maq.id, manutencoes)
    if (concl.length === 0 && !maq.ultimaManutencaoData) continue

    analisadas += 1
    const cliente = resolveCliente(maq, clientesByNif)
    const base = baseIssue(maq, cliente)
    const abertas = abertasOrdenadas(maq.id, manutencoes)
    const dataExec = resolverDataExecucaoParaMaquina(maq, manutencoes, sameMidFn)

    for (const buraco of detectarBuracosConcluidas(concl, intervaloDias)) {
      issues.push({
        ...base,
        tipo: 'buraco_concluidas',
        severidade: AGENDA_AUDIT_TIPOS.buraco_concluidas.severidade,
        detalhe: `Entre ${buraco.de} e ${buraco.ate} faltam: ${buraco.periodosEmFaltaLabel}`,
        ...buraco,
      })
    }

    const salto = detectarSaltoAgendaAberta(dataExec, abertas, concl, intervaloDias)
    if (salto) {
      issues.push({
        ...base,
        tipo: 'salto_agenda_aberta',
        severidade: AGENDA_AUDIT_TIPOS.salto_agenda_aberta.severidade,
        detalhe: `Última exec. ${salto.ultimaExec}; esperado ~${salto.slotEsperado}; 1.ª aberta ${salto.primeiraAberta}`,
        ...salto,
      })
    }

    const acc = manutencoes.map(m => ({ ...m }))
    const syncGap = detectarSlotSyncEmFalta(acc, {
      maq,
      subcategorias,
      categorias,
      hojeStr,
      intervalos,
      sameMid: sameMidFn,
      idSeed: 1,
    })
    if (syncGap) {
      issues.push({
        ...base,
        tipo: 'sync_slot_em_falta',
        severidade: AGENDA_AUDIT_TIPOS.sync_slot_em_falta.severidade,
        detalhe: `Sync criaria ${syncGap.slotSync} (em atraso); próxima actual ${syncGap.proxActual ?? '—'}`,
        ...syncGap,
      })
    }

    const proxReal = minDataManutencaoAberta(maq.id, manutencoes)
    const proxFicha = maq.proximaManut ?? null
    if (String(proxFicha ?? '') !== String(proxReal ?? '')) {
      issues.push({
        ...base,
        tipo: 'proxima_desalinhada',
        severidade: AGENDA_AUDIT_TIPOS.proxima_desalinhada.severidade,
        detalhe: `Ficha: ${proxFicha ?? '—'}; agenda: ${proxReal ?? '—'}`,
        ficha: proxFicha,
        agenda: proxReal,
      })
    }
  }

  const porTipo = {}
  for (const key of Object.keys(AGENDA_AUDIT_TIPOS)) {
    porTipo[key] = issues.filter(i => i.tipo === key).length
  }

  const ordemSeveridade = { alta: 0, media: 1, baixa: 2 }
  issues.sort((a, b) => {
    const sa = ordemSeveridade[a.severidade] ?? 9
    const sb = ordemSeveridade[b.severidade] ?? 9
    if (sa !== sb) return sa - sb
    return (a.clienteNome || '').localeCompare(b.clienteNome || '', 'pt')
  })

  return {
    hojeStr,
    analisadas,
    issues,
    resumo: {
      total: issues.length,
      porTipo,
      limpo: issues.length === 0,
    },
  }
}

export function formatAgendaAuditReportText(result) {
  const lines = [
    `=== AUDITORIA AGENDA PERIÓDICA ===`,
    `Data: ${result.hojeStr}`,
    `Equipamentos analisados: ${result.analisadas}`,
    `Anomalias: ${result.resumo.total}`,
    '',
  ]
  if (result.resumo.limpo) {
    lines.push('Nenhuma anomalia detectada.')
    return lines.join('\n')
  }
  for (const issue of result.issues) {
    const meta = AGENDA_AUDIT_TIPOS[issue.tipo]
    lines.push(`[${issue.severidade.toUpperCase()}] ${meta?.label ?? issue.tipo}`)
    lines.push(`  Cliente: ${issue.clienteNome} (${issue.clienteNif})`)
    lines.push(`  Equipamento: ${issue.modelo} — S/N ${issue.numeroSerie}`)
    lines.push(`  ${issue.detalhe}`)
    lines.push('')
  }
  return lines.join('\n')
}
