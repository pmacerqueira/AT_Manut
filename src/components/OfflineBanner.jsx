/**
 * OfflineBanner — Indicador de estado de ligação e sincronização.
 *
 * Mostra:
 *  • Offline sem pendentes  → aviso amarelo com data/hora do cache
 *  • Offline com pendentes  → aviso laranja com contagem
 *  • A sincronizar          → azul com spinner
 *  • Online (limpo)         → oculto
 */
import { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useData } from '../context/DataContext'
import { cacheTimestamp } from '../services/localCache'
import { getHojeAzores } from '../utils/datasAzores'
import { addDays } from 'date-fns'
import { CloudOff, CheckCircle2 } from 'lucide-react'
import './OfflineBanner.css'

const PREFETCH_DIAS = 5
const READY_DISPLAY_MS = 4000

export default function OfflineBanner() {
  const { isOnline, syncPending, processSync, manutencoes, maquinas, loading } = useData()
  const [syncing,   setSyncing]   = useState(false)
  const [cacheDate, setCacheDate] = useState(null)
  const [visible,   setVisible]   = useState(false)
  const [readyShown, setReadyShown] = useState(false)
  const [readyVisible, setReadyVisible] = useState(false)

  // M5: Pré-carregamento preditivo — calcular manutenções da semana
  const weekReadiness = useMemo(() => {
    if (loading) return null
    const hoje = getHojeAzores()
    const limite = addDays(new Date(hoje + 'T12:00:00'), PREFETCH_DIAS).toISOString().slice(0, 10)
    const pendentes = manutencoes.filter(
      mt => (mt.status === 'pendente' || mt.status === 'agendada') && mt.data >= hoje && mt.data <= limite
    )
    const comMaquina = pendentes.filter(mt => maquinas.some(m => m.id === mt.maquinaId))
    return { total: pendentes.length, prontas: comMaquina.length }
  }, [loading, manutencoes, maquinas])

  // Mostrar indicador de prontidão uma vez após carregar dados
  useEffect(() => {
    if (!loading && isOnline && weekReadiness && !readyShown && syncPending === 0) {
      setReadyShown(true)
      setReadyVisible(true)
      const t = setTimeout(() => setReadyVisible(false), READY_DISPLAY_MS)
      return () => clearTimeout(t)
    }
  }, [loading, isOnline, weekReadiness, readyShown, syncPending])

  // Actualizar data do cache e visibilidade
  useEffect(() => {
    if (!isOnline) {
      cacheTimestamp().then(setCacheDate)
      setVisible(true)
    } else if (syncPending > 0) {
      setVisible(true)
    } else {
      const t = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(t)
    }
  }, [isOnline, syncPending])

  // Iniciar sync manual
  const handleSync = async () => {
    if (syncing) return
    setSyncing(true)
    await processSync()
    setSyncing(false)
  }

  // M5: Indicador de prontidão da semana (mostrado brevemente ao carregar)
  const barraSync = syncPending > 0
    ? createPortal(
      <div className="sync-dados-bar" role="status" aria-live="polite">
        <div className="sync-dados-bar__text">
          <strong>Dados guardados neste telemóvel</strong>
          <span>
            {syncing
              ? 'A enviar ao servidor…'
              : `${syncPending} operação${syncPending !== 1 ? 'ões' : ''} por enviar`}
          </span>
        </div>
        <button
          type="button"
          className="sync-dados-bar__btn"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? 'A sincronizar…' : 'Sincronizar dados'}
        </button>
      </div>,
      document.body,
    )
    : null

  if (syncPending > 0) return barraSync

  if (readyVisible && isOnline && weekReadiness && syncPending === 0) {
    return (
      <div className="offline-banner offline-banner--ready" role="status" aria-live="polite">
        <CheckCircle2 size={15} />
        <span>
          {weekReadiness.total > 0
            ? `✓ ${weekReadiness.prontas} manutenção${weekReadiness.prontas !== 1 ? 'ões' : ''} pré-carregada${weekReadiness.prontas !== 1 ? 's' : ''} para os próximos ${PREFETCH_DIAS} dias`
            : '✓ Dados sincronizados — sem manutenções agendadas esta semana'}
        </span>
      </div>
    )
  }

  if (!visible) return null

  const formatDate = (d) => {
    if (!d) return ''
    return d.toLocaleString('pt-PT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Atlantic/Azores',
    })
  }

  // Estado: offline sem pendentes
  return (
    <div className="offline-banner offline-banner--offline" role="alert" aria-live="assertive">
      <CloudOff size={15} />
      <span>
        Sem ligação — dados guardados
        {cacheDate ? ` (${formatDate(cacheDate)})` : ''}
      </span>
    </div>
  )
}
