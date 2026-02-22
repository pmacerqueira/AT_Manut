import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

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
      if (localStorage.getItem('atm_after_logout')) {
        localStorage.removeItem('atm_after_logout')
        redirectState = { from: { pathname: '/' } }
      } else {
        redirectState = { from: location }
      }
    } catch {
      redirectState = { from: location }
    }
    return <Navigate to="/login" state={redirectState} replace />
  }

  return children
}
