import { useState, useEffect, useCallback } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { APP_FOOTER_TEXT } from '../config/version'
import InstallPrompt from './InstallPrompt'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import {
  LayoutDashboard, Users, FolderTree, Cpu, Wrench,
  Calendar, LogOut, Menu, X, CalendarPlus, ScrollText,
  Settings, RefreshCw, Search, QrCode, BarChart2, Hammer,
} from 'lucide-react'
import Breadcrumbs from './Breadcrumbs'
import OfflineBanner from './OfflineBanner'
import PesquisaGlobal from './PesquisaGlobal'
import QrReaderModal from './QrReaderModal'
import './Layout.css'

export default function Layout({ children }) {
  const { user, logout }   = useAuth()
  const { isAdmin }        = usePermissions()
  const { loading }        = useData()
  const [sidebarOpen, setSidebarOpen]   = useState(false)
  const [pesquisaOpen, setPesquisaOpen] = useState(false)
  const [qrReaderOpen, setQrReaderOpen] = useState(false)
  const location = useLocation()

  const closeSidebar = () => setSidebarOpen(false)

  // Atalho de teclado Ctrl+K / Cmd+K para pesquisa global
  const handleGlobalKey = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault()
      setPesquisaOpen(p => !p)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKey)
    return () => document.removeEventListener('keydown', handleGlobalKey)
  }, [handleGlobalKey])

  return (
    <div className="layout">
      <button type="button" className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}>
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      <button type="button" className="logout-btn-mobile" onClick={() => { closeSidebar(); logout() }} aria-label="Terminar sessão">
        <LogOut size={20} />
        <span>Sair</span>
      </button>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={closeSidebar} aria-hidden="true" />}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <Link to="/" className="logo-card" onClick={closeSidebar} title="Ir para o início">
            <img src={`${import.meta.env.BASE_URL}logo-navel.png`} alt="Navel" className="logo-img" />
          </Link>
        </div>

        {/* Barra de pesquisa rápida */}
        <div className="sidebar-search">
          <button
            type="button"
            className="sidebar-search-btn"
            onClick={() => { closeSidebar(); setPesquisaOpen(true) }}
            title="Pesquisa global (Ctrl+K)"
          >
            <Search size={15} />
            <span>Pesquisar…</span>
            <kbd>Ctrl K</kbd>
          </button>
        </div>

        <nav className="nav">
          <NavLink to="/" className={location.pathname === '/' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/clientes" className={location.pathname === '/clientes' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <Users size={20} />
            <span>Clientes</span>
          </NavLink>
          {isAdmin && (
            <NavLink to="/categorias" className={location.pathname === '/categorias' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
              <FolderTree size={20} />
              <span>Categorias</span>
            </NavLink>
          )}
          <NavLink to="/equipamentos" className={location.pathname === '/equipamentos' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <Cpu size={20} />
            <span>Equipamentos</span>
          </NavLink>
          <NavLink to="/manutencoes" className={location.pathname === '/manutencoes' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <Wrench size={20} />
            <span>Manutenções</span>
          </NavLink>
          <NavLink to="/reparacoes" className={location.pathname === '/reparacoes' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <Hammer size={20} />
            <span>Reparações</span>
          </NavLink>
          <NavLink to="/agendamento" className={location.pathname === '/agendamento' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <CalendarPlus size={20} />
            <span>Agendar</span>
          </NavLink>
          <NavLink to="/calendario" className={location.pathname === '/calendario' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
            <Calendar size={20} />
            <span>Calendário</span>
          </NavLink>

          {/* Separador para ferramentas de campo */}
          <button
            type="button"
            className="nav-link nav-link--qr"
            onClick={() => { closeSidebar(); setQrReaderOpen(true) }}
            title="Ler QR Code de equipamento"
          >
            <QrCode size={20} />
            <span>Ler QR Code</span>
          </button>

          {isAdmin && (
            <NavLink to="/metricas" className={location.pathname === '/metricas' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
              <BarChart2 size={20} />
              <span>Métricas</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/logs" className={location.pathname === '/logs' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
              <ScrollText size={20} />
              <span>Logs</span>
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/definicoes" className={location.pathname === '/definicoes' ? 'nav-link active' : 'nav-link'} onClick={closeSidebar}>
              <Settings size={20} />
              <span>Definições</span>
            </NavLink>
          )}
        </nav>
        <div className="sidebar-footer">
          <span className="user-name" title={user?.role === 'admin' ? 'Administrador' : 'Técnico Navel'}>
            {user?.nome ?? user?.username}
          </span>
          <button type="button" className="btn-logout" onClick={logout} title="Terminar sessão">
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>
      <main className="main">
        {loading
          ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'60vh', gap:'1rem', color:'#6b7280' }}>
              <RefreshCw size={32} style={{ animation:'spin 1s linear infinite' }} />
              <span style={{ fontSize:'0.9rem' }}>A carregar dados…</span>
            </div>
          )
          : (
            <>
              <OfflineBanner />
              <Breadcrumbs />
              <div className="main-content">
                {children}
              </div>
              <footer className="app-footer">
                {APP_FOOTER_TEXT}
              </footer>
              <InstallPrompt />
            </>
          )
        }
      </main>

      {/* Modais globais — fora do <main> para z-index correcto */}
      {pesquisaOpen && <PesquisaGlobal onClose={() => setPesquisaOpen(false)} />}
      <QrReaderModal isOpen={qrReaderOpen} onClose={() => setQrReaderOpen(false)} />
    </div>
  )
}
