import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { ROLES } from '../config/users'

/**
 * Relatório registado como enviado ao cliente (email efectivo ou marcação manual «enviado»).
 * Enquanto isto for falso, utilizadores ATecnica podem editar manutenção/relatório concluído.
 */
export function isRelatorioEnviadoAoCliente(relatorio) {
  const e = relatorio?.enviadoParaCliente?.email
  return !!(e && String(e).trim())
}

/**
 * Hook que retorna permissões baseadas no papel do utilizador.
 *
 * Admin: CRUD completo em Clientes, Categorias, Equipamentos, Manutenções, Agendar, Calendário.
 *
 * ATecnica (permissoes limitadas):
 * - NÃO pode editar nem eliminar Clientes
 * - Pode editar manutenções concluídas até o relatório ser enviado ao cliente (email ou marcação manual);
 *   depois disso, só Admin edita.
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
      return !isRelatorioEnviadoAoCliente(relatorio)
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
