/**
 * Declaração de aceitação/compromisso do cliente — afixada no relatório e
 * apresentada ao cliente antes da assinatura digital.
 *
 * Legislação: EN 1493:2022, Dir. 2006/42/CE, Reg. (UE) 2023/1230, DL 50/2005
 *
 * O texto adapta-se ao tipo de serviço via getDeclaracaoCliente(tipo).
 * DECLARACAO_CLIENTE mantém-se como fallback genérico (manutenção).
 */

const TEXTO_BASE_ANTES = 'Declaro que li e concordo com o que foi relatado pelo técnico na'
const TEXTO_BASE_DEPOIS = 'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos de todas as manutenções realizadas, de acordo com o manual do fabricante, bem como a preservar toda a documentação exigível para o equipamento (Manual de Utilizador e Declaração de Conformidade CE), conservando os relatórios de manutenções preventivas realizadas pelo fornecedor NAVEL pelo período mínimo de dois anos, no estrito cumprimento da legislação em vigor, nomeadamente: Norma Europeia EN 1493:2022, Diretiva Máquinas 2006/42/CE (e Regulamento (UE) 2023/1230, quando aplicável) e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho.'

const TIPO_LABEL = {
  montagem:   'montagem',
  periodica:  'manutenção',
  reparacao:  'reparação',
}

/**
 * Retorna a declaração adaptada ao tipo de serviço.
 * @param {'montagem'|'periodica'|'reparacao'} tipo
 */
export function getDeclaracaoCliente(tipo) {
  const label = TIPO_LABEL[tipo] || 'manutenção'
  return `${TEXTO_BASE_ANTES} ${label} ${TEXTO_BASE_DEPOIS}`
}

/** Fallback genérico (manutenção) — retrocompatível com imports existentes */
export const DECLARACAO_CLIENTE = getDeclaracaoCliente('periodica')
