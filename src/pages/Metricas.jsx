/**
 * Metricas.jsx — Dashboard de KPIs e métricas da frota.
 *
 * Visão executiva para o Admin: taxa de cumprimento, maquinas em atraso,
 * próximas manutenções por semana, evolução mensal e top clientes em atraso.
 *
 * Acesso: Admin apenas.
 */
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import {
  calcResumoCounts,
  calcTaxaCumprimento,
  calcProximasSemanas,
  calcTopClientesAtraso,
  calcEvolucaoMensal,
} from '../utils/kpis'
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  BarChart2, ArrowLeft, Users, Cpu, Wrench, FileText,
  AlertTriangle, CheckCircle, Clock, TrendingUp, Calendar,
} from 'lucide-react'
import './Metricas.css'

// Cores dos gráficos (CSS variables não funcionam directamente no recharts)
const COR_CONCLUIDA = '#22c55e'
const COR_PENDENTE  = '#f59e0b'
const COR_AGENDADA  = '#00a3e0'
const COR_GRID      = '#2d3a4d'
const COR_TEXTO     = '#8b9cad'

export default function Metricas() {
  const { isAdmin }     = usePermissions()
  const navigate        = useNavigate()
  const { clientes, maquinas, manutencoes, relatorios } = useData()

  // Redirige se não for admin
  if (!isAdmin) { navigate('/', { replace: true }); return null }

  // ── Cálculo de KPIs (memorizados) ────────────────────────────────────────
  const resumo       = useMemo(() => calcResumoCounts({ clientes, maquinas, manutencoes, relatorios }), [clientes, maquinas, manutencoes, relatorios])
  const cumprimento  = useMemo(() => calcTaxaCumprimento({ manutencoes, meses: 12 }), [manutencoes])
  const semanas      = useMemo(() => calcProximasSemanas({ manutencoes, semanas: 8 }), [manutencoes])
  const topAtraso    = useMemo(() => calcTopClientesAtraso({ clientes, maquinas }), [clientes, maquinas])
  const evolucao     = useMemo(() => calcEvolucaoMensal({ manutencoes, meses: 6 }), [manutencoes])

  // ── Cor da taxa de cumprimento ────────────────────────────────────────────
  const txClass = cumprimento.percentagem === null
    ? ''
    : cumprimento.percentagem >= 90
      ? 'met-taxa--verde'
      : cumprimento.percentagem >= 70
        ? 'met-taxa--amarelo'
        : 'met-taxa--vermelho'

  return (
    <div className="met-page">

      {/* Cabeçalho */}
      <div className="met-header">
        <button type="button" className="met-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Voltar</span>
        </button>
        <div className="met-title-wrap">
          <BarChart2 size={22} className="met-title-icon" />
          <h1 className="met-title">Métricas da frota</h1>
        </div>
      </div>

      {/* ── Cards de resumo ─────────────────────────────────────────────── */}
      <section className="met-section">
        <div className="met-cards">
          <div className="met-card">
            <div className="met-card-icon met-card-icon--blue"><Users size={20} /></div>
            <div className="met-card-body">
              <span className="met-card-val">{resumo.totalClientes}</span>
              <span className="met-card-lbl">Clientes</span>
            </div>
          </div>
          <div className="met-card">
            <div className="met-card-icon met-card-icon--green"><Cpu size={20} /></div>
            <div className="met-card-body">
              <span className="met-card-val">{resumo.totalMaquinas}</span>
              <span className="met-card-lbl">Equipamentos</span>
            </div>
          </div>
          <div className="met-card">
            <div className="met-card-icon met-card-icon--yellow"><Wrench size={20} /></div>
            <div className="met-card-body">
              <span className="met-card-val">{resumo.totalManutencoes}</span>
              <span className="met-card-lbl">Manutenções</span>
            </div>
          </div>
          <div className="met-card">
            <div className="met-card-icon met-card-icon--purple"><FileText size={20} /></div>
            <div className="met-card-body">
              <span className="met-card-val">{resumo.totalRelatorios}</span>
              <span className="met-card-lbl">Relatórios</span>
            </div>
          </div>
          <div className={`met-card ${resumo.emAtraso > 0 ? 'met-card--alerta' : ''}`}>
            <div className={`met-card-icon ${resumo.emAtraso > 0 ? 'met-card-icon--red' : 'met-card-icon--green'}`}>
              {resumo.emAtraso > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            </div>
            <div className="met-card-body">
              <span className="met-card-val">{resumo.emAtraso}</span>
              <span className="met-card-lbl">Em atraso</span>
            </div>
          </div>
          <div className={`met-card ${resumo.semEmail > 0 ? 'met-card--aviso' : ''}`}>
            <div className={`met-card-icon ${resumo.semEmail > 0 ? 'met-card-icon--orange' : 'met-card-icon--green'}`}>
              {resumo.semEmail > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            </div>
            <div className="met-card-body">
              <span className="met-card-val">{resumo.semEmail}</span>
              <span className="met-card-lbl">Sem email</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Taxa de cumprimento + evolução mensal ───────────────────────── */}
      <div className="met-row-2">

        {/* Taxa */}
        <section className="met-section met-section--taxa">
          <h2 className="met-section-title">
            <TrendingUp size={16} />
            Taxa de cumprimento (12 meses)
          </h2>
          {cumprimento.total === 0 ? (
            <p className="met-empty">Sem dados suficientes</p>
          ) : (
            <div className="met-taxa-wrap">
              <div className={`met-taxa-circle ${txClass}`}>
                <span className="met-taxa-pct">{cumprimento.percentagem}%</span>
              </div>
              <div className="met-taxa-info">
                <div className="met-taxa-row">
                  <span className="met-taxa-dot met-taxa-dot--verde" />
                  <span>{cumprimento.concluidas} concluídas</span>
                </div>
                <div className="met-taxa-row">
                  <span className="met-taxa-dot met-taxa-dot--muted" />
                  <span>{cumprimento.total - cumprimento.concluidas} pendentes/outros</span>
                </div>
                <div className="met-taxa-row met-taxa-total">
                  <span>Total: {cumprimento.total} manutenções</span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Evolução mensal */}
        <section className="met-section met-section--evolucao">
          <h2 className="met-section-title">
            <TrendingUp size={16} />
            Evolução mensal (6 meses)
          </h2>
          {evolucao.every(m => m.total === 0) ? (
            <p className="met-empty">Sem dados suficientes</p>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={evolucao} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={COR_GRID} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: COR_TEXTO }} />
                <YAxis tick={{ fontSize: 11, fill: COR_TEXTO }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1a2332', border: '1px solid #2d3a4d', borderRadius: 8 }}
                  labelStyle={{ color: '#e8edf2', fontWeight: 600 }}
                  itemStyle={{ color: '#8b9cad' }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: COR_TEXTO }} />
                <Line type="monotone" dataKey="concluidas" name="Concluídas" stroke={COR_CONCLUIDA} strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="pendentes"  name="Pendentes"  stroke={COR_PENDENTE}  strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="agendadas"  name="Agendadas"  stroke={COR_AGENDADA}  strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </section>
      </div>

      {/* ── Próximas 8 semanas ───────────────────────────────────────────── */}
      <section className="met-section">
        <h2 className="met-section-title">
          <Calendar size={16} />
          Próximas 8 semanas
        </h2>
        {semanas.every(s => s.total === 0) ? (
          <p className="met-empty">Sem manutenções agendadas nas próximas 8 semanas</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={semanas} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={COR_GRID} />
              <XAxis dataKey="labelCurto" tick={{ fontSize: 10, fill: COR_TEXTO }} />
              <YAxis tick={{ fontSize: 11, fill: COR_TEXTO }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1a2332', border: '1px solid #2d3a4d', borderRadius: 8 }}
                labelStyle={{ color: '#e8edf2', fontWeight: 600 }}
                formatter={(value, name, props) => [value, name === 'pendentes' ? 'Pendentes' : 'Agendadas']}
                labelFormatter={(_, payload) => payload?.[0]?.payload?.label ?? ''}
                itemStyle={{ color: '#8b9cad' }}
              />
              <Legend wrapperStyle={{ fontSize: 11, color: COR_TEXTO }} />
              <Bar dataKey="pendentes" name="Pendentes" fill={COR_PENDENTE} radius={[4, 4, 0, 0]} stackId="a" />
              <Bar dataKey="agendadas" name="Agendadas" fill={COR_AGENDADA} radius={[4, 4, 0, 0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Top clientes em atraso ───────────────────────────────────────── */}
      {topAtraso.length > 0 && (
        <section className="met-section">
          <h2 className="met-section-title">
            <AlertTriangle size={16} />
            Clientes com equipamentos em atraso
          </h2>
          <div className="met-top-list">
            {topAtraso.map((c, i) => (
              <div key={c.clienteId} className="met-top-item">
                <span className="met-top-rank">#{i + 1}</span>
                <div className="met-top-info">
                  <span className="met-top-nome">{c.nome}</span>
                  <span className="met-top-detalhe">
                    {c.totalMaquinas} equipamento{c.totalMaquinas !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className="met-top-badge">
                  <AlertTriangle size={12} />
                  {c.emAtraso} em atraso
                </span>
                <button
                  type="button"
                  className="btn secondary met-top-btn"
                  onClick={() => navigate('/equipamentos?filter=atraso')}
                  title="Ver equipamentos em atraso"
                >
                  <Clock size={13} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {topAtraso.length === 0 && resumo.emAtraso === 0 && (
        <div className="met-tudo-bem">
          <CheckCircle size={32} />
          <p>Todos os equipamentos estão dentro do prazo de manutenção.</p>
        </div>
      )}
    </div>
  )
}
