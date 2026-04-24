/**
 * Botão para recarregar dados do servidor e recalcular manutenções periódicas futuras
 * (Dashboard, Manutenções — todos os perfis com sessão válida).
 */
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'

export default function AgendaCompletaRefreshButton({ className = '' }) {
  const { sincronizarAgendaCompleta } = useData()
  const { showToast } = useToast()
  const [busy, setBusy] = useState(false)

  const handle = async () => {
    const ok = window.confirm(
      'Sincronizar dados e recalcular a agenda?\n\n' +
        '• Recarrega equipamentos e manutenções a partir do servidor.\n' +
        '• Para cada equipamento com periodicidade, volta a gerar as manutenções periódicas futuras com base na última execução (ficha ou histórico).\n' +
        '• Actualiza a «próxima manutenção» em cada ficha quando necessário.\n' +
        '• Manutenções de montagem pendentes ou agendadas não são removidas.\n\n' +
        'Continuar?',
    )
    if (!ok) return
    setBusy(true)
    try {
      const r = await sincronizarAgendaCompleta()
      if (!r.ok) {
        if (r.reason === 'offline') showToast('Sem ligação. Ligue à Internet e tente de novo.', 'error', 5000)
        else if (r.reason === 'auth') showToast('Sessão expirada. Volte a entrar.', 'error', 5000)
        else if (r.reason === 'busy') showToast('Operação em curso…', 'warning', 3000)
        else showToast(r.error || 'Não foi possível concluir a sincronização.', 'error', 6000)
        return
      }
      showToast(
        `Agenda actualizada: ${r.recalculadas} equipamento(s) recalculados, ${r.removidas} linha(s) substituídas, ${r.criadas} nova(s) data(s), ${r.proximaAtualizadas} ficha(s) com «próxima» actualizada.`,
        'success',
        7000,
      )
    } catch (e) {
      showToast(e?.message || 'Erro inesperado.', 'error', 5000)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`secondary agenda-sync-btn ${className}`.trim()}
      onClick={handle}
      disabled={busy}
      title="Recarregar dados do servidor e recalcular manutenções periódicas futuras"
    >
      <RefreshCw size={18} className={busy ? 'atm-sync-spin' : ''} aria-hidden />
      {busy ? 'A sincronizar…' : 'Sincronizar agenda'}
    </button>
  )
}
