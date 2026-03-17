import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { ROLES } from '../config/users'

/**
 * Hook que retorna permissões baseadas no papel do utilizador.
 *
 * Admin: CRUD completo em Clientes, Categorias, Equipamentos, Manutenções, Agendar, Calendário.
 *
 * ATecnica (permissoes limitadas):
 * - NÃO pode editar nem eliminar Clientes
 * - NÃO pode editar nem eliminar manutenções já realizadas e assinadas pelo cliente
 *
 * Ninguém pode eliminar manutenções/reparações com relatório assinado pelo cliente.
 */
export function usePermissions() {
  const { user } = useAuth()
  const { getRelatorioByManutencao, getRelatorioByReparacao } = useData()

  return useMemo(() => {
    const isAdmin = user?.role === ROLES.ADMIN

    const canDelete = isAdmin

    const canEditCliente = isAdmin
    const canAddCliente = isAdmin

    const canEditManutencao = (manutencaoId) => {
      if (isAdmin) return true
      const relatorio = getRelatorioByManutencao(manutencaoId)
      return !relatorio?.assinadoPeloCliente
    }

    const isManutencaoAssinada = (manutencaoId) => {
      const relatorio = getRelatorioByManutencao(manutencaoId)
      return !!relatorio?.assinadoPeloCliente
    }

    /** Admin pode eliminar qualquer manutenção (incluindo assinada) */
    const canDeleteManutencao = (_manutencaoId) => isAdmin

    /** Bloqueia eliminação de reparação com relatório assinado */
    const canDeleteReparacao = (reparacaoId) => {
      if (!isAdmin) return false
      const relatorio = getRelatorioByReparacao(reparacaoId)
      return !relatorio?.assinadoPeloCliente
    }

    return {
      canDelete,
      canEditCliente,
      canAddCliente,
      canEditManutencao,
      isManutencaoAssinada,
      canDeleteManutencao,
      canDeleteReparacao,
      isAdmin,
    }
  }, [user?.role, getRelatorioByManutencao, getRelatorioByReparacao])
}
