/**
 * Configuração do serviço de email — cPanel / navel.pt
 *
 * O envio é feito via script PHP no próprio servidor da Navel,
 * usando a conta noreply@navel.pt do cPanel.
 *
 * Ficheiro PHP a instalar: servidor-cpanel/send-email.php
 *   → Destino no servidor: public_html/api/send-email.php
 *   → URL final: https://www.navel.pt/api/send-email.php
 *
 * Ver instruções completas em: servidor-cpanel/INSTRUCOES_CPANEL.md
 */

export const EMAIL_CONFIG = {
  /** URL do script PHP no cPanel (relatórios de manutenção — FPDF, JSON estruturado). */
  ENDPOINT_URL: 'https://www.navel.pt/api/send-email.php',

  /**
   * Token de autenticação — deve ser idêntico ao definido no PHP
   * (variável AUTH_TOKEN em send-email.php, linha ~52).
   * Alterar para uma string secreta própria antes de publicar.
   */
  AUTH_TOKEN: 'Navel2026$Api!Key#xZ99',

  /** Endereço de resposta visível pelo cliente (remetente visível: no-reply@navel.pt). */
  REPLY_TO: 'comercial@navel.pt',
}

/**
 * URL de `send-report.php` (HTML no corpo + PDF base64 opcional).
 *
 * **Norma:** usar sempre o mesmo host que `ENDPOINT_URL` / `send-email.php`.
 * Não depender só de `window.location.origin` nem de `VITE_API_BASE_URL` em produção:
 * builds com API base errada geram `Failed to fetch` no browser (rede/CORS/host inexistente).
 *
 * `VITE_API_BASE_URL`: em `npm run build`, um .env local com `http://localhost:8080` fica
 * **embutido no bundle**. Em navel.pt o fetch ia para localhost → CSP bloqueia (`connect-src`).
 * Por isso ignoramos base «localhost» quando a página **não** está em localhost.
 */
function safeViteApiBaseUrl() {
  const raw = (import.meta.env.VITE_API_BASE_URL || '').trim()
  if (!raw) return ''
  const base = raw.replace(/\/$/, '')
  if (import.meta.env.DEV) return base
  if (typeof window === 'undefined') return base
  try {
    const u = new URL(raw.includes('://') ? raw : `https://${raw}`)
    const envH = u.hostname.toLowerCase()
    const pageH = window.location.hostname.toLowerCase()
    const envLoop = envH === 'localhost' || envH === '127.0.0.1'
    const pageLoop = pageH === 'localhost' || pageH === '127.0.0.1'
    if (envLoop && !pageLoop) return ''
    return base
  } catch {
    return base
  }
}

export function getSendReportUrl() {
  const fromEnv = safeViteApiBaseUrl()
  if (fromEnv) {
    return `${fromEnv}/api/send-report.php`
  }
  // Dev: mesmo host que a app (proxy Vite → /api).
  if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
    return `${window.location.origin.replace(/\/$/, '')}/api/send-report.php`
  }
  // Produção no browser: path absoluto na raiz do site — mesmo scheme/host que a página
  // (evita mistura www / navel.pt vs URL fixa) e igual ao send-email no mesmo domínio.
  if (typeof window !== 'undefined') {
    return '/api/send-report.php'
  }
  const ep = EMAIL_CONFIG.ENDPOINT_URL || ''
  if (/send-email\.php\s*$/i.test(ep)) {
    return ep.replace(/send-email\.php\s*$/i, 'send-report.php')
  }
  return 'https://www.navel.pt/api/send-report.php'
}

/**
 * Devolve true se o token ainda está no valor de placeholder
 * (endpoint ainda não configurado).
 */
export const isEmailConfigured = () =>
  EMAIL_CONFIG.AUTH_TOKEN !== 'NAVEL_MANUT_TOKEN_ALTERAR_AQUI'
