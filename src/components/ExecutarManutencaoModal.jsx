/**
 * ExecutarManutencaoModal – Modal para executar manutenção.
 * Fluxo: checklist → notas + fotos → técnico (obrigatório) → nome cliente (obrigatório) → assinatura digital (obrigatória).
 * Fotos: capturadas pela câmara ou galeria, comprimidas no browser (canvas), guardadas como base64.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useData } from '../context/DataContext'
import { logger } from '../utils/logger'
import { TIPOS_DOCUMENTO, SUBCATEGORIAS_COM_CONTADOR_HORAS, SUBCATEGORIAS_COMPRESSOR, INTERVALOS_KAESER, tipoKaeserNaPosicao, proximaPosicaoKaeser, descricaoCicloKaeser } from '../context/DataContext'
import { format, addDays } from 'date-fns'
import { getHojeAzores, nowISO } from '../utils/datasAzores'
import { pt } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, PenLine, Trash2, Camera, X, CalendarClock, AlertTriangle, CheckCircle2, Mail, Eye, History, Save, Bookmark, ChevronLeft, ChevronRight, FileDown } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { formatarDataPT, distribuirHorarios, buildFeriadosSet, proximoDiaUtilLivre } from '../utils/diasUteis'
import { enviarRelatorioEmail } from '../services/emailService'
import { gerarPdfCompacto } from '../utils/gerarPdfRelatorio'
import { isEmailConfigured } from '../config/emailConfig'
import { safeHttpUrl } from '../utils/sanitize'
import { MAX_FOTOS } from '../config/limits'
import { getDeclaracaoCliente } from '../constants/relatorio'

const FOTO_MAX_W = 1200
const FOTO_MAX_H = 1200
const FOTO_QUALITY = 0.75

const STEP_LABELS = ['Checklist', 'Observações', 'Fotografias', 'Técnico', 'Cliente', 'Assinatura', 'Finalizar']
const TOTAL_STEPS = 7

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

const QUICK_NOTES = getQuickNotes()

/** Copia o ficheiro para memória imediatamente (evita revogação em mobile ao usar câmara) */
function fileToMemory(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Blob([reader.result], { type: file.type || 'image/jpeg' }))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/** Redimensiona e comprime uma imagem para base64 JPEG via canvas.
 *  Em mobile, receber o Blob em memória evita que a foto desapareça (ficheiros temp da câmara são revogados). */
function comprimirFoto(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(FOTO_MAX_W / width, FOTO_MAX_H / height, 1)
        width  = Math.round(width  * ratio)
        height = Math.round(height * ratio)
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', FOTO_QUALITY))
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(blob)
  })
}

