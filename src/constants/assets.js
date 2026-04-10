/**
 * Caminhos dos assets estáticos da aplicação.
 * Todos os ficheiros estão em public/ e são copiados para dist/ no build.
 * No cPanel: public_html/manut/
 *
 * Logótipo oficial (identidade): sempre `public/NAVEL_LOGO.jpg` — o mesmo JPEG que
 * `navel-propostas` e o resto do workspace NAVEL (ver `.cursor/rules/navel-workspace.mdc`).
 * Tamanhos (h-8, caixas em mm nos PDFs, etc.) são por contexto; o ficheiro é sempre este.
 */
const BASE = import.meta.env.BASE_URL || '/manut/'

export const ASSETS = {
  /** URL do logótipo oficial — usar em `<img src={…}>`, relatórios HTML e fetch para base64 */
  LOGO_NAVEL: `${BASE}NAVEL_LOGO.jpg`,

  /** Ícone "N" azul — sidebar, PWA, favicon */
  LOGO_ICON: `${BASE}logo.png`,

  /** Ícones PWA (192x192, 512x512) */
  ICON_192: `${BASE}icon-192.png`,
  ICON_512: `${BASE}icon-512.png`,
}
