/**
 * Contador único de horas na UX: leitura acumulada no equipamento (compressores / contador).
 * Na BD mantemos `horas_servico_*` e `horas_totais_*` espelhados na gravação para compatibilidade.
 */

/** Inteiro ≥0 a partir de um valor bruto, ou null. */
function parseHorasNumeroBruto(raw) {
  if (raw == null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

/** @param {object|null|undefined} maquina */
export function horasContadorNaFicha(maquina) {
  if (!maquina) return null
  const hs = parseHorasNumeroBruto(maquina.horasServicoAcumuladas ?? maquina.horas_servico_acumuladas)
  if (hs != null) return hs
  const ht = parseHorasNumeroBruto(maquina.horasTotaisAcumuladas ?? maquina.horas_totais_acumuladas)
  if (ht != null) return ht
  return null
}

/** @param {object|null|undefined} manutencao */
export function horasContadorNaManutencao(manutencao) {
  if (!manutencao) return null
  const hs = parseHorasNumeroBruto(manutencao.horasServico ?? manutencao.horas_servico)
  if (hs != null) return hs
  const ht = parseHorasNumeroBruto(manutencao.horasTotais ?? manutencao.horas_totais)
  if (ht != null) return ht
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
 * Valor único para relatório HTML/PDF:
 * snapshot gravado no relatório → manutenção → formulário em curso → ficha do equipamento.
 * @param {object|null|undefined} relatorio — opcional; usa `horasLeituraContador` quando existir (BD: horas_leitura_contador).
 */
export function horasContadorParaRelatorio(maquina, manutencao, form, relatorio = null) {
  const snap = parseHorasNumeroBruto(
    relatorio?.horasLeituraContador ?? relatorio?.horas_leitura_contador,
  )
  if (snap != null) return snap
  const m = horasContadorNaManutencao(manutencao)
  if (m != null) return m
  const f = parseHorasContadorForm(form?.horasServico)
  if (f != null) return f
  return horasContadorNaFicha(maquina)
}
