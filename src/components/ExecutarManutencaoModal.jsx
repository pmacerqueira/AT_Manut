/**
 * ExecutarManutencaoModal – Modal para executar manutenção.
 * Fluxo standard: checklist → notas + fotos → técnico → cliente → assinatura → finalizar.
 * KAESER A/B/C/D (periódica): horas de serviço + tipo → consumíveis (qtd editável) → checklist → resto igual.
 * Fotos: câmara ou galeria; compressão em `utils/comprimirImagemRelatorio.js`.
 */
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useData } from '../context/DataContext'
import { logger } from '../utils/logger'
import {
  SUBCATEGORIAS_COM_CONTADOR_HORAS,
  INTERVALOS_KAESER,
  SEQUENCIA_KAESER,
  tipoKaeserNaPosicao,
  proximaPosicaoKaeser,
  descricaoCicloKaeser,
  isKaeserAbcdMaquina,
  tipoKaeserSugeridoPorHorasServico,
} from '../context/DataContext'
import { KAESER_INTERVALO_HORAS_REF, KAESER_ANUAL_MIN_DIAS, KAESER_DELTA_H_WARNING_ANUAL } from '../constants/kaeserCiclo.js'
import { sugerirFaseKaeser } from '../utils/sugerirFaseKaeser.js'
import { format, addDays } from 'date-fns'
import { getHojeAzores, nowISO } from '../utils/datasAzores'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, PenLine, Trash2, Camera, X, CalendarClock, AlertTriangle, CheckCircle2, Mail, Eye, History, Save, Bookmark, ChevronLeft, ChevronRight, FileDown, Plus, HelpCircle } from 'lucide-react'
import { usePermissions, isRelatorioEnviadoAoCliente } from '../hooks/usePermissions'
import { formatarDataPT, distribuirHorarios, buildFeriadosSet, proximoDiaUtilLivre } from '../utils/diasUteis'
import { enviarRelatorioEmail } from '../services/emailService'
import { gerarPdfCompacto } from '../utils/gerarPdfRelatorio'
import { isEmailConfigured } from '../config/emailConfig'
import MaquinaDocumentacaoLinks from './MaquinaDocumentacaoLinks'
import { MAX_FOTOS } from '../config/limits'
import { categoriaNomeFromMaquina, declaracaoClienteDepoisFromMaquina, resolveDeclaracaoClienteForMaquina } from '../constants/relatorio'
import { candidatosMesmaDataMinimaAberta } from '../utils/proximaManutAgenda'
import { fileToMemory, comprimirFotoParaRelatorio } from '../utils/comprimirImagemRelatorio'
import {
  horasContadorNaFicha,
  horasContadorNaManutencao,
  parseHorasContadorForm,
} from '../utils/horasContadorEquipamento.js'
import { normEntityId } from '../utils/frotaReportHelpers'

const STEP_LABELS_BASE = ['Confirmação', 'Checklist', 'Observações', 'Fotografias', 'Técnico', 'Cliente', 'Assinatura', 'Finalizar']
const STEP_LABELS_KAESER = ['Confirmação', 'Horas e fase KAESER', 'Consumíveis', 'Checklist', 'Observações', 'Fotografias', 'Técnico', 'Cliente', 'Assinatura', 'Finalizar']

function sanitizarPecasRelatorio(pecasUsadas) {
  return pecasUsadas.map(p => {
    const q = Math.max(0, Number(p.quantidadeUsada ?? p.quantidade ?? 0))
    return { ...p, quantidade: q, quantidadeUsada: q, usado: q > 0 }
  })
}

const QUICK_NOTES_DEFAULT = [
  'Equipamento em bom estado geral',
  'Desgaste normal, dentro do esperado',
  'Necessita acompanhamento na próxima visita',
  'Cliente informado de anomalia',
  'Peça substituída preventivamente',
  'Ruído anormal detetado — monitorizar',
  'Lubrificação efetuada em todos os pontos',
  'Alinhamento verificado e corrigido',
  'Filtros substituídos conforme plano',
  'Sem observações adicionais',
]

function getQuickNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem('atm_quick_notes') || 'null')
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch { /* fallback */ }
  return QUICK_NOTES_DEFAULT
}

