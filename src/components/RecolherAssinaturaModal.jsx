import { useState, useCallback, useEffect, useRef } from 'react'
import { useToast } from './Toast'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { logger } from '../utils/logger'
import SignaturePad from './SignaturePad'
import { PenLine, X, Bookmark, Upload } from 'lucide-react'
import { formatDataAzores } from '../utils/datasAzores'
import { resolveDeclaracaoClienteForMaquina } from '../constants/relatorio'

const MAX_ASSINATURA_UPLOAD_BYTES = 2.5 * 1024 * 1024
const MIME_ASSINATURA_OK = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

function assinaturaUploadAceite(file) {
  const t = (file.type || '').toLowerCase()
  if (MIME_ASSINATURA_OK.has(t)) return true
  const n = (file.name || '').toLowerCase()
  return /\.(png|jpe?g|webp)$/.test(n)
}

export default function RecolherAssinaturaModal({ isOpen, onClose, manutencao, maquina }) {
  const { updateRelatorio, addRelatorio, getRelatorioByManutencao, clientes, updateCliente, getSubcategoria, getCategoria } = useData()
  const { showToast } = useToast()
  const { isAdmin } = useAuth()

  const assinaturaFileRef = useRef(null)
  const [nomeAssinante, setNomeAssinante] = useState('')
  const [assinaturaDigital, setAssinaturaDigital] = useState(null)
  const [padInitialOverride, setPadInitialOverride] = useState(null)
  const [erro, setErro] = useState('')
  const [key, setKey] = useState(0)

  const rel = manutencao ? getRelatorioByManutencao(manutencao.id) : null
  const cliente = clientes.find(c => c.nif === maquina?.clienteNif) ?? null

  useEffect(() => {
    if (isOpen) {
      setNomeAssinante(cliente?.nomeContacto ?? '')
      setAssinaturaDigital(cliente?.assinaturaContacto ?? null)
      setPadInitialOverride(null)
      setErro('')
      setKey(k => k + 1)
    }
  }, [isOpen, manutencao?.id, cliente?.nomeContacto, cliente?.assinaturaContacto])

  const handlePadChange = useCallback((sig) => {
    setAssinaturaDigital(sig)
    if (sig == null) setPadInitialOverride(null)
  }, [])

  const handleAssinaturaFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const type = (file.type || '').toLowerCase()
    if (!assinaturaUploadAceite(file)) {
      showToast('Use uma imagem PNG, JPEG ou WebP.', 'warning')
      return
    }
    if (file.size > MAX_ASSINATURA_UPLOAD_BYTES) {
      showToast('Imagem demasiado grande (máximo 2,5 MB).', 'warning')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => showToast('Não foi possível ler o ficheiro.', 'error', 4000)
    reader.onload = () => {
      const dataUrl = reader.result
      if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) {
        showToast('Ficheiro de imagem inválido.', 'warning')
        return
      }
      setPadInitialOverride(dataUrl)
      setKey(k => k + 1)
      logger.action('RecolherAssinaturaModal', 'uploadAssinaturaImagem',
        'Assinatura carregada a partir de ficheiro (Admin)',
        { bytes: file.size, tipo: type })
    }
    reader.readAsDataURL(file)
  }, [showToast])

  const guardarNomeContacto = useCallback(() => {
    const nome = nomeAssinante.trim()
    if (!nome || !maquina?.clienteNif) return
    updateCliente(maquina.clienteNif, { nomeContacto: nome })
    showToast('Nome do contacto guardado para futuras intervenções', 'success')
    logger.action('RecolherAssinaturaModal', 'guardarNomeContacto', `Nome "${nome}" guardado para cliente ${maquina.clienteNif}`)
  }, [nomeAssinante, maquina?.clienteNif, updateCliente, showToast])

  const guardarAssinaturaContacto = useCallback(() => {
    if (!assinaturaDigital || !maquina?.clienteNif) return
    updateCliente(maquina.clienteNif, { assinaturaContacto: assinaturaDigital })
    showToast('Assinatura guardada para futuras intervenções', 'success')
    logger.action('RecolherAssinaturaModal', 'guardarAssinaturaContacto', `Assinatura guardada para cliente ${maquina.clienteNif}`)
  }, [assinaturaDigital, maquina?.clienteNif, updateCliente, showToast])

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

      showToast('Dados gravados com sucesso.', 'success', 5000)
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
            {resolveDeclaracaoClienteForMaquina(
              manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica',
              maquina,
              getSubcategoria,
              getCategoria,
            )}
          </p>
        </div>

        {erro && <p className="form-erro">{erro}</p>}

        <label className="label-required">
          <span>Nome do assinante <span className="req-star">*</span></span>
          <div className="campo-com-guardar">
            <input
              type="text"
              value={nomeAssinante}
              onChange={e => setNomeAssinante(e.target.value)}
              placeholder="Nome completo do responsável"
              maxLength={80}
            />
            {nomeAssinante.trim() && (
              <button type="button" className="btn-guardar-contacto" onClick={guardarNomeContacto}
                title="Guardar este nome para futuras intervenções deste cliente">
                <Bookmark size={14} />
                {cliente?.nomeContacto === nomeAssinante.trim() ? 'Guardado' : 'Guardar'}
              </button>
            )}
          </div>
        </label>

        <div className="recolher-assinatura-pad">
          <div className="recolher-assinatura-toolbar">
            <div className="assinatura-canvas-label">
              Assinatura digital <span className="req-star">*</span>
            </div>
            {isAdmin && (
              <>
                <input
                  ref={assinaturaFileRef}
                  type="file"
                  className="fotos-input-hidden"
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  onChange={handleAssinaturaFileChange}
                  aria-label="Carregar imagem de assinatura"
                />
                <button
                  type="button"
                  className="btn secondary btn-sm recolher-btn-upload-sig"
                  onClick={() => assinaturaFileRef.current?.click()}
                >
                  <Upload size={15} aria-hidden /> Carregar imagem…
                </button>
              </>
            )}
          </div>
          {isAdmin && (
            <p className="form-hint recolher-upload-hint">
              Como administrador, pode carregar PNG, JPEG ou WebP (ex.: assinatura digitalizada no computador) em vez de desenhar no quadro.
            </p>
          )}
          <SignaturePad
            key={key}
            onChange={handlePadChange}
            initialImage={padInitialOverride ?? cliente?.assinaturaContacto}
          />
          {assinaturaDigital && (
            <button type="button" className="btn-guardar-contacto" onClick={guardarAssinaturaContacto}
              title="Guardar esta assinatura para futuras intervenções deste cliente"
              style={{ marginTop: 'var(--space-sm)' }}>
              <Bookmark size={14} /> Guardar assinatura
            </button>
          )}
        </div>

        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn" onClick={handleConfirmar}>
            <PenLine size={15} /> Confirmar assinatura
          </button>
        </div>
      </div>
    </div>
  )
}
