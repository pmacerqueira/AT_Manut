/**
 * QrEtiquetaModal — Gera e imprime uma etiqueta com QR code para uma máquina.
 *
 * Tamanho de impressão: 90 × 50 mm (padrão asset-tag industrial)
 * O QR code codifica o URL directo da máquina na app.
 * A câmara nativa do telemóvel lê o QR e abre directamente a ficha — zero código extra.
 */
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { X, Printer, QrCode } from 'lucide-react'
import { APP_VERSION } from '../config/version'

export default function QrEtiquetaModal({ isOpen, onClose, maquina, subcategoria, cliente }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)

  // Gerar QR com resolução alta (400px) para impressão nítida a 35mm/300dpi
  useEffect(() => {
    if (!isOpen || !maquina) return
    const url = `${window.location.origin}/manut/equipamentos?maquina=${encodeURIComponent(maquina.id)}`
    QRCode.toDataURL(url, {
      width: 400,
      margin: 1,
      color: { dark: '#0d2340', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    }).then(setQrDataUrl).catch(() => setQrDataUrl(null))
  }, [isOpen, maquina])

  if (!isOpen || !maquina) return null

  const logoSrc = `${import.meta.env.BASE_URL}logo-navel.png`

  return (
    <div className="modal-overlay qr-modal-overlay" onClick={onClose}>
      <div className="modal qr-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Etiqueta QR">

        {/* ─── Cabeçalho do modal (oculto na impressão) ─── */}
        <div className="modal-header qr-modal-header no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <QrCode size={20} />
            <h2 style={{ margin: 0, fontSize: '1rem' }}>
              Etiqueta QR — {maquina.marca} {maquina.modelo}
            </h2>
          </div>
          <button type="button" className="icon-btn secondary" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <div className="qr-modal-body">
          <p className="no-print qr-modal-hint">
            Pré-visualização da etiqueta <strong>90 × 50 mm</strong>. Imprima, recorte e cole na máquina.
            A câmara do telemóvel lê o QR e abre directamente a ficha da máquina.
          </p>

          {/* ══════════════════════════════════════════════
              ETIQUETA — layout 90 × 50 mm
              ══════════════════════════════════════════════ */}
          <div className="qr-etiqueta" id="qr-etiqueta-print">

            {/* Coluna esquerda: logo + info */}
            <div className="qr-etiqueta-left">
              <div className="qr-etiqueta-logo-wrap">
                <img
                  src={logoSrc}
                  alt="Navel"
                  className="qr-etiqueta-logo"
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>

              <div className="qr-etiqueta-sep" />

              {subcategoria?.nome && (
                <div className="qr-etiqueta-type">{subcategoria.nome}</div>
              )}

              <div className="qr-etiqueta-machine">
                <div className="qr-etiqueta-nome">{maquina.marca} {maquina.modelo}</div>
                <div className="qr-etiqueta-serie">
                  S/N: <strong>{maquina.numeroSerie || '—'}</strong>
                </div>
                {cliente && (
                  <div className="qr-etiqueta-cliente">{cliente.nome}</div>
                )}
                {maquina.localizacao && (
                  <div className="qr-etiqueta-local">{maquina.localizacao}</div>
                )}
              </div>
            </div>

            {/* Coluna direita: QR code */}
            <div className="qr-etiqueta-right">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="QR Code" className="qr-etiqueta-img" />
              ) : (
                <div className="qr-etiqueta-loading">
                  <QrCode size={28} strokeWidth={1.2} />
                  <span>A gerar…</span>
                </div>
              )}
              <div className="qr-etiqueta-scan-hint">Digitalizar</div>
            </div>

            {/* Rodapé */}
            <div className="qr-etiqueta-footer">
              Navel-Açores, Lda &nbsp;·&nbsp; AT_Manut v{APP_VERSION}
            </div>
          </div>

          {/* ─── Botões (ocultos na impressão) ─── */}
          <div className="qr-modal-actions no-print">
            <button type="button" className="btn secondary" onClick={onClose}>Fechar</button>
            <button
              type="button"
              className="btn primary"
              onClick={() => window.print()}
              disabled={!qrDataUrl}
            >
              <Printer size={16} /> Imprimir etiqueta
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
