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
import { X, Camera, QrCode, CheckCircle, AlertTriangle, Loader, Wrench } from 'lucide-react'
import { useData } from '../context/DataContext'
import { getHojeAzores } from '../utils/datasAzores'
import { addDays } from 'date-fns'
import './QrReaderModal.css'

const SCAN_GO_DIAS_LIMITE = 7

export default function QrReaderModal({ isOpen, onClose }) {
  const videoRef    = useRef(null)
  const controlsRef = useRef(null)  // IScannerControls
  const navigate    = useNavigate()
  const { maquinas, manutencoes } = useData()

  const [estado, setEstado]       = useState('a-iniciar') // 'a-iniciar' | 'a-ler' | 'lido' | 'erro'
  const [mensagem, setMensagem]   = useState('')
  const [textoQr, setTextoQr]     = useState('')
  const [manutPendente, setManutPendente] = useState(null)
  const [maqDetectada, setMaqDetectada]   = useState(null)

  // Parar câmara ao fechar
  const pararCamera = () => {
    try { controlsRef.current?.stop() } catch (_) {}
    controlsRef.current = null
  }

  const fechar = () => {
    pararCamera()
    onClose()
  }

  function processar(texto) {
    setTextoQr(texto)
    setManutPendente(null)
    setMaqDetectada(null)

    // Verificar se é um QR da app (URL com ?maquina=ID)
    try {
      const url   = new URL(texto)
      const maqId = url.searchParams.get('maquina')
      if (maqId) {
        const maq = maquinas.find(m => m.id === maqId)
        setMaqDetectada(maq ?? null)

        // M2: Scan & Go — verificar se há manutenção pendente nos próximos 7 dias
        const hoje = getHojeAzores()
        const limite7d = addDays(new Date(hoje + 'T12:00:00'), SCAN_GO_DIAS_LIMITE).toISOString().slice(0, 10)
        const manutProxima = manutencoes
          .filter(mt => mt.maquinaId === maqId && (mt.status === 'pendente' || mt.status === 'agendada') && mt.data <= limite7d)
          .sort((a, b) => a.data.localeCompare(b.data))[0]

        if (manutProxima) {
          setManutPendente(manutProxima)
          setEstado('lido')
          setMensagem(maq ? `${maq.marca} ${maq.modelo} — manutenção agendada!` : 'Máquina encontrada — manutenção agendada!')
          return
        }

        setEstado('lido')
        setMensagem(maq ? `${maq.marca} ${maq.modelo} — a abrir ficha…` : 'Máquina encontrada — a abrir ficha…')
        setTimeout(() => {
          onClose()
          navigate(`/equipamentos?maquina=${encodeURIComponent(maqId)}`)
        }, 800)
        return
      }
    } catch {
      // Não é URL válida; mostrar o texto lido como QR externo.
    }

    // QR externo ou desconhecido
    setEstado('lido')
    setMensagem('QR lido — não é uma máquina AT_Manut.')
  }

  // Iniciar câmara quando o modal abre
  useEffect(() => {
    if (!isOpen) return
    setEstado('a-iniciar')
    setMensagem('')
    setTextoQr('')

    // E2E: simular leitura de QR (Playwright define window.__E2E_SIMULATE_QR = 'm01')
    const sim = typeof window !== 'undefined' ? window.__E2E_SIMULATE_QR : null
    if (typeof sim === 'string' && sim) {
      window.__E2E_SIMULATE_QR = null // consumir
      const url = `${window.location.origin}/manut/equipamentos?maquina=${encodeURIComponent(sim)}`
      setEstado('a-ler')
      requestAnimationFrame(() => processar(url))
      return
    }

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

          {/* M2: Scan & Go — ação direta para manutenção pendente */}
          {estado === 'lido' && manutPendente && maqDetectada && (
            <div className="qrr-scan-go">
              <div className="qrr-scan-go-info">
                <Wrench size={16} />
                <div>
                  <strong>{maqDetectada.marca ?? '—'} {maqDetectada.modelo ?? ''}</strong>
                  <span className="qrr-scan-go-sub">
                    {maqDetectada.numeroSerie ? `S/N: ${maqDetectada.numeroSerie} · ` : ''}
                    Agendada: {manutPendente.data ? manutPendente.data.split('-').reverse().join('-') : '—'}
                  </span>
                </div>
              </div>
              <button type="button" className="btn primary qrr-scan-go-btn" onClick={() => {
                onClose()
                navigate(`/manutencoes?executar=${encodeURIComponent(manutPendente.id)}`)
              }}>
                <Wrench size={15} /> Executar manutenção agendada
              </button>
              <button type="button" className="btn secondary" onClick={() => {
                onClose()
                navigate(`/equipamentos?maquina=${encodeURIComponent(maqDetectada.id)}`)
              }}>
                Ver ficha do equipamento
              </button>
            </div>
          )}

          {/* Texto QR externo (quando não é da app) */}
          {estado === 'lido' && textoQr && !textoQr.includes('?maquina=') && !manutPendente && (
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
          {(estado === 'erro' || (estado === 'lido' && !manutPendente)) && (
            <div className="qrr-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setEstado('a-iniciar')
                  setTextoQr('')
                  setMensagem('')
                  setManutPendente(null)
                  setMaqDetectada(null)
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
