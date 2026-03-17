/**
 * Chaves de localStorage / sessionStorage — fonte única.
 * Prefixo: atm_ (AT_Manut)
 */
export const STORAGE = {
  CACHE: 'atm_cache_v1',
  SYNC_QUEUE: 'atm_sync_queue',
  APP_VERSION: 'atm_app_version',
  LOG: 'atm_log',
  LOG_PENDING_FLUSH: 'atm_log_pending_flush',
  PECAS_PLANO: 'atm_pecas_plano',
  MODO_CAMPO: 'atm_modo_campo',
  LAST_EXPORT: 'atm_last_export',
  INSTALL_DISMISSED: 'atm_install_dismissed',
  INSTALL_DONE: 'atm_install_done',
  AFTER_LOGOUT: 'atm_after_logout',
  CONFIG_ALERTAS: 'atm_config_alertas',
  ALERTAS_DISMISS: 'atm_alertas_dismiss',
  ALERTAS_ENVIADOS: 'atm_alertas_enviados',
  MANUTENCOES_FILTER: 'atm_manutencoes_filter',
  QUICK_NOTES: 'atm_quick_notes',
}

export const SESSION = {
  API_TOKEN: 'atm_api_token',
  SESSION_ID: 'atm_session_id',
}
