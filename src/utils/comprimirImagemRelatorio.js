/**
 * Redimensiona e comprime imagens para relatórios (PDF, email, persistência JSON/base64).
 * Várias passagens com qualidade e dimensão decrescentes se o JPEG ainda for grande —
 * sem cortar ficheiros por limite rígido de KB (evita falhas em anexos e payloads).
 */

/**
 * Meta “suave” por foto (~280–320 KB JPEG) — com 6 fotos no relatório mantém payload gerível
 * para jsPDF, email e PHP sem aproximar limites de memória em Android/Chrome.
 */
const SOFT_MAX_BASE64_LEN = 380_000

/** Teto duro: após todas as passagens, última tentativa extra (evita strings gigantes raras). */
const HARD_MAX_BASE64_LEN = 560_000

/** [lado máximo, qualidade JPEG] por passagem */
const PASSES = [
  [1200, 0.78],
  [1080, 0.68],
  [960, 0.58],
  [840, 0.48],
  [720, 0.42],
  [640, 0.36],
]

/** Copia o ficheiro para memória (evita revogação de ficheiros temporários da câmara em mobile). */
export function fileToMemory(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(new Blob([reader.result], { type: file.type || 'image/jpeg' }))
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

/**
 * Barra de rodapé escura com texto, embutida no bitmap antes do JPEG.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} canvasWidth
 * @param {number} imageHeight — altura só da fotografia (acima do rodapé)
 * @param {number} footerBar
 * @param {string} text
 */
function drawImageFooterBar(ctx, canvasWidth, imageHeight, footerBar, text) {
  const y0 = imageHeight
  ctx.fillStyle = 'rgba(18, 18, 22, 0.94)'
  ctx.fillRect(0, y0, canvasWidth, footerBar)

  const pad = Math.max(10, Math.floor(canvasWidth * 0.03))
  const maxTextW = canvasWidth - 2 * pad
  const raw = String(text || '').trim() || '—'
  const font = (s) => `600 ${s}px system-ui, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`

  let size = Math.max(11, Math.min(20, Math.floor(footerBar * 0.36)))
  let display = raw
  for (; size >= 9; size -= 1) {
    ctx.font = font(size)
    if (ctx.measureText(display).width <= maxTextW) break
  }
  if (size < 9) size = 9
  ctx.font = font(size)
  if (ctx.measureText(display).width > maxTextW) {
    while (display.length > 1 && ctx.measureText(`${display}…`).width > maxTextW) {
      display = display.slice(0, -1)
    }
    display = `${display}…`
  }

  ctx.fillStyle = '#f0f0f0'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(display, canvasWidth / 2, y0 + footerBar / 2)
}

/**
 * @param {Blob} blob
 * @param {number} maxSide
 * @param {number} quality
 * @param {string} [footerLine] — se definido, desenha barra com texto no fundo do JPEG
 */
function encodeJpegOnce(blob, maxSide, quality, footerLine) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      const img = new Image()
      img.onerror = () =>
        reject(new Error('Não foi possível ler a imagem. Tente outro formato ou tire foto em JPEG.'))
      img.onload = () => {
        let { width, height } = img
        const ratio = Math.min(maxSide / width, maxSide / height, 1)
        const w = Math.max(1, Math.round(width * ratio))
        const h = Math.max(1, Math.round(height * ratio))
        const foot = footerLine
          ? Math.max(32, Math.min(70, Math.round(h * 0.08)))
          : 0
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h + foot
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas não disponível.'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        if (foot && footerLine) {
          drawImageFooterBar(ctx, w, h, foot, footerLine)
        }
        try {
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch (e) {
          reject(e)
        }
      }
      img.src = dataUrl
    }
    reader.readAsDataURL(blob)
  })
}

/**
 * @param {Blob} blob — tipicamente vindo de {@link fileToMemory}
 * @param {object} [options]
 * @param {string} [options.footerLine] — linha a desenhar no rodapé do bitmap (ex.: `Equipamento_SN123_25/04/2026 14:30`)
 * @returns {Promise<string>} data URL JPEG
 */
export async function comprimirFotoParaRelatorio(blob, options = {}) {
  const { footerLine } = options
  let last = ''
  for (let i = 0; i < PASSES.length; i += 1) {
    const [maxSide, q] = PASSES[i]
    last = await encodeJpegOnce(blob, maxSide, q, footerLine)
    if (last.length <= SOFT_MAX_BASE64_LEN) return last
  }
  if (last.length > HARD_MAX_BASE64_LEN) {
    last = await encodeJpegOnce(blob, 520, 0.32, footerLine)
  }
  return last
}
