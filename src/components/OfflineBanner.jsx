/**
 * OfflineBanner — Indicador de estado de ligação e sincronização.
 *
 * Mostra:
 *  • Offline sem pendentes  → aviso amarelo com data/hora do cache
 *  • Offline com pendentes  → aviso laranja com contagem
 *  • A sincronizar          → azul com spinner
 *  • Online (limpo)         → oculto
 */
import { useState, useEffect } from 'react'
import { useData } from '../context/DataContext'
import { cacheTimestamp } from '../services/localCache'
import { WifiOff, RefreshCw, CloudOff } from 'lucide-react'
import './OfflineBanner.css'

export default function OfflineBanner() {
  const { isOnline, syncPending, processSync } = useData()
  const [syncing,   setSyncing]   = useState(false)
  const [cacheDate, setCacheDate] = useState(null)
  const [visible,   setVisible]   = useState(false)

  // Actualizar data do cache e visibilidade
  useEffect(() => {
    if (!isOnline) {
      setCacheDate(cacheTimestamp())
      setVisible(true)
    } else if (syncPending > 0) {
      setVisible(true)
    } else {
      // Esconder com pequeno delay para dar feedback visual ao sincronizar
      const t = setTimeout(() => setVisible(false), 2000)
      return () => clearTimeout(t)
    }
  }, [isOnline, syncPending])

  // Iniciar sync manual
  const handleSync = async () => {
    if (syncing || !isOnline) return
    setSyncing(true)
    await processSync()
    setSyncing(false)
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

  // Estado: online + syncing
  if (isOnline && syncing) {
    return (
      <div className="offline-banner offline-banner--syncing" role="status" aria-live="polite">
        <RefreshCw size={15} className="offline-banner__spin" />
        <span>A sincronizar operações pendentes…</span>
      </div>
    )
  }

  // Estado: online + pendentes (não está a sincronizar)
  if (isOnline && syncPending > 0) {
    return (
      <div className="offline-banner offline-banner--pending" role="status" aria-live="polite">
        <RefreshCw size={15} />
        <span>{syncPending} operação{syncPending !== 1 ? 'ões' : ''} aguardam envio</span>
        <button
          type="button"
          className="offline-banner__btn"
          onClick={handleSync}
          disabled={syncing}
        >
          Sincronizar
        </button>
      </div>
    )
  }

  // Estado: offline com pendentes
  if (!isOnline && syncPending > 0) {
    return (
      <div className="offline-banner offline-banner--offline-pending" role="alert" aria-live="assertive">
        <WifiOff size={15} />
        <span>Sem ligação · {syncPending} operação{syncPending !== 1 ? 'ões' : ''} aguardam sincronização</span>
      </div>
    )
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
