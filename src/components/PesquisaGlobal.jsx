/**
 * PesquisaGlobal — Pesquisa instantânea cross-entity (Ctrl+K / ⌘K).
 * Pesquisa em clientes, equipamentos e manutenções.
 * Navegação por teclado: ↑↓ para seleccionar, Enter para abrir, Esc para fechar.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useDebounce } from '../hooks/useDebounce'
import { Search, X, Users, Cpu, Wrench, ChevronRight } from 'lucide-react'
import './PesquisaGlobal.css'

export default function PesquisaGlobal({ onClose }) {
  const [query, setQuery]         = useState('')
  const [resultados, setResultados] = useState([])
  const [selIndex, setSelIndex]   = useState(-1)
  const inputRef  = useRef(null)
  const listRef   = useRef(null)
  const navigate  = useNavigate()
  const { clientes, maquinas, manutencoes } = useData()
  const debouncedQuery = useDebounce(query, 200)

  useEffect(() => { inputRef.current?.focus() }, [])

  const pesquisar = useCallback((q) => {
    if (!q || q.trim().length < 2) { setResultados([]); setSelIndex(-1); return }
    const ql = q.trim().toLowerCase()

    const resClientes = clientes
      .filter(c =>
        c.nome?.toLowerCase().includes(ql) ||
        c.nif?.toLowerCase().includes(ql) ||
        c.email?.toLowerCase().includes(ql) ||
        c.telefone?.toLowerCase().includes(ql)
      )
      .slice(0, 5)
      .map(c => ({
        tipo: 'cliente',
        id: c.id,
        titulo: c.nome ?? '(sem nome)',
        sub: [c.nif, c.email].filter(Boolean).join(' · '),
      }))

    const resMaquinas = maquinas
      .filter(m =>
        m.marca?.toLowerCase().includes(ql) ||
        m.modelo?.toLowerCase().includes(ql) ||
        m.numero_serie?.toLowerCase().includes(ql) ||
        m.numeroSerie?.toLowerCase().includes(ql)
      )
      .slice(0, 5)
      .map(m => {
        const cliente = clientes.find(c => c.id === m.cliente_id)
        return {
          tipo: 'maquina',
          id: m.id,
          titulo: [m.marca, m.modelo].filter(Boolean).join(' ') || '(sem nome)',
          sub: `S/N: ${m.numero_serie ?? m.numeroSerie ?? '—'} · ${cliente?.nome ?? ''}`,
        }
      })

    const resManutencoes = manutencoes
      .filter(m =>
        m.tipo?.toLowerCase().includes(ql) ||
        m.status?.toLowerCase().includes(ql) ||
        m.data?.includes(ql) ||
        m.tecnico?.toLowerCase().includes(ql)
      )
      .slice(0, 4)
      .map(m => {
        const maq = maquinas.find(mq => mq.id === m.maquina_id)
        return {
          tipo: 'manutencao',
          id: m.id,
          titulo: `${m.tipo ? m.tipo.charAt(0).toUpperCase() + m.tipo.slice(1) : 'Manutenção'} — ${m.data}`,
          sub: `${maq ? [maq.marca, maq.modelo].filter(Boolean).join(' ') : '—'} · ${m.status}`,
        }
      })

    setResultados([...resClientes, ...resMaquinas, ...resManutencoes])
    setSelIndex(-1)
  }, [clientes, maquinas, manutencoes])

  useEffect(() => { pesquisar(debouncedQuery) }, [debouncedQuery, pesquisar])

  const irPara = useCallback((item) => {
    onClose()
    if      (item.tipo === 'cliente')    navigate('/clientes',    { state: { highlightId: item.id } })
    else if (item.tipo === 'maquina')    navigate('/equipamentos', { state: { highlightId: item.id } })
    else if (item.tipo === 'manutencao') navigate('/manutencoes', { state: { highlightId: item.id } })
  }, [navigate, onClose])

  // Navegação por teclado
  const handleKeyDown = (e) => {
    if (e.key === 'Escape')     { onClose(); return }
    if (e.key === 'ArrowDown')  { e.preventDefault(); setSelIndex(i => Math.min(i + 1, resultados.length - 1)) }
    if (e.key === 'ArrowUp')    { e.preventDefault(); setSelIndex(i => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && selIndex >= 0 && resultados[selIndex]) irPara(resultados[selIndex])
  }

  // Scroll automático do item seleccionado
  useEffect(() => {
    if (selIndex < 0 || !listRef.current) return
    const item = listRef.current.children[selIndex]
    item?.scrollIntoView({ block: 'nearest' })
  }, [selIndex])

  const icone = (tipo) => {
    if (tipo === 'cliente')    return <Users size={13} />
    if (tipo === 'maquina')    return <Cpu size={13} />
    return <Wrench size={13} />
  }

  const labelTipo = (tipo) => {
    if (tipo === 'cliente')    return 'Cliente'
    if (tipo === 'maquina')    return 'Equipamento'
    return 'Manutenção'
  }

  return (
    <div className="pq-backdrop" onClick={onClose}>
      <div
        className="pq-modal"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-label="Pesquisa global"
      >
        {/* Input */}
        <div className="pq-input-wrap">
          <Search size={17} className="pq-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="pq-input"
            placeholder="Pesquisar clientes, equipamentos, manutenções…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
          />
          {query && (
            <button type="button" className="pq-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Limpar">
              <X size={15} />
            </button>
          )}
          <button type="button" className="pq-close" onClick={onClose} aria-label="Fechar">
            <kbd>Esc</kbd>
          </button>
        </div>

        {/* Resultados */}
        {query.trim().length >= 2 && (
          <div className="pq-results" ref={listRef}>
            {resultados.length === 0 ? (
              <div className="pq-empty">Sem resultados para <em>"{query}"</em></div>
            ) : (
              resultados.map((item, idx) => (
                <button
                  key={`${item.tipo}-${item.id}`}
                  type="button"
                  className={`pq-item${selIndex === idx ? ' pq-item--selected' : ''}`}
                  onClick={() => irPara(item)}
                  onMouseEnter={() => setSelIndex(idx)}
                >
                  <span className={`pq-badge pq-badge--${item.tipo}`}>
                    {icone(item.tipo)}
                    {labelTipo(item.tipo)}
                  </span>
                  <div className="pq-info">
                    <span className="pq-titulo">{item.titulo}</span>
                    {item.sub && <span className="pq-sub">{item.sub}</span>}
                  </div>
                  <ChevronRight size={14} className="pq-arrow" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Estado inicial */}
        {query.trim().length === 0 && (
          <div className="pq-hint">
            <Search size={32} className="pq-hint-icon" />
            <p>Pesquise em clientes, equipamentos e manutenções</p>
            <div className="pq-shortcuts">
              <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
              <span><kbd>Enter</kbd> abrir</span>
              <span><kbd>Esc</kbd> fechar</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
