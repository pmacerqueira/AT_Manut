import { lazy, Suspense, Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import { logEntry } from './utils/logger'
import './App.css'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[AT_Manut] Erro não tratado:', error, info.componentStack)
    logEntry('fatal', 'React', 'ErrorBoundary', error?.message || String(error), {
      stack:          error?.stack?.slice(0, 600),
      componentStack: info?.componentStack?.slice(0, 400),
    })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100vh', gap:'1rem', padding:'2rem', fontFamily:'sans-serif' }}>
          <h2 style={{ color:'#dc2626' }}>Ocorreu um erro inesperado</h2>
          <p style={{ color:'#555', maxWidth:'400px', textAlign:'center' }}>
            Por favor recarregue a página. Se o problema persistir, contacte o suporte técnico.
          </p>
          <button onClick={() => window.location.reload()} style={{ padding:'0.6rem 1.4rem', background:'#1a4880', color:'#fff', border:'none', borderRadius:'6px', cursor:'pointer', fontSize:'1rem' }}>
            Recarregar
          </button>
          {import.meta.env.DEV && (
            <pre style={{ fontSize:'0.75rem', color:'#888', maxWidth:'600px', whiteSpace:'pre-wrap', marginTop:'1rem' }}>
              {String(this.state.error)}
            </pre>
          )}
        </div>
      )
    }
    return this.props.children
  }
}

// Lazy load rotas para code splitting e carregamento mais rápido
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Clientes     = lazy(() => import('./pages/Clientes'))
const Equipamentos = lazy(() => import('./pages/Equipamentos'))
const Categorias   = lazy(() => import('./pages/Categorias'))
const Manutencoes  = lazy(() => import('./pages/Manutencoes'))
const Calendario   = lazy(() => import('./pages/Calendario'))
const Agendamento  = lazy(() => import('./pages/Agendamento'))
const Logs         = lazy(() => import('./pages/Logs'))
const Definicoes   = lazy(() => import('./pages/Definicoes'))

function PageLoader() {
  return (
    <div className="page-loader" role="status" aria-label="A carregar">
      <div className="page-loader-spinner" />
      <span className="page-loader-text">A carregar…</span>
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/clientes" element={<Clientes />} />
                      <Route path="/categorias" element={<Categorias />} />
                      <Route path="/equipamentos" element={<Equipamentos />} />
                      <Route path="/manutencoes" element={<Manutencoes />} />
                      <Route path="/calendario" element={<Calendario />} />
                      <Route path="/agendamento" element={<Agendamento />} />
                      <Route path="/logs" element={<Logs />} />
                      <Route path="/definicoes" element={<Definicoes />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Suspense>
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  )
}

export default App
