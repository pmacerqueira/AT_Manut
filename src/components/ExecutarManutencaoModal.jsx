/**
 * ExecutarManutencaoModal – Modal para executar manutenção.
 * Fluxo: checklist → notas + fotos → técnico (obrigatório) → nome cliente (obrigatório) → assinatura digital (obrigatória).
 * Fotos: capturadas pela câmara ou galeria, comprimidas no browser (canvas), guardadas como base64.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useData } from '../context/DataContext'
import { logger } from '../utils/logger'
import { TIPOS_DOCUMENTO, SUBCATEGORIAS_COM_CONTADOR_HORAS, SUBCATEGORIAS_COMPRESSOR, INTERVALOS_KAESER, SEQUENCIA_KAESER, tipoKaeserNaPosicao, proximaPosicaoKaeser, descricaoCicloKaeser } from '../context/DataContext'
import { TECNICOS } from '../config/users'
import { format, addDays } from 'date-fns'
import { getHojeAzores, nowISO } from '../utils/datasAzores'
import { pt } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import { FolderOpen, PenLine, Trash2, Camera, X, CalendarClock, AlertTriangle, CheckCircle2, Mail, Eye, History } from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { formatarDataPT, distribuirHorarios, buildFeriadosSet, proximoDiaUtilLivre } from '../utils/diasUteis'
import { enviarRelatorioEmail } from '../services/emailService'
import { relatorioParaHtml } from '../utils/relatorioHtml'
import { imprimirOuGuardarPdf } from '../utils/gerarPdfRelatorio'
import { isEmailConfigured } from '../config/emailConfig'
import { safeHttpUrl } from '../utils/sanitize'

const MAX_FOTOS = 8
const FOTO_MAX_W = 1200
const FOTO_MAX_H = 1200
const FOTO_QUALITY = 0.75

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
    getPecasPlanoByMaquina,
  } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

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

  const navigate = useNavigate()
  const canvasRef   = useRef(null)
  const drawingRef  = useRef(false)
  const lastPosRef  = useRef({ x: 0, y: 0 })
  const fotoInputRef = useRef(null)

  const maq = maquina
  const items = maq ? getChecklistBySubcategoria(maq.subcategoriaId, manutencaoAtual?.tipo || 'periodica') : []
  const rel   = manutencaoAtual ? getRelatorioByManutencao(manutencaoAtual.id) : null
  const temContadorHoras = maq && SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maq.subcategoriaId)
  const isCompressor = maq && SUBCATEGORIAS_COMPRESSOR.includes(maq.subcategoriaId)

  useEffect(() => {
    if (!isOpen) return
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
    checklistItems.forEach(it => {
      checklistRespostas[it.id] = existingRel?.checklistRespostas?.[it.id] ?? ''
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
    setForm({
      checklistRespostas,
      notas: (existingRel?.notas ?? '').slice(0, 300),
      horasTotais: '',
      horasServico: '',
      tecnico: existingRel?.tecnico ?? '',
      nomeAssinante: existingRel?.nomeAssinante ?? '',
      tipoManutKaeser,
      pecasUsadas,
    })
    setFotos(existingRel?.fotos ?? [])
    setErroChecklist('')
    setErroAssinatura('')
    setAssinaturaFeita(false)
    // Pré-preencher email do cliente associado à máquina
    const clienteEmail = clientes.find(c => c.nif === maq?.clienteNif)?.email ?? ''
    setEmailDestinatario(clienteEmail)
    requestAnimationFrame(() => {
      const canvas = canvasRef.current
      if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    })
  }, [isOpen, manutencao, maq?.id, manutencoes, addManutencao, getChecklistBySubcategoria, getRelatorioByManutencao])

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
    }
  }, [fotos.length])

  const removerFoto = useCallback((idx) => {
    setFotos(prev => prev.filter((_, i) => i !== idx))
  }, [])

  // ── Submit ───────────────────────────────────────────────────────────────
  /** Abre a pré-visualização/PDF do relatório actual (antes de gravar). */
  const handlePrevisualizar = useCallback(() => {
    const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
    const cliente = clientes.find(c => c.nif === maq?.clienteNif) ?? null
    // Constrói um relatório temporário com os dados do form actual
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
    const html = relatorioParaHtml(tempRel, manutencaoAtual, maq, cliente, items, {
      subcategoriaNome: sub?.nome ?? '',
      logoUrl: `${import.meta.env.BASE_URL}logo.png`,
    })
    if (html) imprimirOuGuardarPdf(html)
  }, [maq, maquina, clientes, rel, form, fotos, assinaturaFeita, manutencaoAtual, items, getSubcategoria, canvasRef])

  const handleSubmit = (e) => {
    e.preventDefault()
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
    if (!form.nomeAssinante.trim()) {
      setErroAssinatura('Indique o nome do cliente que assina o relatório.')
      return
    }
    if (!assinaturaFeita) {
      setErroAssinatura('A assinatura digital do cliente é obrigatória.')
      return
    }

    const canvas = canvasRef.current
    const assinaturaDataUrl = canvas ? canvas.toDataURL('image/png') : ''

    // Admin pode registar manutenções históricas com data retroativa.
    // Se form.dataRealizacao estiver preenchido (só visível para Admin), usa essa data;
    // caso contrário usa a data/hora actual — comportamento padrão.
    const hoje = (isAdmin && form.dataRealizacao) ? form.dataRealizacao : getHojeAzores()
    const now  = (isAdmin && form.dataRealizacao)
      ? `${form.dataRealizacao}T12:00:00.000Z`
      : nowISO()

    const dias = getIntervaloDiasByMaquina(maq)
    const proxima = addDays(new Date(hoje), dias)

    const relPayload = {
      checklistRespostas: form.checklistRespostas,
      notas: form.notas.slice(0, 300),
      fotos,
      tecnico: form.tecnico,
      assinadoPeloCliente: true,
      nomeAssinante: form.nomeAssinante.trim(),
      assinaturaDigital: assinaturaDataUrl,
      dataAssinatura: now,
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

    logger.action('ExecutarManutencaoModal', 'concluirManutencao',
      `Manutenção concluída — ${numeroRelatorioFinal} — assinada por "${form.nomeAssinante}" (técnico: ${form.tecnico})`,
      { manutencaoId: manutencaoAtual.id, numeroRelatorio: numeroRelatorioFinal, tecnico: form.tecnico }
    )

    const updateMaqData = {
      proximaManut: format(proxima, 'yyyy-MM-dd'),
      ultimaManutencaoData: hoje,
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

    updateMaquina(maq.id, updateMaqData)

    // Bloco B: reagendar manutenções periódicas futuras a partir da data de execução real
    if (manutencaoAtual.tipo === 'periodica' && maq.periodicidadeManut) {
      const n = recalcularPeriodicasAposExecucao(maq.id, maq.periodicidadeManut, hoje, form.tecnico)
      if (n > 0) {
        logger.action('ExecutarManutencaoModal', 'reagendarPeriodicas',
          `${n} periódicas reagendadas para ${maq.marca ?? ''} ${maq.modelo ?? ''} a partir de ${hoje}`,
          { maquinaId: maq.id, periodicidade: maq.periodicidadeManut, n })
        showToast(`${n} manutenções futuras reagendadas a partir de hoje.`, 'info', 2500)
      }
    }

    // Enviar email se endereço preenchido, e depois navegar
    const enviarEmail = async (relFinal, manutFinal) => {
      if (!emailDestinatario.trim()) return
      setEmailEnviando(true)
      showGlobalLoading()
      const sub     = maq ? getSubcategoria(maq.subcategoriaId) : null
      const cliente = clientes.find(c => c.nif === maq?.clienteNif) ?? null
      try {
        const resultado = await enviarRelatorioEmail({
          emailDestinatario: emailDestinatario.trim(),
          relatorio:        relFinal,
          manutencao:       manutFinal,
          maquina:          maq,
          cliente,
          checklistItems:   items,
          subcategoriaNome: sub?.nome ?? '',
          logoUrl:          `${import.meta.env.BASE_URL}logo.png`,
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

    // Mostra ecrã de confirmação breve e navega para a lista de concluídas.
    // numeroRelatorioFinal é incluído para que o emailService use o número correcto.
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

  if (!isOpen || !maq) return null

  const desc = `${maq.marca} ${maq.modelo} — Nº Série: ${maq.numeroSerie}`

  // ── Ecrã de confirmação — manutenção periódica concluída ──────────────────
  if (concluido) {
    return (
      <div className="modal-overlay">
        <div className="modal modal-assinatura" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle2 size={48} color="var(--color-success, #22c55e)" style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Manutenção executada!</h2>
          <p style={{ marginBottom: '0.5rem', color: 'var(--color-text-muted)' }}>
            Relatório gerado e assinado com sucesso.
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
      <div className="modal modal-assinatura modal-relatorio-form" onClick={e => e.stopPropagation()}>
        <h2>Executar manutenção</h2>
        {maq && (
          <p className="modal-hint" style={{ marginBottom: '0.5rem' }}>{desc}</p>
        )}
        <p className="modal-hint">
          Confirme ponto a ponto do checklist se a tarefa foi executada (Sim/Não).
        </p>

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

        <form onSubmit={handleSubmit}>
          {/* ── Checklist ── */}
          {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
          {items.length > 0 && (
            <div className="form-section">
              <h3>Checklist de verificação</h3>
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

          {/* ── Contador de horas ── */}
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

          {/* ── Tipo de manutenção KAESER ── */}
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

          {/* ── Consumíveis e peças — checklist ── */}
          {(form.pecasUsadas.length > 0 || (isCompressor && form.tipoManutKaeser)) && (
            <div className="form-section">
              <div className="pecas-checklist-header">
                <h3>Consumíveis e peças</h3>
                {form.pecasUsadas.length > 0 && (
                  <div className="pecas-checklist-actions">
                    <button
                      type="button"
                      className="btn-checklist-all btn-marcar"
                      onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map(p => ({ ...p, usado: true })) }))}
                    >
                      ✓ Marcar todos
                    </button>
                    <button
                      type="button"
                      className="btn-checklist-all btn-desmarcar"
                      onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map(p => ({ ...p, usado: false })) }))}
                    >
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
                    <label
                      key={p.id ?? idx}
                      className={`peca-checklist-row${p.usado ? ' peca-usada' : ' peca-nao-usada'}`}
                    >
                      <input
                        type="checkbox"
                        checked={!!p.usado}
                        onChange={e => setForm(f => ({
                          ...f,
                          pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, usado: e.target.checked } : pp)
                        }))}
                        className="peca-checkbox"
                      />
                      <span className="peca-checklist-info">
                        {p.posicao && <span className="peca-pos">{p.posicao}</span>}
                        {p.codigoArtigo && <span className="peca-codigo">{p.codigoArtigo}</span>}
                        <span className="peca-desc">{p.descricao || '—'}</span>
                        <span className="peca-qty-un">{p.quantidade} {p.unidade}</span>
                      </span>
                      {p.manual && (
                        <button
                          type="button"
                          className="icon-btn danger peca-remove-btn"
                          onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.filter((_, i) => i !== idx) }))}
                          title="Remover"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </label>
                  ))}
                </div>
              )}

              <button
                type="button"
                className="btn-link-checklist"
                style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}
                onClick={() => setForm(f => ({
                  ...f,
                  pecasUsadas: [...f.pecasUsadas, { id: 'manual_' + Date.now(), posicao: '', codigoArtigo: '', descricao: 'Item manual', quantidade: 1, unidade: 'PÇ', usado: true, manual: true }]
                }))}
              >
                + Adicionar consumível manualmente
              </button>
            </div>
          )}

          {/* ── Notas ── */}
          <label className="form-section">
            Notas importantes <span className="char-count">({form.notas.length}/300)</span>
            <textarea
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value.slice(0, 300) }))}
              rows={4}
              className="textarea-full"
              maxLength={300}
              placeholder="Notas relevantes da manutenção..."
            />
          </label>

          {/* ── Fotos ── */}
          <div className="form-section fotos-section">
            <div className="fotos-header">
              <span className="fotos-label">
                Fotografias de apoio
                <span className="fotos-count"> ({fotos.length}/{MAX_FOTOS})</span>
              </span>
              {fotos.length < MAX_FOTOS && (
                <>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="fotos-input-hidden"
                    onChange={handleFotoChange}
                    id="foto-input"
                  />
                  <label htmlFor="foto-input" className="btn-foto">
                    <Camera size={15} />
                    {fotoCarregando ? 'A processar…' : 'Adicionar foto'}
                  </label>
                </>
              )}
            </div>
            {fotos.length > 0 && (
              <div className="fotos-grid">
                {fotos.map((src, idx) => (
                  <div key={idx} className="foto-thumb">
                    <img src={src} alt={`Foto ${idx + 1}`} />
                    <button
                      type="button"
                      className="foto-remover"
                      onClick={() => removerFoto(idx)}
                      aria-label={`Remover foto ${idx + 1}`}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {fotos.length === 0 && (
              <p className="fotos-vazio">Nenhuma fotografia adicionada.</p>
            )}
          </div>

          {/* ── Técnico + Assinatura (campos obrigatórios) ── */}
          <div className="form-section assinatura-section">
            <h3 className="assinatura-titulo">
              <PenLine size={16} />
              Conclusão e assinatura
            </h3>

            {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

            {/* Campo de data histórica — visível apenas para Admin */}
            {isAdmin && (
              <div className="form-section-historica">
                <label className="historica-label">
                  <History size={14} />
                  Data de realização
                  <span className="historica-hint">(preencher apenas para registos históricos — deixar vazio para usar hoje)</span>
                  <input
                    type="date"
                    max={getHojeAzores()}
                    value={form.dataRealizacao}
                    onChange={e => setForm(f => ({ ...f, dataRealizacao: e.target.value }))}
                  />
                </label>
                {form.dataRealizacao && (
                  <p className="historica-aviso">
                    ⚠ Registo histórico: manutenção, relatório e próxima data serão registados como <strong>{form.dataRealizacao}</strong>
                  </p>
                )}
              </div>
            )}

            <label className="label-required">
              Técnico que realizou a manutenção <span className="req-star">*</span>
              <select value={form.tecnico}
                onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} required>
                <option value="">— Selecionar técnico —</option>
                {TECNICOS.map(nome => (
                  <option key={nome} value={nome}>{nome}</option>
                ))}
              </select>
            </label>

            <label className="label-required">
              Nome do cliente que assina <span className="req-star">*</span>
              <input type="text" value={form.nomeAssinante}
                onChange={e => setForm(f => ({ ...f, nomeAssinante: e.target.value }))}
                placeholder="Nome completo do responsável"
                maxLength={80} required />
            </label>

            <div className="assinatura-canvas-wrap">
              <div className="assinatura-canvas-label">
                Assinatura digital do cliente <span className="req-star">*</span>
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
                {assinaturaFeita && <span className="assinatura-ok">✓ Assinatura registada</span>}
              </div>
            </div>
          </div>

          {/* ── Email + pré-visualização ── */}
          <div className="form-section email-section">
            <h3 className="assinatura-titulo">
              <Mail size={16} />
              Envio do comprovativo
            </h3>
            <label className="label-required">
              Email do cliente para envio do relatório <span className="req-star">*</span>
              <input
                type="email"
                value={emailDestinatario}
                onChange={e => setEmailDestinatario(e.target.value)}
                placeholder="exemplo@empresa.pt"
                autoComplete="email"
              />
              {!isEmailConfigured() && (
                <small className="email-config-aviso">
                  ⚠ Endpoint de email não configurado — o botão abrirá o cliente de email local.
                </small>
              )}
            </label>

            <button
              type="button"
              className="btn-preview"
              onClick={handlePrevisualizar}
            >
              <Eye size={15} /> Pré-visualizar relatório
            </button>
          </div>

          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" disabled={emailEnviando}>
              {emailEnviando
                ? 'A enviar…'
                : emailDestinatario.trim()
                  ? <><Mail size={15} /> Gravar e enviar email</>
                  : 'Gravar relatório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
