/**
 * Utilitários de sanitização para prevenir injeção XSS/HTML em conteúdo enviado por email
 * ou exibido dinamicamente.
 */

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

/**
 * Escapa caracteres HTML para prevenir injeção.
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (str == null || typeof str !== 'string') return ''
  return str.replace(/[&<>"']/g, c => ENTITIES[c] ?? c)
}

/**
 * Valida que a URL é segura (apenas http/https).
 * Retorna a URL se válida, ou '#' em caso contrário.
 * @param {string} url
 * @returns {string}
 */
export function safeHttpUrl(url) {
  if (!url || typeof url !== 'string') return '#'
  const t = url.trim()
  if (!t.startsWith('http://') && !t.startsWith('https://')) return '#'
  try {
    new URL(t)
    return t
  } catch {
    return '#'
  }
}

/**
 * Valida que a URL é um data URI de imagem segura (data:image/jpeg, data:image/png, etc.).
 * Retorna a URL se válida, ou string vazia em caso contrário.
 */
export function safeDataImageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const t = url.trim()
  if (!t.startsWith('data:image/')) return ''
  const m = t.match(/^data:image\/(jpeg|jpg|png|gif|webp);base64,[A-Za-z0-9+/=]+$/)
  return m ? t : ''
}
