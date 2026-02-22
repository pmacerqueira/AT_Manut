import { useRef, useEffect, useCallback, useState } from 'react'
import './SignaturePad.css'

export default function SignaturePad({ onChange, disabled }) {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)

  const getPoint = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    // Converte coordenadas CSS para coordenadas do buffer do canvas
    const scaleX = (canvas.width / dpr) / rect.width
    const scaleY = (canvas.height / dpr) / rect.height
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY }
  }, [])

  const startDraw = useCallback((e) => {
    e.preventDefault()
    if (disabled) return
    const pt = getPoint(e)
    if (!pt) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(pt.x, pt.y)
    setIsDrawing(true)
  }, [disabled, getPoint])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!isDrawing || disabled) return
    const pt = getPoint(e)
    if (!pt) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    ctx.lineTo(pt.x, pt.y)
    ctx.stroke()
  }, [isDrawing, disabled, getPoint])

  const endDraw = useCallback((e) => {
    e.preventDefault()
    if (isDrawing) {
      const dataUrl = canvasRef.current?.toDataURL('image/png')
      if (dataUrl) onChange?.(dataUrl)
    }
    setIsDrawing(false)
  }, [isDrawing, onChange])

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
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
    }
    setupCanvas()
    const ro = new ResizeObserver(setupCanvas)
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [])


  return (
    <div className="signature-pad">
      <canvas
        ref={canvasRef}
        className="signature-canvas"
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{ opacity: disabled ? 0.6 : 1, pointerEvents: disabled ? 'none' : 'auto' }}
      />
      {!disabled && (
        <button type="button" className="signature-clear" onClick={clear}>
          Limpar assinatura
        </button>
      )}
    </div>
  )
}
