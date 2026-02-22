import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
} from 'date-fns'
import { getHojeAzores } from '../utils/datasAzores'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { pt } from 'date-fns/locale'
import './Calendario.css'

export default function Calendario() {
  const isMobile = useMediaQuery('(max-width: 600px)')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const navigate = useNavigate()
  const { maquinas, manutencoes, getSubcategoria } = useData()

  const getManutencoesForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return manutencoes.filter(m => m.data === dateStr)
  }

  const getMaquinasForDay = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return maquinas.filter(e => e.proximaManut === dateStr)
  }

  const getDayStatus = (date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const hojeStr = getHojeAzores()
    const list = manutencoes.filter(m => m.data === dateStr)
    const executadas = list.filter(m => m.status === 'concluida').length
    const pendentesList = list.filter(m => m.status === 'pendente' || m.status === 'agendada')
    const proximas = pendentesList.filter(m => dateStr >= hojeStr).length
    const atrasoManut = pendentesList.filter(m => dateStr < hojeStr).length
    const atrasoMaq = (dateStr < hojeStr) ? maquinas.filter(e => e.proximaManut === dateStr).length : 0
    const atraso = atrasoManut + atrasoMaq
    return { executadas, proximas, atraso }
  }

  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const days = isMobile
    ? Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
    : (() => {
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(monthStart)
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
        const arr = []
        let day = calendarStart
        while (day <= calendarEnd) {
          arr.push(day)
          day = addDays(day, 1)
        }
        return arr
      })()

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>Calendário</h1>
          <p className="page-sub">{isMobile ? 'Semana atual' : 'Visualização mensal das manutenções planeadas'}</p>
        </div>
        <div className="calendar-nav">
          {isMobile ? (
            <>
              <button className="secondary icon-btn" onClick={() => setWeekStart(ws => subWeeks(ws, 1))} aria-label="Semana anterior">
                <ChevronLeft size={20} />
              </button>
              <h2 className="calendar-title">
                {format(weekStart, 'd MMM', { locale: pt })} – {format(addDays(weekStart, 6), 'd MMM yyyy', { locale: pt })}
              </h2>
              <button className="secondary icon-btn" onClick={() => setWeekStart(ws => addWeeks(ws, 1))} aria-label="Semana seguinte">
                <ChevronRight size={20} />
              </button>
            </>
          ) : (
            <>
              <button className="secondary icon-btn" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} aria-label="Mês anterior">
                <ChevronLeft size={20} />
              </button>
              <h2 className="calendar-title">{format(currentMonth, 'MMMM yyyy', { locale: pt })}</h2>
              <button className="secondary icon-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} aria-label="Mês seguinte">
                <ChevronRight size={20} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className={`calendar-card card ${isMobile ? 'calendar-week-view' : ''}`}>
        <div className="calendar-header">
          {weekDays.map(d => (
            <div key={d} className="calendar-weekday">{d}</div>
          ))}
        </div>
        <div className="calendar-grid">
          {days.map(d => {
            const manuts = getManutencoesForDay(d)
            const maqs = getMaquinasForDay(d)
            const status = getDayStatus(d)
            const statusClass = status.atraso > 0 ? 'cal-status-red' : status.proximas > 0 ? 'cal-status-orange' : status.executadas > 0 ? 'cal-status-green' : ''
            const isCurrentMonth = isMobile ? true : isSameMonth(d, currentMonth)
            const isToday = isSameDay(d, new Date())
            return (
              <div
                key={d.toISOString()}
                className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${statusClass}`}
              >
                <span className="day-number">{format(d, 'd')}</span>
                <div className="day-events">
                  {manuts.map(m => {
                    const maq = maquinas.find(e => e.id === m.maquinaId)
                    const sub = maq ? getSubcategoria(maq.subcategoriaId) : null
                    const desc = maq ? `${sub?.nome || ''} ${maq.marca}`.trim() : ''
                    return <div key={m.id} className="event event-manut" title={desc}>{desc?.slice(0, 12)}…</div>
                  })}
                  {maqs.filter(e => !manuts.some(m => m.maquinaId === e.id)).map(e => {
                    const sub = getSubcategoria(e.subcategoriaId)
                    const desc = `${sub?.nome || ''} ${e.marca}`.trim()
                    return <div key={e.id} className="event event-previsto" title={desc}>{desc?.slice(0, 12)}…</div>
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="calendar-legend">
        <span><span className="dot dot-green"></span> Executadas</span>
        <span><span className="dot dot-orange"></span> Próximas</span>
        <span><span className="dot dot-red"></span> Em atraso</span>
      </div>
    </div>
  )
}
