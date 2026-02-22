/**
 * Utilitários de data/hora no fuso horário dos Açores (Ponta Delgada).
 * Todas as datas e timestamps da aplicação devem ser exibidos e calculados
 * no fuso Atlantic/Azores.
 */
export const TZ_AZORES = 'Atlantic/Azores'

const optsBase = { timeZone: TZ_AZORES }

/**
 * Hoje no fuso dos Açores (yyyy-MM-dd) — para comparações e storage de datas.
 */
export function getHojeAzores() {
  return new Date().toLocaleDateString('en-CA', { ...optsBase, year: 'numeric', month: '2-digit', day: '2-digit' })
}

/**
 * Momento actual em ISO (UTC) — para gravar timestamps.
 * O instante é universal; a exibição usa sempre Atlantic/Azores.
 */
export function nowISO() {
  return new Date().toISOString()
}

/**
 * Formata data e hora completas no fuso Açores.
 * Ex: "12 de fevereiro de 2026 às 14:30"
 */
export function formatDataHoraAzores(dateOrISO) {
  const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO)
  return d.toLocaleString('pt-PT', {
    ...optsBase,
    dateStyle: 'long',
    timeStyle: 'short',
  })
}

/**
 * Formata data e hora curtas no fuso Açores.
 * Ex: "12 fev 2026, 14:30"
 */
export function formatDataHoraCurtaAzores(dateOrISO) {
  const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO)
  const parts = d.toLocaleString('pt-PT', {
    ...optsBase,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).split(', ')
  return parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : parts[0]
}

/**
 * Formata apenas a data no fuso Açores.
 * Ex: "12 fev 2026" ou "12 de fevereiro de 2026"
 */
export function formatDataAzores(dateOrISO, long = false) {
  const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO)
  return d.toLocaleDateString('pt-PT', {
    ...optsBase,
    day: 'numeric',
    month: long ? 'long' : 'short',
    year: 'numeric',
  })
}

/**
 * Formata data no formato yyyy-MM-dd no fuso Açores.
 */
export function formatISODateAzores(dateOrISO) {
  const d = dateOrISO instanceof Date ? dateOrISO : new Date(dateOrISO)
  return d.toLocaleDateString('en-CA', { ...optsBase, year: 'numeric', month: '2-digit', day: '2-digit' })
}
