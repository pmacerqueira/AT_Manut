/**
 * Breadcrumbs — Navegação contextual no topo de cada painel.
 * Útil para identificar o painel em printscreens e para orientação do utilizador.
 */
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import './Breadcrumbs.css'

const ROUTE_LABELS = {
  '/': 'Dashboard',
  '/clientes': 'Clientes',
  '/categorias': 'Categorias',
  '/equipamentos': 'Equipamentos',
  '/manutencoes': 'Manutenções',
  '/calendario': 'Calendário',
  '/agendamento': 'Agendar',
  '/logs': 'Logs',
  '/definicoes': 'Definições',
}

export default function Breadcrumbs() {
  const location = useLocation()
  const pathname = location.pathname.replace(/\/$/, '') || '/'

  /* Dashboard tem o seu próprio h1 — não mostrar breadcrumbs para evitar duplicação */
  if (pathname === '/') return null

  const crumbs = [
        { path: '/', label: 'Dashboard' },
        ...pathname.split('/').filter(Boolean).map((seg, i, arr) => {
          const path = '/' + arr.slice(0, i + 1).join('/')
          return { path, label: ROUTE_LABELS[path] ?? seg }
        }),
      ]

  return (
    <nav className="breadcrumbs" aria-label="Navegação">
      <ol className="breadcrumbs-list">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path} className="breadcrumbs-item">
            {i > 0 && <ChevronRight size={14} className="breadcrumbs-sep" aria-hidden />}
            {i < crumbs.length - 1 ? (
              <Link to={crumb.path} className="breadcrumbs-link">
                {crumb.label}
              </Link>
            ) : (
              <span className="breadcrumbs-current" data-breadcrumb-panel={crumb.label}>
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
