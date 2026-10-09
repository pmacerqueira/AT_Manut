import { useEffect, useState } from 'react'

/** Tempo que uma operação pode ficar "em envio" sem incomodar o utilizador. */
export const PENDENTES_GRACE_MS = 1500

/**
 * usePendentesEstaveis — versão "calma" de `syncPending` para a UI.
 *
 * Desde a v1.17.31 cada gravação entra primeiro na fila local e só depois segue
 * para o servidor; com boa ligação a fila fica a 1 durante algumas centenas de
 * milissegundos. Mostrar a barra «por enviar» nesse intervalo é só ruído
 * (barra vermelha a piscar no rodapé). Este hook:
 *  • devolve 0 imediatamente quando a fila esvazia;
 *  • devolve o valor imediatamente quando estamos offline (aí é informação útil);
 *  • online, só devolve > 0 se a fila continuar com itens após `PENDENTES_GRACE_MS`.
 */
export function usePendentesEstaveis(syncPending, isOnline, graceMs = PENDENTES_GRACE_MS) {
  const [estavel, setEstavel] = useState(() => (syncPending > 0 && !isOnline ? syncPending : 0))

  useEffect(() => {
    if (syncPending <= 0) { setEstavel(0); return undefined }
    if (!isOnline) { setEstavel(syncPending); return undefined }
    const t = setTimeout(() => setEstavel(syncPending), graceMs)
    return () => clearTimeout(t)
  }, [syncPending, isOnline, graceMs])

  return estavel
}
