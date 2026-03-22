/**
 * Limites, timeouts e quotas — valores partilhados entre componentes.
 *
 * Fotos: limite por relatório (manutenção e reparação) — PDF, HTML/email, PHP send-email e API.
 * 6 reduz risco de timeouts / memória em tablets (Samsung A séries) e anexos grandes.
 */
export const MAX_FOTOS = 6
export const API_TIMEOUT_MS = 15000
/** Operações maiores na API (ex.: `replace_maquina` + `list` de `pecas_plano` em redes lentas). */
export const API_TIMEOUT_BULK_MS = 45000
