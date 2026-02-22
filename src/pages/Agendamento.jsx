/**
 * Agendamento – Página de agendamento de Montagem ou Manutenção periódica.
 * Fluxo: Cliente (com pesquisa) → Equipamento (máquinas do cliente) → Tipo (Montagem|Periódica) → Periodicidade (só Montagem) → Data/Hora.
 * Sugere data alternativa se o dia escolhido já tiver agendamentos.
 * @see DOCUMENTACAO.md §10
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { ArrowLeft, Search } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
import './Agendamento.css'

/** Formata entrada para DD-MM-YYYY */
function formatDataInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

/** Formata entrada para HH:MM */
function formatHoraInput(value) {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

/** Valida DD-MM-YYYY e devolve yyyy-MM-dd ou null */
function parseDataPT(str) {
  const m = str.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!m) return null
  const [, d, mo, y] = m
  const day = parseInt(d, 10)
  const month = parseInt(mo, 10) - 1
  const year = parseInt(y, 10)
  const date = new Date(year, month, day)
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) return null
  return `${year}-${mo}-${d}`
}

/** Valida HH:MM */
function parseHora(str) {
  return /^([01]?\d|2[0-3]):([0-5]\d)$/.test(str) ? str : null
}

/** Converte yyyy-MM-dd para DD-MM-YYYY */
function toDataPT(iso) {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

/** Procura o próximo dia com 0 manutenções agendadas/pendentes, a partir de dataStr (yyyy-MM-dd) */
function proxDiaLivre(dataStr, manutencoes) {
  const agendadasPorData = {}
  manutencoes
    .filter(m => m.status === 'agendada' || m.status === 'pendente')
    .forEach(m => {
      agendadasPorData[m.data] = (agendadasPorData[m.data] || 0) + 1
    })
  let d = new Date(dataStr)
  for (let i = 0; i < 365; i++) {
    d.setDate(d.getDate() + 1)
    const key = d.toISOString().slice(0, 10)
    const count = agendadasPorData[key] || 0
    if (count === 0) return key
  }
  return null
}

export default function Agendamento() {
  const { clientes, maquinas, manutencoes, addManutencao, getSubcategoria } = useData()
  const { user } = useAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [clienteNif, setClienteNif] = useState('')
  const [maquinaId, setMaquinaId] = useState('')
  const [tipo, setTipo] = useState('periodica')
  const [periodicidade, setPeriodicidade] = useState('anual')
  const [dataInput, setDataInput] = useState('')
  const [horaInput, setHoraInput] = useState('')

  useEffect(() => {
    const state = location.state
    if (state?.dataFromCalendar) {
      setDataInput(toDataPT(state.dataFromCalendar))
    }
    if (state?.tipoPreenchido === 'montagem' || state?.tipoPreenchido === 'periodica') {
      setTipo(state.tipoPreenchido)
    }
  }, [location.state])
  const [erro, setErro] = useState('')
  const [sugestaoData, setSugestaoData] = useState(null) // { dataStr, count, dataSugeridaStr }
  const [searchCliente, setSearchCliente] = useState('')
  const searchClienteDebounced = useDebounce(searchCliente, 250)

  const clientesComEquipamento = useMemo(() =>
    clientes.filter(c => maquinas.some(m => m.clienteNif === c.nif)),
  [clientes, maquinas])

  const clientesFiltrados = useMemo(() => {
    const q = searchClienteDebounced.trim().toLowerCase()
    if (!q) return clientesComEquipamento
    let list = clientesComEquipamento.filter(c =>
      (c.nome || '').toLowerCase().includes(q) ||
      (c.nif || '').toLowerCase().includes(q) ||
      (c.morada || '').toLowerCase().includes(q) ||
      (c.localidade || '').toLowerCase().includes(q)
    )
    if (clienteNif && !list.some(c => c.nif === clienteNif)) {
      const sel = clientesComEquipamento.find(c => c.nif === clienteNif)
      if (sel) list = [sel, ...list]
    }
    return list
  }, [searchClienteDebounced, clienteNif, clientesComEquipamento])

  const equipamentosDoCliente = useMemo(() =>
    clienteNif ? maquinas.filter(m => m.clienteNif === clienteNif) : [],
  [clienteNif, maquinas])

  const handleDataChange = (e) => {
    setDataInput(formatDataInput(e.target.value))
    setErro('')
  }
  const handleHoraChange = (e) => {
    setHoraInput(formatHoraInput(e.target.value))
    setErro('')
  }

  const handleClienteChange = (e) => {
    const nif = e.target.value
    setClienteNif(nif)
    setMaquinaId('')
    setErro('')
  }

  const executarAgendamento = (dataStr) => {
    const horaStr = parseHora(horaInput)
    const tecnico = user?.nome ?? user?.username ?? ''
    const observacoes = horaStr ? `Hora prevista: ${horaStr}` : ''
    addManutencao({
      maquinaId,
      tipo,
      periodicidade: tipo === 'montagem' ? periodicidade : undefined,
      data: dataStr,
      tecnico,
      status: 'agendada',
      observacoes,
    })
    setSugestaoData(null)
    showToast('Agendamento registado com sucesso.', 'success')
    setTimeout(() => navigate('/manutencoes?filter=proximas'), 1500)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErro('')
    const dataStr = parseDataPT(dataInput)
    const horaStr = parseHora(horaInput)
    if (!dataStr) {
      setErro('Introduza uma data válida (DD-MM-AAAA).')
      return
    }
    if (!horaStr) {
      setErro('Introduza uma hora válida (HH:MM).')
      return
    }
    if (!maquinaId) {
      setErro('Selecione um equipamento.')
      return
    }

    const countNesteDia = manutencoes.filter(
      m => m.data === dataStr && (m.status === 'agendada' || m.status === 'pendente')
    ).length

    if (countNesteDia > 0) {
      const dataSugeridaStr = proxDiaLivre(dataStr, manutencoes)
      if (dataSugeridaStr) {
        setSugestaoData({ dataStr, count: countNesteDia, dataSugeridaStr })
        return
      }
    }

    executarAgendamento(dataStr)
  }

  return (
    <div className="page agendamento-page">
      <div className="page-header agendamento-header">
        <button type="button" className="btn-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          Voltar atrás
        </button>
        <div>
          <h1>Agendamento de Montagem / Manutenção Periódica</h1>
          <p className="page-sub">Selecione o cliente, o equipamento e a data/hora</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card agendamento-form">
        <label>
          <span>Cliente</span>
          <div className="agendamento-cliente-search">
            <Search size={18} className="agendamento-search-icon" aria-hidden />
            <input
              type="search"
              value={searchCliente}
              onChange={e => setSearchCliente(e.target.value)}
              placeholder="Procurar por nome, NIF..."
              className="agendamento-search-input"
              aria-label="Procurar cliente"
            />
          </div>
          <select
            required
            value={clienteNif}
            onChange={handleClienteChange}
          >
            <option value="">— Selecione o cliente —</option>
            {clientesFiltrados.map(c => (
              <option key={c.nif} value={c.nif}>{c.nome}</option>
            ))}
          </select>
        </label>

        {clienteNif && (
          <label>
            <span>Equipamento</span>
            <select
              required
              value={maquinaId}
              onChange={e => { setMaquinaId(e.target.value); setErro(''); }}
            >
              <option value="">— Selecione o equipamento —</option>
              {equipamentosDoCliente.map(m => {
                const sub = getSubcategoria(m.subcategoriaId)
                return (
                  <option key={m.id} value={m.id}>
                    {sub?.nome || ''} — {m.marca} {m.modelo} {m.numeroSerie ? `(Série: ${m.numeroSerie})` : ''}
                  </option>
                )
              })}
            </select>
          </label>
        )}

        <label>
          <span>Tipo de serviço</span>
          <select value={tipo} onChange={e => { setTipo(e.target.value); setErro('') }}>
            <option value="montagem">Montagem</option>
            <option value="periodica">Manutenção Periódica</option>
          </select>
        </label>

        {tipo === 'montagem' && (
          <label>
            <span>Periodicidade das manutenções futuras</span>
            <select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}>
              <option value="trimestral">Trimestral (a cada 3 meses)</option>
              <option value="semestral">Semestral (a cada 6 meses)</option>
              <option value="anual">Anual (uma vez por ano)</option>
            </select>
            <small className="agendamento-hint">
              Após concluir a montagem, as manutenções periódicas serão agendadas automaticamente para os próximos 3 anos.
            </small>
          </label>
        )}

        <div className="form-row">
          <label>
            <span>Data (DD-MM-AAAA)</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={dataInput}
              onChange={handleDataChange}
              placeholder="DD-MM-AAAA"
              maxLength={10}
            />
          </label>
          <label>
            <span>Hora (HH:MM)</span>
            <input
              type="text"
              inputMode="numeric"
              required
              value={horaInput}
              onChange={handleHoraChange}
              placeholder="HH:MM"
              maxLength={5}
            />
          </label>
        </div>

        {/* Erros de validação inline (campo obrigatório em falta) */}
        {erro && <p className="form-erro">{erro}</p>}

        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </button>
          <button type="submit">
            Agendar
          </button>
        </div>
      </form>

      {clientesComEquipamento.length === 0 && (
        <p className="text-muted agendamento-empty">
          Não existem clientes com equipamentos registados. Contacte o administrador para registar clientes e equipamentos.
        </p>
      )}

      {sugestaoData && (
        <div className="modal-overlay" onClick={() => setSugestaoData(null)}>
          <div className="modal agendamento-sugestao-modal" onClick={e => e.stopPropagation()}>
            <h3>Dia com agendamentos existentes</h3>
            <p>
              O dia <strong>{dataInput}</strong> já tem <strong>{sugestaoData.count}</strong> manutenção(ões) agendada(s).
              Para evitar sobrecarga, sugerimos o próximo dia livre:
            </p>
            <p className="agendamento-sugestao-data">
              <strong>{toDataPT(sugestaoData.dataSugeridaStr)}</strong>
            </p>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => executarAgendamento(sugestaoData.dataStr)}>
                Manter data escolhida
              </button>
              <button type="button" onClick={() => executarAgendamento(sugestaoData.dataSugeridaStr)}>
                Usar data sugerida
              </button>
              <button type="button" className="secondary" onClick={() => { setDataInput(toDataPT(sugestaoData.dataSugeridaStr)); setSugestaoData(null); }}>
                Alterar e continuar
              </button>
            </div>
            <p className="agendamento-sugestao-hint">
              «Alterar e continuar» atualiza o formulário para a data sugerida; pode editar antes de submeter.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
