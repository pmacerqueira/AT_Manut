import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/users'
import { isTecnicoHorarioRestritoNow, TECNICO_HORARIO_MSG_SESSAO } from '../utils/tecnicoHorarioRestrito'

/**
 * Se o perfil técnico estiver autenticado e o relógio (config em tecnicoHorarioRestrito.js)
 * entrar num período restrito, dispara o mesmo fluxo que um 403 da API.
 */
export default function TecnicoHorarioGuard({ children }) {
  const { user } = useAuth()
  const role = user?.role

  useEffect(() => {
    if (role !== ROLES.TECNICO) return undefined

    const tick = () => {
      if (isTecnicoHorarioRestritoNow()) {
        window.dispatchEvent(
          new CustomEvent('atm:tecnico-horario-restrito', { detail: { message: TECNICO_HORARIO_MSG_SESSAO } }),
        )
      }
    }
    tick()
    const id = setInterval(tick, 60_000)
    return () => clearInterval(id)
  }, [role])

  return children
}
