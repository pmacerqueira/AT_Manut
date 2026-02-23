/**
 * QrReaderModal — Leitura de QR Code via câmara do dispositivo.
 *
 * Usa @zxing/browser para aceder à câmara e descodificar QR codes.
 * Quando detecta um QR gerado pela app (URL com ?maquina=ID), navega
 * directamente para a ficha da máquina em /equipamentos?maquina=ID.
 *
 * Fallback: se o QR não for da app, mostra o texto lido para que o
 * utilizador possa copiar ou abrir manualmente.
 */
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrowserQRCodeReader } from '@zxing/browser'
import { X, Camera, QrCode, CheckCircle, AlertTriangle, Loader } from 'lucide-react'
import './QrReaderModal.css'

export default function QrReaderModal({ isOpen, onClose }) {
  const videoRef    = useRef(null)
  const controlsRef = useRef(null)  // IScannerControls
  const navigate    = useNavigate()

  const [estado, setEstado]       = useState('a-iniciar') // 'a-iniciar' | 'a-ler' | 'lido' | 'erro'
  const [mensagem, setMensagem]   = useState('')
  const [textoQr, setTextoQr]     = useState('')

  // Parar câmara ao fechar
  const pararCamera = () => {
    try { controlsRef.current?.stop() } catch (_) {}
    controlsRef.current = null
  }

  const fechar = () => {
    pararCamera()
    onClose()
  }

  // Iniciar câmara quando o modal abre
  useEffect(() => {
    if (!isOpen) return
    setEstado('a-iniciar')
    setMensagem('')
    setTextoQr('')

    let cancelado = false

    const iniciar = async () => {
      try {
        const reader = new BrowserQRCodeReader()
        // Prefere câmara traseira em mobile
        const dispositivos = await BrowserQRCodeReader.listVideoInputDevices()
        const cameraId = dispositivos.find(d =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('rear') ||
          d.label.toLowerCase().includes('traseira') ||
          d.label.toLowerCase().includes('environment')
        )?.deviceId ?? dispositivos[0]?.deviceId

        if (!videoRef.current || cancelado) return
        setEstado('a-ler')

        controlsRef.current = await reader.decodeFromVideoDevice(
          cameraId,
          videoRef.current,
          (result, error) => {
            if (cancelado) return
            if (result) {
              const texto = result.getText()
              controlsRef.current?.stop()
              processar(texto)
            } else if (error && error?.name !== 'NotFoundException') {
              // Ignora NotFoundException — é o estado normal quando não há QR em frame
            }
          }
        )
      } catch (err) {
        if (cancelado) return
        const msg = err?.name === 'NotAllowedError'
          ? 'Permissão de câmara negada. Autorize o acesso à câmara nas definições do browser.'
          : err?.name === 'NotFoundError'
            ? 'Nenhuma câmara encontrada neste dispositivo.'
            : `Erro ao aceder à câmara: ${err?.message ?? 'desconhecido'}`
        setEstado('erro')
        setMensagem(msg)
      }
    }

    iniciar()
    return () => {
      cancelado = true
      pararCamera()
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  const processar = (texto) => {
    setTextoQr(texto)

    // Verificar se é um QR da app (URL com ?maquina=ID)
    try {
      const url   = new URL(texto)
      const maqId = url.searchParams.get('maquina')
      if (maqId) {
        setEstado('lido')
        setMensagem(`Máquina encontrada — a abrir ficha…`)
        setTimeout(() => {
          onClose()
          navigate(`/equipamentos?maquina=${encodeURIComponent(maqId)}`)
        }, 800)
        return
      }
    } catch (_) { /* não é URL válida */ }

    // QR externo ou desconhecido
    setEstado('lido')
    setMensagem('QR lido — não é uma máquina AT_Manut.')
  }

  // Fechar com Escape
  useEffect(() => {
    if (!isOpen) return
    const fn = (e) => { if (e.key === 'Escape') fechar() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null

  return (
    <div className="qrr-overlay" onClick={fechar}>
      <div className="qrr-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Leitor QR">

        {/* Header */}
        <div className="qrr-header">
          <div className="qrr-header-left">
            <QrCode size={18} />
            <span>Ler QR Code</span>
          </div>
          <button type="button" className="icon-btn secondary" onClick={fechar} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        {/* Corpo */}
        <div className="qrr-body">

          {/* Viewfinder com vídeo */}
          <div className={`qrr-viewfinder qrr-viewfinder--${estado}`}>
            <video
              ref={videoRef}
              className="qrr-video"
              autoPlay
              playsInline
              muted
            />
            {/* Overlay de scanner (animação) */}
            {estado === 'a-ler' && (
              <div className="qrr-scan-line" aria-hidden="true" />
            )}
            {estado === 'lido' && (
              <div className="qrr-success-overlay" aria-hidden="true">
                <CheckCircle size={48} />
              </div>
            )}
          </div>

          {/* Mensagem de estado */}
          <div className="qrr-status">
            {estado === 'a-iniciar' && (
              <span className="qrr-status-text qrr-status-text--info">
                <Loader size={15} className="qrr-spin" />
                A iniciar câmara…
              </span>
            )}
            {estado === 'a-ler' && (
              <span className="qrr-status-text qrr-status-text--info">
                <Camera size={15} />
                Aponte a câmara para a etiqueta QR da máquina
              </span>
            )}
            {estado === 'lido' && (
              <span className="qrr-status-text qrr-status-text--success">
                <CheckCircle size={15} />
                {mensagem}
              </span>
            )}
            {estado === 'erro' && (
              <span className="qrr-status-text qrr-status-text--erro">
                <AlertTriangle size={15} />
                {mensagem}
              </span>
            )}
          </div>

          {/* Texto QR externo (quando não é da app) */}
          {estado === 'lido' && textoQr && !textoQr.includes('?maquina=') && (
            <div className="qrr-externo">
              <p className="qrr-externo-label">Conteúdo lido:</p>
              <code className="qrr-externo-texto">{textoQr}</code>
              {textoQr.startsWith('http') && (
                <a
                  href={textoQr}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn secondary qrr-open-link"
                >
                  Abrir link
                </a>
              )}
            </div>
          )}

          {/* Retry em caso de erro */}
          {(estado === 'erro' || estado === 'lido') && (
            <div className="qrr-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setEstado('a-iniciar')
                  setTextoQr('')
                  setMensagem('')
                }}
              >
                Tentar novamente
              </button>
              <button type="button" className="btn primary" onClick={fechar}>
                Fechar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
