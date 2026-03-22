/**
 * Agendamento – Página de agendamento de Montagem ou Manutenção periódica.
 * Fluxo: Cliente (com pesquisa) → Equipamento (máquinas do cliente) → Tipo (Montagem|Periódica) → Periodicidade (só Montagem) → Data/Hora.
 * Sugere data alternativa se o dia escolhido já tiver agendamentos.
 * @see DOCUMENTACAO.md §10
 */
import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useData, isKaeserAbcdMaquina, isKaeserMarca } from '../context/DataContext'
import { INTERVALOS } from '../context/DataContext'
import ContentLoader from '../components/ContentLoader'
import { useDeferredReady } from '../hooks/useDeferredReady'
import { useAuth } from '../context/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../components/Toast'
import { ArrowLeft, Search, CalendarPlus, CalendarClock, Archive, ChevronDown, ChevronUp } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
import { logger } from '../utils/logger'
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

function gerarDatasRecorrentes(dataInicioISO, periodicidade, horizonteAnos) {
  const intervaloDias = INTERVALOS[periodicidade]?.dias
  if (!intervaloDias) return []
  const inicio = new Date(dataInicioISO + 'T12:00:00')
  const limite = new Date(inicio)
  limite.setFullYear(limite.getFullYear() + horizonteAnos)
  const datas = []
  let d = new Date(inicio.getTime() + intervaloDias * 24 * 3600 * 1000)
  while (d <= limite) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    datas.push(iso)
    d = new Date(d.getTime() + intervaloDias * 24 * 3600 * 1000)
  }
  return datas
}

