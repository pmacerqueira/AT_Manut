/**
 * Regras para blocos condicionais em relatórios (PDF, HTML, email).
 * Extensível: novas subcategorias com plano por série podem activar o mesmo bloco.
 */
import { isKaeserAbcdMaquina } from '../context/DataContext'

/**
 * Relatórios que devem incluir sempre a secção «Consumíveis e peças» do plano do fabricante,
 * mesmo quando a lista está vazia (transparência documental).
 * @param {object|null|undefined} maquina
 * @param {object|null|undefined} manutencao
 */
export function relatorioObrigaBlocoConsumiveisPlano(maquina, manutencao) {
  if (!maquina || manutencao?.tipo === 'montagem') return false
  return isKaeserAbcdMaquina(maquina)
}

/**
 * Equipamento com identificação alargada no PDF compacto (compressor KAESER A/B/C/D).
 */
export function relatorioIncluiResumoPlanoNoPdf(maquina, manutencao) {
  return relatorioObrigaBlocoConsumiveisPlano(maquina, manutencao)
}
