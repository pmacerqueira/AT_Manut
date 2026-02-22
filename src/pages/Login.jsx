import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { LogOut } from 'lucide-react'
import { APP_FOOTER_TEXT } from '../config/version'
import { ASSETS } from '../constants/assets'
import './Login.css'

const NAVEL_SITE_URL = 'https://www.navel.pt'

export default function Login() {
  const { isAuthenticated, login, logout, loginError, hydrated } = useAuth()
  const { refreshData } = useData()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const navigate   = useNavigate()
  const location   = useLocation()
  const rawFrom   = location.state?.from?.pathname
  // Evitar open redirect: só aceitar paths internos (começam com /)
  const from    = (typeof rawFrom === 'string' && rawFrom.startsWith('/') && !rawFrom.startsWith('//'))
    ? rawFrom
    : '/'

  if (hydrated && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    const ok = await login(username, password)
    setLoading(false)
    if (ok) {
      await refreshData()
      navigate(from, { replace: true })
    } else setPassword('')
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-wrap">
            <img src={ASSETS.LOGO_NAVEL} alt="Navel" className="login-logo" />
          </div>
          <span className="login-sub">Dashboard — Assistência Técnica</span>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Utilizador
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="Admin ou ATecnica"
              autoCapitalize="off"
            />
          </label>
          <label>
            Palavra-passe
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>
          {loginError && <p className="form-erro">{loginError}</p>}
          <button type="submit" className="login-submit" disabled={loading || !username || !password}>
            {loading ? 'A verificar…' : 'Entrar'}
          </button>
        </form>
        <p className="login-hint">
          Introduza o utilizador e a palavra-passe para aceder.
        </p>
        <button type="button" className="login-btn-sair" onClick={() => { logout(); window.location.href = NAVEL_SITE_URL }}>
          <LogOut size={18} />
          Sair para o site Navel
        </button>
        <footer className="login-footer">
          {APP_FOOTER_TEXT}
        </footer>
      </div>
    </div>
  )
}
