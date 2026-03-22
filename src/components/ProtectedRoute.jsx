import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { STORAGE } from '../config/storageKeys'
import TecnicoHorarioGuard from './TecnicoHorarioGuard'

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, hydrated } = useAuth()
  const location = useLocation()

  if (!hydrated) {
    return (
      <div className="auth-loading">
        <span>A carregar…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    let redirectState
    try {
      if (localStorage.getItem(STORAGE.AFTER_LOGOUT)) {
        localStorage.removeItem(STORAGE.AFTER_LOGOUT)
        redirectState = { from: { pathname: '/' } }
      } else {
        redirectState = { from: location }
      }
    } catch {
      redirectState = { from: location }
    }
    return <Navigate to="/login" state={redirectState} replace />
  }

  return <TecnicoHorarioGuard>{children}</TecnicoHorarioGuard>
}

export function AdminRoute({ children }) {
  const { isAdmin } = usePermissions()
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
