/**
 * Contador único de horas na UX: leitura acumulada no equipamento (compressores / contador).
 * Na BD mantemos `horas_servico_*` e `horas_totais_*` espelhados na gravação para compatibilidade.
 */

/** @param {object|null|undefined} maquina */
export function horasContadorNaFicha(maquina) {
  if (!maquina) return null
  const hs = maquina.horasServicoAcumuladas
  if (hs != null && hs !== '') {
    const n = Number(hs)
    return Number.isFinite(n) ? n : null
  }
  const ht = maquina.horasTotaisAcumuladas
  if (ht != null && ht !== '') {
    const n = Number(ht)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/** @param {object|null|undefined} manutencao */
export function horasContadorNaManutencao(manutencao) {
  if (!manutencao) return null
  if (manutencao.horasServico != null && manutencao.horasServico !== '') {
    const n = Number(manutencao.horasServico)
    return Number.isFinite(n) ? n : null
  }
  if (manutencao.horasTotais != null && manutencao.horasTotais !== '') {
    const n = Number(manutencao.horasTotais)
    return Number.isFinite(n) ? n : null
  }
  return null
}

/**
 * Valor inteiro ≥0 a partir do campo do formulário, ou null se vazio/ inválido.
 * @param {string|number} raw
 */
export function parseHorasContadorForm(raw) {
  const n = parseInt(String(raw ?? '').trim(), 10)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/**
 * Valor único para relatório HTML/PDF: leitura da intervenção (manutenção) → formulário → última ficha.
 */
export function horasContadorParaRelatorio(maquina, manutencao, form) {
  const m = horasContadorNaManutencao(manutencao)
  if (m != null) return m
  const f = parseHorasContadorForm(form?.horasServico)
  if (f != null) return f
  return horasContadorNaFicha(maquina)
}
