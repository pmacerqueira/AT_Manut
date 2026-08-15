/**
 * Payload canónico para PDF e email de relatórios de manutenção periódica/montagem.
 * Fonte única para data de execução, próximas datas e metadados de declaração.
 */
import { computarProximasDatas } from './diasUteis.js'
import { listProximasAgendaPeriodicas } from './proximaManutAgenda.js'
import { categoriaNomeFromMaquina, declaracaoClienteDepoisFromMaquina } from '../constants/relatorio.js'

/** Periodicidade efectiva: ficha da máquina ou linha de manutenção (montagem antes de copiar para máquina). */
export function resolvePeriodicidadeManutencao({ maquina, manutencao }) {
  return maquina?.periodicidadeManut || manutencao?.periodicidade || ''
}

/** Data-base para cálculo de próximas manutenções (PDF/email em tempo real). */
export function resolveDataExecucaoManutencao({ relatorio, manutencao, dataExecucaoOverride }) {
  if (dataExecucaoOverride) return String(dataExecucaoOverride).slice(0, 10)
  return (
    relatorio?.dataCriacao?.slice(0, 10) ||
    relatorio?.dataAssinatura?.slice(0, 10) ||
    manutencao?.data ||
    ''
  )
}

/**
 * Próximas manutenções para PDF/email.
 * Manutenção concluída + lista da agenda: espelha slots abertos recalculados (BD).
 * Caso contrário: calcula a partir da data de execução (pré-visualização / montagem).
 */
export function buildProximasManutencoesManutencao({ relatorio, manutencao, maquina, dataExecucao, manutencoes }) {
  const dataExec = dataExecucao ?? resolveDataExecucaoManutencao({ relatorio, manutencao })
  const periMaq = resolvePeriodicidadeManutencao({ maquina, manutencao })
  const tecnico = manutencao?.tecnico || relatorio?.tecnico || ''
  if (!periMaq || !dataExec) return []

  const maquinaId = manutencao?.maquinaId ?? maquina?.id
  const fromAgenda = (manutencao?.status === 'concluida' && Array.isArray(manutencoes) && maquinaId)
    ? listProximasAgendaPeriodicas(maquinaId, manutencoes)
    : []
  if (fromAgenda.length > 0) {
    return fromAgenda.map(m => ({
      data: m.data,
      periodicidade: m.periodicidade || periMaq,
      tecnico: m.tecnico || tecnico,
    }))
  }

  return computarProximasDatas(dataExec, periMaq, { tecnico, count: 12 })
}

/**
 * Metadados partilhados por PDF jsPDF e envio por email.
 */
export function buildRelatorioManutencaoMeta({
  relatorio,
  manutencao,
  maquina,
  getSubcategoria,
  getCategoria,
  getTecnicoByNome,
  checklistItems = [],
  manutencoes,
}) {
  const sub = maquina ? getSubcategoria(maquina.subcategoriaId) : null
  const dataExecucao = resolveDataExecucaoManutencao({ relatorio, manutencao })
  return {
    checklistItems,
    subcategoriaNome: sub?.nome ?? '',
    tecnicoObj: getTecnicoByNome?.(manutencao?.tecnico || relatorio?.tecnico) ?? null,
    proximasManutencoes: buildProximasManutencoesManutencao({ relatorio, manutencao, maquina, dataExecucao, manutencoes }),
    categoriaNome: categoriaNomeFromMaquina(maquina, getSubcategoria, getCategoria),
    declaracaoClienteDepois: declaracaoClienteDepoisFromMaquina(maquina, getSubcategoria, getCategoria),
    dataExecucao,
    periodicidade: resolvePeriodicidadeManutencao({ maquina, manutencao }),
  }
}

/** Argumentos completos para {@link gerarPdfCompacto}. */
export function buildRelatorioManutencaoPdfArgs({
  relatorio,
  manutencao,
  maquina,
  cliente,
  marcas = [],
  getSubcategoria,
  getCategoria,
  getTecnicoByNome,
  checklistItems = [],
  manutencoes,
}) {
  const meta = buildRelatorioManutencaoMeta({
    relatorio,
    manutencao,
    maquina,
    getSubcategoria,
    getCategoria,
    getTecnicoByNome,
    checklistItems,
    manutencoes,
  })
  return {
    relatorio,
    manutencao,
    maquina,
    cliente,
    checklistItems: meta.checklistItems,
    subcategoriaNome: meta.subcategoriaNome,
    tecnicoObj: meta.tecnicoObj,
    proximasManutencoes: meta.proximasManutencoes,
    marcas,
    categoriaNome: meta.categoriaNome,
    declaracaoClienteDepois: meta.declaracaoClienteDepois,
  }
}

/** Argumentos para {@link enviarRelatorioEmail} (manutenção/montagem). */
export function buildRelatorioManutencaoEmailArgs({
  emailDestinatario,
  relatorio,
  manutencao,
  maquina,
  cliente,
  marcas = [],
  getSubcategoria,
  getCategoria,
  getTecnicoByNome,
  checklistItems = [],
  logoUrl = '',
  manutencoes,
}) {
  const meta = buildRelatorioManutencaoMeta({
    relatorio,
    manutencao,
    maquina,
    getSubcategoria,
    getCategoria,
    getTecnicoByNome,
    checklistItems,
    manutencoes,
  })
  return {
    emailDestinatario,
    relatorio,
    manutencao,
    maquina,
    cliente,
    checklistItems: meta.checklistItems,
    subcategoriaNome: meta.subcategoriaNome,
    logoUrl,
    tecnicoObj: meta.tecnicoObj,
    marcas,
    categoriaNome: meta.categoriaNome,
    declaracaoClienteDepois: meta.declaracaoClienteDepois,
    proximasManutencoes: meta.proximasManutencoes,
    manutencoes,
  }
}
