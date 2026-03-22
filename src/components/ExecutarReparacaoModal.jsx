/**
 * ExecutarReparacaoModal – Modal para executar e concluir uma reparação.
 * Fluxo único: dados → avaria → trabalho → peças → checklist → fotos → assinatura.
 * No final gera o relatório, marca a reparação como concluída, e oferece envio imediato por email.
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { getHojeAzores, nowISO, formatDataAzores } from '../utils/datasAzores'
import { logger } from '../utils/logger'
import { isEmailConfigured } from '../config/emailConfig'
import { safeHttpUrl } from '../utils/sanitize'
import MaquinaDocumentacaoLinks from './MaquinaDocumentacaoLinks'
import { Hammer, X, Camera, FolderOpen, PenLine, Trash2, Plus, CheckCircle2, Mail, AlertTriangle, FileText, Eye, Bookmark } from 'lucide-react'
import { MAX_FOTOS } from '../config/limits'
import { resolveDeclaracaoCliente } from '../constants/relatorio'
import { fileToMemory, comprimirFotoParaRelatorio } from '../utils/comprimirImagemRelatorio'
import './ExecutarReparacaoModal.css'

export default function ExecutarReparacaoModal({ reparacao, onClose }) {
  const { isAdmin } = usePermissions()
  const {
    clientes, maquinas,
    updateReparacao,
    updateCliente,
    addRelatorioReparacao,
    updateRelatorioReparacao,
    getRelatorioByReparacao,
    getChecklistBySubcategoria,
    getSubcategoria,
    getCategoria,
    tecnicos,
    getTecnicoByNome,
  } = useData()

  const nomesTecnicos = useMemo(() => tecnicos.filter(t => t.ativo !== false).map(t => t.nome), [tecnicos])

  // Emails fixos para envio após conclusão de cada reparação
  const EMAIL_ADMIN   = 'comercial@navel.pt'
  // lmonteiro.pt@istobal.com = Sra. Luísa Monteiro (ISTOBAL Portugal) — destinatária dos relatórios concluídos
  // Nota: isat@istobal.com é o remetente dos avisos ES-... (usado no parse-istobal-email.php); não é o mesmo endereço
  const EMAIL_ISTOBAL = 'lmonteiro.pt@istobal.com'
  const { showToast }                           = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

  const maq = maquinas.find(m => m.id === reparacao.maquinaId)
  const cli = clientes.find(c => c.nif === maq?.clienteNif)
  const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
  const cat = sub ? getCategoria(sub.categoriaId ?? sub.categoria_id) : null
  const categoriaNome = cat?.nome ?? ''
  const declaracaoClienteDepois = String(cat?.declaracaoClienteDepois ?? cat?.declaracao_cliente_depois ?? '').trim()
  const checklistItems = maq ? getChecklistBySubcategoria(maq.subcategoriaId, 'corretiva') : []

  // ── Estado do formulário ────────────────────────────────────────────────

  const buildChecklistInicial = useCallback(() => {
    const resp = {}
    checklistItems.forEach(it => { resp[it.id] = '' })
    return resp
  }, [checklistItems])

  const [form, setForm] = useState({
    tecnico:           reparacao.tecnico ?? '',
    nomeAssinante:     cli?.nomeContacto ?? '',
    dataRealizacao:    reparacao.data ?? '', // Admin: data histórica (execução real)
    dataEmissao:       '',            // Admin: data de emissão do relatório
    numeroAviso:       reparacao.numeroAviso ?? '',
    descricaoAvaria:   reparacao.descricaoAvaria ?? '',
    trabalhoRealizado: '',
    horasMaoObra:      '',
    notas:             '',
    checklistRespostas: buildChecklistInicial(),
  })
  const [pecas, setPecas]         = useState([{ codigo: '', descricao: '', quantidade: 1 }])
  const [fotos, setFotos]         = useState([])
  const [fotoCarregando, setFotoCarregando] = useState(false)
  const [erroChecklist, setErroChecklist]   = useState('')
  const [erroAssinatura, setErroAssinatura] = useState('')
  const [assinaturaFeita, setAssinaturaFeita] = useState(false)
  const [concluido, setConcluido] = useState(false)
  const [relatorioGerado, setRelatorioGerado] = useState(null)
  const [emailDestinatario, setEmailDestinatario] = useState(cli?.email ?? '')
  const [emailEnviando, setEmailEnviando] = useState(false)
  const [guardandoProgresso, setGuardandoProgresso] = useState(false)
  const [emailsAutoEnviados, setEmailsAutoEnviados] = useState([]) // lista dos emails auto-enviados ao concluir

  const canvasRef   = useRef(null)
  const drawingRef  = useRef(false)
  const lastPosRef  = useRef({ x: 0, y: 0 })
  const fotoInputRef = useRef(null)
  const fotoCameraRef = useRef(null)
  const initRef = useRef(null)

  // ── Carregar relatório existente (se já foi iniciado antes) ─────────────

  useEffect(() => {
    if (initRef.current === reparacao.id) return
    initRef.current = reparacao.id
    const existente = getRelatorioByReparacao(reparacao.id)
    if (!existente) return
    setForm(p => ({
      ...p,
      tecnico:           existente.tecnico           ?? p.tecnico,
      nomeAssinante:     existente.nomeAssinante      || cli?.nomeContacto || '',
      dataEmissao:       existente.dataCriacao        ? String(existente.dataCriacao).slice(0, 10) : p.dataEmissao,
      numeroAviso:       existente.numeroAviso        ?? p.numeroAviso,
      descricaoAvaria:   existente.descricaoAvaria    ?? p.descricaoAvaria,
      trabalhoRealizado: existente.trabalhoRealizado  ?? '',
      horasMaoObra:      existente.horasMaoObra       ?? '',
      notas:             existente.notas              ?? '',
      checklistRespostas: (() => {
        const cr = existente.checklistRespostas
        if (!cr) return p.checklistRespostas
        if (typeof cr === 'string') { try { return JSON.parse(cr) } catch { return p.checklistRespostas } }
        return cr
      })(),
    }))
    if (existente.pecasUsadas) {
      try {
        const p = typeof existente.pecasUsadas === 'string'
          ? JSON.parse(existente.pecasUsadas) : existente.pecasUsadas
        if (Array.isArray(p) && p.length > 0) setPecas(p)
      } catch { /* manter padrão */ }
    }
    if (existente.fotos) {
      try {
        const f = typeof existente.fotos === 'string'
          ? JSON.parse(existente.fotos) : existente.fotos
        if (Array.isArray(f)) setFotos(f)
      } catch { /* manter padrão */ }
    }
  }, [reparacao.id, getRelatorioByReparacao])

  // ── Assinatura canvas ────────────────────────────────────────────────────

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#f8fafc'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth   = 2.5
    ctx.lineCap     = 'round'
  }, [])

  useEffect(() => {
    initCanvas()
    const existente = getRelatorioByReparacao(reparacao.id)
    const assSalva = !existente?.assinaturaDigital && cli?.assinaturaContacto
    if (assSalva) {
      const canvas = canvasRef.current
      if (!canvas) return
      const img = new Image()
      img.onload = () => {
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        setAssinaturaFeita(true)
      }
      img.src = cli.assinaturaContacto
    }
  }, [initCanvas, reparacao.id, getRelatorioByReparacao, cli?.assinaturaContacto])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect   = canvas.getBoundingClientRect()
    const scaleX = canvas.width  / rect.width
    const scaleY = canvas.height / rect.height
    const src    = e.touches ? e.touches[0] : e
    return { x: (src.clientX - rect.left) * scaleX, y: (src.clientY - rect.top) * scaleY }
  }

  const startDraw = (e) => {
    drawingRef.current = true
    lastPosRef.current = getPos(e)
    e.preventDefault()
  }
  const draw = useCallback((e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const pos    = getPos(e)
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.stroke()
    lastPosRef.current = pos
    setAssinaturaFeita(true)
    setErroAssinatura('')
  }, [])
  const stopDraw = () => { drawingRef.current = false }

  const limparAssinatura = () => {
    initCanvas()
    setAssinaturaFeita(false)
  }

  const guardarNomeContacto = useCallback(() => {
    const nome = form.nomeAssinante.trim()
    if (!nome || !maq?.clienteNif) return
    updateCliente(maq.clienteNif, { nomeContacto: nome })
    showToast('Nome do contacto guardado para futuras intervenções', 'success')
    logger.action('ExecutarReparacaoModal', 'guardarNomeContacto', `Nome "${nome}" guardado para cliente ${maq.clienteNif}`)
  }, [form.nomeAssinante, maq?.clienteNif, updateCliente, showToast])

  const guardarAssinaturaContacto = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !assinaturaFeita || !maq?.clienteNif) return
    const dataUrl = canvas.toDataURL('image/png')
    updateCliente(maq.clienteNif, { assinaturaContacto: dataUrl })
    showToast('Assinatura guardada para futuras intervenções', 'success')
    logger.action('ExecutarReparacaoModal', 'guardarAssinaturaContacto', `Assinatura guardada para cliente ${maq.clienteNif}`)
  }, [assinaturaFeita, maq?.clienteNif, updateCliente, showToast])

  // ── Fotos ────────────────────────────────────────────────────────────────

  const handleFotoChange = async (e) => {
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
      showToast(`Só couberam mais ${ficheiros.length} foto(s) (máx. ${MAX_FOTOS}).`, 'warning')
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
      logger.error('ExecutarReparacaoModal', 'handleFotoChange', err?.message || String(err))
    } finally {
      setFotoCarregando(false)
      if (fotoInputRef.current) fotoInputRef.current.value = ''
      if (fotoCameraRef.current) fotoCameraRef.current.value = ''
    }
  }

  const removerFoto = (idx) => setFotos(prev => prev.filter((_, i) => i !== idx))

  // ── Peças ────────────────────────────────────────────────────────────────

  const addPeca  = () => setPecas(prev => [...prev, { codigo: '', descricao: '', quantidade: 1 }])
  const setPeca  = (i, field, val) => setPecas(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  const remPeca  = (i) => setPecas(prev => prev.filter((_, idx) => idx !== i))

  // ── Guardar progresso (sem assinatura, status em_progresso) ──────────────

  const handleGuardarProgresso = async () => {
    if (!form.tecnico?.trim()) { showToast('Indique o nome do técnico antes de guardar', 'warning'); return }
    setGuardandoProgresso(true)
    try {
      const pecasFiltradas = pecas.filter(p => p.descricao?.trim() || p.codigo?.trim())
      const payload = {
        reparacaoId:        reparacao.id,
        tecnico:            form.tecnico.trim(),
        numeroAviso:        form.numeroAviso.trim(),
        descricaoAvaria:    form.descricaoAvaria.trim(),
        trabalhoRealizado:  form.trabalhoRealizado.trim(),
        horasMaoObra:       form.horasMaoObra ? parseFloat(form.horasMaoObra) : null,
        checklistRespostas: JSON.stringify(form.checklistRespostas),
        checklistSnapshot:  JSON.stringify(checklistItems.map(it => ({ id: it.id, texto: it.texto ?? it.nome, ordem: it.ordem, grupo: it.grupo ?? null }))),
        pecasUsadas:        JSON.stringify(pecasFiltradas),
        fotos:              JSON.stringify(fotos),
        notas:              form.notas.trim(),
        assinadoPeloCliente: false,
      }

      const existente = getRelatorioByReparacao(reparacao.id)
      if (existente) {
        updateRelatorioReparacao(existente.id, payload)
      } else {
        addRelatorioReparacao(payload)
      }

      updateReparacao(reparacao.id, {
        status:          'em_progresso',
        tecnico:         form.tecnico.trim(),
        numeroAviso:     form.numeroAviso.trim(),
        descricaoAvaria: form.descricaoAvaria.trim(),
      })

      logger.action('ExecutarReparacaoModal', 'guardarProgresso',
        `Progresso guardado para reparação ${reparacao.id}`)
      showToast('Progresso guardado — pode continuar mais tarde', 'success')
      onClose()
    } catch (err) {
      showToast('Erro ao guardar progresso: ' + err.message, 'error')
      logger.error('ExecutarReparacaoModal', 'guardarProgresso', err.message)
    } finally {
      setGuardandoProgresso(false)
    }
  }

  // ── Envio automático ao concluir ──────────────────────────────────────────
  //
  // Destinatários:
  //   1. Sempre:               comercial@navel.pt         (Admin Navel)
  //   2. Se ISTOBAL:           lmonteiro.pt@istobal.com   (Sra. Luísa Monteiro, ISTOBAL Portugal)
  //   3. Se cliente tem email: email do cliente            (confirmação ao cliente final)

  const enviarEmailsAutomaticos = async (relGerado) => {
    const { relatorioReparacaoParaHtml } = await import('../utils/relatorioReparacaoHtml')
    const { enviarRelatorioHtmlEmail }   = await import('../services/emailService')
    const tecObj  = getTecnicoByNome(relGerado.tecnico)
    const html    = relatorioReparacaoParaHtml(relGerado, reparacao, maq, cli, checklistItems, { tecnicoObj: tecObj, categoriaNome, declaracaoClienteDepois })
    const assunto = `Relatório de Reparação ${relGerado.numeroRelatorio} — ${maq?.marca ?? ''} ${maq?.modelo ?? ''}`

    const destsSet = new Set()
    destsSet.add(EMAIL_ADMIN)
    if (reparacao.origem === 'istobal_email') destsSet.add(EMAIL_ISTOBAL)
    if (cli?.email?.trim()) destsSet.add(cli.email.trim().toLowerCase())

    const enviados  = []
    const falhados  = []
    for (const dest of destsSet) {
      try {
        const resultado = await enviarRelatorioHtmlEmail({
          destinatario: dest,
          assunto,
          html,
          nomeCliente: cli?.nome ?? '',
        })
        if (resultado.ok) {
          enviados.push(dest)
          logger.action('ExecutarReparacaoModal', 'envioAuto', `Email enviado para ${dest}`, { relId: relGerado.id })
        } else {
          falhados.push(dest)
          logger.error('ExecutarReparacaoModal', 'envioAuto', `Falha: ${resultado.message}`, { dest })
        }
      } catch (err) {
        falhados.push(dest)
        logger.error('ExecutarReparacaoModal', 'envioAuto', `Falha ao enviar para ${dest}: ${err.message}`)
      }
    }

    setEmailsAutoEnviados(enviados)
    if (!cli?.email?.trim()) setEmailDestinatario('')
    return { enviados, falhados }
  }

  // ── Submissão final (com assinatura) ────────────────────────────────────

  const handleConcluir = async () => {
    // Validação
    const erros = []
    if (!form.tecnico?.trim())       erros.push('Indique o nome do técnico')
    if (!form.nomeAssinante?.trim()) erros.push('Indique o nome do assinante')
    if (checklistItems.length > 0) {
      const pendentes = checklistItems.filter(it => !form.checklistRespostas[it.id])
      if (pendentes.length > 0) {
        setErroChecklist(`${pendentes.length} item(ns) do checklist por preencher`)
        erros.push('Checklist incompleto')
      } else {
        setErroChecklist('')
      }
    }
    if (!assinaturaFeita) {
      setErroAssinatura('A assinatura do cliente é obrigatória')
      erros.push('Assinatura em falta')
    }

    if (erros.length > 0) {
      showToast(erros[0], 'warning')
      return
    }

    showGlobalLoading()
    try {
      // Separação explícita de datas:
      // - dataRealizacao: quando o trabalho foi efetivamente executado
      // - dataEmissao: data do relatório (manual ou sistema)
      // - dataAssinatura: sempre relógio atual do sistema/dispositivo
      const dataRealizacao = (isAdmin && form.dataRealizacao) ? form.dataRealizacao : getHojeAzores()
      const dataEmissao = (isAdmin && form.dataEmissao) ? form.dataEmissao : getHojeAzores()
      const dataAssinaturaSistema = nowISO()
      const dataEmissaoIso = `${dataEmissao}T12:00:00.000Z`

      const pecasFiltradas = pecas.filter(p => p.descricao?.trim() || p.codigo?.trim())

      const payload = {
        reparacaoId:         reparacao.id,
        tecnico:             form.tecnico.trim(),
        nomeAssinante:       form.nomeAssinante.trim(),
        dataAssinatura:      dataAssinaturaSistema,
        assinadoPeloCliente: true,
        assinaturaDigital:   canvasRef.current?.toDataURL('image/png') ?? null,
        dataRealizacao,
        numeroAviso:         form.numeroAviso.trim(),
        descricaoAvaria:     form.descricaoAvaria.trim(),
        trabalhoRealizado:   form.trabalhoRealizado.trim(),
        horasMaoObra:        form.horasMaoObra ? parseFloat(form.horasMaoObra) : null,
        checklistRespostas:  JSON.stringify(form.checklistRespostas),
        checklistSnapshot:   JSON.stringify(checklistItems.map(it => ({ id: it.id, texto: it.texto ?? it.nome, ordem: it.ordem, grupo: it.grupo ?? null }))),
        pecasUsadas:         JSON.stringify(pecasFiltradas),
        fotos:               JSON.stringify(fotos),
        notas:               form.notas.trim(),
        dataCriacao:         dataEmissaoIso,
      }

      // Se já existe rascunho em progresso, actualiza; caso contrário cria
      const existente = getRelatorioByReparacao(reparacao.id)
      let numeroRelatorio
      let relId
      if (existente) {
        updateRelatorioReparacao(existente.id, payload)
        numeroRelatorio = existente.numeroRelatorio
        relId           = existente.id
      } else {
        const resultado = addRelatorioReparacao(payload)
        numeroRelatorio = resultado.numeroRelatorio
        relId           = resultado.id
      }

      updateReparacao(reparacao.id, {
        status:          'concluida',
        data:            dataRealizacao,
        tecnico:         form.tecnico.trim(),
        numeroAviso:     form.numeroAviso.trim(),
        descricaoAvaria: form.descricaoAvaria.trim(),
      })

      const relFinal = { ...payload, numeroRelatorio, id: relId }

      logger.action('ExecutarReparacaoModal', 'concluirReparacao',
        `Reparação ${reparacao.id} concluída — relatório ${numeroRelatorio}`,
        { maquinaId: reparacao.maquinaId }
      )

      setRelatorioGerado(relFinal)
      setConcluido(true)
      showToast(`Reparação concluída — ${numeroRelatorio}`, 'success')

      // Envio automático (não bloqueia o UI — corre em background)
      if (isEmailConfigured()) {
        enviarEmailsAutomaticos(relFinal).catch(err => {
          logger.error('ExecutarReparacaoModal', 'envioAutoFallback', err.message)
        })
      }
    } catch (err) {
      showToast('Erro ao concluir reparação: ' + err.message, 'error')
      logger.error('ExecutarReparacaoModal', 'concluirReparacao', err.message)
    } finally {
      hideGlobalLoading()
    }
  }

  // ── Pré-visualizar / PDF ──────────────────────────────────────────────────

  const handlePrevisualizar = useCallback(async () => {
    const { relatorioReparacaoParaHtml } = await import('../utils/relatorioReparacaoHtml')
    const dataRealizacao = (isAdmin && form.dataRealizacao) ? form.dataRealizacao : (reparacao?.data ?? getHojeAzores())
    const dataEmissao = (isAdmin && form.dataEmissao) ? form.dataEmissao : getHojeAzores()
    const tempRel = {
      tecnico:            form.tecnico,
      dataRealizacao,
      dataCriacao:        `${dataEmissao}T12:00:00.000Z`,
      dataAssinatura:     assinaturaFeita ? nowISO() : null,
      numeroAviso:        form.numeroAviso,
      descricaoAvaria:    form.descricaoAvaria,
      trabalhoRealizado:  form.trabalhoRealizado,
      horasMaoObra:       form.horasMaoObra,
      notas:              form.notas,
      checklistRespostas: form.checklistRespostas,
      pecasUsadas:        pecas.filter(p => p.descricao?.trim() || p.codigo?.trim()),
      fotos,
      assinaturaDigital:  assinaturaFeita ? canvasRef.current?.toDataURL('image/png') : null,
      nomeAssinante:      form.nomeAssinante,
      numeroRelatorio:    '(pré-visualização)',
    }
    const tecObj = getTecnicoByNome(form.tecnico)
    const html = relatorioReparacaoParaHtml(tempRel, reparacao, maq, cli, checklistItems, { tecnicoObj: tecObj, categoriaNome, declaracaoClienteDepois })
    if (html) {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    }
  }, [form, pecas, fotos, assinaturaFeita, reparacao, maq, cli, checklistItems, isAdmin, getTecnicoByNome])

  const handleVerPdf = useCallback(async (relGerado) => {
    const { relatorioReparacaoParaHtml } = await import('../utils/relatorioReparacaoHtml')
    const tecObj = getTecnicoByNome(relGerado.tecnico)
    const html = relatorioReparacaoParaHtml(relGerado, reparacao, maq, cli, checklistItems, { tecnicoObj: tecObj, categoriaNome, declaracaoClienteDepois })
    if (html) {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    }
  }, [reparacao, maq, cli, checklistItems, getTecnicoByNome])

  // ── Envio de email ────────────────────────────────────────────────────────

  const handleEnviarEmail = async () => {
    if (!emailDestinatario?.trim()) { showToast('Indique o email de destino', 'warning'); return }
    showGlobalLoading()
    setEmailEnviando(true)
    try {
      const { relatorioReparacaoParaHtml } = await import('../utils/relatorioReparacaoHtml')
      const { enviarRelatorioHtmlEmail }   = await import('../services/emailService')
      const tecObj = getTecnicoByNome(relatorioGerado.tecnico)
      const html = relatorioReparacaoParaHtml(relatorioGerado, reparacao, maq, cli, checklistItems, { tecnicoObj: tecObj, categoriaNome, declaracaoClienteDepois })
      const resultado = await enviarRelatorioHtmlEmail({
        destinatario: emailDestinatario.trim(),
        assunto: `Relatório de Reparação ${relatorioGerado.numeroRelatorio} — ${maq?.marca ?? ''} ${maq?.modelo ?? ''}`,
        html,
        nomeCliente: cli?.nome ?? '',
      })
      if (resultado.ok) {
        showToast('Relatório enviado com sucesso!', 'success')
        logger.action('ExecutarReparacaoModal', 'enviarEmail', `Email enviado (${relatorioGerado.numeroRelatorio})`, { dest: emailDestinatario })
      } else {
        showToast(resultado.message || 'Erro ao enviar email.', 'error', 4000)
      }
    } catch (err) {
      showToast('Erro ao enviar email: ' + err.message, 'error')
      logger.error('ExecutarReparacaoModal', 'enviarEmail', err.message)
    } finally {
      hideGlobalLoading()
      setEmailEnviando(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Executar Reparação">
      <div className="modal modal-exec-rep">

        {/* Cabeçalho */}
        <div className="modal-header">
          <div className="exec-rep-titulo">
            <Hammer size={18} />
            <div>
              <h2>Executar Reparação</h2>
              <span className="exec-rep-subtitulo">
                {maq ? `${maq.marca} ${maq.modelo}` : 'Máquina removida'}
                {sub ? ` — ${sub.nome}` : ''}
                {cli ? ` · ${cli.nome}` : ''}
              </span>
            </div>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar"><X size={20} /></button>
        </div>

        {concluido ? (
          /* ── Ecrã de Conclusão ──────────────────────────────────────── */
          <div className="modal-body exec-rep-concluido">
            <div className="concluido-icon"><CheckCircle2 size={48} /></div>
            <h3>Reparação concluída!</h3>
            <p>Relatório <strong>{relatorioGerado?.numeroRelatorio}</strong> gerado com sucesso.</p>
            <button
              type="button"
              className="btn primary"
              onClick={() => handleVerPdf(relatorioGerado)}
            >
              <FileText size={15} /> Ver / Guardar PDF
            </button>

            {emailsAutoEnviados.length > 0 && (
              <div className="concluido-auto-email card">
                <h4><Mail size={15} /> Relatório enviado automaticamente para:</h4>
                <ul className="emails-auto-lista">
                  {emailsAutoEnviados.map(e => (
                    <li key={e}>
                      {e}
                      {e === EMAIL_ADMIN   && <span className="email-tag">Admin</span>}
                      {e === EMAIL_ISTOBAL && <span className="email-tag email-tag-istobal">ISTOBAL</span>}
                      {e !== EMAIL_ADMIN && e !== EMAIL_ISTOBAL && <span className="email-tag email-tag-cliente">Cliente</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Envio manual — só mostrar se o cliente não tem email na ficha */}
            {isEmailConfigured() && !cli?.email?.trim() && (
              <div className="concluido-email card">
                <h4><Mail size={16} /> Enviar relatório ao cliente</h4>
                <p className="concluido-email-aviso">O cliente não tem email registado na ficha. Pode enviar manualmente:</p>
                <div className="form-group">
                  <label>Email do cliente</label>
                  <input
                    type="email"
                    value={emailDestinatario}
                    onChange={e => setEmailDestinatario(e.target.value)}
                    placeholder="cliente@empresa.pt"
                  />
                </div>
                <button type="button" className="btn primary" onClick={handleEnviarEmail} disabled={emailEnviando}>
                  {emailEnviando ? 'A enviar...' : <><Mail size={14} /> Enviar ao cliente</>}
                </button>
              </div>
            )}

            <button type="button" className="btn secondary btn-fechar-concluido" onClick={onClose}>
              Fechar
            </button>
          </div>
        ) : (
          /* ── Formulário de Execução ─────────────────────────────────── */
          <>
            <div className="modal-body">

              {/* Secção: Dados básicos */}
              <div className="exec-section">
                <h3 className="exec-section-title">Dados da Intervenção</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Técnico <span className="required">*</span></label>
                    <select
                      value={form.tecnico}
                      onChange={e => setForm(p => ({ ...p, tecnico: e.target.value }))}
                    >
                      <option value="">— Seleccionar técnico —</option>
                      {nomesTecnicos.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nº Aviso / Pedido</label>
                    <input
                      type="text"
                      value={form.numeroAviso}
                      onChange={e => setForm(p => ({ ...p, numeroAviso: e.target.value }))}
                      placeholder="Referência do cliente"
                    />
                  </div>
                </div>

                {isAdmin && (
                  <>
                    <div className="form-group admin-date-field">
                      <label><AlertTriangle size={14} className="text-warning" /> Data de realização (Admin — data histórica)</label>
                      <input
                        type="date"
                        value={form.dataRealizacao}
                        max={getHojeAzores()}
                        onChange={e => setForm(p => ({ ...p, dataRealizacao: e.target.value }))}
                      />
                    </div>
                    <div className="form-group admin-date-field">
                      <label><FileText size={14} className="text-warning" /> Data de emissão do relatório (Admin)</label>
                      <input
                        type="date"
                        value={form.dataEmissao}
                        max={getHojeAzores()}
                        onChange={e => setForm(p => ({ ...p, dataEmissao: e.target.value }))}
                      />
                      <span className="admin-date-aviso">
                        ⚠ Emissão do relatório: {formatDataAzores(form.dataEmissao || getHojeAzores())} · Assinatura digital: data/hora do sistema
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Secção: Avaria */}
              <div className="exec-section">
                <h3 className="exec-section-title">Avaria / Problema reportado</h3>
                <div className="form-group">
                  <textarea
                    rows={5}
                    className="textarea-full"
                    value={form.descricaoAvaria}
                    onChange={e => setForm(p => ({ ...p, descricaoAvaria: e.target.value }))}
                    placeholder="Descreva a avaria ou problema reportado pelo cliente..."
                  />
                </div>
              </div>

              {/* Secção: Trabalho realizado */}
              <div className="exec-section">
                <h3 className="exec-section-title">Trabalho realizado</h3>
                <div className="form-group">
                  <textarea
                    rows={6}
                    className="textarea-full"
                    value={form.trabalhoRealizado}
                    onChange={e => setForm(p => ({ ...p, trabalhoRealizado: e.target.value }))}
                    placeholder="Descreva o trabalho efectuado, substituições feitas, ajustes realizados..."
                  />
                </div>
                <div className="form-group form-group-horas">
                  <label>Horas M.O.</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.horasMaoObra}
                    onChange={e => setForm(p => ({ ...p, horasMaoObra: e.target.value }))}
                    placeholder="Ex: 2.5"
                  />
                </div>
              </div>

              <MaquinaDocumentacaoLinks maquina={maq} />

              {/* Secção: Peças / Consumíveis */}
              <div className="exec-section">
                <h3 className="exec-section-title">Peças / Consumíveis utilizados</h3>
                <div className="pecas-lista">
                  {pecas.map((p, i) => (
                    <div key={i} className="peca-row">
                      <input
                        type="text"
                        className="peca-codigo"
                        placeholder="Código"
                        value={p.codigo}
                        onChange={e => setPeca(i, 'codigo', e.target.value)}
                      />
                      <input
                        type="text"
                        className="peca-descricao"
                        placeholder="Descrição"
                        value={p.descricao}
                        onChange={e => setPeca(i, 'descricao', e.target.value)}
                      />
                      <input
                        type="number"
                        className="peca-qtd"
                        min="1"
                        value={p.quantidade}
                        onChange={e => setPeca(i, 'quantidade', parseInt(e.target.value) || 1)}
                      />
                      {pecas.length > 1 && (
                        <button type="button" className="icon-btn danger" onClick={() => remPeca(i)}><Trash2 size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="btn secondary btn-sm" onClick={addPeca}>
                  <Plus size={14} /> Adicionar peça
                </button>
              </div>

              {/* Secção: Checklist */}
              {checklistItems.length > 0 && (
                <div className="exec-section">
                  <h3 className="exec-section-title">Checklist</h3>
                  {erroChecklist && <p className="field-error">{erroChecklist}</p>}
                  <div className="checklist-lista">
                    {checklistItems.map(item => (
                      <div key={item.id} className="checklist-item">
                        <span className="checklist-item-nome">{item.nome}</span>
                        <div className="checklist-opcoes">
                          {['OK', 'NOK', 'N/A'].map(opt => (
                            <label key={opt} className={`checklist-opt${form.checklistRespostas[item.id] === opt ? ' active' : ''}`}>
                              <input
                                type="radio"
                                name={`cl-${item.id}`}
                                value={opt}
                                checked={form.checklistRespostas[item.id] === opt}
                                onChange={() => setForm(p => ({ ...p, checklistRespostas: { ...p.checklistRespostas, [item.id]: opt } }))}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Secção: Fotos */}
              <div className="exec-section">
                <h3 className="exec-section-title">Fotos ({fotos.length}/{MAX_FOTOS})</h3>
                <div className="fotos-grid">
                  {fotos.map((f, i) => (
                    <div key={i} className="foto-thumb">
                      <img src={safeHttpUrl(f) ?? f} alt={`Foto ${i + 1}`} />
                      <button type="button" className="foto-remove" onClick={() => removerFoto(i)}><X size={12} /></button>
                    </div>
                  ))}
                  {fotos.length < MAX_FOTOS && !fotoCarregando && (
                    <>
                      <button type="button" className="foto-add" onClick={() => fotoCameraRef.current?.click()}>
                        <Camera size={20} /><span>Câmara</span>
                      </button>
                      <button type="button" className="foto-add foto-add-gallery" onClick={() => fotoInputRef.current?.click()}>
                        <FolderOpen size={20} /><span>Galeria</span>
                      </button>
                    </>
                  )}
                  {fotoCarregando && (
                    <div className="foto-add foto-add-loading"><span>…</span></div>
                  )}
                </div>
                <input ref={fotoCameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFotoChange} />
                <input ref={fotoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleFotoChange} />
                <p className="fotos-limite-hint" style={{ marginTop: '0.5rem' }}>
                  Máximo de <strong>{MAX_FOTOS}</strong> fotos por relatório (PDF e email). Compressão automática no tablet ou telemóvel.
                  {fotos.length >= MAX_FOTOS && (
                    <span className="fotos-limite-atingido"> Limite atingido — apague uma foto para adicionar outra.</span>
                  )}
                </p>
              </div>

              {/* Secção: Notas */}
              <div className="exec-section">
                <h3 className="exec-section-title">Notas adicionais</h3>
                <textarea
                  rows={4}
                  className="textarea-full"
                  value={form.notas}
                  onChange={e => setForm(p => ({ ...p, notas: e.target.value }))}
                  placeholder="Observações, recomendações ao cliente..."
                />
              </div>

              {/* Secção: Assinatura */}
              <div className="exec-section assinatura-section">
                <h3 className="exec-section-title">Assinatura do cliente</h3>
                <div className="declaracao-assinatura-box">
                  <p className="declaracao-assinatura-titulo">Declaração de aceitação</p>
                  <p className="declaracao-assinatura-texto">
                    {resolveDeclaracaoCliente('reparacao', categoriaNome, declaracaoClienteDepois)}
                  </p>
                </div>
                <div className="form-group">
                  <label>Nome do assinante <span className="required">*</span></label>
                  <div className="campo-com-guardar">
                    <input
                      type="text"
                      value={form.nomeAssinante}
                      onChange={e => setForm(p => ({ ...p, nomeAssinante: e.target.value }))}
                      placeholder="Nome completo"
                    />
                    {form.nomeAssinante.trim() && (
                      <button type="button" className="btn-guardar-contacto" onClick={guardarNomeContacto}
                        title="Guardar este nome para futuras intervenções deste cliente">
                        <Bookmark size={14} />
                        {cli?.nomeContacto === form.nomeAssinante.trim() ? 'Guardado' : 'Guardar'}
                      </button>
                    )}
                  </div>
                </div>
                {erroAssinatura && <p className="field-error">{erroAssinatura}</p>}
                <div className="canvas-wrapper">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    className="assinatura-canvas"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={stopDraw}
                    style={{ touchAction: 'none' }}
                  />
                  <div className="assinatura-canvas-actions">
                    {assinaturaFeita && (
                      <>
                        <button type="button" className="btn secondary btn-sm btn-limpar-assinatura" onClick={limparAssinatura}>
                          <PenLine size={13} /> Limpar
                        </button>
                        <button type="button" className="btn-guardar-contacto" onClick={guardarAssinaturaContacto}
                          title="Guardar esta assinatura para futuras intervenções deste cliente">
                          <Bookmark size={14} /> Guardar assinatura
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {!assinaturaFeita && (
                  <p className="assinatura-hint">Peça ao cliente para assinar no campo acima</p>
                )}
              </div>

            </div>

            <div className="modal-footer">
              <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
              <button
                type="button"
                className="btn secondary"
                onClick={handlePrevisualizar}
                title="Pré-visualizar relatório (PDF/impressão)"
              >
                <Eye size={14} /> Pré-visualizar
              </button>
              <button
                type="button"
                className="btn secondary btn-guardar-progresso"
                onClick={handleGuardarProgresso}
                disabled={guardandoProgresso}
                title="Guardar progresso e continuar mais tarde"
              >
                {guardandoProgresso ? 'A guardar...' : 'Guardar progresso'}
              </button>
              <button type="button" className="btn primary btn-concluir" onClick={handleConcluir}>
                <CheckCircle2 size={16} /> Concluir e assinar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
