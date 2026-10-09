/**
 * ultimaVisitaDomain — resumo da última intervenção concluída num equipamento,
 * para o técnico ver no primeiro passo do assistente antes de começar.
 *
 * Lógica pura: recebe listas do DataContext, devolve um objecto pronto a mostrar.
 * Não escreve nada. Não interpreta segurança: só repete o que ficou registado.
 */
import { normalizarChecklistRespostasMap, linhasNotasRelatorio } from '../components/executarManutencao/execWizardHelpers.js'
import { codigoResposta, decisaoOperacionalElevador, emissaoDoRelatorio, itensDoSnapshot } from './relatorioElevadorPreventivo.js'
import { limparCitacaoNormaChecklist } from './notaLegalColocacaoMercado.js'
import { horasContadorNaManutencao } from '../utils/horasContadorEquipamento.js'

function idEq(a, b) {
  return String(a ?? '') === String(b ?? '')
}

function textoCurto(s, max = 160) {
  const t = String(s ?? '').trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t
  return t.slice(0, max - 1).trimEnd() + '…'
}

/**
 * @param {object} p
 * @param {string|number} p.maquinaId
 * @param {Array} p.manutencoes
 * @param {Array} p.relatorios
 * @param {Array} [p.checklistItems] — itens vivos da subcategoria (fallback quando o relatório não tem snapshot)
 * @param {string|number|null} [p.excluirManutencaoId] — a manutenção que está a ser executada agora
 * @param {string} [p.hoje] — YYYY-MM-DD para calcular «há N dias»
 * @returns {null|object}
 */
export function resumoUltimaVisita({ maquinaId, manutencoes, relatorios, checklistItems = [], excluirManutencaoId = null, hoje = null }) {
  if (maquinaId == null || maquinaId === '') return null
  const concluidas = (manutencoes || [])
    .filter(m => idEq(m.maquinaId, maquinaId) && m.status === 'concluida' && !idEq(m.id, excluirManutencaoId))
    .sort((a, b) => String(b.data || '').localeCompare(String(a.data || '')))
  if (concluidas.length === 0) return null

  const manut = concluidas[0]
  const rel = (relatorios || []).find(r => idEq(r.manutencaoId, manut.id)) || null

  const snapItens = itensDoSnapshot(rel?.checklistSnapshot)
  const itens = snapItens.length > 0 ? snapItens : (checklistItems || [])
  const respostas = normalizarChecklistRespostasMap(rel?.checklistRespostas)

  const anomalias = []
  const documentosEmFalta = []
  const naoExecutados = []
  itens.forEach((it, i) => {
    const valor = respostas[it.id] ?? respostas[String(it.id)]
    if (valor == null || valor === '') return
    const codigo = codigoResposta(valor)
    const texto = limparCitacaoNormaChecklist(it.texto)
    const obj = valor && typeof valor === 'object' ? valor : null
    if (obj?.papel === 'documento') {
      if (obj.documento === 'nao_disponibilizado' || obj.documento === 'ilegivel') {
        documentosEmFalta.push({ n: i + 1, texto, estado: obj.documento })
      }
      return
    }
    if (codigo === 'nao') {
      anomalias.push({
        n: i + 1,
        texto,
        descricao: textoCurto(obj?.descricao),
        recomendacao: textoCurto(obj?.recomendacao),
        critico: !!obj?.recomendaRetirada,
      })
      return
    }
    if (codigo === 'parcial') {
      naoExecutados.push({ n: i + 1, texto, motivo: textoCurto(obj?.motivo) })
    }
  })

  const emissao = emissaoDoRelatorio(rel)
  const foraDeServico = !!(emissao?.recomendaRetirada || (rel && decisaoOperacionalElevador(itens, respostas)))
  const pedidoReparacao = emissao?.pedidoReparacao === 'sim' ? textoCurto(emissao.pedidoReparacaoDescricao || 'Reparação pedida pelo cliente') : ''

  const notas = rel?.notas ? linhasNotasRelatorio(rel.notas).map(l => textoCurto(l, 120)).slice(0, 3) : []
  const horas = horasContadorNaManutencao(manut)

  let diasDesde = null
  if (hoje && manut.data) {
    const a = new Date(`${String(manut.data).slice(0, 10)}T12:00:00`)
    const b = new Date(`${hoje}T12:00:00`)
    if (!Number.isNaN(a.getTime()) && !Number.isNaN(b.getTime())) {
      diasDesde = Math.round((b - a) / 86400000)
    }
  }

  return {
    manutencaoId: manut.id,
    data: String(manut.data || '').slice(0, 10),
    tipo: manut.tipo || 'periodica',
    tecnico: rel?.tecnico || manut.tecnico || '',
    numeroRelatorio: rel?.numeroRelatorio || '',
    temRelatorio: !!rel,
    anomalias,
    documentosEmFalta,
    naoExecutados,
    foraDeServico,
    pedidoReparacao,
    notas,
    horas,
    diasDesde,
    temPendencias: anomalias.length > 0 || documentosEmFalta.length > 0 || naoExecutados.length > 0 || foraDeServico || !!pedidoReparacao,
  }
}
