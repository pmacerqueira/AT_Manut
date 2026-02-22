/**
 * Caminhos dos assets estáticos da aplicação.
 * Todos os ficheiros estão em public/ e são copiados para dist/ no build.
 * No cPanel: public_html/manut/
 */
const BASE = import.meta.env.BASE_URL || '/manut/'

export const ASSETS = {
  /** Logotipo Navel (palavra completa) — login, relatórios */
  LOGO_NAVEL: `${BASE}logo-navel.png`,

  /** Ícone "N" azul — sidebar, PWA, favicon */
  LOGO_ICON: `${BASE}logo.png`,

  /** Ícones PWA (192x192, 512x512) */
  ICON_192: `${BASE}icon-192.png`,
  ICON_512: `${BASE}icon-512.png`,
}
