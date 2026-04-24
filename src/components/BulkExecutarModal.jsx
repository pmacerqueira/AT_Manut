/**
 * BulkExecutarModal — Modal para executar várias manutenções em massa.
 * Formulário simplificado (sem wizard): dados comuns partilhados entre todas.
 */
import { useState, useRef, useCallback, useMemo } from 'react'
import { useToast } from './Toast'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { logger } from '../utils/logger'
import { getHojeAzores, nowISO } from '../utils/datasAzores'
import { addDays } from 'date-fns'
import { PenLine, Trash2, CheckCircle2, Bookmark, X } from 'lucide-react'

export default function BulkExecutarModal({ isOpen, onClose, manutencoesList, maquinaMap }) {
  const { isAdmin } = usePermissions()
  const {
    clientes,
    updateManutencao,
    addRelatorio,
    getChecklistBySubcategoria,
    getIntervaloDiasByMaquina,
    updateMaquina,
    recalcularPeriodicasAposExecucao,
    updateCliente,
    tecnicos,
  } = useData()
  const { showToast } = useToast()
  const nomesTecnicos = useMemo(() => tecnicos.filter(t => t.ativo !== false).map(t => t.nome), [tecnicos])

  const [form, setForm] = useState({
    dataRealizacao: getHojeAzores(),
    tecnico: '',
    notas: '',
    nomeAssinante: '',
    checklistTodosSim: true,
  })
  const [assinaturaFeita, setAssinaturaFeita] = useState(false)
  const [processando, setProcessando] = useState(false)
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 })
  const [concluido, setConcluido] = useState(false)

  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  const clienteComum = useMemo(() => {
    if (!manutencoesList?.length) return null
    const nifs = new Set(manutencoesList.map(m => maquinaMap[m.maquinaId]?.clienteNif).filter(Boolean))
    if (nifs.size === 1) {
      const nif = [...nifs][0]
      return clientes.find(c => c.nif === nif) ?? null
    }
    return null
  }, [manutencoesList, maquinaMap, clientes])

  // Pre-fill client name from common client
  useState(() => {
    if (clienteComum?.nomeContacto) {
      setForm(f => ({ ...f, nomeAssinante: clienteComum.nomeContacto }))
    }
  })

  // Pre-fill saved signature
  useState(() => {
    if (clienteComum?.assinaturaContacto) {
      requestAnimationFrame(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const img = new Image()
        img.onload = () => {
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
          setAssinaturaFeita(true)
        }
        img.src = clienteComum.assinaturaContacto
      })
    }
  })

  // ── Canvas handlers ──
  const getPos = useCallback((e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if (e.touches) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY }
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
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

  // ── Execute all ──
  const executarTodas = useCallback(async (semAssinatura = false) => {
    if (!form.tecnico) {
      showToast('Selecione o técnico que realizou as manutenções.', 'warning')
      return
    }
    if (!semAssinatura && !form.nomeAssinante.trim()) {
      showToast('Indique o nome do cliente que assina.', 'warning')
      return
    }
    if (!semAssinatura && !assinaturaFeita) {
      showToast('A assinatura digital é obrigatória.', 'warning')
      return
    }

    setProcessando(true)
    const total = manutencoesList.length
    setProgresso({ atual: 0, total })

    const canvas = canvasRef.current
    const assinaturaDataUrl = (!semAssinatura && canvas) ? canvas.toDataURL('image/png') : null
    const hoje = form.dataRealizacao || getHojeAzores()
    const now = form.dataRealizacao ? `${form.dataRealizacao}T12:00:00.000Z` : nowISO()

    let sucesso = 0
    let erros = 0

    for (let i = 0; i < manutencoesList.length; i++) {
      const m = manutencoesList[i]
      const maq = maquinaMap[m.maquinaId]
      if (!maq) { erros++; continue }

      try {
        setProgresso({ atual: i + 1, total })

        const checklistItems = getChecklistBySubcategoria(maq.subcategoriaId, m.tipo || 'periodica')
        const checklistRespostas = {}
        if (form.checklistTodosSim) {
          checklistItems.forEach(it => { checklistRespostas[it.id] = 'sim' })
        }

        const relPayload = {
          checklistRespostas,
          checklistSnapshot: checklistItems.map(it => ({ id: it.id, texto: it.texto, ordem: it.ordem, grupo: it.grupo ?? null })),
          notas: form.notas.slice(0, 300),
          fotos: [],
          tecnico: form.tecnico,
          assinadoPeloCliente: !semAssinatura,
          nomeAssinante: semAssinatura ? '' : form.nomeAssinante.trim(),
          assinaturaDigital: assinaturaDataUrl,
          dataAssinatura: semAssinatura ? null : now,
          dataCriacao: now,
        }

        const resultado = addRelatorio({ manutencaoId: m.id, ...relPayload })

        updateManutencao(m.id, {
          status: 'concluida',
          data: hoje,
          tecnico: form.tecnico,
        })

        const dias = getIntervaloDiasByMaquina(maq)
        const proxima = addDays(new Date(hoje), dias)
        const proximaFormatada = `${proxima.getFullYear()}-${String(proxima.getMonth() + 1).padStart(2, '0')}-${String(proxima.getDate()).padStart(2, '0')}`

        const updateMaqData = {
          proximaManut: proximaFormatada,
          ultimaManutencaoData: hoje,
        }
        updateMaquina(maq.id, updateMaqData)

        const periodicidade = maq.periodicidadeManut || m.periodicidade
        if (m.tipo === 'periodica' && periodicidade) {
          recalcularPeriodicasAposExecucao(maq.id, periodicidade, hoje, form.tecnico)
        }

        sucesso++
      } catch (err) {
        erros++
        logger.error('BulkExecutarModal', 'executarManutencao', `Erro ao executar manutenção ${m.id}`, { msg: err?.message })
      }
    }

    if (!semAssinatura && clienteComum && assinaturaDataUrl) {
      const clienteUpdate = {}
      if (form.nomeAssinante.trim()) clienteUpdate.nomeContacto = form.nomeAssinante.trim()
      if (assinaturaDataUrl) clienteUpdate.assinaturaContacto = assinaturaDataUrl
      if (Object.keys(clienteUpdate).length > 0) {
        updateCliente(clienteComum.nif, clienteUpdate)
      }
    }

    setProcessando(false)
    setConcluido(true)
    logger.action('BulkExecutarModal', 'executarEmMassa', `${sucesso} manutenções executadas em massa (${erros} erros)`, { sucesso, erros, tecnico: form.tecnico })

    if (erros === 0) {
      showToast('Dados gravados com sucesso.', 'success', 5000)
    } else {
      showToast(`${sucesso} gravadas, ${erros} com erro. Verifique os registos.`, 'warning', 6000)
    }
  }, [form, assinaturaFeita, manutencoesList, maquinaMap, clienteComum, getChecklistBySubcategoria, addRelatorio, updateManutencao, getIntervaloDiasByMaquina, updateMaquina, recalcularPeriodicasAposExecucao, updateCliente, showToast])

  if (!isOpen || !manutencoesList?.length) return null

  if (concluido) {
    return (
      <div className="modal-overlay">
        <div className="modal modal-assinatura" onClick={e => e.stopPropagation()} style={{ textAlign: 'center', padding: '2rem' }}>
          <CheckCircle2 size={48} color="var(--color-success, #22c55e)" style={{ marginBottom: '0.75rem' }} />
          <h2 style={{ marginBottom: '0.5rem' }}>Execução em massa concluída!</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>
            {progresso.total} manutenção(ões) processada(s).
          </p>
          <button type="button" className="btn primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-assinatura modal-bulk" onClick={e => e.stopPropagation()}>
        <h2>Executar {manutencoesList.length} manutenções em massa</h2>
        <p className="modal-hint">
          Os dados abaixo serão aplicados a todas as manutenções selecionadas.
          {clienteComum && <> Cliente comum: <strong>{clienteComum.nome}</strong></>}
        </p>

        {processando && (
          <div className="bulk-progress">
            <div className="bulk-progress-bar">
              <div className="bulk-progress-fill" style={{ width: `${(progresso.atual / progresso.total) * 100}%` }} />
            </div>
            <p className="bulk-progress-text">A processar {progresso.atual} de {progresso.total}…</p>
          </div>
        )}

        <div className="bulk-lista-resumo">
          <h3>Manutenções selecionadas</h3>
          <div className="bulk-lista-scroll">
            {manutencoesList.map(m => {
              const maq = maquinaMap[m.maquinaId]
              return (
                <div key={m.id} className="bulk-item">
                  <strong>{maq ? `${maq.marca} ${maq.modelo}` : 'N/A'}</strong>
                  <span className="text-muted"> — {maq?.numeroSerie || ''} — {m.data}</span>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={e => { e.preventDefault(); executarTodas(false) }}>
          <div className="form-section">
            <label>
              Data de realização
              <input type="date" max={getHojeAzores()} value={form.dataRealizacao}
                onChange={e => setForm(f => ({ ...f, dataRealizacao: e.target.value }))} />
            </label>
          </div>

          <div className="form-section">
            <label className="label-required">
              <span>Técnico <span className="req-star">*</span></span>
              <select value={form.tecnico} onChange={e => setForm(f => ({ ...f, tecnico: e.target.value }))} required>
                <option value="">— Selecionar técnico —</option>
                {nomesTecnicos.map(nome => <option key={nome} value={nome}>{nome}</option>)}
              </select>
            </label>
          </div>

          <div className="form-section">
            <label>
              Notas (partilhadas) <span className="char-count">({form.notas.length}/300)</span>
              <textarea value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value.slice(0, 300) }))}
                rows={3} className="textarea-full" maxLength={300} placeholder="Notas comuns a todas as manutenções..." />
            </label>
          </div>

          <div className="form-section">
            <label className="bulk-toggle">
              <input type="checkbox" checked={form.checklistTodosSim}
                onChange={e => setForm(f => ({ ...f, checklistTodosSim: e.target.checked }))} />
              <span>Marcar todos os itens da checklist como <strong>Conforme (Sim)</strong></span>
            </label>
          </div>

          <div className="form-section assinatura-section">
            <h3 className="assinatura-titulo"><PenLine size={16} /> Assinatura</h3>

            <label className="label-required">
              <span>Nome do cliente que assina <span className="req-star">*</span></span>
              <div className="campo-com-guardar">
                <input type="text" value={form.nomeAssinante}
                  onChange={e => setForm(f => ({ ...f, nomeAssinante: e.target.value }))}
                  placeholder="Nome completo do responsável" maxLength={80} />
                {form.nomeAssinante.trim() && clienteComum && (
                  <button type="button" className="btn-guardar-contacto" onClick={() => {
                    updateCliente(clienteComum.nif, { nomeContacto: form.nomeAssinante.trim() })
                    showToast('Nome guardado para futuras intervenções.', 'success')
                  }} title="Guardar nome">
                    <Bookmark size={14} />
                    {clienteComum.nomeContacto === form.nomeAssinante.trim() ? 'Guardado' : 'Guardar'}
                  </button>
                )}
              </div>
            </label>

            <div className="assinatura-canvas-wrap">
              <div className="assinatura-canvas-label">Assinatura digital do cliente {!isAdmin && <span className="req-star">*</span>}</div>
              <canvas ref={canvasRef} width={480} height={140}
                className={`assinatura-canvas ${assinaturaFeita ? 'assinatura-canvas--feita' : ''}`}
                onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
                onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw} />
              <div className="assinatura-canvas-actions">
                <button type="button" className="btn-link-checklist assinatura-limpar" onClick={limparAssinatura}>
                  <Trash2 size={12} /> Limpar
                </button>
                {assinaturaFeita && <span className="assinatura-ok">✓ Assinatura registada</span>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose} disabled={processando}>Cancelar</button>
            {isAdmin && (
              <button type="button" className="btn btn-outline-warning" onClick={() => executarTodas(true)} disabled={processando}>
                <PenLine size={15} /> Sem assinatura
              </button>
            )}
            <button type="submit" className="btn primary" disabled={processando}>
              {processando ? `A processar ${progresso.atual}/${progresso.total}…` : `Executar ${manutencoesList.length} manutenções`}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
