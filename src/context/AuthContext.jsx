/**
 * AuthContext — Autenticação via API PHP + JWT
 *
 * O login é validado pelo servidor (public_html/api/data.php).
 * O JWT é armazenado em sessionStorage (atm_api_token). Ao fechar a janela, a sessão termina.
 * A sessão é restaurada a partir do payload JWT sem chamada de rede.
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { logger, flushLogsToServer } from '../utils/logger'
import { ROLES } from '../config/users'

const AuthContext = createContext(null)

// Import dinâmico isolado — evita incluir apiService.js no bundle principal
// (AuthContext é sempre carregado; import dinâmico permite ao Vite criar chunk separado)
async function getApi() {
  return import('../services/apiService')
}

async function sessionFromToken() {
  const { isTokenValid, decodeTokenPayload } = await getApi()
  if (!isTokenValid()) return null
  const p = decodeTokenPayload()
  if (!p) return null
  return {
    user: {
      id:       p.sub,
      username: p.username,
      nome:     p.nome,
      role:     p.role,
    },
  }
}

/** JWT mínimo para bypass em localhost (DEV) — mesmo formato que `decodeTokenPayload` / E2E. */
function buildDevBypassJwt(user) {
  const payload = {
    sub: user.id,
    username: user.username,
    nome: user.nome,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 7200,
  }
  const json = JSON.stringify(payload)
  const b64 = btoa(
    encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
  )
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${b64}.dev`
}

// ── DEV BYPASS — remover antes de build de produção ──
const DEV_BYPASS = import.meta.env.DEV && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const DEV_USERS = {
  Admin:    { id: 'dev-admin', username: 'Admin', nome: 'Admin (Dev)', role: ROLES.ADMIN },
  ATecnica: { id: 'dev-tec',  username: 'ATecnica', nome: 'Técnico (Dev)', role: ROLES.TECNICO },
}

export function AuthProvider({ children }) {
  const [session,   setSession]   = useState(null)
  const [hydrated,  setHydrated]  = useState(false)
  const [loginError, setLoginError] = useState(null)

  // Restaurar sessão a partir do JWT existente (sem chamada de rede)
  useEffect(() => {
    sessionFromToken().then(sess => {
      setSession(sess)
      setHydrated(true)
      if (sess?.user) {
        logger.info('AuthContext', 'sessionRestore', `Sessão restaurada: ${sess.user.username} (${sess.user.role})`)
      }
    })
  }, [])

  const login = useCallback(async (username, password) => {
    setLoginError(null)
    // ── DEV BYPASS ──
    if (DEV_BYPASS) {
      const devUser = DEV_USERS[username]
      if (devUser) {
        const expectedPw = devUser.role === ROLES.ADMIN ? 'admin123' : 'tecnico123'
        if (password !== expectedPw) {
          setLoginError('Utilizador ou password incorretos.')
          return false
        }
        const { setToken } = await getApi()
        setToken(buildDevBypassJwt(devUser))
        setSession({ user: devUser })
        setHydrated(true)
        window.dispatchEvent(new Event('atm:login'))
        return true
      }
      setLoginError('Dev bypass: use "Admin" ou "ATecnica".')
      return false
    }
    try {
      const { apiLogin } = await getApi()
      const result = await apiLogin(username, password)
      // apiLogin já guardou o token via setToken()
      const sess = {
        user: {
          id:       result.user.id,
          username: result.user.username,
          nome:     result.user.nome,
          role:     result.user.role,
        },
      }
      setSession(sess)
      logger.action('AuthContext', 'login', `Utilizador "${result.user.username}" (${result.user.role}) autenticado`)
      // Notificar DataContext para processar fila offline e refrescar dados
      window.dispatchEvent(new Event('atm:login'))
      return true
    } catch (err) {
      const msg = err.status === 401
        ? 'Utilizador ou password incorretos.'
        : 'Não foi possível contactar o servidor. Verifique a ligação.'
      setLoginError(msg)
      logger.warn('AuthContext', 'login', `Tentativa de login falhada: utilizador "${username}" — ${err.message}`)
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    const username = session?.user?.username ?? 'desconhecido'
    logger.action('AuthContext', 'logout', `Utilizador "${username}" terminou sessão`)
    await flushLogsToServer()
    const { clearToken } = await getApi()
    clearToken()
    try { localStorage.setItem('atm_after_logout', '1') } catch { /* */ }
    setSession(null)
    setLoginError(null)
    try {
      sessionStorage.clear()
      if ('caches' in window) {
        const names = await caches.keys()
        await Promise.all(names.map(n => caches.delete(n)))
      }
    } catch { /* falha silenciosa */ }
  }, [session])

  const value = {
    user:          session?.user ?? null,
    isAdmin:       session?.user?.role === ROLES.ADMIN,
    isAuthenticated: !!session?.user,
    hydrated,
    loginError,
    login,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
