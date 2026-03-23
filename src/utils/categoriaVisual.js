import { declaracaoLegislacaoVariantFromCategoriaNome } from '../constants/relatorio'

/**
 * Tom visual na lista de manutenções — alinhado a `declaracaoLegislacaoVariantFromCategoriaNome`
 * (elevadores / compressores / outros) e, dentro de «outros», tons extra (geradores, pneus, lavagem).
 */
export function manutencoesCategoriaToneKey(categoriaNome) {
  const legislacao = declaracaoLegislacaoVariantFromCategoriaNome(categoriaNome)
  if (legislacao === 'elevadores') return 'elevadores'
  if (legislacao === 'compressores') return 'compressores'
  const n = String(categoriaNome || '').toLowerCase()
  if (/gerador/.test(n)) return 'geradores'
  if (/pneu|equilibrad|trocar pneus|trabalho em pneus/.test(n)) return 'pneus'
  if (/lavagem|lavado|istobal|rollover|túnel de lavagem|tunel de lavagem/.test(n)) return 'lavagem'
  return 'outros'
}

/** Classe partilhada por linhas da tabela desktop e cards mobile (.mc). */
export function manutencoesCategoriaClass(categoriaNome) {
  return `manut-cat-${manutencoesCategoriaToneKey(categoriaNome)}`
}
