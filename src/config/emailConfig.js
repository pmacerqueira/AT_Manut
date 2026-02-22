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
  /** URL do script PHP no cPanel. */
  ENDPOINT_URL: 'https://www.navel.pt/api/send-email.php',

  /**
   * Token de autenticação — deve ser idêntico ao definido no PHP
   * (variável AUTH_TOKEN em send-email.php, linha ~52).
   * Alterar para uma string secreta própria antes de publicar.
   */
  AUTH_TOKEN: 'Navel2026$Api!Key#xZ99',

  /** Endereço de resposta visível pelo cliente (remetente visível: no-reply@navel.pt). */
  REPLY_TO: 'geral@navel.pt',
}

/**
 * Devolve true se o token ainda está no valor de placeholder
 * (endpoint ainda não configurado).
 */
export const isEmailConfigured = () =>
  EMAIL_CONFIG.AUTH_TOKEN !== 'NAVEL_MANUT_TOKEN_ALTERAR_AQUI'
