import { useRef, useEffect, useCallback, useState } from 'react'
import './SignaturePad.css'

/**
 * SignaturePad — Captura de assinatura digital com canvas.
 *
 * O utilizador pode levantar o dedo/caneta quantas vezes quiser
 * (para acentos, pontos, espaços entre nome e apelido).
 * Só fica bloqueado ao tocar explicitamente em "Confirmar".
 */
export default function SignaturePad({ onChange, disabled, initialImage }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [locked, setLocked] = useState(false)
  const [hasSigned, setHasSigned] = useState(false)
  const [strokeCount, setStrokeCount] = useState(0)

  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const scaleX = (canvas.width / dpr) / rect.width
    const scaleY = (canvas.height / dpr) / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }, [])

  const startDraw = useCallback((e) => {
    e.preventDefault()
    if (disabled || locked) return
    const pt = getPoint(e)
    if (!pt) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    setIsDrawing(true)
  }, [disabled, locked, getPoint])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing || disabled || locked) return
    const pt = getPoint(e)
    if (!pt) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
  }, [isDrawing, disabled, locked, getPoint])

  const endDraw = useCallback((e) => {
    e.preventDefault()
    if (isDrawing) {
      setHasSigned(true)
      setStrokeCount(prev => prev + 1)
      const dataUrl = canvasRef.current?.toDataURL('image/png')
      if (dataUrl) onChange?.(dataUrl)
    }
    setIsDrawing(false)
  }, [isDrawing, onChange])

  const confirmSignature = useCallback(() => {
    setLocked(true)
    const dataUrl = canvasRef.current?.toDataURL('image/png')
    if (dataUrl) onChange?.(dataUrl)
  }, [onChange])

  const unlock = useCallback(() => {
    setLocked(false)
  }, [])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setLocked(false)
    setHasSigned(false)
    setStrokeCount(0)
    onChange?.(null)
  }, [onChange])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const w = rect.width  || 400
      const h = rect.height || 140
      canvas.width  = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#1a1a1a'
      ctx.lineWidth   = 2
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      if (initialImage) {
        const img = new Image()
        img.onload = () => {
          ctx.drawImage(img, 0, 0, w, h)
          setHasSigned(true)
          setLocked(true)
          onChange?.(initialImage)
        }
        img.src = initialImage
      }
    }
    setupCanvas()
    const ro = new ResizeObserver(setupCanvas)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [initialImage])

  return (
    <div className="signature-pad">
      <div className="signature-canvas-wrap">
        <canvas
          ref={canvasRef}
          className={`signature-canvas${locked ? ' signature-canvas-locked' : ''}`}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
          style={{ opacity: disabled ? 0.6 : 1, pointerEvents: (disabled || locked) ? 'none' : 'auto' }}
        />
        {locked && !disabled && (
          <button type="button" className="signature-unlock" onClick={unlock} aria-label="Editar assinatura">
            Tocar para editar
          </button>
        )}
        {!locked && !disabled && hasSigned && !isDrawing && (
          <div className="signature-hint">
            Pode continuar a escrever — toque em Confirmar quando terminar
          </div>
        )}
      </div>
      {!disabled && (
        <div className="signature-actions">
          <button type="button" className="signature-clear" onClick={clear}>
            Limpar
          </button>
          {hasSigned && !locked && (
            <button
              type="button"
              className={`signature-lock-btn${strokeCount > 0 && !isDrawing ? ' signature-lock-pulse' : ''}`}
              onClick={confirmSignature}
            >
              ✓ Confirmar assinatura
            </button>
          )}
        </div>
      )}
    </div>
  )
}
