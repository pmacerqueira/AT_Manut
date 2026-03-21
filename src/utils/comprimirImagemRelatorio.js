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

function encodeJpegOnce(blob, maxSide, quality) {
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
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('Canvas não disponível.'))
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
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
 * @returns {Promise<string>} data URL JPEG
 */
export async function comprimirFotoParaRelatorio(blob) {
  let last = ''
  for (let i = 0; i < PASSES.length; i++) {
    const [maxSide, q] = PASSES[i]
    last = await encodeJpegOnce(blob, maxSide, q)
    if (last.length <= SOFT_MAX_BASE64_LEN) return last
  }
  if (last.length > HARD_MAX_BASE64_LEN) {
    last = await encodeJpegOnce(blob, 520, 0.32)
  }
  return last
}
