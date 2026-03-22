/**
 * Ciclo KAESER A/B/C/D e constantes de intervalo — módulo sem React para uso em utils e testes.
 * Manter alinhado com a documentação do plano de manutenção oficial.
 */

/** Passo de referência em horas de serviço para sugestões por Δh (e fallback por contador absoluto). */
export const KAESER_INTERVALO_HORAS_REF = 3000

/** Dias mínimos desde a última manutenção para considerar cumprida a janela anual (regra operacional Navel). */
export const KAESER_ANUAL_MIN_DIAS = 365

/** Se a sugestão dominante for por calendário mas Δh exceder este valor, mostrar aviso ao técnico. */
export const KAESER_DELTA_H_WARNING_ANUAL = 4500

/**
 * Sequência de manutenção KAESER (ciclo de 12 anos).
 * Posição 0=Ano1 (A), 1=Ano2 (B), …, 11=Ano12 (D).
 */
export const SEQUENCIA_KAESER = ['A', 'B', 'A', 'C', 'A', 'B', 'A', 'C', 'A', 'B', 'A', 'D']

export function tipoKaeserNaPosicao(posicao) {
  const pos = ((posicao ?? 0) % SEQUENCIA_KAESER.length + SEQUENCIA_KAESER.length) % SEQUENCIA_KAESER.length
  return SEQUENCIA_KAESER[pos]
}

export function proximaPosicaoKaeser(posicaoAtual) {
  return ((posicaoAtual ?? 0) + 1) % SEQUENCIA_KAESER.length
}

/**
 * Sugestão por contador absoluto de horas (fallback quando não há referência de última visita).
 */
export function tipoKaeserSugeridoPorHorasServico(horasServico) {
  const h = Math.max(0, Number(horasServico) || 0)
  const idx = Math.floor(h / KAESER_INTERVALO_HORAS_REF) % SEQUENCIA_KAESER.length
  return SEQUENCIA_KAESER[idx] || 'A'
}

export function descricaoCicloKaeser(posicao) {
  const pos = ((posicao ?? 0) % SEQUENCIA_KAESER.length + SEQUENCIA_KAESER.length) % SEQUENCIA_KAESER.length
  const tipo = SEQUENCIA_KAESER[pos]
  return `Tipo ${tipo} — Ano ${pos + 1} de 12`
}
