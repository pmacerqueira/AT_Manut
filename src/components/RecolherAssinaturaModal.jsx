import { useState, useCallback, useEffect } from 'react'
import { useToast } from './Toast'
import { useData } from '../context/DataContext'
import { logger } from '../utils/logger'
import SignaturePad from './SignaturePad'
import { PenLine, X } from 'lucide-react'
import { formatDataAzores } from '../utils/datasAzores'
import { getDeclaracaoCliente } from '../constants/relatorio'

export default function RecolherAssinaturaModal({ isOpen, onClose, manutencao, maquina }) {
  const { updateRelatorio, addRelatorio, getRelatorioByManutencao, clientes } = useData()
  const { showToast } = useToast()

  const [nomeAssinante, setNomeAssinante] = useState('')
  const [assinaturaDigital, setAssinaturaDigital] = useState(null)
  const [erro, setErro] = useState('')
  const [key, setKey] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setNomeAssinante('')
      setAssinaturaDigital(null)
      setErro('')
      setKey(k => k + 1)
    }
  }, [isOpen, manutencao?.id])

  const rel = manutencao ? getRelatorioByManutencao(manutencao.id) : null
  const cliente = clientes.find(c => c.nif === maquina?.clienteNif) ?? null

  const handleConfirmar = useCallback(() => {
    setErro('')
    if (!nomeAssinante.trim()) {
      setErro('Indique o nome do cliente que assina o relatório.')
      return
    }
    if (!assinaturaDigital) {
      setErro('A assinatura digital do cliente é obrigatória.')
      return
    }
    try {
      const dataAssinatura = manutencao.data
        ? `${manutencao.data}T12:00:00.000Z`
        : (rel?.dataCriacao ?? new Date().toISOString())

      const payload = {
        assinadoPeloCliente: true,
        nomeAssinante: nomeAssinante.trim(),
        assinaturaDigital,
        dataAssinatura,
      }

      if (rel) {
        updateRelatorio(rel.id, payload)
        logger.action('RecolherAssinaturaModal', 'assinar',
          `Assinatura recolhida — ${rel.numeroRelatorio} — por "${nomeAssinante.trim()}" (data: ${manutencao.data})`,
          { manutencaoId: manutencao.id, relatorioId: rel.id, nomeAssinante: nomeAssinante.trim() }
        )
      } else {
        addRelatorio({
          manutencaoId: manutencao.id,
          dataCriacao: dataAssinatura,
          ...payload,
        })
        logger.action('RecolherAssinaturaModal', 'criarEAssinar',
          `Relatório criado e assinado — por "${nomeAssinante.trim()}" (data: ${manutencao.data})`,
          { manutencaoId: manutencao.id, nomeAssinante: nomeAssinante.trim() }
        )
      }

      showToast('Assinatura recolhida com sucesso!', 'success')
      onClose()
    } catch (err) {
      logger.error('RecolherAssinaturaModal', 'assinar',
        `Erro ao gravar assinatura: ${err.message}`,
        { relatorioId: rel?.id, stack: err.stack?.slice(0, 400) })
      setErro('Erro ao gravar assinatura. Tente novamente.')
    }
  }, [nomeAssinante, assinaturaDigital, rel, manutencao, updateRelatorio, addRelatorio, showToast, onClose])

  if (!isOpen || !manutencao || !maquina) return null

  const desc = `${maquina.marca ?? ''} ${maquina.modelo ?? ''} — Nº Série: ${maquina.numeroSerie ?? ''}`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-assinatura modal-recolher-assinatura" onClick={e => e.stopPropagation()}>
        <div className="modal-header-row">
          <h2><PenLine size={18} /> Recolher assinatura do cliente</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="recolher-resumo">
          {rel?.numeroRelatorio && <p className="recolher-info"><strong>Relatório:</strong> {rel.numeroRelatorio}</p>}
          <p className="recolher-info"><strong>Data da manutenção:</strong> {formatDataAzores(manutencao.data)}</p>
          <p className="recolher-info"><strong>Equipamento:</strong> {desc}</p>
          {cliente && <p className="recolher-info"><strong>Cliente:</strong> {cliente.nome}</p>}
          {(rel?.tecnico || manutencao.tecnico) && <p className="recolher-info"><strong>Técnico:</strong> {rel?.tecnico || manutencao.tecnico}</p>}
        </div>

        <div className="recolher-data-aviso">
          Data de assinatura: <strong>{formatDataAzores(manutencao.data)}</strong>
          <span className="recolher-data-hint">(bloqueada — corresponde à data da manutenção)</span>
        </div>

        <div className="declaracao-assinatura-box">
          <p className="declaracao-assinatura-titulo">Declaração de aceitação</p>
          <p className="declaracao-assinatura-texto">
            {getDeclaracaoCliente(manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica')}
          </p>
        </div>

        {erro && <p className="form-erro">{erro}</p>}

        <label className="label-required">
          <span>Nome do assinante <span className="req-star">*</span></span>
          <input
            type="text"
            value={nomeAssinante}
            onChange={e => setNomeAssinante(e.target.value)}
            placeholder="Nome completo do responsável"
            maxLength={80}
          />
        </label>

        <div className="recolher-assinatura-pad">
          <div className="assinatura-canvas-label">
            Assinatura digital <span className="req-star">*</span>
          </div>
          <SignaturePad key={key} onChange={setAssinaturaDigital} />
        </div>

        <div className="form-actions">
          <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="primary" onClick={handleConfirmar}>
            <PenLine size={15} /> Confirmar assinatura
          </button>
        </div>
      </div>
    </div>
  )
}
