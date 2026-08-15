/**
 * Desenha assinatura (data URL) num canvas de execução de relatório.
 */
export function desenharAssinaturaNoCanvas(canvas, dataUrl, { onLoad, onError } = {}) {
  if (!canvas || !dataUrl) {
    onError?.()
    return
  }
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const img = new Image()
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    onLoad?.()
  }
  img.onerror = () => onError?.()
  img.src = dataUrl
}
