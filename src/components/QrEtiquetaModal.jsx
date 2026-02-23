/**
 * QrEtiquetaModal — Gera e imprime uma etiqueta com QR code para uma máquina.
 *
 * O QR code codifica o URL directo da máquina na app.
 * A câmara nativa do telemóvel lê o QR e abre o URL no browser — sem código extra.
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Printer, QrCode } from 'lucide-react'
import { APP_VERSION } from '../config/version'

export default function QrEtiquetaModal({ isOpen, onClose, maquina, subcategoria, cliente }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)

  useEffect(() => {
    if (!isOpen || !maquina) return
    const url = `${window.location.origin}/manut/equipamentos?maquina=${encodeURIComponent(maquina.id)}`
    QRCode.toDataURL(url, {
      width: 220,
      margin: 1,
      color: { dark: '#1e3a5f', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [isOpen, maquina])

  if (!isOpen || !maquina) return null

  const handlePrint = () => window.print()

  return (
    <div className="modal-overlay qr-modal-overlay" onClick={onClose}>
      <div className="modal qr-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Etiqueta QR">

        {/* ─── Cabeçalho (só visível no ecrã, não na impressão) ─── */}
        <div className="modal-header qr-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={20} />
            <h2 style={{ margin: 0, fontSize: '1rem' }}>Etiqueta QR — {maquina.marca} {maquina.modelo}</h2>
          </div>
          <button type="button" className="icon-btn secondary" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="qr-modal-body">
          <p className="no-print" style={{ fontSize: '0.88em', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Clique em <strong>Imprimir</strong> para gerar a etiqueta. Recorte e cole na máquina.
            A câmara nativa do telemóvel lê o QR code e abre directamente a ficha da máquina.
          </p>

          {/* ─── Etiqueta printável ─── */}
          <div className="qr-etiqueta" id="qr-etiqueta-print">
            <div className="qr-etiqueta-header">
              <span className="qr-etiqueta-marca">NAVEL</span>
              <span className="qr-etiqueta-divider" />
              <span className="qr-etiqueta-sub">{subcategoria?.nome || 'Equipamento'}</span>
            </div>

            <div className="qr-etiqueta-body">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="qr-etiqueta-img" />
              ) : (
                <div className="qr-etiqueta-loading">A gerar QR…</div>
              )}
              <div className="qr-etiqueta-info">
                <div className="qr-etiqueta-nome">{maquina.marca} {maquina.modelo}</div>
                <div className="qr-etiqueta-serie">Nº Série: <strong>{maquina.numeroSerie}</strong></div>
                {cliente && <div className="qr-etiqueta-cliente">{cliente.nome}</div>}
                {maquina.localizacao && <div className="qr-etiqueta-local">{maquina.localizacao}</div>}
              </div>
            </div>

            <div className="qr-etiqueta-footer">
              Navel-Açores, Lda · AT_Manut v{APP_VERSION}
            </div>
          </div>

          {/* ─── Botões de acção ─── */}
          <div className="qr-modal-actions no-print">
            <button type="button" className="btn secondary" onClick={onClose}>Fechar</button>
            <button type="button" className="btn primary" onClick={handlePrint} disabled={!qrDataUrl}>
              <Printer size={16} /> Imprimir etiqueta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