export default function ExecutarManutencaoModal({ isOpen, onClose, manutencao, maquina }) {
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
    getIntervaloDiasByMaquina,
    getChecklistBySubcategoria,
    getSubcategoria,
    updateMaquina,
    updateCliente,
    getPecasPlanoByMaquina,
    tecnicos,
    getTecnicoByNome,
    relatorios: todosRelatorios,
  } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const nomesTecnicos = useMemo(() => tecnicos.filter(t => t.ativo !== false).map(t => t.nome), [tecnicos])

  const [form, setForm] = useState({
    checklistRespostas: {},
    notas: '',
    horasTotais: '',
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
  const [manutAgendadas, setManutAgendadas] = useState(0)
  const [concluido, setConcluido] = useState(false)
  const [conflitosAgendamento, setConflitosAgendamento] = useState(null)
  const [emailDestinatario, setEmailDestinatario] = useState('')
  const [emailEnviando, setEmailEnviando] = useState(false)
  const [step, setStep] = useState(1)
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(null)
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [preFilledFromLast, setPreFilledFromLast] = useState(false)

  const navigate = useNavigate()
  const canvasRef   = useRef(null)
  const drawingRef  = useRef(false)
  const lastPosRef  = useRef({ x: 0, y: 0 })
  const fotoInputRef = useRef(null)
  const fotoCameraRef = useRef(null)
  const initRef = useRef(false)
  const modalRef = useRef(null)

  const maq = maquina
  const cli = useMemo(() => clientes.find(c => c.nif === maq?.clienteNif) ?? null, [clientes, maq?.clienteNif])
  const items = maq ? getChecklistBySubcategoria(maq.subcategoriaId, manutencaoAtual?.tipo || 'periodica') : []
  const rel   = manutencaoAtual ? getRelatorioByManutencao(manutencaoAtual.id) : null
  const temContadorHoras = maq && SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maq.subcategoriaId)
  const isCompressor = maq && SUBCATEGORIAS_COMPRESSOR.includes(maq.subcategoriaId)

  useEffect(() => {
    if (!isOpen) {
      initRef.current = false
      setStep(1)
      setConfirmacaoPendente(null)
      setPreviewLoading(false)
      if (previewPdfUrl) { URL.revokeObjectURL(previewPdfUrl); setPreviewPdfUrl(null) }
      return
    }
    if (initRef.current) return
    initRef.current = true
    let m = manutencao
    if (!m && maq) {
      const existente = manutencoes.find(
        x => x.maquinaId === maq.id && (x.status === 'pendente' || x.status === 'agendada' || x.status === 'em_progresso')
      )
      if (existente) {
        m = existente
      } else {
        const hoje = getHojeAzores()
        const id = addManutencao({
          maquinaId: maq.id,
          data: hoje,
          tipo: 'periodica',
          tecnico: '',
          status: 'pendente',
          observacoes: '',
        })
        m = { id, maquinaId: maq.id, data: hoje, tipo: 'periodica', tecnico: '', status: 'pendente', observacoes: '' }
      }
    }
    setManutencaoAtual(m || null)

    const checklistRespostas = {}
    const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, m?.tipo || 'periodica') : []
    const existingRel = m ? getRelatorioByManutencao(m.id) : null

    // M1: Pré-preenchimento inteligente — usar última execução do mesmo tipo como base
    const tipoAtual = m?.tipo || 'periodica'
    let lastRel = null
    if (!existingRel && maq) {
      const manutsConclMaq = manutencoes
        .filter(mt => mt.maquinaId === maq.id && mt.status === 'concluida' && mt.tipo === tipoAtual)
        .sort((a, b) => b.data.localeCompare(a.data))
      for (const mt of manutsConclMaq) {
        const r = todosRelatorios.find(rr => rr.manutencaoId === mt.id)
        if (r?.checklistRespostas) { lastRel = r; break }
      }
    }
    const fontePreFill = existingRel || lastRel
    const isPreFilled = !existingRel && !!lastRel
    setPreFilledFromLast(isPreFilled)

    checklistItems.forEach(it => {
      checklistRespostas[it.id] = fontePreFill?.checklistRespostas?.[it.id] ?? ''
    })
    // Auto-sugerir tipo pelo ciclo da máquina (posicaoKaeser), com fallback ao relatório existente
    const isCompressorMaq = maq && SUBCATEGORIAS_COMPRESSOR.includes(maq.subcategoriaId)
    const tipoAutoCiclo = isCompressorMaq && maq.posicaoKaeser != null
      ? tipoKaeserNaPosicao(maq.posicaoKaeser)
      : ''
    const tipoManutKaeser = existingRel?.tipoManutKaeser ?? m?.tipoManutKaeser ?? tipoAutoCiclo
    const pecasExistentes = existingRel?.pecasUsadas ?? []
    // Normalizar formato antigo (quantidadeUsada) para novo (usado: bool)
    const normalizarPecas = (lista) => lista.map(p =>
      'usado' in p ? p : { ...p, usado: (p.quantidadeUsada ?? p.quantidade ?? 0) > 0 }
    )
    // Pré-carregar peças do plano se houver tipo definido e ainda não houver peças no relatório
    const pecasUsadas = pecasExistentes.length > 0
      ? normalizarPecas(pecasExistentes)
      : (tipoManutKaeser && maq
          ? (getPecasPlanoByMaquina(maq.id, tipoManutKaeser) ?? []).map(p => ({ ...p, usado: true }))
          : [])
    const nomePreenchido = existingRel?.nomeAssinante || cli?.nomeContacto || ''
    setForm({
      checklistRespostas,
      notas: isPreFilled ? '' : (existingRel?.notas ?? '').slice(0, 300),
      horasTotais: '',
      horasServico: '',
      tecnico: existingRel?.tecnico ?? '',
      nomeAssinante: nomePreenchido,
      tipoManutKaeser,
      pecasUsadas,
      dataRealizacao: '',
    })
    setFotos(existingRel?.fotos ?? [])
    setErroChecklist('')
    setErroAssinatura('')
    setAssinaturaFeita(false)
    const clienteEmail = cli?.email ?? ''
    setEmailDestinatario(clienteEmail)
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const assSalva = !existingRel?.assinaturaDigital && cli?.assinaturaContacto
      if (assSalva) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          setAssinaturaFeita(true)
        }
        img.src = cli.assinaturaContacto
      }
    })
  }, [isOpen, manutencao, maq?.id, manutencoes, addManutencao, getChecklistBySubcategoria, getRelatorioByManutencao])

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
    if (disponiveis <= 0) return
    const ficheiros = files.slice(0, disponiveis)
    setFotoCarregando(true)
    const novas = []
    try {
      for (const file of ficheiros) {
        const blob = await fileToMemory(file)
        const dataUrl = await comprimirFoto(blob)
        novas.push(dataUrl)
      }
      setFotos(prev => [...prev, ...novas])
    } catch (err) {
      logger.warn('ExecutarManutencaoModal', 'handleFotoChange', 'Falha ao adicionar foto (ficheiro inválido ou demasiado grande?)', { msg: err?.message })
    } finally {
      setFotoCarregando(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
      if (fotoCameraRef.current) fotoCameraRef.current.value = ''
    }
  }, [fotos.length])

  const removerFoto = useCallback((idx) => {
    setFotos(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // ── Wizard: validação por etapa + navegação ──────────────────────────────
  const validateStep = useCallback((s) => {
    switch (s) {
      case 1: {
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
      case 2: {
        if (!form.notas.trim() && confirmacaoPendente !== 'notas') {
          setConfirmacaoPendente('notas')
          return false
        }
        return true
      }
      case 3: {
        if (fotos.length === 0 && confirmacaoPendente !== 'fotos') {
          setConfirmacaoPendente('fotos')
          return false
        }
        return true
      }
      case 4: {
        if (!form.tecnico) {
          setErroAssinatura('Selecione o técnico que realizou a manutenção.')
          return false
        }
        setErroAssinatura('')
        return true
      }
      case 5: {
        if (!form.nomeAssinante.trim()) {
          setErroAssinatura('Indique o nome do cliente que assina o relatório.')
          return false
        }
        setErroAssinatura('')
        return true
      }
      case 6: {
        if (!isAdmin && !assinaturaFeita) {
          setErroAssinatura('A assinatura digital do cliente é obrigatória.')
          return false
        }
        setErroAssinatura('')
        return true
      }
      default:
        return true
    }
  }, [form, items, fotos, assinaturaFeita, confirmacaoPendente, isAdmin])

  const goNext = useCallback(() => {
    if (step >= TOTAL_STEPS) return
    if (!validateStep(step)) return
    setStep(s => s + 1)
    setConfirmacaoPendente(null)
    setErroChecklist('')
    setErroAssinatura('')
  }, [step, validateStep])

  const goPrev = useCallback(() => {
    setStep(s => Math.max(1, s - 1))
    setConfirmacaoPendente(null)
    setErroChecklist('')
    setErroAssinatura('')
  }, [])

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
      const tempRel = {
        ...rel,
        checklistRespostas: form.checklistRespostas,
        notas: form.notas,
        fotos,
        tecnico: form.tecnico,
        nomeAssinante: form.nomeAssinante,
        assinadoPeloCliente: assinaturaFeita,
        assinaturaDigital: canvasRef.current?.toDataURL('image/png') ?? '',
        dataAssinatura: rel?.dataAssinatura ?? nowISO(),
        dataCriacao: rel?.dataCriacao ?? nowISO(),
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
      })
      const url = URL.createObjectURL(blob)
      setPreviewPdfUrl(url)
    } catch (err) {
      showToast('Erro ao gerar pré-visualização do PDF.', 'error')
      logger.error('ExecutarManutencaoModal', 'handlePreviewInline', err?.message)
    } finally {
      setPreviewLoading(false)
    }
  }, [previewPdfUrl, maq, clientes, rel, form, fotos, assinaturaFeita, manutencaoAtual, items, getSubcategoria, getTecnicoByNome, showToast])

  const gravar = (semAssinatura = false, enviarEmailAoGravar = true) => {
    setErroChecklist('')
    setErroAssinatura('')
    if (!manutencaoAtual || !maq) return

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
      if (!assinaturaFeita) {
        setErroAssinatura('A assinatura digital do cliente é obrigatória.')
        return
      }
    }

    const canvas = canvasRef.current
    const assinaturaDataUrl = (!semAssinatura && canvas) ? canvas.toDataURL('image/png') : null

    const usarDataHistorica = form.dataRealizacao && (isAdmin || (manutencaoAtual?.data && manutencaoAtual.data < getHojeAzores()))
    const hoje = usarDataHistorica ? form.dataRealizacao : getHojeAzores()
    const now  = usarDataHistorica
      ? `${form.dataRealizacao}T12:00:00.000Z`
      : nowISO()

    const dias = getIntervaloDiasByMaquina(maq)
    const proxima = addDays(new Date(hoje), dias)

    const relPayload = {
      checklistRespostas: form.checklistRespostas,
      checklistSnapshot: items.map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null })),
      notas: form.notas.slice(0, 300),
      fotos,
      tecnico: form.tecnico,
      assinadoPeloCliente: !semAssinatura,
      nomeAssinante: semAssinatura ? '' : form.nomeAssinante.trim(),
      assinaturaDigital: assinaturaDataUrl,
      dataAssinatura: semAssinatura ? null : now,
      dataCriacao: rel?.dataCriacao ?? now,
      ...(form.tipoManutKaeser && { tipoManutKaeser: form.tipoManutKaeser }),
      ...(form.pecasUsadas.length > 0 && { pecasUsadas: form.pecasUsadas }),
    }

    // Gravar/actualizar o relatório e obter o numeroRelatorio definitivo.
    // addRelatorio devolve { id, numeroRelatorio } — tem de ser capturado aqui
    // para ser passado ao logger e ao serviço de email (evita "undefined"/"S/N").
    let numeroRelatorioFinal
    if (rel) {
      updateRelatorio(rel.id, relPayload)
      numeroRelatorioFinal = rel.numeroRelatorio   // já existe no relatório anterior
    } else {
      const resultado = addRelatorio({ manutencaoId: manutencaoAtual.id, ...relPayload })
      numeroRelatorioFinal = resultado.numeroRelatorio
    }

    updateManutencao(manutencaoAtual.id, {
      status: 'concluida',
      data: hoje,
      tecnico: form.tecnico,
    })

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
    const isHistoricoPassado = usarDataHistorica && form.dataRealizacao < getHojeAzores()

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
    if (temContadorHoras && (form.horasTotais !== '' || form.horasServico !== '')) {
      if (form.horasTotais !== '') updateMaqData.horasTotaisAcumuladas = Number(form.horasTotais)
      if (form.horasServico !== '') updateMaqData.horasServicoAcumuladas = Number(form.horasServico)
    }
    // Avançar posição no ciclo KAESER após concluir manutenção de compressor
    if (isCompressor && form.tipoManutKaeser && maq.posicaoKaeser != null) {
      updateMaqData.posicaoKaeser = proximaPosicaoKaeser(maq.posicaoKaeser)
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
        setTimeout(onClose, 3200)
      }
      return
    }

    const periodicidadeRecalc = maq.periodicidadeManut || manutencaoAtual.periodicidade
    if (!maq.periodicidadeManut && manutencaoAtual.periodicidade) {
      updateMaqData.periodicidadeManut = manutencaoAtual.periodicidade
    }

    updateMaquina(maq.id, updateMaqData)

    if (!isHistoricoPassado && manutencaoAtual.tipo === 'periodica' && periodicidadeRecalc) {
      const n = recalcularPeriodicasAposExecucao(maq.id, periodicidadeRecalc, hoje, form.tecnico)
      if (n > 0) {
        logger.action('ExecutarManutencaoModal', 'reagendarPeriodicas',
          `${n} periódicas reagendadas para ${maq.marca ?? ''} ${maq.modelo ?? ''} a partir de ${hoje}`,
          { maquinaId: maq.id, periodicidade: periodicidadeRecalc, n })
        showToast(`${n} manutenções futuras reagendadas a partir de hoje.`, 'info', 2500)
      }
    }

    if (semAssinatura) {
      showToast('Relatório gravado sem assinatura. O cliente poderá assinar depois.', 'success')
      setConcluido(true)
      setTimeout(() => {
        onClose()
        navigate('/manutencoes?filter=executadas')
      }, 2000)
      return
    }

    // Gravar sem enviar email — concluir processo técnico sem envio
    if (!enviarEmailAoGravar) {
      showToast('Manutenção gravada com sucesso. O relatório poderá ser enviado posteriormente.', 'success')
      setConcluido(true)
      setTimeout(() => {
        onClose()
        navigate('/manutencoes?filter=executadas')
      }, 2000)
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
          relatorio:        relFinal,
          manutencao:       manutFinal,
          maquina:          maq,
          cliente,
          checklistItems:   items,
          subcategoriaNome: sub?.nome ?? '',
          logoUrl:          `${import.meta.env.BASE_URL}logo-navel.png`,
          tecnicoObj:       tecObj,
        })
        if (resultado.ok) {
          showToast(`Email enviado para ${emailDestinatario}.`, 'success')
        } else {
          showToast(resultado.message || 'Erro ao enviar email.', 'error', 4000)
        }
        return resultado
      } finally {
        setEmailEnviando(false)
        hideGlobalLoading()
      }
    }

    const relAtualizado = { ...relPayload, manutencaoId: manutencaoAtual.id, numeroRelatorio: numeroRelatorioFinal }
    enviarEmail(relAtualizado, { ...manutencaoAtual, status: 'concluida', data: hoje, tecnico: form.tecnico })
      .finally(() => {
        setConcluido(true)
        setTimeout(() => {
          onClose()
          navigate('/manutencoes?filter=executadas')
        }, 2000)
      })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (step < TOTAL_STEPS) { goNext(); return }
    gravar(false, true)
  }

  const handleGravarSemEnvio = () => {
    gravar(false, false)
  }

  const handleGravarSemAssinatura = () => {
    gravar(true)
  }

  if (!isOpen || !maq) return null

  const desc = `${maq.marca} ${maq.modelo} — Nº Série: ${maq.numeroSerie}`

  if (concluido) {
    const relFinal = manutencaoAtual ? getRelatorioByManutencao(manutencaoAtual.id) : null
    const foiSemAssinatura = relFinal && !relFinal.assinadoPeloCliente
    return (
      <div className="modal-overlay">
        <div className="modal modal-assinatura" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle2 size={48} color="var(--color-success, #22c55e)" style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Manutenção executada!</h2>
          <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            {foiSemAssinatura
              ? 'Relatório gravado. Pendente de assinatura do cliente.'
              : 'Relatório gerado e assinado com sucesso.'}
          </p>
          <p className="modal-hint">A abrir lista de manutenções executadas…</p>
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
      setTimeout(onClose, 3200)
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
      setTimeout(onClose, 3200)
    }

    const resolverIgnorando = () => {
      const count = confirmarManutencoesPeriodicas(novas)
      setConflitosAgendamento(null)
      setManutAgendadas(count)
      setTimeout(onClose, 3200)
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-assinatura modal-relatorio-form" ref={modalRef} onClick={e => e.stopPropagation()}>
        <h2>Executar manutenção</h2>
        {maq && <p className="modal-hint">{desc}</p>}

        <div className="wizard-progress">
          <div className="wizard-progress-bar">
            <div className="wizard-progress-fill" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
          </div>
          <div className="wizard-progress-info">
            <span className="wizard-progress-step">Passo {step} de {TOTAL_STEPS}</span>
            <span className="wizard-progress-label">{STEP_LABELS[step - 1]}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
        <div className="wizard-body">

          {/* ═══ STEP 1 — Checklist ═══ */}
          <div className="wizard-step-content" style={{ display: step === 1 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Confirme ponto a ponto se a tarefa foi executada (Sim/Não).</p>

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

            {(maq?.documentos ?? []).length > 0 && (
              <div className="doc-links-inline">
                <FolderOpen size={14} />
                {maq.documentos.map(d => {
                  const tipoLabel = TIPOS_DOCUMENTO.find(t => t.id === d.tipo)?.label ?? d.tipo
                  return (
                    <a key={d.id} href={safeHttpUrl(d.url)} target="_blank" rel="noopener noreferrer" className="doc-link-inline" title={d.titulo}>
                      {tipoLabel}
                    </a>
                  )
                })}
              </div>
            )}

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

            {temContadorHoras && (
              <div className="form-row form-section">
                <label>
                  Horas totais (contador)
                  <input type="number" min={0} step={1} value={form.horasTotais}
                    onChange={e => setForm(f => ({ ...f, horasTotais: e.target.value }))}
                    placeholder="Ex: 1250" />
                </label>
                <label>
                  Horas de serviço
                  <input type="number" min={0} step={1} value={form.horasServico}
                    onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
                    placeholder="Ex: 1180" />
                </label>
              </div>
            )}

            {isCompressor && manutencaoAtual?.tipo !== 'montagem' && (
              <div className="form-section">
                <label>
                  Tipo de manutenção (A/B/C/D)
                  {maq?.posicaoKaeser != null && (
                    <span className="kaeser-ciclo-hint">
                      Ciclo: {descricaoCicloKaeser(maq.posicaoKaeser)}
                      {' '}· Próximo ciclo: {descricaoCicloKaeser(proximaPosicaoKaeser(maq.posicaoKaeser))}
                    </span>
                  )}
                  <select
                    value={form.tipoManutKaeser}
                    onChange={e => {
                      const tipo = e.target.value
                      const novasPecas = tipo && maq
                        ? (getPecasPlanoByMaquina(maq.id, tipo) ?? []).map(p => ({ ...p, usado: true }))
                        : []
                      setForm(f => ({ ...f, tipoManutKaeser: tipo, pecasUsadas: novasPecas }))
                    }}
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

            {(form.pecasUsadas.length > 0 || (isCompressor && form.tipoManutKaeser)) && (
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

          {/* ═══ STEP 2 — Observações ═══ */}
          <div className="wizard-step-content" style={{ display: step === 2 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Adicione notas ou observações relevantes sobre a manutenção.</p>
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
                placeholder="Notas relevantes da manutenção..."
              />
            </label>

            <div className="quick-notes-section">
              <span className="quick-notes-label">Notas rápidas — toque para adicionar:</span>
              <div className="quick-notes-chips">
                {QUICK_NOTES.map((note, i) => (
                  <button key={i} type="button" className="quick-note-chip"
                    onClick={() => {
                      setForm(f => {
                        const current = f.notas.trim()
                        const sep = current ? (current.endsWith('.') ? ' ' : '. ') : ''
                        return { ...f, notas: (current + sep + note).slice(0, 300) }
                      })
                      if (confirmacaoPendente) setConfirmacaoPendente(null)
                    }}>{note}</button>
                ))}
              </div>
            </div>
            {confirmacaoPendente === 'notas' && (
              <div className="wizard-confirm">
                <AlertTriangle size={16} />
                <span>Pretende deixar as observações em branco?</span>
                <div className="wizard-confirm-actions">
                  <button type="button" className="btn primary btn-sm" onClick={() => { setConfirmacaoPendente(null); setStep(3) }}>
                    Sim, avançar
                  </button>
                  <button type="button" className="btn secondary btn-sm" onClick={() => setConfirmacaoPendente(null)}>
                    Não
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ STEP 3 — Fotografias ═══ */}
          <div className="wizard-step-content" style={{ display: step === 3 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Adicione fotografias de apoio à manutenção.</p>
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
                  <button type="button" className="btn primary btn-sm" onClick={() => { setConfirmacaoPendente(null); setStep(4) }}>
                    Sim, avançar
                  </button>
                  <button type="button" className="btn secondary btn-sm" onClick={() => setConfirmacaoPendente(null)}>
                    Não
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ═══ STEP 4 — Técnico ═══ */}
          <div className="wizard-step-content" style={{ display: step === 4 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Selecione o técnico responsável pela manutenção.</p>
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

          {/* ═══ STEP 5 — Nome do cliente ═══ */}
          <div className="wizard-step-content" style={{ display: step === 5 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Indique o nome do cliente responsável pela aceitação do serviço.</p>
            {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

            <div className="declaracao-assinatura-box">
              <p className="declaracao-assinatura-titulo">Declaração de aceitação</p>
              <p className="declaracao-assinatura-texto">
                {getDeclaracaoCliente(manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica')}
              </p>
            </div>

            <label className="label-required form-section">
              <span>Nome do cliente que assina <span className="req-star">*</span></span>
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

          {/* ═══ STEP 6 — Assinatura ═══ */}
          <div className="wizard-step-content" style={{ display: step === 6 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">O cliente deve assinar digitalmente para confirmar a aceitação do serviço.</p>
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
          </div>

          {/* ═══ STEP 7 — Finalizar ═══ */}
          <div className="wizard-step-content" style={{ display: step === 7 ? 'block' : 'none' }}>
            <p className="wizard-step-hint">Reveja os dados, pré-visualize o relatório e finalize a manutenção.</p>

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

        {/* ═══ Rodapé fixo — navegação unificada para todos os passos ═══ */}
        <div className="wizard-footer">
          <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
          <div className="wizard-footer-actions">
            {step > 1 && (
              <button type="button" className="btn secondary" onClick={goPrev}>
                <ChevronLeft size={16} /> Anterior
              </button>
            )}
            {step < TOTAL_STEPS && (
              <button type="button" className="btn primary" onClick={goNext}>
                Seguinte <ChevronRight size={16} />
              </button>
            )}
            {step === TOTAL_STEPS && (
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
        </div>
        </form>
      </div>
    </div>
  )
}