/** Respostas da checklist: API pode devolver object ou JSON em string (cache/offline). */
function normalizarChecklistRespostasMap(raw) {
  if (raw == null || raw === '') return {}
  let o = raw
  if (typeof raw === 'string') {
    try {
      o = JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (typeof o !== 'object' || o === null || Array.isArray(o)) return {}
  return o
}

const OBSERVACOES_TEXTO_LIVRE_MIN = 24

/** Observações aceites por nota rápida ou por texto livre minimamente descritivo. */
function notasCumpremMinimoObservacoes(notas, quickNotesList) {
  const t = (notas || '').trim()
  if (!t) return false
  const list = Array.isArray(quickNotesList) && quickNotesList.length > 0 ? quickNotesList : QUICK_NOTES_DEFAULT
  if (list.some((q) => typeof q === 'string' && q.trim().length > 0 && t.includes(q))) return true
  return t.length >= OBSERVACOES_TEXTO_LIVRE_MIN && /\s/.test(t)
}

/** Snapshot estável para comparar se o utilizador alterou o assistente (cancelar com confirmação). */
function snapshotExecCancelState({
  form,
  fotos,
  emailDestinatario,
  assinaturaFeita,
  step,
  confirmaEquipamentoSerie,
  adminEdit,
  hasPreviewPdf,
  kaeserPecasDirty,
}) {
  const cr = form?.checklistRespostas || {}
  const checklist = Object.keys(cr).sort().reduce((acc, k) => {
    acc[k] = cr[k]
    return acc
  }, {})
  const pecasNorm = (form?.pecasUsadas || []).map(p => ({
    id: p.id,
    codigoArtigo: p.codigoArtigo ?? '',
    descricao: p.descricao ?? '',
    quantidadeUsada: Number(p.quantidadeUsada ?? p.quantidade ?? 0),
    usado: !!p.usado,
    unidade: p.unidade || 'PÇ',
  }))
  const fotosNorm = (fotos || []).map(f => f.id || f.preview || f.name || '').join('|')
  return JSON.stringify({
    checklist,
    notas: form?.notas || '',
    horasServico: form?.horasServico || '',
    tecnico: form?.tecnico || '',
    nomeAssinante: form?.nomeAssinante || '',
    tipoManutKaeser: form?.tipoManutKaeser || '',
    pecas: pecasNorm,
    dataRealizacao: form?.dataRealizacao || '',
    adminStatus: form?.adminStatus || '',
    adminDataAgendada: form?.adminDataAgendada || '',
    adminDataExecucao: form?.adminDataExecucao || '',
    limparAssinatura: !!form?.limparAssinatura,
    fotos: fotosNorm,
    email: emailDestinatario || '',
    assinaturaFeita: !!assinaturaFeita,
    step,
    confirmaEquipamentoSerie: !!confirmaEquipamentoSerie,
    adminEdit: !!adminEdit,
    preview: !!hasPreviewPdf,
    kaeserPecasDirty: !!kaeserPecasDirty,
  })
}

export default function ExecutarManutencaoModal({ isOpen, onClose, manutencao, maquina, adminEdit = false, quickEdit = false }) {
  const { isAdmin } = usePermissions()
  const {
    manutencoes,
    clientes,
    addManutencao,
    updateManutencao,
    addRelatorio,
    updateRelatorio,
    getRelatorioByManutencao,
    prepararManutencoesPeriodicas,
    confirmarManutencoesPeriodicas,
    recalcularPeriodicasAposExecucao,
    sincronizarProximaManutComAgenda,
    getIntervaloDiasByMaquina,
    getChecklistBySubcategoria,
    getSubcategoria,
    getCategoria,
    updateMaquina,
    updateCliente,
    getPecasPlanoByMaquina,
    tecnicos,
    getTecnicoByNome,
    relatorios: todosRelatorios,
    marcas,
  } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const nomesTecnicos = useMemo(() => tecnicos.filter(t => t.ativo !== false).map(t => t.nome), [tecnicos])
  const quickNotes = useMemo(() => getQuickNotes(), [isOpen])

  const [form, setForm] = useState({
    checklistRespostas: {},
    notas: '',
    horasServico: '',
    tecnico: '',
    nomeAssinante: '',
    tipoManutKaeser: '',
    pecasUsadas: [],
    dataRealizacao: '', // Admin only — data histórica (YYYY-MM-DD); vazio = usa data de hoje
  })
  const [fotos, setFotos] = useState([])
  const [fotoCarregando, setFotoCarregando] = useState(false)
  const [manutencaoAtual, setManutencaoAtual] = useState(null)
  const [erroChecklist, setErroChecklist] = useState('')
  const [erroAssinatura, setErroAssinatura] = useState('')
  const [assinaturaFeita, setAssinaturaFeita] = useState(false)
  /** True após «Limpar assinatura» no canvas — não reutilizar assinatura antiga do relatório ao gravar. */
  const [signatureClearedByUser, setSignatureClearedByUser] = useState(false)
  const [manutAgendadas, setManutAgendadas] = useState(0)
  const [concluido, setConcluido] = useState(false)
  /** 'executada' | 'gravado_sem_email' — texto do ecrã após concluir (último passo). */
  const [conclusaoVariant, setConclusaoVariant] = useState('executada')
  const [conflitosAgendamento, setConflitosAgendamento] = useState(null)
  const [emailDestinatario, setEmailDestinatario] = useState('')
  const [emailEnviando, setEmailEnviando] = useState(false)
  const [step, setStep] = useState(1)
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(null)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preFilledFromLast, setPreFilledFromLast] = useState(false)
  /** idle | form | no_intervention | choose_intervention — só para abertura sem `manutencao` explícita. */
  const [execUiPhase, setExecUiPhase] = useState('idle')
  const [opcoesEscolha, setOpcoesEscolha] = useState([])
  const [kaeserCalcDetalhesOpen, setKaeserCalcDetalhesOpen] = useState(false)
  const [kaeserPecasDirty, setKaeserPecasDirty] = useState(false)
  const [confirmaEquipamentoSerie, setConfirmaEquipamentoSerie] = useState(false)
  const [kaeserSemConsumiveis, setKaeserSemConsumiveis] = useState(false)
  /** Intervenção anual: escolha livre de kit A/B/C/D; não sobrescrever tipo no blur das horas. */
  const [kaeserIntervencaoAnual, setKaeserIntervencaoAnual] = useState(false)

  const navigate = useNavigate()
  const canvasRef   = useRef(null)
  const drawingRef  = useRef(false)
  const lastPosRef  = useRef({ x: 0, y: 0 })
  const fotoInputRef = useRef(null)
  const fotoCameraRef = useRef(null)
  /** Evita repetir bootstrap do formulário para o mesmo `manutencaoAtual.id`. */
  const bootstrappedIdRef = useRef(null)
  /** Re-bootstrap quando o relatório (checklist gravada) aparece ou muda no estado. */
  const bootstrapRelSigRef = useRef('')
  const modalRef = useRef(null)
  /** Estado inicial do assistente após bootstrap — para confirmar saída só se houve alterações. */
  const execCancelBaselineRef = useRef('')
  /** Última sugestão do motor (para auditoria no relatório). */
  const kaeserAuditoriaRef = useRef({ tipoSugerido: null, motivo: null })
  const kaeserWarnAnualHighDeltaRef = useRef(false)

  const maq = maquina
  const { categoriaNome, declaracaoClienteDepois } = useMemo(() => ({
    categoriaNome: categoriaNomeFromMaquina(maq, getSubcategoria, getCategoria),
    declaracaoClienteDepois: declaracaoClienteDepoisFromMaquina(maq, getSubcategoria, getCategoria),
  }), [maq, getSubcategoria, getCategoria])
  const cli = useMemo(() => clientes.find(c => c.nif === maq?.clienteNif) ?? null, [clientes, maq?.clienteNif])
  const items = maq ? getChecklistBySubcategoria(maq.subcategoriaId, manutencaoAtual?.tipo || 'periodica') : []
  const rel   = manutencaoAtual ? getRelatorioByManutencao(manutencaoAtual.id) : null
  const isCorrectionMode = adminEdit || quickEdit
  /** Admin: `adminEdit`. ATecnica: relatório ainda não enviado ao cliente — podem corrigir agendamento e data de execução. */
  const showStatusDatasSection = isCorrectionMode || (!!rel && !isRelatorioEnviadoAoCliente(rel) && !isAdmin)
  const temContadorHoras = maq && SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maq.subcategoriaId)
  const isKaeserAbcdMaq = maq ? isKaeserAbcdMaquina(maq) : false
  const isKaeserPeriodicExec = !!(isKaeserAbcdMaq && manutencaoAtual && manutencaoAtual.tipo !== 'montagem')
  const useKaeserPipeline = isKaeserPeriodicExec && !isCorrectionMode

  /** Data da manutenção concluída mais recente (para fallback quando a ficha não tem `ultimaManutencaoData`). */
  const fallbackUltimaManutDataKaeser = useMemo(() => {
    if (!maq?.id) return null
    const done = manutencoes
      .filter(mt => String(mt.maquinaId) === String(maq.id) && mt.status === 'concluida')
      .sort((a, b) => b.data.localeCompare(a.data))
    return done[0]?.data ?? null
  }, [maq?.id, manutencoes])

  const temManutencaoConcluidaNaMaq = useMemo(() => {
    if (!maq?.id) return false
    return manutencoes.some(m => String(m.maquinaId) === String(maq.id) && m.status === 'concluida')
  }, [manutencoes, maq?.id])

  const conflitoHorasFichaVsUltimoRel = useMemo(() => {
    if (!maq?.id) return null
    const last = manutencoes
      .filter(mt => mt.maquinaId === maq.id && mt.status === 'concluida')
      .sort((a, b) => b.data.localeCompare(a.data))[0]
    if (!last) return null
    const hm = horasContadorNaFicha(maq)
    const hr = horasContadorNaManutencao(last)
    if (hm == null || hr == null || Number(hm) === Number(hr)) return null
    return { last, hm, hr }
  }, [maq, manutencoes])

  const W = useMemo(() => {
    if (useKaeserPipeline) {
      return {
        total: 10,
        labels: STEP_LABELS_KAESER,
        verif: 1,
        horas: 2,
        pecas: 3,
        checklist: 4,
        notas: 5,
        fotos: 6,
        tec: 7,
        cli: 8,
        ass: 9,
        fin: 10,
      }
    }
    return {
      total: 8,
      labels: STEP_LABELS_BASE,
      verif: 1,
      checklist: 2,
      notas: 3,
      fotos: 4,
      tec: 5,
      cli: 6,
      ass: 7,
      fin: 8,
      horas: null,
      pecas: null,
    }
  }, [useKaeserPipeline])

  useLayoutEffect(() => {
    if (!isOpen) {
      setExecUiPhase('idle')
      setOpcoesEscolha([])
      setManutencaoAtual(null)
      bootstrappedIdRef.current = null
      bootstrapRelSigRef.current = ''
      setStep(1)
      setConfirmacaoPendente(null)
      setPreviewLoading(false)
      if (previewPdfUrl) { URL.revokeObjectURL(previewPdfUrl); setPreviewPdfUrl(null) }
      setKaeserCalcDetalhesOpen(false)
      setKaeserPecasDirty(false)
      setConfirmaEquipamentoSerie(false)
      setKaeserSemConsumiveis(false)
      setKaeserIntervencaoAnual(false)
      kaeserAuditoriaRef.current = { tipoSugerido: null, motivo: null }
      kaeserWarnAnualHighDeltaRef.current = false
      execCancelBaselineRef.current = ''
      setSignatureClearedByUser(false)
      setConclusaoVariant('executada')
      return
    }
    if (!maq) return

    // Não repor bootstrappedIdRef aqui: `manutencoes` muda com frequência no DataContext e
    // anular o ref fazia o useEffect de bootstrap voltar a correr e `setFotos(rel)` apagava
    // fotos recém-adicionadas no «Editar relatório» / execução (menos de 1s após a galeria).
    if (isCorrectionMode && manutencao) {
      setExecUiPhase('form')
      setManutencaoAtual(prev => (prev?.id === manutencao.id ? prev : manutencao))
      setOpcoesEscolha([])
      return
    }
    if (manutencao) {
      setExecUiPhase('form')
      setManutencaoAtual(prev => (prev?.id === manutencao.id ? prev : manutencao))
      setOpcoesEscolha([])
      return
    }
    if (!isCorrectionMode) {
      const candidatos = candidatosMesmaDataMinimaAberta(maq.id, manutencoes)
      if (candidatos.length === 0) {
        setExecUiPhase('no_intervention')
        setManutencaoAtual(null)
        setOpcoesEscolha([])
        bootstrappedIdRef.current = null
        return
      }
      if (candidatos.length > 1) {
        setExecUiPhase('choose_intervention')
        setManutencaoAtual(null)
        setOpcoesEscolha(candidatos)
        bootstrappedIdRef.current = null
        return
      }
      setExecUiPhase('form')
      const escolhido = candidatos[0]
      setManutencaoAtual(prev => {
        if (prev?.id === escolhido.id) return prev
        bootstrappedIdRef.current = null
        return escolhido
      })
      setOpcoesEscolha([])
    }
  }, [isOpen, adminEdit, quickEdit, isCorrectionMode, manutencao?.id, maq?.id, manutencoes])

  useEffect(() => {
    if (!isOpen) return
    if (execUiPhase !== 'form' || !manutencaoAtual || !maq) return
    const mid = normEntityId(manutencaoAtual.id)
    const existingRelPeek = getRelatorioByManutencao(manutencaoAtual.id)
    const chkRawPeek = existingRelPeek?.checklistRespostas
    const chkKey = typeof chkRawPeek === 'string' ? chkRawPeek : JSON.stringify(chkRawPeek ?? {})
    const bootstrapSig = `${mid}|${existingRelPeek?.id ?? 'norel'}|${chkKey}`

    if (bootstrappedIdRef.current === mid && bootstrapRelSigRef.current === bootstrapSig) return
    bootstrappedIdRef.current = mid
    bootstrapRelSigRef.current = bootstrapSig

    const m = manutencaoAtual
    const checklistRespostas = {}
    const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m?.tipo || 'periodica') : []
    const existingRel = m ? getRelatorioByManutencao(m.id) : null

    const tipoAtual = m?.tipo || 'periodica'
    let lastRel = null
    if (!existingRel && maq) {
      const manutsConclMaq = manutencoes
        .filter(mt => normEntityId(mt.maquinaId) === normEntityId(maq.id) && mt.status === 'concluida' && mt.tipo === tipoAtual)
        .sort((a, b) => String(b.data).localeCompare(String(a.data)))
      for (const mt of manutsConclMaq) {
        const r = todosRelatorios.find(rr => normEntityId(rr.manutencaoId) === normEntityId(mt.id))
        const mapCh = r ? normalizarChecklistRespostasMap(r.checklistRespostas) : {}
        if (Object.keys(mapCh).length > 0) {
          lastRel = r
          break
        }
      }
    }
    const fontePreFill = existingRel || lastRel
    const isPreFilled = !existingRel && !!lastRel
    setPreFilledFromLast(isPreFilled)

    const prefillMap = normalizarChecklistRespostasMap(fontePreFill?.checklistRespostas)
    checklistItems.forEach((it) => {
      checklistRespostas[it.id] = prefillMap[it.id] ?? prefillMap[String(it.id)] ?? ''
    })
    const tipoAutoCiclo = isKaeserAbcdMaquina(maq) && maq.posicaoKaeser != null
      ? tipoKaeserNaPosicao(maq.posicaoKaeser)
      : ''
    const horasNaManutAberta = m ? horasContadorNaManutencao(m) : null
    const horasNaFicha = temManutencaoConcluidaNaMaq ? horasContadorNaFicha(maq) : null
    const hsBootstrapRaw = horasNaManutAberta ?? horasNaFicha
    const hsBootstrap = hsBootstrapRaw != null ? Number(hsBootstrapRaw) : NaN
    const sugBootstrap = isKaeserAbcdMaquina(maq) && Number.isFinite(hsBootstrap) && hsBootstrap >= 0
      ? sugerirFaseKaeser({
          maquina: maq,
          horasServicoAtuais: hsBootstrap,
          dataExecucao: getHojeAzores(),
          fallbackUltimaData: fallbackUltimaManutDataKaeser,
          contadorFichaConfiavel: temManutencaoConcluidaNaMaq,
        })
      : null
    let tipoManutKaeser = existingRel?.tipoManutKaeser ?? m?.tipoManutKaeser ?? tipoAutoCiclo
    if (!tipoManutKaeser && sugBootstrap) {
      tipoManutKaeser = sugBootstrap.tipoPreSelecao
    }
    kaeserAuditoriaRef.current = {
      tipoSugerido: existingRel?.tipoManutKaeserSugerido ?? sugBootstrap?.tipoPreSelecao ?? null,
      motivo: existingRel?.sugestaoFaseMotivo ?? sugBootstrap?.motivoPrincipal ?? null,
    }
    const pecasExistentes = existingRel?.pecasUsadas ?? []
    const normalizarPecasBootstrap = (lista) => lista.map(p => {
      if (p.quantidadeUsada != null && p.quantidadeUsada !== '') {
        const q = Math.max(0, Number(p.quantidadeUsada))
        return { ...p, quantidadeUsada: q, quantidade: q, usado: q > 0 }
      }
      if ('usado' in p) {
        const q = p.usado ? Math.max(1, Number(p.quantidade ?? 1)) : 0
        return { ...p, quantidadeUsada: q, quantidade: q, usado: p.usado }
      }
      const q = Math.max(0, Number(p.quantidade ?? 0))
      return { ...p, quantidadeUsada: q > 0 ? q : 1, quantidade: q > 0 ? q : 1, usado: q > 0 }
    })
    const pecasUsadas = pecasExistentes.length > 0
      ? normalizarPecasBootstrap(pecasExistentes)
      : (tipoManutKaeser && maq
          ? (getPecasPlanoByMaquina(maq.id, tipoManutKaeser) ?? []).map(p => ({
              ...p,
              quantidadeUsada: 1,
              quantidade: 1,
              usado: true,
            }))
          : [])
    const nomePreenchido = existingRel?.nomeAssinante || cli?.nomeContacto || ''
    const horasIniciaisUnificadas = horasNaManutAberta ?? horasNaFicha
    const nextFotos = existingRel?.fotos ?? []
    const nextForm = {
      checklistRespostas,
      notas: isPreFilled ? '' : (existingRel?.notas ?? '').slice(0, 300),
      horasServico: horasIniciaisUnificadas != null ? String(horasIniciaisUnificadas) : '',
      tecnico: existingRel?.tecnico ?? '',
      nomeAssinante: nomePreenchido,
      tipoManutKaeser,
      pecasUsadas,
      dataRealizacao: (!isCorrectionMode && m?.data && m.data < getHojeAzores()) ? getHojeAzores() : '',
      adminStatus: m?.status || 'concluida',
      adminDataAgendada: m?.data || '',
      adminDataExecucao: existingRel
        ? ((existingRel.dataAssinatura || existingRel.dataCriacao || '').slice(0, 10) || m?.data || '')
        : (m?.data || ''),
      limparAssinatura: false,
    }
    setForm(nextForm)
    setFotos(nextFotos)
    setErroChecklist('')
    setErroAssinatura('')
    setAssinaturaFeita(false)
    setSignatureClearedByUser(false)
    const clienteEmail = cli?.email ?? ''
    setEmailDestinatario(clienteEmail)
    const assinaturaBaseline = !!(existingRel?.assinaturaDigital || cli?.assinaturaContacto)
    execCancelBaselineRef.current = snapshotExecCancelState({
      form: nextForm,
      fotos: nextFotos,
      emailDestinatario: clienteEmail,
      assinaturaFeita: assinaturaBaseline,
      step: 1,
      confirmaEquipamentoSerie: false,
      adminEdit: isCorrectionMode,
      hasPreviewPdf: false,
      kaeserPecasDirty: false,
    })
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Prioridade: assinatura já guardada no relatório (edição antes de enviar ao cliente);
      // senão, assinatura reutilizável do contacto do cliente.
      const assinaturaImgSrc = existingRel?.assinaturaDigital || cli?.assinaturaContacto || null
      if (assinaturaImgSrc) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          setAssinaturaFeita(true)
        }
        img.onerror = () => {
          logger.warn('ExecutarManutencaoModal', 'bootstrapAssinatura', 'Falha ao carregar imagem de assinatura no canvas', {
            temRelatorio: !!existingRel?.assinaturaDigital,
          })
        }
        img.src = assinaturaImgSrc
      }
    })
  }, [isOpen, execUiPhase, manutencaoAtual?.id, maq?.id, adminEdit, quickEdit, isCorrectionMode, manutencoes, getChecklistBySubcategoria, getRelatorioByManutencao, getPecasPlanoByMaquina, todosRelatorios, fallbackUltimaManutDataKaeser, temManutencaoConcluidaNaMaq, cli?.assinaturaContacto])

  const confirmarCriarIntervencaoHoje = useCallback(() => {
    if (!maq) return
    if (!window.confirm('Criar uma manutenção pendente para hoje neste equipamento? Depois poderá preencher o relatório de execução.')) return
    const hoje = getHojeAzores()
    const id = addManutencao({
      maquinaId: maq.id,
      data: hoje,
      tipo: 'periodica',
      tecnico: '',
      status: 'pendente',
      observacoes: '',
    })
    bootstrappedIdRef.current = null
    setManutencaoAtual({
      id,
      maquinaId: maq.id,
      data: hoje,
      tipo: 'periodica',
      tecnico: '',
      status: 'pendente',
      observacoes: '',
    })
    setExecUiPhase('form')
    logger.action('ExecutarManutencaoModal', 'criarIntervencaoHoje', `Pendente criada para ${hoje}`, { maquinaId: maq.id, manutencaoId: id })
  }, [maq, addManutencao])

  const escolherIntervencaoParaExecutar = useCallback((m) => {
    bootstrappedIdRef.current = null
    setManutencaoAtual(m)
    setExecUiPhase('form')
    setOpcoesEscolha([])
  }, [])

  const handleCancelarExecucao = useCallback(() => {
    const atual = snapshotExecCancelState({
      form,
      fotos,
      emailDestinatario,
      assinaturaFeita,
      step,
      confirmaEquipamentoSerie,
      adminEdit: isCorrectionMode,
      hasPreviewPdf: !!previewPdfUrl,
      kaeserPecasDirty,
    })
    const base = execCancelBaselineRef.current
    if (base && atual !== base) {
      if (!window.confirm(
        'Tem a certeza que pretende sair? O progresso e os dados preenchidos neste assistente serão perdidos.',
      )) return
    }
    onClose()
  }, [
    form,
    fotos,
    emailDestinatario,
    assinaturaFeita,
    step,
    confirmaEquipamentoSerie,
    adminEdit,
    quickEdit,
    isCorrectionMode,
    previewPdfUrl,
    kaeserPecasDirty,
    onClose,
  ])

  useEffect(() => {
    if (modalRef.current) modalRef.current.scrollTop = 0
  }, [step])

  useEffect(() => {
    return () => { if (previewPdfUrl) URL.revokeObjectURL(previewPdfUrl) }
  }, [previewPdfUrl])

  // ── Canvas de assinatura ─────────────────────────────────────────────────
  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top)  * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    }
  }, [])

  const startDraw = useCallback((e) => {
    e.preventDefault()
    drawingRef.current = true
    lastPosRef.current = getPos(e, canvasRef.current)
  }, [getPos])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!drawingRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1a1a1a'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPosRef.current = pos
    setAssinaturaFeita(true)
  }, [getPos])

  const stopDraw = useCallback((e) => {
    e.preventDefault()
    drawingRef.current = false
  }, [])

  const limparAssinatura = useCallback(() => {
    const canvas = canvasRef.current
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setAssinaturaFeita(false)
    setSignatureClearedByUser(true)
  }, [])

  const guardarNomeContacto = useCallback(() => {
    const nome = form.nomeAssinante.trim()
    if (!nome || !maq?.clienteNif) return
    updateCliente(maq.clienteNif, { nomeContacto: nome })
    showToast('Nome do contacto guardado para futuras intervenções', 'success')
    logger.action('ExecutarManutencaoModal', 'guardarNomeContacto', `Nome "${nome}" guardado para cliente ${maq.clienteNif}`)
  }, [form.nomeAssinante, maq?.clienteNif, updateCliente, showToast])

  const guardarAssinaturaContacto = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !assinaturaFeita || !maq?.clienteNif) return
    const dataUrl = canvas.toDataURL('image/png')
    updateCliente(maq.clienteNif, { assinaturaContacto: dataUrl })
    showToast('Assinatura guardada para futuras intervenções', 'success')
    logger.action('ExecutarManutencaoModal', 'guardarAssinaturaContacto', `Assinatura guardada para cliente ${maq.clienteNif}`)
  }, [assinaturaFeita, maq?.clienteNif, updateCliente, showToast])

  // ── Fotos ────────────────────────────────────────────────────────────────
  // Em mobile: copiar para memória imediatamente evita que fotos da câmara desapareçam
  // (o SO revoga ficheiros temp quando o picker fecha). Processar sequencialmente reduz o risco.
  const handleFotoChange = useCallback(async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const disponiveis = MAX_FOTOS - fotos.length
    if (disponiveis <= 0) {
      showToast(`Limite de ${MAX_FOTOS} fotografias atingido.`, 'warning')
      if (fotoInputRef.current) fotoInputRef.current.value = ''
      if (fotoCameraRef.current) fotoCameraRef.current.value = ''
      return
    }
    const ficheiros = files.slice(0, disponiveis)
    if (files.length > ficheiros.length) {
      showToast(`Só couberam mais ${ficheiros.length} foto(s) (máx. ${MAX_FOTOS} por relatório).`, 'warning')
    }
    setFotoCarregando(true)
    const novas = []
    try {
      for (const file of ficheiros) {
        const blob = await fileToMemory(file)
        const dataUrl = await comprimirFotoParaRelatorio(blob)
        novas.push(dataUrl)
      }
      setFotos(prev => [...prev, ...novas])
    } catch (err) {
      showToast(err?.message || 'Não foi possível processar a fotografia.', 'error', 4000)
      logger.warn('ExecutarManutencaoModal', 'handleFotoChange', 'Falha ao adicionar foto', { msg: err?.message })
    } finally {
      setFotoCarregando(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
      if (fotoCameraRef.current) fotoCameraRef.current.value = ''
    }
  }, [fotos.length, showToast])

  const removerFoto = useCallback((idx) => {
    setFotos(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // ── Wizard: validação por etapa + navegação ──────────────────────────────
  const validateStep = useCallback((s) => {
    const validarChecklistCompleta = () => {
      const todasMarcadas = items.length === 0 || items.every(it =>
        form.checklistRespostas[it.id] === 'sim' || form.checklistRespostas[it.id] === 'nao'
      )
      if (!todasMarcadas) {
        setErroChecklist('Todas as linhas da checklist devem ser verificadas.')
        return false
      }
      setErroChecklist('')
      return true
    }

    if (s === W.verif) {
      if (!confirmaEquipamentoSerie) {
        setErroChecklist('Confirme o número de série do equipamento antes de avançar.')
        return false
      }
      if (temContadorHoras && !useKaeserPipeline) {
        const hs = String(form.horasServico).trim()
        if (hs === '' || Number.isNaN(Number(hs)) || Number(hs) < 0) {
          setErroChecklist('Indique as horas no contador (acumuladas) — leitura actual.')
          return false
        }
      }
      setErroChecklist('')
      return true
    }

    if (useKaeserPipeline) {
      if (s === W.horas) {
        const hs = String(form.horasServico).trim()
        if (hs === '' || Number.isNaN(Number(hs)) || Number(hs) < 0) {
          setErroChecklist('Indique as horas no contador (acumuladas) do compressor.')
          return false
        }
        if (!form.tipoManutKaeser) {
          setErroChecklist('Seleccione o tipo de manutenção KAESER (A/B/C/D).')
          return false
        }
        setErroChecklist('')
        return true
      }
      if (s === W.pecas) {
        const pecasSan = sanitizarPecasRelatorio(form.pecasUsadas)
        const algumUsado = pecasSan.some(p => p.usado && Number(p.quantidadeUsada) > 0)
        if (!algumUsado && !kaeserSemConsumiveis) {
          setErroChecklist('Indique consumíveis com quantidade superior a zero ou confirme que não houve materiais nesta intervenção.')
          return false
        }
        setErroChecklist('')
        return true
      }
      if (s === W.checklist) return validarChecklistCompleta()
      if (s === W.notas) {
        if (!form.notas.trim()) {
          setErroChecklist('As observações são obrigatórias. Utilize uma nota rápida ou descreva o trabalho.')
          return false
        }
        if (!notasCumpremMinimoObservacoes(form.notas, quickNotes)) {
          setErroChecklist(`Use uma nota rápida ou escreva pelo menos ${OBSERVACOES_TEXTO_LIVRE_MIN} caracteres descritivos.`)
          return false
        }
        setErroChecklist('')
        return true
      }
      if (s === W.fotos) {
        if (fotos.length === 0 && confirmacaoPendente !== 'fotos') {
          setConfirmacaoPendente('fotos')
          return false
        }
        return true
      }
      if (s === W.tec) {
        if (!form.tecnico) {
          setErroAssinatura('Selecione o técnico que realizou a manutenção.')
          return false
        }
        setErroAssinatura('')
        return true
      }
      if (s === W.cli) {
        if (!form.nomeAssinante.trim()) {
          setErroAssinatura('Indique o nome do cliente que assina o relatório.')
          return false
        }
        setErroAssinatura('')
        return true
      }
      if (s === W.ass) {
        const temAssinaturaOuRel = assinaturaFeita || (!!rel?.assinaturaDigital && !signatureClearedByUser)
        if (!isAdmin && !temAssinaturaOuRel) {
          setErroAssinatura('A assinatura digital do cliente é obrigatória.')
          return false
        }
        setErroAssinatura('')
        return true
      }
      return true
    }

    if (s === W.checklist) return validarChecklistCompleta()
    if (s === W.notas) {
      if (!form.notas.trim()) {
        setErroChecklist('As observações são obrigatórias. Utilize uma nota rápida ou descreva o trabalho.')
        return false
      }
      if (!notasCumpremMinimoObservacoes(form.notas, quickNotes)) {
        setErroChecklist(`Use uma nota rápida ou escreva pelo menos ${OBSERVACOES_TEXTO_LIVRE_MIN} caracteres descritivos.`)
        return false
      }
      setErroChecklist('')
      return true
    }
    if (s === W.fotos) {
      if (fotos.length === 0 && confirmacaoPendente !== 'fotos') {
        setConfirmacaoPendente('fotos')
        return false
      }
      return true
    }
    if (s === W.tec) {
      if (!form.tecnico) {
        setErroAssinatura('Selecione o técnico que realizou a manutenção.')
        return false
      }
      setErroAssinatura('')
      return true
    }
    if (s === W.cli) {
      if (!form.nomeAssinante.trim()) {
        setErroAssinatura('Indique o nome do cliente que assina o relatório.')
        return false
      }
      setErroAssinatura('')
      return true
    }
    if (s === W.ass) {
      const temAssinaturaOuRel = assinaturaFeita || (!!rel?.assinaturaDigital && !signatureClearedByUser)
      if (!isAdmin && !temAssinaturaOuRel) {
        setErroAssinatura('A assinatura digital do cliente é obrigatória.')
        return false
      }
      setErroAssinatura('')
      return true
    }
    return true
  }, [useKaeserPipeline, W, form, items, fotos, assinaturaFeita, signatureClearedByUser, rel?.assinaturaDigital, confirmacaoPendente, isAdmin, confirmaEquipamentoSerie, temContadorHoras, kaeserSemConsumiveis, quickNotes])

  const goNext = useCallback(() => {
    if (step >= W.total) return
    if (!validateStep(step)) return
    setStep(s => s + 1)
    setConfirmacaoPendente(null)
    setErroChecklist('')
    setErroAssinatura('')
  }, [step, W.total, validateStep])

  const goPrev = useCallback(() => {
    setStep(s => Math.max(1, s - 1))
    setConfirmacaoPendente(null)
    setErroChecklist('')
    setErroAssinatura('')
  }, [])

  const pecasDoPlanoKaeser = useCallback((tipo) => {
    if (!tipo || !maq) return []
    return (getPecasPlanoByMaquina(maq.id, tipo) ?? []).map(p => ({
      ...p,
      quantidadeUsada: 1,
      quantidade: 1,
      usado: true,
    }))
  }, [maq, getPecasPlanoByMaquina])

  /** Altera tipo KAESER e repõe consumíveis do plano; confirma se `pecasDirty` (excepto `skipDirtyConfirm`). */
  const aplicarTipoKaeserComPecas = useCallback((tipo, opts = {}) => {
    const skipDirtyConfirm = opts.skipDirtyConfirm === true
    if (!tipo) {
      setKaeserPecasDirty(false)
      setForm(f => ({ ...f, tipoManutKaeser: '', pecasUsadas: [] }))
      return
    }
    if (!skipDirtyConfirm && kaeserPecasDirty && form.tipoManutKaeser && form.tipoManutKaeser !== tipo) {
      if (!window.confirm('Já alterou consumíveis manualmente. Substituir pelo plano do tipo seleccionado?')) return
    }
    setKaeserPecasDirty(false)
    setForm(f => ({
      ...f,
      tipoManutKaeser: tipo,
      pecasUsadas: pecasDoPlanoKaeser(tipo),
    }))
  }, [pecasDoPlanoKaeser, kaeserPecasDirty, form.tipoManutKaeser])

  const kaeserSugestaoLive = useMemo(() => {
    if (!maq || !isKaeserAbcdMaq) return null
    const hs = parseInt(String(form.horasServico).trim(), 10)
    if (!Number.isFinite(hs) || hs < 0) return null
    return sugerirFaseKaeser({
      maquina: maq,
      horasServicoAtuais: hs,
      dataExecucao: getHojeAzores(),
      fallbackUltimaData: fallbackUltimaManutDataKaeser,
      contadorFichaConfiavel: temManutencaoConcluidaNaMaq,
    })
  }, [maq, isKaeserAbcdMaq, form.horasServico, fallbackUltimaManutDataKaeser, temManutencaoConcluidaNaMaq])

  useEffect(() => {
    if (!useKaeserPipeline || step !== W.horas) return
    const s = kaeserSugestaoLive
    if (!s || s.motivoPrincipal !== 'anual') return
    const dh = s.detalhes.deltaH
    if (dh == null || dh <= KAESER_DELTA_H_WARNING_ANUAL) return
    if (kaeserWarnAnualHighDeltaRef.current) return
    kaeserWarnAnualHighDeltaRef.current = true
    showToast('Δh elevado desde a última referência — confirme se a intervenção corresponde ao plano anual.', 'warning')
  }, [useKaeserPipeline, step, W.horas, kaeserSugestaoLive, showToast])

  // ── Submit ───────────────────────────────────────────────────────────────
  /** Gera PDF inline dentro do modal (em vez de abrir janela de impressão). */
  const handlePreviewInline = useCallback(async () => {
    if (previewPdfUrl) {
      URL.revokeObjectURL(previewPdfUrl)
      setPreviewPdfUrl(null)
      return
    }
    setPreviewLoading(true)
    try {
      const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
      const cliente = clientes.find(c => c.nif === maq?.clienteNif) ?? null
      const assinaturaPreview =
        (assinaturaFeita && canvasRef.current?.toDataURL('image/png'))
        || (!signatureClearedByUser && rel?.assinaturaDigital)
        || ''
      const tempRel = {
        ...rel,
        checklistRespostas: form.checklistRespostas,
        notas: form.notas,
        fotos,
        tecnico: form.tecnico,
        nomeAssinante: form.nomeAssinante,
        assinadoPeloCliente: !!assinaturaPreview,
        assinaturaDigital: assinaturaPreview,
        dataAssinatura: rel?.dataAssinatura ?? nowISO(),
        dataCriacao: rel?.dataCriacao ?? nowISO(),
        ...(form.tipoManutKaeser && { tipoManutKaeser: form.tipoManutKaeser }),
        ...(form.pecasUsadas.length > 0 && { pecasUsadas: sanitizarPecasRelatorio(form.pecasUsadas) }),
        ...(isKaeserAbcdMaq && form.tipoManutKaeser
          ? (() => {
              const aud = kaeserAuditoriaRef.current
              const sug = aud.tipoSugerido
              const motivoGravar = sug && form.tipoManutKaeser !== sug ? 'manual' : (aud.motivo || 'fallback')
              return {
                tipoManutKaeserSugerido: sug ?? form.tipoManutKaeser,
                sugestaoFaseMotivo: motivoGravar,
              }
            })()
          : {}),
      }
      const tecObj = getTecnicoByNome(form.tecnico)
      const blob = await gerarPdfCompacto({
        relatorio: tempRel,
        manutencao: manutencaoAtual,
        maquina: maq,
        cliente,
        checklistItems: items,
        subcategoriaNome: sub?.nome ?? '',
        tecnicoObj: tecObj,
        marcas,
        categoriaNome,
        declaracaoClienteDepois,
      })
      const url = URL.createObjectURL(blob)
      setPreviewPdfUrl(url)
    } catch (err) {
      showToast('Erro ao gerar pré-visualização do PDF.', 'error')
      logger.error('ExecutarManutencaoModal', 'handlePreviewInline', err?.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [previewPdfUrl, maq, clientes, rel, form, fotos, assinaturaFeita, signatureClearedByUser, manutencaoAtual, items, getSubcategoria, getTecnicoByNome, showToast, categoriaNome, declaracaoClienteDepois, isKaeserAbcdMaq])

  const gravar = (semAssinatura = false, enviarEmailAoGravar = true) => {
    setErroChecklist('')
    setErroAssinatura('')
    if (!manutencaoAtual || !maq) return

    if (!isAdmin && rel && isRelatorioEnviadoAoCliente(rel)) {
      showToast('O relatório já foi enviado ao cliente. Só um administrador pode alterar.', 'warning')
      return
    }

    const agFormGravar = (form.adminDataAgendada || '').trim()
    const exFormGravar = (form.adminDataExecucao || '').trim()
    if (rel && !isRelatorioEnviadoAoCliente(rel) && (!agFormGravar || !exFormGravar)) {
      showToast('Indique a data de agendamento e a data de execução do relatório.', 'warning')
      return
    }

    if (!isCorrectionMode) {
      if (!confirmaEquipamentoSerie) {
        showToast('Confirme o equipamento (número de série) antes de gravar.', 'warning')
        return
      }
      if (temContadorHoras) {
        const hs = String(form.horasServico).trim()
        if (hs === '' || Number.isNaN(Number(hs)) || Number(hs) < 0) {
          showToast('Indique as horas no contador (acumuladas) do equipamento.', 'warning')
          return
        }
      }
      if (useKaeserPipeline) {
        const pecasSan = sanitizarPecasRelatorio(form.pecasUsadas)
        const algumUsado = pecasSan.some(p => p.usado && Number(p.quantidadeUsada) > 0)
        if (!algumUsado && !kaeserSemConsumiveis) {
          showToast('Consumíveis: indique quantidades ou confirme ausência de materiais.', 'warning')
          return
        }
      }
      if (!form.notas.trim() || !notasCumpremMinimoObservacoes(form.notas, quickNotes)) {
        showToast(`Observações: use uma nota rápida ou escreva pelo menos ${OBSERVACOES_TEXTO_LIVRE_MIN} caracteres descritivos.`, 'warning')
        return
      }
    }

    const todasMarcadas = items.length === 0 || items.every(it =>
      form.checklistRespostas[it.id] === 'sim' || form.checklistRespostas[it.id] === 'nao'
    )
    if (!todasMarcadas) {
      setErroChecklist('Todas as linhas da checklist devem ser verificadas pelo utilizador.')
      return
    }
    if (!form.tecnico) {
      setErroAssinatura('Selecione o técnico que realizou a manutenção.')
      return
    }
    if (!semAssinatura) {
      if (!form.nomeAssinante.trim()) {
        setErroAssinatura('Indique o nome do cliente que assina o relatório.')
        return
      }
      const temAssinaturaOuRel = assinaturaFeita || (!!rel?.assinaturaDigital && !signatureClearedByUser)
      if (!temAssinaturaOuRel) {
        setErroAssinatura('A assinatura digital do cliente é obrigatória.')
        return
      }
    }

    const canvas = canvasRef.current
    let assinaturaDataUrl = null
    if (!semAssinatura) {
      if (assinaturaFeita && canvas) {
        assinaturaDataUrl = canvas.toDataURL('image/png')
      } else if (rel?.assinaturaDigital && !signatureClearedByUser) {
        assinaturaDataUrl = rel.assinaturaDigital
      }
    }
    const usouAssinaturaDoRelatorioSemRedraw =
      !semAssinatura && !assinaturaFeita && !!rel?.assinaturaDigital && !signatureClearedByUser && !!assinaturaDataUrl

    const podeUsarDatasFormularioRel = !!(rel && !isRelatorioEnviadoAoCliente(rel) && agFormGravar && exFormGravar)

    let hoje
    let now
    /** Só definido no ramo sem datas do formulário de relatório — necessário mais abaixo para `isHistoricoPassado`. */
    let usarDataHistorica = false
    if (podeUsarDatasFormularioRel) {
      hoje = exFormGravar
      now = `${exFormGravar}T12:00:00.000Z`
    } else {
      usarDataHistorica = !!(form.dataRealizacao && (isAdmin || (manutencaoAtual?.data && manutencaoAtual.data < getHojeAzores())))
      hoje = usarDataHistorica ? form.dataRealizacao : getHojeAzores()
      now = usarDataHistorica
        ? `${form.dataRealizacao}T12:00:00.000Z`
        : nowISO()
    }

    const dias = getIntervaloDiasByMaquina(maq)
    const proxima = addDays(new Date(hoje), dias)

    const pecasSanGravar = sanitizarPecasRelatorio(form.pecasUsadas || [])
    const pecasParaRelatorio =
      isKaeserAbcdMaq && manutencaoAtual?.tipo !== 'montagem'
        ? pecasSanGravar
        : (pecasSanGravar.length > 0 ? pecasSanGravar : undefined)
    const hContadorRel = temContadorHoras ? parseHorasContadorForm(form.horasServico) : null

    const relPayload = {
      checklistRespostas: form.checklistRespostas,
      checklistSnapshot: items.map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null })),
      notas: form.notas.slice(0, 300),
      fotos,
      tecnico: form.tecnico,
      assinadoPeloCliente: !semAssinatura,
      nomeAssinante: semAssinatura ? '' : form.nomeAssinante.trim(),
      assinaturaDigital: assinaturaDataUrl,
      dataAssinatura: semAssinatura ? null : (usouAssinaturaDoRelatorioSemRedraw ? (rel.dataAssinatura ?? now) : now),
      dataCriacao: rel?.dataCriacao ?? now,
      ...(form.tipoManutKaeser && { tipoManutKaeser: form.tipoManutKaeser }),
      ...(pecasParaRelatorio !== undefined && { pecasUsadas: pecasParaRelatorio }),
      ...(hContadorRel != null && { horasLeituraContador: hContadorRel }),
    }
    if (isKaeserAbcdMaq && form.tipoManutKaeser && manutencaoAtual?.tipo !== 'montagem') {
      const aud = kaeserAuditoriaRef.current
      const sug = aud.tipoSugerido
      relPayload.tipoManutKaeserSugerido = sug ?? form.tipoManutKaeser
      relPayload.sugestaoFaseMotivo =
        sug && form.tipoManutKaeser !== sug ? 'manual' : (aud.motivo || 'fallback')
    }

    if (podeUsarDatasFormularioRel && rel) {
      const execAnterior = (rel.dataAssinatura || rel.dataCriacao || '').slice(0, 10) || ''
      const execIso = `${exFormGravar}T12:00:00.000Z`
      if (exFormGravar !== execAnterior) {
        relPayload.dataCriacao = execIso
        if (rel.assinadoPeloCliente && !semAssinatura) {
          relPayload.dataAssinatura = execIso
        } else if (!rel.assinadoPeloCliente) {
          relPayload.dataAssinatura = semAssinatura ? null : now
        }
      }
    }

    // Gravar/actualizar o relatório e obter o numeroRelatorio definitivo.
    // addRelatorio devolve { id, numeroRelatorio } — tem de ser capturado aqui
    // para ser passado ao logger e ao serviço de email (evita "undefined"/"S/N").
    let numeroRelatorioFinal
    let relIdFinal
    if (rel) {
      const anoExecucao = new Date(now).getFullYear()
      const anoRelatorio = parseInt(rel.numeroRelatorio?.split('.')[0], 10)
      if (anoExecucao && anoRelatorio && anoExecucao !== anoRelatorio) {
        const tipoManut = manutencaoAtual.tipo ?? 'periodica'
        const prefix = tipoManut === 'montagem' ? 'MT' : 'MP'
        const pattern = `${anoExecucao}.${prefix}.`
        const existingNums = todosRelatorios
          .filter(r => r.id !== rel.id)
          .map(r => r.numeroRelatorio)
          .filter(n => typeof n === 'string' && n.startsWith(pattern))
          .map(n => parseInt(n.split('.')[2] ?? '0', 10))
          .filter(n => !isNaN(n))
        const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
        relPayload.numeroRelatorio = `${anoExecucao}.${prefix}.${String(next).padStart(5, '0')}`
      }
      updateRelatorio(rel.id, relPayload)
      relIdFinal = rel.id
      numeroRelatorioFinal = relPayload.numeroRelatorio || rel.numeroRelatorio
    } else {
      const resultado = addRelatorio({ manutencaoId: manutencaoAtual.id, ...relPayload })
      relIdFinal = resultado.id
      numeroRelatorioFinal = resultado.numeroRelatorio
    }

    const manutPatch = {
      status: 'concluida',
      data: podeUsarDatasFormularioRel ? agFormGravar : hoje,
      tecnico: form.tecnico,
    }
    if (temContadorHoras) {
      const hCont = parseHorasContadorForm(form.horasServico)
      if (hCont != null) {
        manutPatch.horasServico = hCont
        manutPatch.horasTotais = hCont
      }
    }
    updateManutencao(manutencaoAtual.id, manutPatch)

    if (!semAssinatura && maq?.clienteNif) {
      const clienteUpdate = {}
      const nomeTrimmed = form.nomeAssinante.trim()
      if (nomeTrimmed) clienteUpdate.nomeContacto = nomeTrimmed
      if (assinaturaDataUrl) clienteUpdate.assinaturaContacto = assinaturaDataUrl
      if (Object.keys(clienteUpdate).length > 0) {
        updateCliente(maq.clienteNif, clienteUpdate)
      }
    }

    const logMsg = semAssinatura
      ? `Manutenção concluída SEM assinatura — ${numeroRelatorioFinal} (técnico: ${form.tecnico})`
      : `Manutenção concluída — ${numeroRelatorioFinal} — assinada por "${form.nomeAssinante}" (técnico: ${form.tecnico})`
    logger.action('ExecutarManutencaoModal', 'concluirManutencao', logMsg,
      { manutencaoId: manutencaoAtual.id, numeroRelatorio: numeroRelatorioFinal, tecnico: form.tecnico, semAssinatura }
    )

    const proximaFormatada = format(proxima, 'yyyy-MM-dd')
    const isHistoricoPassado = podeUsarDatasFormularioRel
      ? (exFormGravar < getHojeAzores())
      : Boolean(usarDataHistorica && form.dataRealizacao && form.dataRealizacao < getHojeAzores())

    const updateMaqData = {}
    if (isHistoricoPassado) {
      if (!maq.ultimaManutencaoData || hoje > maq.ultimaManutencaoData) {
        updateMaqData.ultimaManutencaoData = hoje
      }
      if (!maq.proximaManut || proximaFormatada > maq.proximaManut) {
        updateMaqData.proximaManut = proximaFormatada
      }
    } else {
      updateMaqData.proximaManut = proximaFormatada
      updateMaqData.ultimaManutencaoData = hoje
    }
    if (temContadorHoras) {
      const hCont = parseHorasContadorForm(form.horasServico)
      if (hCont != null) {
        updateMaqData.horasServicoAcumuladas = hCont
        updateMaqData.horasTotaisAcumuladas = hCont
      }
    }
    // Avançar posição no ciclo A/B/C/D — KAESER parafuso (± secador), periódica
    if (isKaeserAbcdMaq && form.tipoManutKaeser && manutencaoAtual?.tipo !== 'montagem') {
      const h = parseInt(String(form.horasServico).trim(), 10)
      let pos = maq.posicaoKaeser
      if (pos == null && Number.isFinite(h) && h >= 0) {
        pos = Math.floor(h / KAESER_INTERVALO_HORAS_REF) % SEQUENCIA_KAESER.length
      }
      if (pos == null) {
        const idx = SEQUENCIA_KAESER.indexOf(form.tipoManutKaeser)
        pos = idx >= 0 ? idx : 0
      }
      if (tipoKaeserNaPosicao(pos) === form.tipoManutKaeser) {
        updateMaqData.posicaoKaeser = proximaPosicaoKaeser(pos)
      } else {
        let found = -1
        for (let k = 0; k < SEQUENCIA_KAESER.length; k++) {
          const j = (pos + k) % SEQUENCIA_KAESER.length
          if (SEQUENCIA_KAESER[j] === form.tipoManutKaeser) {
            found = j
            break
          }
        }
        updateMaqData.posicaoKaeser = found >= 0 ? proximaPosicaoKaeser(found) : proximaPosicaoKaeser(pos)
      }
    }
    // Se for montagem com periodicidade: calcular datas e verificar conflitos antes de confirmar
    if (manutencaoAtual.tipo === 'montagem' && manutencaoAtual.periodicidade) {
      updateMaqData.periodicidadeManut = manutencaoAtual.periodicidade
      updateMaquina(maq.id, updateMaqData)

      const resultado = prepararManutencoesPeriodicas({
        ...manutencaoAtual,
        data: hoje,
        tecnico: form.tecnico,
      })

      if (resultado.conflitos.length > 0) {
        // Mostra ecrã de revisão de conflitos — o utilizador decide como resolver
        setConflitosAgendamento(resultado)
      } else {
        // Sem conflitos: confirmar imediatamente
        const n = confirmarManutencoesPeriodicas(resultado.novas)
        setManutAgendadas(n)
        setConclusaoVariant('executada')
        showToast('Dados gravados com sucesso.', 'success', 5000)
        setConcluido(true)
      }
      return
    }

    const periodicidadeRecalc = maq.periodicidadeManut || manutencaoAtual.periodicidade
    if (!maq.periodicidadeManut && manutencaoAtual.periodicidade) {
      updateMaqData.periodicidadeManut = manutencaoAtual.periodicidade
    }

    updateMaquina(maq.id, updateMaqData)

    if (manutencaoAtual.tipo === 'periodica' && periodicidadeRecalc) {
      const n = recalcularPeriodicasAposExecucao(maq.id, periodicidadeRecalc, hoje, form.tecnico)
      if (n > 0) {
        logger.action('ExecutarManutencaoModal', 'reagendarPeriodicas',
          `${n} periódicas reagendadas para ${maq.marca ?? ''} ${maq.modelo ?? ''} a partir de ${hoje}`,
          { maquinaId: maq.id, periodicidade: periodicidadeRecalc, n })
        showToast(`${n} manutenções futuras reagendadas a partir de ${hoje}.`, 'info', 2500)
      }
    }

    if (semAssinatura) {
      setConclusaoVariant('executada')
      showToast('Dados gravados com sucesso.', 'success', 5000)
      setConcluido(true)
      return
    }

    // Gravar sem enviar email — concluir processo técnico sem envio
    if (!enviarEmailAoGravar) {
      setConclusaoVariant('gravado_sem_email')
      showToast('Dados gravados com sucesso.', 'success', 5000)
      setConcluido(true)
      return
    }

    const enviarEmail = async (relFinal, manutFinal) => {
      if (!emailDestinatario.trim()) return
      setEmailEnviando(true)
      showGlobalLoading()
      const sub     = maq ? getSubcategoria(maq.subcategoriaId) : null
      const cliente = clientes.find(c => c.nif === maq?.clienteNif) ?? null
      try {
        const tecObj = getTecnicoByNome(relFinal?.tecnico || manutFinal?.tecnico)

        const resultado = await enviarRelatorioEmail({
          emailDestinatario: emailDestinatario.trim(),
          relatorio: relFinal, manutencao: manutFinal, maquina: maq, cliente,
          checklistItems: items, subcategoriaNome: sub?.nome || '',
          logoUrl: `${import.meta.env.BASE_URL}NAVEL_LOGO.jpg`,
          tecnicoObj: tecObj,
          marcas,
          categoriaNome,
          declaracaoClienteDepois,
        })
        if (resultado.ok) {
          showToast(`Email enviado para ${emailDestinatario}.`, 'success')
          const dest = emailDestinatario.trim().toLowerCase()
          if (dest && relIdFinal) {
            const nowEnvio = new Date().toISOString()
            const patchEnvio = {
              ultimoEnvio: { data: nowEnvio, destinatario: dest, destinatarios: [dest] },
            }
            if (dest !== 'comercial@navel.pt') {
              patchEnvio.enviadoParaCliente = { data: nowEnvio, email: dest, emails: [dest] }
            }
            updateRelatorio(relIdFinal, patchEnvio)
          }
        } else {
          showToast(resultado.message || 'Erro ao enviar email.', 'error', 4000)
        }
        return resultado
      } finally {
        setEmailEnviando(false)
        hideGlobalLoading()
      }
    }

    if (!emailDestinatario.trim()) {
      showToast('Indique o email do cliente ou use "Gravar" para fechar sem envio.', 'warning')
      return
    }

    setConclusaoVariant('email_enviando')
    showToast('Dados gravados. A enviar email ao cliente…', 'info', 3500)
    const relAtualizado = { ...relPayload, manutencaoId: manutencaoAtual.id, numeroRelatorio: numeroRelatorioFinal }
    enviarEmail(relAtualizado, { ...manutencaoAtual, status: 'concluida', data: hoje, tecnico: form.tecnico })
      .then((resultado) => {
        setConclusaoVariant(resultado?.ok ? 'email_enviado' : 'email_falhou')
      })
      .catch((err) => {
        logger.error('ExecutarManutencaoModal', 'enviarEmailAposGravar', err?.message || 'Erro ao enviar email')
        setConclusaoVariant('email_falhou')
      })
      .finally(() => {
        setConcluido(true)
      })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (isCorrectionMode) { handleAdminEditSave(); return }
    if (step < W.total) { goNext(); return }
    gravar(false, true)
  }

  const handleGravarSemEnvio = () => {
    gravar(false, false)
  }

  const handleGravarSemAssinatura = () => {
    gravar(true)
  }

  const handleAdminEditSave = () => {
    if (!manutencaoAtual || !maq || !rel) return
    if (!form.tecnico) {
      showToast('Selecione o técnico responsável.', 'warning')
      return
    }
    const todasMarcadasAdmin = items.length === 0 || items.every(it =>
      form.checklistRespostas[it.id] === 'sim' || form.checklistRespostas[it.id] === 'nao'
    )
    if (!todasMarcadasAdmin) {
      showToast('Preencha toda a checklist (Sim/Não).', 'warning')
      return
    }
    if (!form.notas.trim() || !notasCumpremMinimoObservacoes(form.notas, quickNotes)) {
      showToast(`Observações: use uma nota rápida ou escreva pelo menos ${OBSERVACOES_TEXTO_LIVRE_MIN} caracteres descritivos.`, 'warning')
      return
    }
    if (temContadorHoras) {
      const hs = String(form.horasServico).trim()
      if (hs === '' || Number.isNaN(Number(hs)) || Number(hs) < 0) {
        showToast('Indique as horas no contador (acumuladas) do equipamento.', 'warning')
        return
      }
    }

    const relPayload = {
      checklistRespostas: form.checklistRespostas,
      checklistSnapshot: items.map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null })),
      notas: form.notas.slice(0, 300),
      fotos,
      tecnico: form.tecnico,
      nomeAssinante: form.nomeAssinante.trim(),
    }
    if (isKaeserPeriodicExec) {
      relPayload.tipoManutKaeser = form.tipoManutKaeser || null
      relPayload.pecasUsadas = sanitizarPecasRelatorio(form.pecasUsadas || [])
    } else {
      if (form.tipoManutKaeser) relPayload.tipoManutKaeser = form.tipoManutKaeser
      if (form.pecasUsadas.length > 0) relPayload.pecasUsadas = sanitizarPecasRelatorio(form.pecasUsadas)
    }
    if (rel.tipoManutKaeserSugerido != null) relPayload.tipoManutKaeserSugerido = rel.tipoManutKaeserSugerido
    if (rel.sugestaoFaseMotivo) relPayload.sugestaoFaseMotivo = rel.sugestaoFaseMotivo
    if (form.limparAssinatura) {
      relPayload.assinadoPeloCliente = false
      relPayload.assinaturaDigital = null
      relPayload.nomeAssinante = ''
      relPayload.dataAssinatura = null
    }

    const assinadoEfetivo = form.limparAssinatura ? false : !!rel.assinadoPeloCliente

    const agAnterior = manutencaoAtual.data
    const execAnterior = (rel.dataAssinatura || rel.dataCriacao || '').slice(0, 10) || ''
    const agNova = (form.adminDataAgendada || '').trim()
    const execNova = (form.adminDataExecucao || '').trim()

    if (!agNova) {
      showToast('Indique a data de agendamento da manutenção.', 'warning')
      return
    }
    if (!execNova) {
      showToast('Indique a data de execução do relatório.', 'warning')
      return
    }

    const execIso = `${execNova}T12:00:00.000Z`
    if (execNova !== execAnterior) {
      relPayload.dataCriacao = execIso
      if (assinadoEfetivo) {
        relPayload.dataAssinatura = execIso
      } else {
        relPayload.dataAssinatura = null
      }
    }

    const anoNovo = new Date(execNova + 'T00:00:00').getFullYear()
    const anoAtual = rel.numeroRelatorio ? parseInt(rel.numeroRelatorio.split('.')[0], 10) : null
    if (anoNovo && anoAtual && anoNovo !== anoAtual) {
      const tipoManut = manutencaoAtual.tipo ?? 'periodica'
      const prefix = tipoManut === 'montagem' ? 'MT' : 'MP'
      const pattern = `${anoNovo}.${prefix}.`
      const existingNums = todosRelatorios
        .filter(r => r.id !== rel.id)
        .map(r => r.numeroRelatorio)
        .filter(n => typeof n === 'string' && n.startsWith(pattern))
        .map(n => parseInt(n.split('.')[2] ?? '0', 10))
        .filter(n => !isNaN(n))
      const next = existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1
      relPayload.numeroRelatorio = `${anoNovo}.${prefix}.${String(next).padStart(5, '0')}`
      relPayload.dataCriacao = execIso
      if (assinadoEfetivo) relPayload.dataAssinatura = execIso
    }

    const hContadorAdmin = temContadorHoras ? parseHorasContadorForm(form.horasServico) : null
    if (hContadorAdmin != null) {
      relPayload.horasLeituraContador = hContadorAdmin
    }

    updateRelatorio(rel.id, relPayload)

    const manutPayload = { tecnico: form.tecnico }
    if (form.adminStatus && form.adminStatus !== manutencaoAtual.status) {
      manutPayload.status = form.adminStatus
    }
    if (agNova !== agAnterior) {
      manutPayload.data = agNova
    }
    if (hContadorAdmin != null) {
      manutPayload.horasServico = hContadorAdmin
      manutPayload.horasTotais = hContadorAdmin
    }
    updateManutencao(manutencaoAtual.id, manutPayload)
    if (hContadorAdmin != null) {
      updateMaquina(maq.id, { horasServicoAcumuladas: hContadorAdmin, horasTotaisAcumuladas: hContadorAdmin })
    }

    const dataAgendamentoChanged = agNova !== agAnterior
    const dataExecucaoChanged = execNova !== execAnterior
    const dataRecalc = execNova
    if (manutencaoAtual.tipo === 'periodica' && dataRecalc) {
      const periodicidade = maq.periodicidadeManut || manutencaoAtual.periodicidade
      if (periodicidade) {
        const n = recalcularPeriodicasAposExecucao(maq.id, periodicidade, dataRecalc, form.tecnico, {
          ultimaManutencaoData: dataRecalc,
        })
        if (n > 0) {
          showToast(`${n} manutenções futuras reagendadas a partir de ${dataRecalc}.`, 'info', 2500)
        }
      } else {
        setTimeout(() => sincronizarProximaManutComAgenda(maq.id, { ultimaManutencaoData: dataRecalc }), 0)
      }
    }

    const numFinal = relPayload.numeroRelatorio || rel.numeroRelatorio
    const statusChanged = form.adminStatus && form.adminStatus !== manutencaoAtual.status
    logger.action('ExecutarManutencaoModal', isAdmin ? 'adminEditSave' : 'quickCorrectionSave', `${isAdmin ? 'Admin editou' : 'Técnico corrigiu'} relatório ${numFinal}`,
      {
        manutencaoId: manutencaoAtual.id,
        numeroRelatorio: numFinal,
        limparAssinatura: !!form.limparAssinatura,
        statusChanged: statusChanged ? form.adminStatus : false,
        dataAgendamentoChanged,
        dataExecucaoChanged,
      }
    )
    showToast(
      relPayload.numeroRelatorio
        ? `Relatório renumerado para ${relPayload.numeroRelatorio}.`
        : statusChanged ? `Relatório actualizado. Status alterado para "${form.adminStatus}".` : 'Relatório actualizado com sucesso.',
      'success'
    )
    onClose()
  }

  if (!isOpen || !maq) return null

  const desc = `${maq.marca} ${maq.modelo} — Nº Série: ${maq.numeroSerie}`
  const resumoFinalizacao = (() => {
    const dataExecucao = (form.adminDataExecucao || form.dataRealizacao || getHojeAzores()).trim()
    const dataAgendada = (form.adminDataAgendada || manutencaoAtual?.data || '').trim()
    const dias = getIntervaloDiasByMaquina(maq)
    const proxima = dataExecucao && dias ? format(addDays(new Date(`${dataExecucao}T12:00:00`), dias), 'yyyy-MM-dd') : ''
    const periodicidade = maq?.periodicidadeManut || manutencaoAtual?.periodicidade || ''
    return {
      dataExecucao,
      dataAgendada,
      proxima,
      periodicidade,
      tecnico: form.tecnico || '—',
      assinatura: assinaturaFeita || (!!rel?.assinaturaDigital && !signatureClearedByUser) ? 'Registada' : 'Pendente / sem assinatura',
      fotos: fotos.length,
      email: emailDestinatario.trim() || 'Não indicado',
      destinoEmail: emailDestinatario.trim()
        ? (emailDestinatario.trim().toLowerCase() === 'comercial@navel.pt' ? 'Interno / administração' : 'Cliente')
        : 'Sem envio',
    }
  })()

  if (!isCorrectionMode && execUiPhase === 'no_intervention') {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
          <h2>Sem intervenção aberta</h2>
          <p className="modal-hint" style={{ marginBottom: '1rem' }}>
            Não há manutenção pendente, agendada ou em progresso para <strong>{desc}</strong>.
            Para trabalhar no terreno, crie uma linha para hoje (com confirmação) ou vá a <strong>Manutenções</strong> / <strong>Agendar</strong>.
          </p>
          <div className="form-actions" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem' }}>
            <button type="button" className="btn primary" onClick={confirmarCriarIntervencaoHoje}>
              Criar intervenção para hoje…
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => { onClose(); navigate(`/manutencoes?filter=proximas&maquinaId=${encodeURIComponent(maq.id)}`) }}
            >
              Ir a manutenções próximas (este equipamento)
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => { onClose(); navigate(`/agendamento?maquinaId=${encodeURIComponent(maq.id)}`) }}
            >
              Agendar nova visita
            </button>
            <button type="button" className="secondary" onClick={onClose}>Fechar</button>
          </div>
        </div>
      </div>
    )
  }

  if (!isCorrectionMode && execUiPhase === 'choose_intervention' && opcoesEscolha.length > 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal modal-compact" onClick={e => e.stopPropagation()} style={{ maxWidth: 440 }}>
          <h2>Qual intervenção executar?</h2>
          <p className="modal-hint" style={{ marginBottom: '0.75rem' }}>
            Existem várias ordens com a mesma data ({formatarDataPT(opcoesEscolha[0].data)}). Escolha uma para continuar.
          </p>
          <ul className="intervencao-escolha-lista" style={{ listStyle: 'none', padding: 0, margin: '0 0 1rem' }}>
            {opcoesEscolha.map((opt) => (
              <li key={opt.id} style={{ marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  className="btn secondary"
                  style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }}
                  onClick={() => escolherIntervencaoParaExecutar(opt)}
                >
                  <strong>{opt.tipo === 'montagem' ? 'Montagem' : 'Manutenção'}</strong>
                  {' · '}
                  {formatarDataPT(opt.data)}
                  {opt.tecnico ? ` · ${opt.tecnico}` : ''}
                  <span className="text-muted" style={{ display: 'block', fontSize: '0.85rem' }}>ID {opt.id}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>
    )
  }

  if (concluido) {
    const relFinal = manutencaoAtual ? getRelatorioByManutencao(manutencaoAtual.id) : null
    const foiSemAssinatura = relFinal && !relFinal.assinadoPeloCliente
    const tituloConclusao =
      conclusaoVariant === 'gravado_sem_email' ? 'Dados gravados com sucesso'
      : conclusaoVariant === 'email_enviado' ? 'Manutenção executada e email enviado'
      : conclusaoVariant === 'email_falhou' ? 'Manutenção executada; email não enviado'
      : 'Manutenção executada!'
    const textoConclusao =
      conclusaoVariant === 'gravado_sem_email'
        ? 'O relatório foi guardado; o email ao cliente não foi enviado. Pode enviar o comprovativo mais tarde a partir da lista de manutenções.'
      : conclusaoVariant === 'email_enviado'
        ? 'Relatório gravado, assinado e enviado ao cliente. A intervenção fica marcada como enviada ao cliente.'
      : conclusaoVariant === 'email_falhou'
        ? 'O relatório foi gravado, mas houve erro no envio. Reenvie a partir da lista de manutenções.'
      : foiSemAssinatura
        ? 'Relatório gravado. Pendente de assinatura do cliente.'
        : 'Relatório gerado e assinado com sucesso.'
    return (
      <div className="modal-overlay">
        <div className="modal modal-assinatura" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle2 size={48} color="var(--color-success, #22c55e)" style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>{tituloConclusao}</h2>
          <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            {textoConclusao}
          </p>
          <p className="modal-hint">Pode fechar quando terminar.</p>
          <button type="button" className="btn primary" style={{ marginTop: '1rem' }} onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    )
  }

  // ── Ecrã de revisão de conflitos ──────────────────────────────────────────
  if (conflitosAgendamento) {
    const { novas, conflitos } = conflitosAgendamento

    const resolverComHorarios = () => {
      // Para cada data conflituosa, distribui horários entre os serviços existentes + o novo
      const novasAjustadas = novas.map((n, i) => {
        const conf = conflitos.find(c => c.index === i)
        if (!conf) return n
        const totalNesseDia = conf.existentes + 1
        const horarios = distribuirHorarios(totalNesseDia)
        const slot = horarios[conf.existentes] // posição do novo serviço (no fim da fila)
        return { ...n, observacoes: `Agendamento automático pós-montagem. Horário sugerido: ${slot}` }
      })
      const count = confirmarManutencoesPeriodicas(novasAjustadas)
      setConflitosAgendamento(null)
      setManutAgendadas(count)
      setConclusaoVariant('executada')
      showToast('Dados gravados com sucesso.', 'success', 5000)
      setConcluido(true)
    }

    const resolverAvancando = () => {
      // Para cada data conflituosa, avança para o próximo dia útil absolutamente livre
      const anoInicio = new Date(novas[0]?.data ?? Date.now()).getFullYear()
      const anoFim    = new Date(novas[novas.length - 1]?.data ?? Date.now()).getFullYear()
      const feriadosSet  = buildFeriadosSet(anoInicio, anoFim + 1)
      const diasOcupados = new Set(
        manutencoes
          .filter(m => m.status === 'agendada' || m.status === 'pendente')
          .map(m => m.data)
      )
      // Também adicionar as datas das novas sem conflito (para não chocar entre si)
      novas.forEach((n, i) => {
        if (!conflitos.find(c => c.index === i)) diasOcupados.add(n.data)
      })

      const novasAjustadas = novas.map((n, i) => {
        if (!conflitos.find(c => c.index === i)) return n
        const novaData = proximoDiaUtilLivre(new Date(n.data + 'T12:00:00'), feriadosSet, diasOcupados)
        const iso = `${novaData.getFullYear()}-${String(novaData.getMonth() + 1).padStart(2, '0')}-${String(novaData.getDate()).padStart(2, '0')}`
        diasOcupados.add(iso)
        return { ...n, data: iso }
      })
      const count = confirmarManutencoesPeriodicas(novasAjustadas)
      setConflitosAgendamento(null)
      setManutAgendadas(count)
      setConclusaoVariant('executada')
      showToast('Dados gravados com sucesso.', 'success', 5000)
      setConcluido(true)
    }

    const resolverIgnorando = () => {
      const count = confirmarManutencoesPeriodicas(novas)
      setConflitosAgendamento(null)
      setManutAgendadas(count)
      setConclusaoVariant('executada')
      showToast('Dados gravados com sucesso.', 'success', 5000)
      setConcluido(true)
    }

    return (
      <div className="modal-overlay">
        <div className="modal modal-assinatura modal-conflitos" onClick={e => e.stopPropagation()}>
          <div className="modal-conflitos-header">
            <AlertTriangle size={22} color="var(--color-warning, #f59e0b)" />
            <h2>Conflitos de agendamento</h2>
          </div>
          <p className="modal-hint" style={{ marginBottom: '0.75rem' }}>
            {conflitos.length} dos {novas.length} agendamentos criados automaticamente coincidem
            com serviços já existentes. Como pretende resolver?
          </p>

          <ul className="conflitos-lista">
            {conflitos.map(c => (
              <li key={c.data} className="conflito-item">
                <CalendarClock size={15} style={{ flexShrink: 0 }} />
                <span>
                  <strong>{formatarDataPT(c.data)}</strong>
                  {' '}— já tem <strong>{c.existentes}</strong> serviço{c.existentes !== 1 ? 's' : ''} agendado{c.existentes !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
          </ul>

          <div className="conflitos-acoes">
            <button type="button" className="btn primary" onClick={resolverAvancando}>
              <CalendarClock size={16} />
              Avançar para dia livre
              <small>Reagenda cada conflito para o próximo dia disponível</small>
            </button>
            <button type="button" className="btn secondary" onClick={resolverComHorarios}>
              Agendar com horários
              <small>Mantém a data e distribui horários manhã/tarde</small>
            </button>
            <button type="button" className="btn btn-outline-muted" onClick={resolverIgnorando}>
              Criar assim mesmo
              <small>Ignora os conflitos, agendamentos sobrepostos</small>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Ecrã de confirmação após auto-agendamento de montagem ──────────────────
  if (manutAgendadas > 0) {
    return (
      <div className="modal-overlay">
        <div className="modal modal-assinatura" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
          <h2 style={{ marginBottom: '0.5rem' }}>Montagem concluída!</h2>
          <p style={{ marginBottom: '1rem' }}>
            Foram criados automaticamente <strong>{manutAgendadas}</strong> agendamentos de manutenção periódica
            para os próximos 3 anos, todos em dias úteis.
          </p>
          <p className="modal-hint">A fechar automaticamente…</p>
        </div>
      </div>
    )
  }

  // Fundo não chama onClose — evita fechar o assistente por clique acidental; usar «Cancelar».
  return (
    <div className="modal-overlay" role="presentation">
      <div className="modal modal-assinatura modal-relatorio-form" ref={modalRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="exec-manut-modal-title">
          <h2 id="exec-manut-modal-title">{isCorrectionMode ? 'Corrigir relatório' : 'Executar manutenção'}</h2>
        {maq && <p className="modal-hint">{desc}</p>}
        {isCorrectionMode && rel?.numeroRelatorio && (
          <p className="modal-hint" style={{ marginTop: '-0.25rem' }}>Relatório {rel.numeroRelatorio}</p>
        )}

        {!isCorrectionMode && (
          <div className="wizard-progress">
            <div className="wizard-progress-bar">
              <div className="wizard-progress-fill" style={{ width: `${(step / W.total) * 100}%` }} />
            </div>
            <div className="wizard-progress-info">
              <span className="wizard-progress-step">Passo {step} de {W.total}</span>
              <span className="wizard-progress-label">{W.labels[step - 1]}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
        <div className="wizard-body">

          {/* ═══ Passo 1: confirmação de equipamento, data e horas (se contador) ═══ */}
          {!isCorrectionMode && step === W.verif && maq && (
            <div className="wizard-step-content" data-testid="exec-passo-verificacao">
              <p className="wizard-step-hint">
                Confirme que está a intervir no equipamento correcto (verifique o <strong>número de série</strong> no local).
                A data da intervenção considerada no relatório é <strong>hoje</strong> nos Açores, salvo data histórica autorizada para Admin.
              </p>
              <div className="exec-equip-verify-card">
                <div><strong>{maq.marca}</strong> {maq.modelo}</div>
                <div className="exec-equip-serie-destaque">
                  N.º de série: <span className="exec-equip-serie-valor">{maq.numeroSerie || '—'}</span>
                </div>
                <p className="text-muted" style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                  Data da intervenção: <strong>{formatarDataPT(getHojeAzores())}</strong>
                </p>
              </div>
              <label className="exec-equip-confirm-label form-section">
                <input
                  type="checkbox"
                  checked={confirmaEquipamentoSerie}
                  onChange={e => { setConfirmaEquipamentoSerie(e.target.checked); setErroChecklist('') }}
                />
                <span>Confirmo que o equipamento acima é o que estou a manter / inspeccionar nesta visita.</span>
              </label>
              {temContadorHoras && !useKaeserPipeline && (
                <div className="form-section">
                  <label>
                    Horas no contador (acumuladas) <span className="req-star">*</span>
                    <span className="form-hint" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 400 }}>
                      Leitura acumulada no equipamento (actualiza a ficha ao concluir).
                    </span>
                    <input
                      className="wizard-input-horas-compact"
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={form.horasServico}
                      onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
                      placeholder="Ex: 3050"
                    />
                  </label>
                </div>
              )}
              {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
            </div>
          )}

          {/* ═══ Admin: status + datas. ATecnica: só as duas datas (até enviar ao cliente). ═══ */}
          {showStatusDatasSection && (
              <div className="wizard-step-content" style={{ display: 'block' }}>
              <h3 className="admin-edit-section-title">Status e datas</h3>
              <p className="form-hint" style={{ marginBottom: '0.75rem', maxWidth: '42rem' }}>
                <strong>Agendamento</strong> é a data prevista no plano (lista «Agendada»).{' '}
                <strong>Execução</strong> é a data real do serviço no relatório (PDF, email e coluna «Execução» nas executadas).
                São campos independentes.
              </p>
              <div className="admin-edit-status-row">
                {adminEdit && (
                  <label className="form-section">
                    Status da manutenção
                    <select value={form.adminStatus} onChange={e => setForm(f => ({ ...f, adminStatus: e.target.value }))}>
                      <option value="concluida">Executada (concluída)</option>
                      <option value="pendente">Pendente</option>
                      <option value="agendada">Agendada</option>
                    </select>
                    {form.adminStatus !== 'concluida' && (
                      <span className="form-hint" style={{ color: 'var(--color-warning)' }}>
                        Ao mudar para pendente/agendada, o relatório existente será mantido mas a manutenção ficará por concluir.
                      </span>
                    )}
                  </label>
                )}
                <label className="form-section">
                  Data de agendamento
                  <input
                    type="date"
                    value={form.adminDataAgendada}
                    onChange={e => setForm(f => ({ ...f, adminDataAgendada: e.target.value }))}
                  />
                  <span className="form-hint">Plano / data prevista do serviço.</span>
                </label>
                <label className="form-section">
                  Data de execução (relatório)
                  <input
                    type="date"
                    value={form.adminDataExecucao}
                    onChange={e => setForm(f => ({ ...f, adminDataExecucao: e.target.value }))}
                  />
                  <span className="form-hint">Data real da intervenção; actualiza PDF, email e «Execução» na lista.</span>
                </label>
              </div>
              {isCorrectionMode && temContadorHoras && (
                <div className="form-section" style={{ marginTop: '0.75rem' }}>
                  <label>
                    Horas no contador (acumuladas)
                    <span className="form-hint" style={{ display: 'block', marginTop: '0.25rem', fontWeight: 400 }}>
                      Uma única leitura do equipamento; actualiza a intervenção e a ficha ao guardar.
                    </span>
                    <input
                      className="wizard-input-horas-compact"
                      type="number"
                      min={0}
                      step={1}
                      value={form.horasServico}
                      onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
                      placeholder="Ex: 6000"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {isCorrectionMode && isKaeserPeriodicExec && (
            <div className="wizard-step-content" style={{ display: 'block' }}>
              <h3 className="admin-edit-section-title">KAESER — ciclo, tipo e consumíveis do plano</h3>
              <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
                As horas do contador estão em <strong>Status e datas</strong> (acima). Abaixo vê a posição no ciclo de 12 anos da ficha, o tipo A/B/C/D desta intervenção e a tabela importada por n.º de série (PDF do fabricante).
              </p>
              <div className="form-section" style={{
                marginBottom: '0.75rem',
                padding: '0.65rem 0.75rem',
                borderRadius: 8,
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-elevated)',
              }}
              >
                <h4 style={{ margin: '0 0 0.35rem', fontSize: '0.9rem' }}>Ciclo A/B/C/D (ficha do equipamento)</h4>
                {maq?.posicaoKaeser != null ? (
                  <p className="form-hint" style={{ margin: 0 }}>
                    Posição actual: <strong>{descricaoCicloKaeser(maq.posicaoKaeser)}</strong>
                    {' · '}
                    Seguinte no ciclo: <strong>{descricaoCicloKaeser(proximaPosicaoKaeser(maq.posicaoKaeser))}</strong>
                  </p>
                ) : (
                  <p className="form-hint" style={{ margin: 0 }}>
                    Posição no ciclo de 12 anos ainda não definida na ficha (normal até à primeira execução com plano KAESER).
                  </p>
                )}
                {rel?.tipoManutKaeser ? (
                  <p className="form-hint" style={{ margin: '0.35rem 0 0' }}>
                    Tipo <strong>já gravado neste relatório</strong>: {rel.tipoManutKaeser}
                    {INTERVALOS_KAESER[rel.tipoManutKaeser] ? ` — ${INTERVALOS_KAESER[rel.tipoManutKaeser].label}` : ''}
                  </p>
                ) : null}
              </div>
              <div className="form-section">
                <label>
                  Tipo KAESER (A/B/C/D) — edição
                  <select
                    value={form.tipoManutKaeser}
                    onChange={e => {
                      const tipo = e.target.value
                      const novasPecas = tipo && maq
                        ? (getPecasPlanoByMaquina(maq.id, tipo) ?? []).map(p => ({ ...p, quantidadeUsada: 1, quantidade: 1, usado: true }))
                        : []
                      setForm(f => ({ ...f, tipoManutKaeser: tipo, pecasUsadas: novasPecas }))
                    }}
                  >
                    <option value="">—</option>
                    {Object.entries(INTERVALOS_KAESER).map(([tipo, info]) => (
                      <option key={tipo} value={tipo}>{info.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-section kaeser-pecas-table-wrap">
                <h4 style={{ margin: '0 0 0.5rem', fontSize: '0.95rem' }}>Consumíveis do plano (por tipo / importação PDF)</h4>
                {form.pecasUsadas.length === 0 ? (
                  <div>
                    <p className="text-muted" style={{ fontSize: '0.88rem', margin: '0 0 0.5rem' }}>
                      Nenhuma linha carregada. Escolha o tipo acima (as linhas são preenchidas automaticamente) ou use o botão para voltar a carregar do plano deste n.º de série.
                    </p>
                    <button
                      type="button"
                      className="btn secondary btn-sm"
                      disabled={!form.tipoManutKaeser || !maq}
                      onClick={() => {
                        const tipo = form.tipoManutKaeser
                        const novasPecas = (getPecasPlanoByMaquina(maq.id, tipo) ?? []).map(p => ({ ...p, quantidadeUsada: 1, quantidade: 1, usado: true }))
                        setForm(f => ({ ...f, pecasUsadas: novasPecas }))
                        if (novasPecas.length === 0) {
                          showToast('Não há linhas no plano para este tipo. Configure em Equipamentos → Plano de peças.', 'warning')
                        }
                      }}
                    >
                      Carregar plano (tipo seleccionado)
                    </button>
                  </div>
                ) : (
                  <>
                    <table className="data-table kaeser-pecas-table">
                      <thead><tr><th>Cód.</th><th>Descrição</th><th>Qtd</th><th>Un.</th><th /></tr></thead>
                      <tbody>
                        {form.pecasUsadas.map((p, idx) => (
                          <tr key={p.id ?? `adm-${idx}`}>
                            <td><input className="kaeser-peca-cell" value={p.codigoArtigo ?? ''} onChange={e => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, codigoArtigo: e.target.value } : pp) }))} /></td>
                            <td><input className="kaeser-peca-cell" value={p.descricao ?? ''} onChange={e => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, descricao: e.target.value } : pp) }))} /></td>
                            <td style={{ width: '5rem' }}>
                              <input type="number" min={0} step={0.5} className="kaeser-peca-cell"
                                value={p.quantidadeUsada ?? p.quantidade ?? 0}
                                onChange={e => {
                                  const q = Math.max(0, parseFloat(e.target.value) || 0)
                                  setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, quantidadeUsada: q, quantidade: q, usado: q > 0 } : pp) }))
                                }}
                              />
                            </td>
                            <td style={{ width: '4rem' }}>
                              <select value={p.unidade || 'PÇ'} onChange={e => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, unidade: e.target.value } : pp) }))}>
                                {['PÇ', 'TER', 'L', 'KG', 'M', 'UN'].map(u => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </td>
                            <td>
                              <button type="button" className="icon-btn danger" aria-label="Remover linha" onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.filter((_, i) => i !== idx) }))}><X size={14} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" className="btn secondary btn-sm" style={{ marginTop: '0.5rem' }}
                      onClick={() => setForm(f => ({ ...f, pecasUsadas: [...f.pecasUsadas, { id: 'manual_' + Date.now(), posicao: '', codigoArtigo: '', descricao: '', quantidadeUsada: 1, quantidade: 1, unidade: 'PÇ', usado: true, manual: true }] }))}>
                      <Plus size={14} /> Adicionar linha
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {!isCorrectionMode && useKaeserPipeline && step === W.horas && (
            <div className="wizard-step-content" data-testid="kaeser-passo-horas">
              <p className="wizard-step-hint">
                Leia o <strong>contador de horas de serviço</strong>. A app combina <strong>Δh desde a última referência</strong> na ficha com a <strong>janela anual ({KAESER_ANUAL_MIN_DIAS} d)</strong> — sugere o tipo A/B/C/D; pode sempre alterar.
                <button
                  type="button"
                  className="btn-icon-hint kaeser-help-btn"
                  aria-label="Ajuda: o que ocorrer primeiro (horas ou ano)"
                  title="Regra: o que ocorrer primeiro — manutenção ao atingir o intervalo de horas do plano, ou pelo menos uma vez por ano se esse intervalo ainda não foi atingido. A sugestão não é obrigatória."
                  onClick={() => showToast(`O que ocorrer primeiro: intervalo de horas (ex.: Δh ≥ ${KAESER_INTERVALO_HORAS_REF}) ou visita anual (≥ ${KAESER_ANUAL_MIN_DIAS} dias desde a última). Pode alterar o tipo e os consumíveis.`, 'info', 3500)}
                >
                  <HelpCircle size={18} />
                </button>
              </p>
              {conflitoHorasFichaVsUltimoRel && (
                <div className="wizard-confirm" style={{ marginBottom: '0.75rem' }}>
                  <AlertTriangle size={16} />
                  <span>
                    Diferença entre ficha e último relatório: ficha indica <strong>{conflitoHorasFichaVsUltimoRel.hm} h</strong> de serviço;
                    última manutenção concluída ({conflitoHorasFichaVsUltimoRel.last.data}) registou <strong>{conflitoHorasFichaVsUltimoRel.hr} h</strong>.
                    Confirme a referência antes de interpretar Δh.
                  </span>
                </div>
              )}
              <div className="form-section">
                <label>
                  Horas no contador (acumuladas) <span className="req-star">*</span>
                  <span className="form-hint" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 400 }}>
                    Valor acumulado no compressor — usado para Δh e para a sugestão de fase A/B/C/D.
                  </span>
                  <input
                    className="wizard-input-horas-compact"
                    type="number"
                    min={0}
                    step={1}
                    required
                    value={form.horasServico}
                    onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
                    onBlur={() => {
                      const hs = parseInt(String(form.horasServico).trim(), 10)
                      if (!Number.isFinite(hs) || hs < 0) return
                      const sug = sugerirFaseKaeser({
                        maquina: maq,
                        horasServicoAtuais: hs,
                        dataExecucao: getHojeAzores(),
                        fallbackUltimaData: fallbackUltimaManutDataKaeser,
                        contadorFichaConfiavel: temManutencaoConcluidaNaMaq,
                      })
                      kaeserAuditoriaRef.current = { tipoSugerido: sug.tipoPreSelecao, motivo: sug.motivoPrincipal }
                      if (kaeserIntervencaoAnual) return
                      setForm(f => ({
                        ...f,
                        tipoManutKaeser: f.tipoManutKaeser || sug.tipoPreSelecao,
                        pecasUsadas: f.tipoManutKaeser ? f.pecasUsadas : pecasDoPlanoKaeser(sug.tipoPreSelecao),
                      }))
                    }}
                    placeholder="Ex: 6200"
                  />
                </label>
              </div>
              <div className="form-section" style={{ marginTop: '0.25rem' }}>
                <label className="kaeser-anual-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
                  <input
                    type="checkbox"
                    checked={kaeserIntervencaoAnual}
                    onChange={e => setKaeserIntervencaoAnual(e.target.checked)}
                    style={{ marginTop: '0.2rem' }}
                  />
                  <span>
                    <strong>Intervenção anual</strong> — escolher livremente o kit (A/B/C/D). A sugestão automática deixa de alterar o tipo ao sair do campo das horas; escolha o kit no menu abaixo e carregue os consumíveis desse tipo.
                  </span>
                </label>
              </div>
              {kaeserSugestaoLive?.tipoIndicadoPorContadorHoras && (
                <div className="form-section kaeser-aviso-tipo-horas" style={{
                  marginTop: '0.35rem',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 8,
                  border: '1px solid var(--color-border, #e5e7eb)',
                  background: 'var(--color-bg-elevated, #f8fafc)',
                  fontSize: '0.9rem',
                  lineHeight: 1.45,
                }}
                >
                  Pelo número de horas indicado no contador, o tipo associado ao <strong>intervalo de horas</strong> do plano seria{' '}
                  <strong>Tipo {kaeserSugestaoLive.tipoIndicadoPorContadorHoras}</strong>
                  {INTERVALOS_KAESER[kaeserSugestaoLive.tipoIndicadoPorContadorHoras]
                    ? ` (${INTERVALOS_KAESER[kaeserSugestaoLive.tipoIndicadoPorContadorHoras].label})`
                    : ''}.
                  {kaeserIntervencaoAnual
                    ? ' Na intervenção anual pode manter este tipo ou seleccionar outro (A, B, C ou D) conforme a decisão no local.'
                    : ' Pode aceitar a sugestão do resumo abaixo ou seleccionar outro tipo se a intervenção for diferente (ex.: emergência, outro kit).'}
                </div>
              )}
              {kaeserSugestaoLive && (
                <div className="form-section kaeser-sugestao-resumo">
                  <p className="form-hint" style={{ marginTop: 0 }}>
                    <strong>Sugestão:</strong>{' '}
                    {kaeserSugestaoLive.motivoPrincipal === 'ambos' && 'calendário e horas indicam tipos diferentes — escolha abaixo.'}
                    {kaeserSugestaoLive.motivoPrincipal === 'anual' && `janela anual (≥ ${KAESER_ANUAL_MIN_DIAS} d desde a referência).`}
                    {kaeserSugestaoLive.motivoPrincipal === 'horas' && `Δh ≥ ${KAESER_INTERVALO_HORAS_REF} h desde a última referência na ficha.`}
                    {kaeserSugestaoLive.motivoPrincipal === 'fallback' && 'sem critério anual/Δh — fallback pelo contador absoluto.'}
                    {' '}
                    <strong>Tipo pré-seleccionado: {kaeserSugestaoLive.tipoPreSelecao}</strong>
                  </p>
                  {kaeserSugestaoLive.mostrarDual && kaeserSugestaoLive.tipoSugeridoCalendario && kaeserSugestaoLive.tipoSugeridoHoras && (
                    <div className="kaeser-dual-sugestao">
                      <button
                        type="button"
                        className="btn secondary btn-sm"
                        onClick={() => {
                          const t = kaeserSugestaoLive.tipoSugeridoCalendario
                          kaeserAuditoriaRef.current = { tipoSugerido: t, motivo: 'anual' }
                          aplicarTipoKaeserComPecas(t, { skipDirtyConfirm: true })
                        }}
                      >
                        Aplicar sugestão (calendário): Tipo {kaeserSugestaoLive.tipoSugeridoCalendario}
                      </button>
                      <button
                        type="button"
                        className="btn secondary btn-sm"
                        onClick={() => {
                          const t = kaeserSugestaoLive.tipoSugeridoHoras
                          kaeserAuditoriaRef.current = { tipoSugerido: t, motivo: 'horas' }
                          aplicarTipoKaeserComPecas(t, { skipDirtyConfirm: true })
                        }}
                      >
                        Aplicar sugestão (horas): Tipo {kaeserSugestaoLive.tipoSugeridoHoras}
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn-link-checklist"
                    data-testid="kaeser-toggle-detalhes"
                    onClick={() => setKaeserCalcDetalhesOpen(o => !o)}
                  >
                    {kaeserCalcDetalhesOpen ? 'Ocultar detalhes do cálculo' : 'Detalhes do cálculo'}
                  </button>
                  {kaeserCalcDetalhesOpen && (
                    <ul className="kaeser-calc-detalhes text-muted" style={{ fontSize: '0.85rem', margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                      <li>Data de referência: {kaeserSugestaoLive.detalhes.dataUltimaReferencia ?? '—'}</li>
                      <li>Dias desde a referência: {kaeserSugestaoLive.detalhes.diasDesdeUltima ?? '—'}</li>
                      <li>
                        Horas na ficha (última):{' '}
                        {kaeserSugestaoLive.detalhes.contadorFichaConfiavel
                          ? (kaeserSugestaoLive.detalhes.horasUltima ?? '—')
                          : '0'}
                        {!kaeserSugestaoLive.detalhes.contadorFichaConfiavel && (
                          <span className="text-muted"> (sem manutenção concluída — valores da ficha ignorados)</span>
                        )}
                      </li>
                      <li>Δh (actual − ficha): {kaeserSugestaoLive.detalhes.deltaH ?? '—'}</li>
                      <li>Limiar horas: {KAESER_INTERVALO_HORAS_REF} h · Limiar anual: {KAESER_ANUAL_MIN_DIAS} d</li>
                      {kaeserSugestaoLive.tipoSugeridoCalendario && (
                        <li>Sugestão por calendário (posição ciclo): Tipo {kaeserSugestaoLive.tipoSugeridoCalendario}</li>
                      )}
                      {kaeserSugestaoLive.tipoSugeridoHoras && (
                        <li>Sugestão por Δh: Tipo {kaeserSugestaoLive.tipoSugeridoHoras}</li>
                      )}
                    </ul>
                  )}
                </div>
              )}
              <div className="form-section">
                <label>
                  Tipo de manutenção KAESER (A/B/C/D) <span className="req-star">*</span>
                  <select
                    value={form.tipoManutKaeser}
                    onChange={e => aplicarTipoKaeserComPecas(e.target.value)}
                  >
                    <option value="">— Seleccionar —</option>
                    {Object.entries(INTERVALOS_KAESER).map(([tipo, info]) => (
                      <option key={tipo} value={tipo}>{info.label}</option>
                    ))}
                  </select>
                </label>
                <p className="form-hint" style={{ marginTop: '0.35rem' }}>
                  Fallback absoluto (sem Δh fiável):{' '}
                  <strong>
                    {(() => {
                      const hs = parseInt(String(form.horasServico).trim(), 10)
                      return Number.isFinite(hs) && hs >= 0
                        ? `Tipo ${tipoKaeserSugeridoPorHorasServico(hs)}`
                        : '— (preencha as horas de serviço)'
                    })()}
                  </strong>
                  {maq?.posicaoKaeser != null && (
                    <>
                      {' '}
                      <span className="kaeser-ciclo-hint">
                        · Ciclo na ficha: {descricaoCicloKaeser(maq.posicaoKaeser)}
                        {' '}· Próximo: {descricaoCicloKaeser(proximaPosicaoKaeser(maq.posicaoKaeser))}
                      </span>
                    </>
                  )}
                </p>
              </div>
              {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
            </div>
          )}

          {!isCorrectionMode && useKaeserPipeline && step === W.pecas && (
            <div className="wizard-step-content">
              <p className="wizard-step-hint">
                Lista do plano para o <strong>Tipo {form.tipoManutKaeser || '—'}</strong>. Pré-preenchida com <strong>1 un.</strong> por linha — ajuste as quantidades (0 = não aplicável) ou acrescente artigos extra.
              </p>
              <div className="kaeser-pecas-table-wrap">
                {form.pecasUsadas.length === 0 ? (
                  <p className="text-muted">Nenhum consumível no plano para este tipo. Adicione linhas manualmente ou configure o plano em Equipamentos.</p>
                ) : (
                  <table className="data-table kaeser-pecas-table">
                    <thead><tr><th>Cód.</th><th>Descrição</th><th>Qtd</th><th>Un.</th><th /></tr></thead>
                    <tbody>
                      {form.pecasUsadas.map((p, idx) => (
                        <tr key={p.id ?? `k-${idx}`}>
                          <td><input className="kaeser-peca-cell" value={p.codigoArtigo ?? ''} onChange={e => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, codigoArtigo: e.target.value } : pp) })) }} /></td>
                          <td><input className="kaeser-peca-cell" value={p.descricao ?? ''} onChange={e => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, descricao: e.target.value } : pp) })) }} /></td>
                          <td style={{ width: '5rem' }}>
                            <input type="number" min={0} step={0.5} className="kaeser-peca-cell"
                              value={p.quantidadeUsada ?? p.quantidade ?? 0}
                              onChange={e => {
                                const q = Math.max(0, parseFloat(e.target.value) || 0)
                                setKaeserPecasDirty(true)
                                setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, quantidadeUsada: q, quantidade: q, usado: q > 0 } : pp) }))
                              }}
                            />
                          </td>
                          <td style={{ width: '4rem' }}>
                            <select value={p.unidade || 'PÇ'} onChange={e => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, unidade: e.target.value } : pp) })) }}>
                              {['PÇ', 'TER', 'L', 'KG', 'M', 'UN'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </td>
                          <td>
                            <button type="button" className="icon-btn danger" aria-label="Remover linha" onClick={() => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.filter((_, i) => i !== idx) })) }}><X size={14} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                <button type="button" className="btn secondary btn-sm" style={{ marginTop: '0.5rem' }}
                  onClick={() => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: [...f.pecasUsadas, { id: 'manual_' + Date.now(), posicao: '', codigoArtigo: '', descricao: '', quantidadeUsada: 1, quantidade: 1, unidade: 'PÇ', usado: true, manual: true }] })) }}>
                  <Plus size={14} /> Adicionar linha
                </button>
              </div>
              <label className="exec-equip-confirm-label form-section" style={{ marginTop: '0.75rem' }}>
                <input
                  type="checkbox"
                  checked={kaeserSemConsumiveis}
                  onChange={e => setKaeserSemConsumiveis(e.target.checked)}
                />
                <span>Confirmo que nesta intervenção não houve substituição nem consumo de materiais do plano (lista vazia ou só inspecção).</span>
              </label>
              {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
            </div>
          )}

          {/* ═══ Checklist ═══ */}
          <div className="wizard-step-content" style={{ display: (isCorrectionMode || step === W.checklist) ? 'block' : 'none' }}>
            {isCorrectionMode && <h3 className="admin-edit-section-title">Checklist de verificação</h3>}
            {!isCorrectionMode && <p className="wizard-step-hint">Confirme ponto a ponto se a tarefa foi executada (Sim/Não).</p>}

            {preFilledFromLast && (
              <div className="prefill-banner">
                <History size={15} />
                <span>Checklist pré-preenchida com base na última execução. Reveja antes de avançar.</span>
                <button type="button" className="btn-link-checklist" onClick={() => {
                  const empty = {}
                  items.forEach(it => { empty[it.id] = '' })
                  setForm(f => ({ ...f, checklistRespostas: empty }))
                  setPreFilledFromLast(false)
                }}>Limpar tudo</button>
              </div>
            )}

            <MaquinaDocumentacaoLinks maquina={maq} />

            {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
            {items.length > 0 && (
              <div className="checklist-section-wizard">
                <h3>Checklist de verificação</h3>
                <span className="checklist-obrigatorio-badge">✱ Preenchimento obrigatório — todos os itens Sim / Não</span>
                <div className="checklist-quick-actions">
                  <button type="button" className="btn-link-checklist"
                    onClick={() => {
                      const all = {}
                      items.forEach(it => { all[it.id] = 'sim' })
                      setForm(f => ({ ...f, checklistRespostas: all }))
                    }}>
                    Marcar todos
                  </button>
                  <span className="checklist-quick-sep">/</span>
                  <button type="button" className="btn-link-checklist"
                    onClick={() => {
                      const empty = {}
                      items.forEach(it => { empty[it.id] = '' })
                      setForm(f => ({ ...f, checklistRespostas: empty }))
                    }}>
                    Desmarcar todos
                  </button>
                </div>
                <div className="checklist-respostas">
                  {items.map((item, i) => (
                    <div key={item.id} className="checklist-item-row">
                      <span className="checklist-item-num">{i + 1}.</span>
                      <span className="checklist-item-texto">{item.texto}</span>
                      <div className="checklist-item-btns">
                        <button type="button"
                          className={`btn-simnao ${form.checklistRespostas[item.id] === 'sim' ? 'active-sim' : ''}`}
                          onClick={() => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: 'sim' } }))}>
                          Sim
                        </button>
                        <button type="button"
                          className={`btn-simnao ${form.checklistRespostas[item.id] === 'nao' ? 'active-nao' : ''}`}
                          onClick={() => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: 'nao' } }))}>
                          Não
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(isCorrectionMode || !useKaeserPipeline) && isKaeserAbcdMaq && manutencaoAtual?.tipo !== 'montagem' && (
              <div className="form-section">
                <label>
                  Tipo de manutenção KAESER (A/B/C/D)
                  {maq?.posicaoKaeser != null && (
                    <span className="kaeser-ciclo-hint">
                      Ciclo: {descricaoCicloKaeser(maq.posicaoKaeser)}
                      {' '}· Próximo ciclo: {descricaoCicloKaeser(proximaPosicaoKaeser(maq.posicaoKaeser))}
                    </span>
                  )}
                  <select
                    value={form.tipoManutKaeser}
                    onChange={e => aplicarTipoKaeserComPecas(e.target.value)}
                  >
                    <option value="">Periódica (sem plano específico)</option>
                    {Object.entries(INTERVALOS_KAESER).map(([tipo, info]) => (
                      <option key={tipo} value={tipo}>
                        {info.label}
                        {maq?.posicaoKaeser != null && tipoKaeserNaPosicao(maq.posicaoKaeser) === tipo ? ' ✓ (sugerido)' : ''}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {(isCorrectionMode || !useKaeserPipeline) && (form.pecasUsadas.length > 0 || (isKaeserAbcdMaq && form.tipoManutKaeser)) && (
              <div className="form-section">
                <div className="pecas-checklist-header">
                  <h3>Consumíveis e peças</h3>
                  {form.pecasUsadas.length > 0 && (
                    <div className="pecas-checklist-actions">
                      <button type="button" className="btn-checklist-all btn-marcar"
                        onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map(p => ({ ...p, usado: true })) }))}>
                        ✓ Marcar todos
                      </button>
                      <button type="button" className="btn-checklist-all btn-desmarcar"
                        onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map(p => ({ ...p, usado: false })) }))}>
                        ✗ Desmarcar todos
                      </button>
                    </div>
                  )}
                </div>
                {form.pecasUsadas.length === 0 ? (
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Nenhum plano configurado para este tipo. Adicione consumíveis abaixo ou configure o plano em Equipamentos → Plano de peças.
                  </p>
                ) : (
                  <div className="pecas-checklist-lista">
                    {form.pecasUsadas.map((p, idx) => (
                      <label key={p.id ?? idx} className={`peca-checklist-row${p.usado ? ' peca-usada' : ' peca-nao-usada'}`}>
                        <input type="checkbox" checked={!!p.usado}
                          onChange={e => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, usado: e.target.checked } : pp) }))}
                          className="peca-checkbox" />
                        <span className="peca-checklist-info">
                          {p.posicao && <span className="peca-pos">{p.posicao}</span>}
                          {p.codigoArtigo && <span className="peca-codigo">{p.codigoArtigo}</span>}
                          <span className="peca-desc">{p.descricao || '—'}</span>
                          <span className="peca-qty-un">{p.quantidade} {p.unidade}</span>
                        </span>
                        {p.manual && (
                          <button type="button" className="icon-btn danger peca-remove-btn"
                            onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.filter((_, i) => i !== idx) }))} title="Remover">
                            <X size={11} />
                          </button>
                        )}
                      </label>
                    ))}
                  </div>
                )}
                <button type="button" className="btn-link-checklist" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}
                  onClick={() => setForm(f => ({ ...f, pecasUsadas: [...f.pecasUsadas, { id: 'manual_' + Date.now(), posicao: '', codigoArtigo: '', descricao: 'Item manual', quantidade: 1, unidade: 'PÇ', usado: true, manual: true }] }))}>
                  + Adicionar consumível manualmente
                </button>
              </div>
            )}
          </div>

          {/* ═══ Observações ═══ */}
          <div className="wizard-step-content" style={{ display: (isCorrectionMode || step === W.notas) ? 'block' : 'none' }}>
            {isCorrectionMode && <h3 className="admin-edit-section-title">Observações</h3>}
            {!isCorrectionMode && (
              <p className="wizard-step-hint">
                As observações são <strong>obrigatórias</strong>. Use uma nota rápida ou escreva uma nota livre descritiva.
              </p>
            )}
            <label className="form-section">
              Notas importantes <span className="char-count">({form.notas.length}/300)</span>
              <textarea
                value={form.notas}
                onChange={e => {
                  setForm(f => ({ ...f, notas: e.target.value.slice(0, 300) }))
                  if (confirmacaoPendente) setConfirmacaoPendente(null)
                }}
                rows={6}
                className="textarea-full"
                maxLength={300}
                placeholder="Descreva o trabalho. Pode tocar numa nota rápida ou escrever texto livre suficiente…"
              />
            </label>

            <div className="quick-notes-section">
              <span className="quick-notes-label">Notas rápidas — toque para acelerar; texto livre também é aceite se for descritivo:</span>
              <div className="quick-notes-chips">
                {quickNotes.map((note, i) => {
                  const isIncluded = form.notas.includes(note)
                  return (
                    <button key={i} type="button"
                      className={`quick-note-chip${isIncluded ? ' quick-note-chip--active' : ''}`}
                      onClick={() => {
                        setForm(f => {
                          const current = f.notas.trim()
                          const sep = current ? '\n' : ''
                          return { ...f, notas: (current + sep + note).slice(0, 300) }
                        })
                        if (confirmacaoPendente) setConfirmacaoPendente(null)
                      }}>{isIncluded && '✓ '}{note}</button>
                  )
                })}
              </div>
            </div>
            {!isCorrectionMode && step === W.notas && erroChecklist && <p className="form-erro">{erroChecklist}</p>}
          </div>

          {/* ═══ Fotografias ═══ */}
          <div className="wizard-step-content" style={{ display: (isCorrectionMode || step === W.fotos) ? 'block' : 'none' }}>
            {isCorrectionMode && <h3 className="admin-edit-section-title">Fotografias</h3>}
            {!isCorrectionMode && <p className="wizard-step-hint">Adicione fotografias de apoio à manutenção.</p>}
            <div className="form-section fotos-section">
              <div className="fotos-header">
                <span className="fotos-label">
                  Fotografias de apoio
                  <span className="fotos-count"> ({fotos.length}/{MAX_FOTOS})</span>
                </span>
                {fotos.length < MAX_FOTOS && !fotoCarregando && (
                  <div className="fotos-btns">
                    <input ref={fotoCameraRef} type="file" accept="image/*" capture="environment" className="fotos-input-hidden" onChange={e => { handleFotoChange(e); if (confirmacaoPendente) setConfirmacaoPendente(null) }} />
                    <button type="button" className="btn-foto" onClick={() => fotoCameraRef.current?.click()}>
                      <Camera size={15} /> Tirar foto
                    </button>
                    <input ref={fotoInputRef} type="file" accept="image/*" multiple className="fotos-input-hidden" onChange={e => { handleFotoChange(e); if (confirmacaoPendente) setConfirmacaoPendente(null) }} />
                    <button type="button" className="btn-foto btn-foto-gallery" onClick={() => fotoInputRef.current?.click()}>
                      <FolderOpen size={15} /> Galeria
                    </button>
                  </div>
                )}
                {fotoCarregando && <span className="fotos-loading">A processar…</span>}
              </div>
              <p className="fotos-limite-hint">
                Máximo de <strong>{MAX_FOTOS}</strong> fotografias por relatório (PDF e envio por email). As imagens são comprimidas no dispositivo.
                {fotos.length >= MAX_FOTOS && (
                  <span className="fotos-limite-atingido"> Limite atingido — remova uma foto para adicionar outra.</span>
                )}
              </p>
              {fotos.length > 0 && (
                <div className="fotos-grid">
                  {fotos.map((src, idx) => (
                    <div key={idx} className="foto-thumb">
                      <img src={src} alt={`Foto ${idx + 1}`} />
                      <button type="button" className="foto-remover" onClick={() => removerFoto(idx)} aria-label={`Remover foto ${idx + 1}`}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {fotos.length === 0 && <p className="fotos-vazio">Nenhuma fotografia adicionada.</p>}
            </div>
            {confirmacaoPendente === 'fotos' && (
              <div className="wizard-confirm">
                <AlertTriangle size={16} />
                <span>Pretende continuar sem fotografias?</span>
                <div className="wizard-confirm-actions">
                  <button type="button" className="btn primary btn-sm" onClick={() => { setConfirmacaoPendente(null); setStep(W.tec) }}>
                    Sim, avançar
                  </button>
                  <button type="button" className="btn secondary btn-sm" onClick={() => setConfirmacaoPendente(null)}>
                    Não
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ Técnico ═══ */}
          <div className="wizard-step-content" style={{ display: (isCorrectionMode || step === W.tec) ? 'block' : 'none' }}>
            {isCorrectionMode && <h3 className="admin-edit-section-title">Técnico</h3>}
            {!isCorrectionMode && <p className="wizard-step-hint">Selecione o técnico responsável pela manutenção.</p>}
            {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}
            <label className="label-required form-section">
              <span>Técnico que realizou a manutenção <span className="req-star">*</span></span>
              <select value={form.tecnico}
                onChange={e => { setForm(f => ({ ...f, tecnico: e.target.value })); setErroAssinatura('') }}>
                <option value="">— Selecionar técnico —</option>
                {nomesTecnicos.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </label>
          </div>

          {/* ═══ Nome do cliente ═══ */}
          <div className="wizard-step-content" style={{ display: (isCorrectionMode || step === W.cli) ? 'block' : 'none' }}>
            {isCorrectionMode && <h3 className="admin-edit-section-title">Nome do cliente</h3>}
            {!isCorrectionMode && <p className="wizard-step-hint">Indique o nome do cliente responsável pela aceitação do serviço.</p>}
            {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

            {!isCorrectionMode && (
              <div className="declaracao-assinatura-box">
                <p className="declaracao-assinatura-titulo">Declaração de aceitação</p>
                <p className="declaracao-assinatura-texto">
                  {resolveDeclaracaoClienteForMaquina(
                    manutencaoAtual?.tipo === 'montagem' ? 'montagem' : 'periodica',
                    maq,
                    getSubcategoria,
                    getCategoria,
                  )}
                </p>
              </div>
            )}

            <label className={`${isCorrectionMode ? '' : 'label-required'} form-section`}>
              <span>{isCorrectionMode ? 'Nome do cliente que assinou' : 'Nome do cliente que assina'} {!isCorrectionMode && <span className="req-star">*</span>}</span>
              <div className="campo-com-guardar">
                <input type="text" value={form.nomeAssinante}
                  onChange={e => { setForm(f => ({ ...f, nomeAssinante: e.target.value })); setErroAssinatura('') }}
                  placeholder="Nome completo do responsável"
                  maxLength={80} />
                {form.nomeAssinante.trim() && (
                  <button type="button" className="btn-guardar-contacto" onClick={guardarNomeContacto}
                    title="Guardar este nome para futuras intervenções deste cliente">
                    <Bookmark size={14} />
                    {cli?.nomeContacto === form.nomeAssinante.trim() ? 'Guardado' : 'Guardar'}
                  </button>
                )}
              </div>
            </label>
          </div>

          {/* ═══ Assinatura ═══ */}
          <div className="wizard-step-content" style={{ display: (isCorrectionMode || step === W.ass) ? 'block' : 'none' }}>
            {isCorrectionMode ? (
              <>
                <h3 className="admin-edit-section-title">Assinatura digital</h3>
                {rel?.assinaturaDigital && !form.limparAssinatura ? (
                  <div className="admin-edit-assinatura-preview">
                    <img src={rel.assinaturaDigital} alt="Assinatura do cliente" className="assinatura-preview-img" />
                    <div className="assinatura-preview-info">
                      <span className="assinatura-ok">Assinado por: {rel.nomeAssinante || '(sem nome)'}</span>
                      <button type="button" className="btn danger btn-sm" style={{ marginTop: '0.5rem' }}
                        onClick={() => setForm(f => ({ ...f, nomeAssinante: '', limparAssinatura: true }))}>
                        <Trash2 size={13} /> Limpar assinatura
                      </button>
                      <span className="form-hint" style={{ display: 'block', marginTop: '0.35rem' }}>
                        Após limpar, use "Recolher assinatura" para obter nova assinatura do cliente.
                      </span>
                    </div>
                  </div>
                ) : form.limparAssinatura ? (
                  <div className="admin-edit-assinatura-cleared">
                    <p className="form-hint">Assinatura será removida ao guardar. Use depois "Recolher assinatura" no menu da manutenção.</p>
                    <button type="button" className="btn secondary btn-sm"
                      onClick={() => setForm(f => ({ ...f, nomeAssinante: rel?.nomeAssinante || '', limparAssinatura: false }))}>
                      Cancelar remoção
                    </button>
                  </div>
                ) : (
                  <p className="form-hint">Sem assinatura registada.</p>
                )}
              </>
            ) : (
              <>
                <p className="wizard-step-hint">O cliente deve assinar digitalmente para confirmar a aceitação do serviço.</p>
                {rel?.assinaturaDigital && (
                  <p className="wizard-step-hint" style={{ marginTop: '0.35rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
                    Se o relatório já tinha assinatura, ela é reposta abaixo. Use «Limpar assinatura» para o cliente voltar a assinar, se necessário.
                  </p>
                )}
                {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

                <div className="assinatura-canvas-wrap">
                  <div className="assinatura-canvas-label">
                    Assinatura digital do cliente {!isAdmin && <span className="req-star">*</span>}
                  </div>
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={140}
                    className={`assinatura-canvas ${assinaturaFeita ? 'assinatura-canvas--feita' : ''}`}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                  />
                  <div className="assinatura-canvas-actions">
                    <button type="button" className="btn-link-checklist assinatura-limpar" onClick={limparAssinatura}>
                      <Trash2 size={12} /> Limpar assinatura
                    </button>
                    {assinaturaFeita && (
                      <>
                        <span className="assinatura-ok">✓ Assinatura registada</span>
                        <button type="button" className="btn-guardar-contacto" onClick={guardarAssinaturaContacto}
                          title="Guardar esta assinatura para futuras intervenções deste cliente">
                          <Bookmark size={14} /> Guardar assinatura
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isAdmin && !assinaturaFeita && (
                  <p className="wizard-step-hint" style={{ marginTop: '0.75rem', fontStyle: 'italic' }}>
                    Como Admin, pode avançar sem assinatura e gravar posteriormente.
                  </p>
                )}
              </>
            )}
          </div>

          {/* ═══ Finalizar (hidden in admin edit mode) ═══ */}
          <div className="wizard-step-content" style={{ display: (!isCorrectionMode && step === W.fin) ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Reveja os dados, pré-visualize o relatório e finalize a manutenção.</p>
            {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

            <div className="exec-review-panel">
              <div className="exec-review-header">
                <CheckCircle2 size={18} />
                <div>
                  <strong>Revisão antes de gravar</strong>
                  <p>Confirme datas, assinatura, próxima manutenção e envio antes de fechar a intervenção.</p>
                </div>
              </div>
              <div className="exec-review-grid">
                <div><span>Agendada</span><strong>{resumoFinalizacao.dataAgendada ? formatarDataPT(resumoFinalizacao.dataAgendada) : '—'}</strong></div>
                <div><span>Execução</span><strong>{resumoFinalizacao.dataExecucao ? formatarDataPT(resumoFinalizacao.dataExecucao) : '—'}</strong></div>
                <div><span>Técnico</span><strong>{resumoFinalizacao.tecnico}</strong></div>
                <div><span>Assinatura</span><strong>{resumoFinalizacao.assinatura}</strong></div>
                <div><span>Fotos</span><strong>{resumoFinalizacao.fotos}/{MAX_FOTOS}</strong></div>
                <div><span>Email</span><strong>{resumoFinalizacao.destinoEmail}</strong></div>
                <div className="exec-review-wide"><span>Próxima manutenção prevista</span><strong>{resumoFinalizacao.proxima ? formatarDataPT(resumoFinalizacao.proxima) : '—'}</strong></div>
                <div className="exec-review-wide"><span>Agenda futura</span><strong>{resumoFinalizacao.periodicidade ? `Recalcular a partir de ${resumoFinalizacao.dataExecucao || 'hoje'}` : 'Sem periodicidade definida'}</strong></div>
              </div>
            </div>

            {(isAdmin || (manutencaoAtual?.data && manutencaoAtual.data < getHojeAzores())) && (
              <div className="form-section-historica">
                <label className="historica-label">
                  <History size={14} />
                  Data de realização
                  <span className="historica-hint">
                    {isAdmin
                      ? '(preencher apenas para registos históricos — deixar vazio para usar hoje)'
                      : '(esta manutenção estava em atraso — pode indicar a data real de execução, ou deixar vazio para usar hoje)'}
                  </span>
                  <input type="date" max={getHojeAzores()} value={form.dataRealizacao}
                    onChange={e => setForm(f => ({ ...f, dataRealizacao: e.target.value }))} />
                </label>
                {form.dataRealizacao && (
                  <p className="historica-aviso">
                    ⚠ Registo histórico: manutenção, relatório e próxima data serão registados como <strong>{form.dataRealizacao}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="form-section email-section">
              <h3 className="assinatura-titulo"><Mail size={16} /> Envio do comprovativo</h3>
              <label className="label-required">
                <span>Email do cliente para envio do relatório</span>
                <input type="email" value={emailDestinatario}
                  onChange={e => setEmailDestinatario(e.target.value)}
                  placeholder="exemplo@empresa.pt" autoComplete="email" />
                {!isEmailConfigured() && (
                  <small className="email-config-aviso">
                    ⚠ Endpoint de email não configurado — o botão abrirá o cliente de email local.
                  </small>
                )}
              </label>

              <button type="button" className="btn-preview" onClick={handlePreviewInline} disabled={previewLoading}>
                <Eye size={15} /> {previewLoading ? 'A gerar…' : previewPdfUrl ? 'Fechar pré-visualização' : 'Pré-visualizar relatório'}
              </button>
            </div>

            {previewPdfUrl && (
              <div className="wizard-preview">
                <iframe src={previewPdfUrl} title="Pré-visualização do relatório" className="wizard-preview-iframe" />
                <div className="wizard-preview-actions">
                  <button type="button" className="btn secondary btn-sm" onClick={() => window.open(previewPdfUrl, '_blank')}>
                    <Eye size={14} /> Abrir noutra janela
                  </button>
                  <button type="button" className="btn secondary btn-sm" onClick={() => {
                    const a = document.createElement('a')
                    a.href = previewPdfUrl
                    a.download = `relatorio-manutencao.pdf`
                    a.click()
                  }}>
                    <FileDown size={14} /> Transferir PDF
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>{/* fim .wizard-body */}

        {/* ═══ Rodapé fixo ═══ */}
        <div className="wizard-footer">
          <button type="button" className="btn secondary" onClick={handleCancelarExecucao}>Cancelar</button>
          {isCorrectionMode ? (
            <div className="wizard-footer-actions">
              <button type="button" className="btn btn-gravar-sucesso" onClick={handleAdminEditSave}>
                <Save size={15} /> Guardar alterações
              </button>
            </div>
          ) : (
            <div className="wizard-footer-actions">
              {step > 1 && (
                <button type="button" className="btn secondary" onClick={goPrev}>
                  <ChevronLeft size={16} /> Anterior
                </button>
              )}
              {step < W.total && (
                <button type="button" className="btn primary" onClick={goNext}>
                  Seguinte <ChevronRight size={16} />
                </button>
              )}
              {step === W.total && (
                <>
                  {isAdmin && (
                    <button type="button" className="btn btn-outline-warning" onClick={handleGravarSemAssinatura} disabled={emailEnviando}>
                      <PenLine size={15} /> Guardar sem ass.
                    </button>
                  )}
                  <button type="button" className="btn btn-gravar-sucesso" onClick={handleGravarSemEnvio} disabled={emailEnviando}>
                    <Save size={15} /> Gravar
                  </button>
                  <button type="submit" className="btn btn-enviar-relatorio" disabled={emailEnviando}>
                    {emailEnviando ? 'A enviar…' : <><Mail size={15} /> Enviar</>}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        </form>
      </div>
    </div>
  )
}
