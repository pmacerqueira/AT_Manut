/**
 * URLs da API AT_Manut em produção.
 *
 * O site (navel-site) redireciona www → navel.pt. Se a app abre em https://www.navel.pt/manut
 * e os fetch usam URLs relativas (/api/data.php), o primeiro pedido vai a www e recebe 301;
 * ao seguir o redirect, POST pode perder o corpo (login e logs falham de forma opaca).
 *
 * Em DEV mantemos caminhos relativos (proxy Vite / mesmo host).
 */

export const ATM_API_CANONICAL_ORIGIN = 'https://navel.pt'

/**
 * URL de data.php (login + CRUD).
 * Respeita VITE_API_URL absoluto ou VITE_API_BASE_URL + path (staging).
 */
export function atmDataPhpUrl() {
  const raw = (import.meta.env.VITE_API_URL || '').trim()
  const baseEnv = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '')
  }

  if (/^https?:\/\//i.test(baseEnv)) {
    const path = raw.startsWith('/') ? raw : '/api/data.php'
    return `${baseEnv}${path}`
  }

  const path = raw.startsWith('/') ? raw : '/api/data.php'
  if (import.meta.env.DEV) {
    return path
  }
  return `${ATM_API_CANONICAL_ORIGIN}${path}`
}

/** URL do log-receiver (POST form-urlencoded). */
export function atmLogReceiverUrl() {
  const u = (import.meta.env.VITE_LOG_RECEIVER_URL || '').trim()
  if (/^https?:\/\//i.test(u)) {
    return u.replace(/\/+$/, '')
  }
  if (import.meta.env.DEV) {
    return '/api/log-receiver.php'
  }
  return `${ATM_API_CANONICAL_ORIGIN}/api/log-receiver.php`
}

/** Upload multipart para biblioteca NAVEL (navel-documentos-upload.php). */
export function atmNavelDocUploadUrl() {
  if (import.meta.env.DEV) {
    return '/api/navel-documentos-upload.php'
  }
  return `${ATM_API_CANONICAL_ORIGIN}/api/navel-documentos-upload.php`
}

/** Download stream via proxy (navel-documentos-download.php). */
export function atmNavelDocDownloadUrl() {
  if (import.meta.env.DEV) {
    return '/api/navel-documentos-download.php'
  }
  return `${ATM_API_CANONICAL_ORIGIN}/api/navel-documentos-download.php`
}
