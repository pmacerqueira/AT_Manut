/**
 * Verificação offline da linha de frota para o elevador Ravaglioli / 2026.MP.00051.
 * Não usa API — reproduz o cenário típico: duas fichas mesmo S/N ou manutenção com data ≠ relatório.
 *
 * Executar: node scripts/verify-frota-fixture-ravaglioli.mjs
 */
import {
  mergeRelatorioPreferNewer,
  normEntityId,
  normRelatorioManutencaoId,
  numeroRelatorioLegivel,
  relatorioVisivelNaFrotaCliente,
  resolveUltimaParaFrota,
  reportDateSortKey,
} from '../src/utils/frotaReportHelpers.js'

const NIF = '512025860'
const SERIE = '10571433'
const NUM_REL = '2026.MP.00051'
const DATA_REL = '2026-01-16' // como no PDF

function buildRelMap(maquinas, manutencoes, relatorios) {
  const maqIds = new Set(maquinas.map((m) => normEntityId(m.id)))
  const manutsCliente = manutencoes.filter((mt) => maqIds.has(normEntityId(mt.maquinaId)))
  const relMap = new Map()
  for (const r of relatorios) {
    const rid = normRelatorioManutencaoId(r)
    if (!rid) continue
    if (!relatorioVisivelNaFrotaCliente(r, maqIds, manutsCliente, manutencoes, maquinas)) continue
    relMap.set(rid, mergeRelatorioPreferNewer(relMap.get(rid), r))
  }
  return relMap
}

function linhaFrota(maquina, manutencoes, relatorios, maquinasCliente) {
  const mid = normEntityId(maquina.id)
  const manutsM = manutencoes.filter((mt) => normEntityId(mt.maquinaId) === mid)
  const relMap = buildRelMap(maquinasCliente, manutencoes, relatorios)
  const { dataUltimaKey, relUltima } = resolveUltimaParaFrota(
    maquina,
    manutsM,
    relatorios,
    relMap,
    manutencoes,
    maquinasCliente,
  )
  return {
    maquinaId: mid,
    dataUltimaKey,
    numeroRelatorio: numeroRelatorioLegivel(relUltima) || null,
    reportDateKey: relUltima ? reportDateSortKey(relUltima) : null,
  }
}

console.log('=== Fixture: ANTERO REGO (simulado) — NIF', NIF, '===\n')

// Equipamento "servidor" onde está a manutenção + relatório
const maqServidor = {
  id: 'mq-rava-serv',
  clienteNif: NIF,
  numeroSerie: SERIE,
  marca: 'Ravaglioli',
  modelo: 'KPX337W-WK-3200KG',
  ultimaManutencaoData: '2026-03-18',
  subcategoriaId: 'sub-el',
}

// Duplicado de ficha (linha que falhava na frota): mesmo S/N, outro id, sem manutenções locais
const maqDuplicado = {
  id: 'mq-rava-dup',
  clienteNif: NIF,
  numeroSerie: SERIE,
  marca: 'Ravaglioli',
  modelo: 'KPX337W-WK-3200KG',
  ultimaManutencaoData: '2026-03-18',
  subcategoriaId: 'sub-el',
}

const mt51 = {
  id: 'mt-mp-00051',
  maquinaId: maqServidor.id,
  status: 'concluida',
  data: '2026-03-18',
  tipo: 'periodica',
}

const relOficial = {
  id: 'rel-51',
  manutencaoId: mt51.id,
  manutencaoMaquinaId: maqServidor.id,
  numeroRelatorio: NUM_REL,
  dataCriacao: `${DATA_REL}T09:00:00.000Z`,
  dataAssinatura: `${DATA_REL}T11:00:00.000Z`,
}

// Rascunho mais recente sem número (deve perder para o 00051)
const rascunho = {
  id: 'rel-draft',
  manutencaoId: mt51.id,
  manutencaoMaquinaId: maqServidor.id,
  numeroRelatorio: '',
  dataCriacao: '2026-03-20T08:00:00.000Z',
  dataAssinatura: null,
}

const maquinasCliente = [maqServidor, maqDuplicado]
const manutencoes = [mt51]
const relatorios = [relOficial, rascunho]

console.log('--- Caso 1: linha da ficha DUPLICADA (sem manuts nesse id) ---')
const rowDup = linhaFrota(maqDuplicado, manutencoes, relatorios, maquinasCliente)
console.log(JSON.stringify(rowDup, null, 2))
const okDup =
  rowDup.numeroRelatorio === NUM_REL && rowDup.dataUltimaKey === DATA_REL
console.log(okDup ? 'OK: nº e data batem com o relatório individual.\n' : 'FALHA.\n')

console.log('--- Caso 2: linha da ficha PRINCIPAL (com manutenção) ---')
const rowMain = linhaFrota(maqServidor, manutencoes, relatorios, maquinasCliente)
console.log(JSON.stringify(rowMain, null, 2))
const okMain =
  rowMain.numeroRelatorio === NUM_REL && rowMain.dataUltimaKey === DATA_REL
console.log(okMain ? 'OK.\n' : 'FALHA.\n')

console.log('--- Caso 3: só relatório oficial (sem rascunho) ---')
const rowSolo = linhaFrota(maqDuplicado, manutencoes, [relOficial], maquinasCliente)
console.log(JSON.stringify(rowSolo, null, 2))
console.log(
  rowSolo.numeroRelatorio === NUM_REL && rowSolo.dataUltimaKey === DATA_REL
    ? 'OK.\n'
    : 'FALHA.\n',
)

// Período custom do modal não altera coluna Última/Últ.rel (só KPIs) — documentar
console.log(
  'Nota: periodoInicio 2026-01-01 / fim 2026-03-31 só filtra KPIs; colunas Última / Últ.rel usam sempre o estado actual (código Clientes.jsx).',
)

process.exit(okDup && okMain ? 0 : 1)
