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
 */
export function usePermissions() {
  const { user } = useAuth()
  const { getRelatorioByManutencao } = useData()

  return useMemo(() => {
    const isAdmin = user?.role === ROLES.ADMIN

    const canDelete = isAdmin

    /** Admin: sim. ATecnica: não. */
    const canEditCliente = isAdmin
    const canAddCliente = isAdmin

    /** Admin: pode editar qualquer. ATecnica: apenas se relatório NÃO estiver assinado. */
    const canEditManutencao = (manutencaoId) => {
      if (isAdmin) return true
      const relatorio = getRelatorioByManutencao(manutencaoId)
      return !relatorio?.assinadoPeloCliente
    }

    const isManutencaoAssinada = (manutencaoId) => {
      const relatorio = getRelatorioByManutencao(manutencaoId)
      return !!relatorio?.assinadoPeloCliente
    }

    return {
      canDelete,
      canEditCliente,
      canAddCliente,
      canEditManutencao,
      isManutencaoAssinada,
      isAdmin,
    }
  }, [user?.role, getRelatorioByManutencao])
}