export default function Agendamento() {
  const { clientes, maquinas, manutencoes, addManutencao, addManutencoesBatch, getSubcategoria } = useData()
  const contentReady = useDeferredReady(maquinas.length >= 0)
  const { user } = useAuth()
  const { isAdmin } = usePermissions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [clienteNif, setClienteNif] = useState('')
  const [maquinaId, setMaquinaId] = useState('')
  const [tipo, setTipo] = useState('periodica')
  const [periodicidade, setPeriodicidade] = useState('anual')
  const [dataInput, setDataInput] = useState('')
  const [horaInput, setHoraInput] = useState('')
  const [recorrente, setRecorrente] = useState(false)
  const [horizonteAnos, setHorizonteAnos] = useState(2)

  // ── Inserção em lote de históricos ──
  const [loteAberto, setLoteAberto] = useState(false)
  const [loteClienteNif, setLoteClienteNif] = useState('')
  const [loteMaquinaIds, setLoteMaquinaIds] = useState([])
  const [lotePeriodicidade, setLotePeriodicidade] = useState('anual')
  const [loteDatasManual, setLoteDatasManual] = useState('')
  const [loteErro, setLoteErro] = useState('')

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
    [...clientes]
      .filter(c => maquinas.some(m => m.clienteNif === c.nif))
      .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')),
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

  const maquinaSelecionada = useMemo(() =>
    maquinas.find(m => m.id === maquinaId),
  [maquinaId, maquinas])

  const periodicidadeEfetiva = tipo === 'montagem' ? periodicidade : (maquinaSelecionada?.periodicidadeManut || null)

  const datasRecorrentes = useMemo(() => {
    if (!recorrente || !periodicidadeEfetiva) return []
    const dataStr = parseDataPT(dataInput)
    if (!dataStr) return []
    return gerarDatasRecorrentes(dataStr, periodicidadeEfetiva, horizonteAnos)
  }, [recorrente, periodicidadeEfetiva, dataInput, horizonteAnos])

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
      periodicidade: tipo === 'montagem' ? periodicidade : (recorrente && periodicidadeEfetiva ? periodicidadeEfetiva : undefined),
      data: dataStr,
      tecnico,
      status: 'agendada',
      observacoes,
    })

    if (recorrente && periodicidadeEfetiva && datasRecorrentes.length > 0) {
      const batch = datasRecorrentes.map(d => ({
        maquinaId,
        tipo: 'periodica',
        periodicidade: periodicidadeEfetiva,
        data: d,
        tecnico,
        status: 'agendada',
        observacoes: 'Agendamento recorrente automático.',
      }))
      addManutencoesBatch(batch)
      logger.action('Agendamento', 'executarAgendamento',
        `Agendamento recorrente: 1 + ${batch.length} futuras (${periodicidadeEfetiva})`,
        { maquinaId, tipo, periodicidade: periodicidadeEfetiva, dataInicio: dataStr, futuras: batch.length })
      showToast(`Agendamento registado + ${batch.length} manutenções futuras criadas.`, 'success')
    } else {
      logger.action('Agendamento', 'executarAgendamento',
        `Agendamento pontual (${tipo}) para ${dataStr}`,
        { maquinaId, tipo, data: dataStr })
      showToast('Agendamento registado com sucesso.', 'success')
    }

    setSugestaoData(null)
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
    if (horaInput.trim() && !horaStr) {
      setErro('Hora inválida (formato HH:MM).')
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

  // ── Inserção em lote ──
  const loteEquipamentos = useMemo(() =>
    loteClienteNif ? maquinas.filter(m => m.clienteNif === loteClienteNif) : [],
  [loteClienteNif, maquinas])

  const { loteDatasPreview, loteDatasIgnoradas } = useMemo(() => {
    const raw = loteDatasManual.trim()
    if (!raw) return { loteDatasPreview: [], loteDatasIgnoradas: 0 }
    const seen = new Set()
    let ignoradas = 0
    const validas = raw.split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(Boolean)
      .map(s => {
        const parsed = parseDataPT(s)
        if (!parsed) { ignoradas++; return null }
        if (seen.has(parsed)) { ignoradas++; return null }
        seen.add(parsed)
        return { display: s, iso: parsed }
      })
      .filter(Boolean)
    return { loteDatasPreview: validas, loteDatasIgnoradas: ignoradas }
  }, [loteDatasManual])

  const handleLoteSubmit = () => {
    setLoteErro('')
    if (!loteClienteNif) { setLoteErro('Selecione o cliente.'); return }
    if (loteMaquinaIds.length === 0) { setLoteErro('Selecione pelo menos um equipamento.'); return }
    if (loteDatasPreview.length === 0) { setLoteErro('Insira pelo menos uma data válida (DD-MM-AAAA).'); return }

    const tecnico = user?.nome ?? user?.username ?? ''
    const batch = []
    for (const mId of loteMaquinaIds) {
      for (const d of loteDatasPreview) {
        batch.push({
          maquinaId: mId,
          tipo: 'periodica',
          periodicidade: lotePeriodicidade,
          data: d.iso,
          tecnico,
          status: 'agendada',
          observacoes: 'Registo histórico inserido em lote.',
        })
      }
    }
    addManutencoesBatch(batch)
    logger.action('Agendamento', 'inserirLoteHistoricos',
      `${batch.length} registos históricos inseridos em lote (${loteMaquinaIds.length} equip. × ${loteDatasPreview.length} datas)`,
      { clienteNif: loteClienteNif, maquinaIds: loteMaquinaIds, datas: loteDatasPreview.map(d => d.iso), periodicidade: lotePeriodicidade, count: batch.length })
    showToast(`${batch.length} registos históricos criados com sucesso.`, 'success')
    setLoteMaquinaIds([])
    setLoteDatasManual('')
  }

  const toggleLoteMaquina = (mId) => {
    setLoteMaquinaIds(prev =>
      prev.includes(mId) ? prev.filter(id => id !== mId) : [...prev, mId]
    )
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

      <ContentLoader loading={!contentReady} message="A carregar agendamento…" hint="Por favor aguarde.">
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

        {tipo === 'periodica' && maquinaSelecionada && isKaeserAbcdMaquina(maquinaSelecionada) && isKaeserMarca(maquinaSelecionada.marca) && (
          <div className="agendamento-kaeser-panel card" style={{ padding: '1rem', marginTop: '0.5rem', background: 'var(--color-bg-elevated, #f4f6f9)' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Compressor KAESER — confirmação do equipamento</h3>
            <p style={{ margin: '0 0 0.35rem', fontSize: '0.95rem' }}>
              <strong>{maquinaSelecionada.marca}</strong> {maquinaSelecionada.modelo}
              {maquinaSelecionada.numeroSerie ? <> — <strong>Nº série:</strong> {maquinaSelecionada.numeroSerie}</> : null}
            </p>
            <p className="text-muted" style={{ margin: 0, fontSize: '0.88rem', lineHeight: 1.45 }}>
              Plano <strong>A/B/C/D</strong>: ao agendar <strong>não</strong> é necessário saber a fase da intervenção nem as horas de serviço
              (muitas vezes só serão lidas no local). Após escolher a data abaixo e confirmar, a manutenção fica registada.
              Na <strong>execução</strong>, o técnico regista primeiro as horas de serviço, confirma o tipo A/B/C/D e preenche os consumíveis dessa fase.
            </p>
          </div>
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

        {tipo === 'periodica' && maquinaId && isAdmin && (
          <div className="agendamento-recorrente-section">
            <label className="agendamento-toggle-row">
              <input
                type="checkbox"
                checked={recorrente}
                onChange={e => setRecorrente(e.target.checked)}
              />
              <span>
                <CalendarPlus size={16} />
                Agendar recorrente para os próximos períodos?
              </span>
            </label>

            {recorrente && (
              <>
                {!periodicidadeEfetiva && (
                  <p className="form-erro" style={{ marginTop: '0.5rem' }}>
                    O equipamento selecionado não tem periodicidade definida. Configure-a em Equipamentos antes de agendar recorrente.
                  </p>
                )}
                {periodicidadeEfetiva && (
                  <div className="agendamento-recorrente-config">
                    <label>
                      <span>Horizonte</span>
                      <select value={horizonteAnos} onChange={e => setHorizonteAnos(Number(e.target.value))}>
                        <option value={1}>1 ano</option>
                        <option value={2}>2 anos</option>
                        <option value={3}>3 anos</option>
                      </select>
                    </label>
                    <p className="agendamento-recorrente-info">
                      Periodicidade: <strong>{INTERVALOS[periodicidadeEfetiva]?.label ?? periodicidadeEfetiva}</strong>
                      {' · '}Horizonte: <strong>{horizonteAnos} ano{horizonteAnos > 1 ? 's' : ''}</strong>
                    </p>
                    {datasRecorrentes.length > 0 && (
                      <div className="agendamento-recorrente-preview">
                        <p className="preview-titulo">
                          <CalendarClock size={14} /> {datasRecorrentes.length} manutenções futuras a criar:
                        </p>
                        <ul className="preview-datas">
                          {datasRecorrentes.map(d => (
                            <li key={d}>{toDataPT(d)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {datasRecorrentes.length === 0 && parseDataPT(dataInput) && (
                      <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                        Nenhuma data futura gerada — verifique a data de início e o horizonte.
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
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
            <span>Hora (HH:MM) <span className="text-muted" style={{ fontWeight: 'normal', fontSize: '0.8em' }}>opcional</span></span>
            <input
              type="text"
              inputMode="numeric"
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

      {/* ── Inserção em lote — históricos (Admin) ────────────────────────── */}
      {isAdmin && (
        <div className="card agendamento-lote-section">
          <button
            type="button"
            className="agendamento-lote-toggle"
            onClick={() => setLoteAberto(v => !v)}
          >
            <Archive size={18} />
            <span>Inserir manutenções históricas em lote</span>
            {loteAberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {loteAberto && (
            <div className="agendamento-lote-body">
              <p className="agendamento-lote-desc">
                Insira registos de manutenções passadas (em papel) de uma só vez.
                Selecione o cliente, os equipamentos e indique as datas.
              </p>

              <label>
                <span>Cliente</span>
                <select
                  value={loteClienteNif}
                  onChange={e => { setLoteClienteNif(e.target.value); setLoteMaquinaIds([]); setLoteErro('') }}
                >
                  <option value="">— Selecione o cliente —</option>
                  {clientesComEquipamento.map(c => (
                    <option key={c.nif} value={c.nif}>{c.nome}</option>
                  ))}
                </select>
              </label>

              {loteClienteNif && loteEquipamentos.length > 0 && (
                <div className="agendamento-lote-equipamentos">
                  <span className="agendamento-form-label">Equipamentos (selecione um ou vários)</span>
                  {loteEquipamentos.map(m => {
                    const sub = getSubcategoria(m.subcategoriaId)
                    return (
                      <label key={m.id} className="agendamento-lote-equip-item">
                        <input
                          type="checkbox"
                          checked={loteMaquinaIds.includes(m.id)}
                          onChange={() => toggleLoteMaquina(m.id)}
                        />
                        <span>{sub?.nome || ''} — {m.marca} {m.modelo} {m.numeroSerie ? `(${m.numeroSerie})` : ''}</span>
                      </label>
                    )
                  })}
                </div>
              )}

              <label>
                <span>Periodicidade</span>
                <select value={lotePeriodicidade} onChange={e => setLotePeriodicidade(e.target.value)}>
                  <option value="trimestral">Trimestral</option>
                  <option value="semestral">Semestral</option>
                  <option value="anual">Anual</option>
                </select>
              </label>

              <label>
                <span>Datas (DD-MM-AAAA, uma por linha ou separadas por vírgula)</span>
                <textarea
                  value={loteDatasManual}
                  onChange={e => { setLoteDatasManual(e.target.value); setLoteErro('') }}
                  placeholder={"15-01-2025\n15-07-2025\n15-01-2026"}
                  rows={5}
                  className="textarea-full"
                />
              </label>

              {loteDatasPreview.length > 0 && (
                <div className="agendamento-lote-preview">
                  <p className="preview-titulo">
                    <CalendarClock size={14} />
                    {loteDatasPreview.length} data(s) × {loteMaquinaIds.length} equipamento(s)
                    = <strong>{loteDatasPreview.length * loteMaquinaIds.length}</strong> registos a criar
                  </p>
                  {loteDatasIgnoradas > 0 && (
                    <p className="form-erro" style={{ fontSize: '0.82rem', margin: '0.3rem 0' }}>
                      {loteDatasIgnoradas} entrada(s) ignorada(s) (formato inválido ou duplicada).
                    </p>
                  )}
                  <ul className="preview-datas">
                    {loteDatasPreview.map(d => (
                      <li key={d.iso}>{d.display}</li>
                    ))}
                  </ul>
                </div>
              )}

              {loteErro && <p className="form-erro">{loteErro}</p>}

              <div className="form-actions" style={{ marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleLoteSubmit}
                  disabled={loteDatasPreview.length === 0 || loteMaquinaIds.length === 0}
                >
                  <Archive size={15} /> Criar registos históricos
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </ContentLoader>

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
