/**
 * Declaração de aceitação / compromisso do cliente — relatórios de manutenção e reparação.
 *
 * ## Modelo de relatório (extensibilidade)
 * - **Layout único:** mesma estrutura visual e ordem canónica de secções (PDF/HTML/UI).
 * - **Texto da declaração:** camadas — (1) texto canónico por família legal (`getDeclaracaoCliente`);
 *   (2) override opcional na categoria (`declaracaoClienteDepois` na BD), sufixo após «na {serviço} »;
 *   (3) resolução única em `resolveDeclaracaoCliente` / `resolveDeclaracaoClienteForMaquina`.
 * - **Email/PDF servidor:** o browser envia `declaracao_texto` já resolvido → PHP não duplica regras.
 * - **Secções condicionais (futuro):** `getRelatorioModuloFlagsForCategoria`.
 *
 * Variantes canónicas (quando não há override na categoria):
 * - **elevadores:** EN 1493:2022, Dir. Máquinas 2006/42/CE, Reg. (UE) 2023/1230 (quando aplicável), DL 50/2005.
 * - **compressores:** Dir. Máquinas + DL 50/2005; PED 2014/68/UE + enquadramento nacional (DL 32/2015, …).
 * - **outros:** texto genérico.
 * - **reparação:** para `tipo === 'reparacao'`, blocos próprios (intervenção corretiva / conservação de relatórios de assistência), não o texto de manutenção periódica.
 */

/** @typedef {'elevadores'|'compressores'|'outros'} DeclaracaoLegislacaoId */

/** Lista canónica — validação de payloads (ex.: email → PHP). */
export const RELATORIO_DECLARACAO_LEGISLACAO_IDS = /** @type {const} */ (['elevadores', 'compressores', 'outros'])

const TEXTO_BASE_ANTES = 'Declaro que li e concordo com o que foi relatado pelo técnico na'

const TEXTO_BASE_DEPOIS_ELEVADORES =
  'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos de todas as manutenções realizadas, de acordo com o manual do fabricante, bem como a preservar toda a documentação exigível para o equipamento (Manual de Utilizador e Declaração de Conformidade CE), conservando os relatórios de manutenções preventivas realizadas pelo fornecedor NAVEL pelo período mínimo de dois anos, no estrito cumprimento da legislação em vigor, nomeadamente: Norma Europeia EN 1493:2022, Diretiva Máquinas 2006/42/CE (e Regulamento (UE) 2023/1230, quando aplicável) e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho.'

const TEXTO_BASE_DEPOIS_COMPRESSORES =
  'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos das manutenções e intervenções realizadas, de acordo com as recomendações e manual do fabricante, bem como a preservar a documentação técnica pertinente (manuais, instruções e Declaração de Conformidade CE quando aplicável), conservando os relatórios de manutenções e assistência técnica realizados pelo fornecedor NAVEL pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, no estrito cumprimento da legislação em vigor, nomeadamente: Diretiva Máquinas 2006/42/CE e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho, e no que respeita a equipamento sob pressão e instalações de ar comprimido, a Diretiva 2014/68/UE relativa aos equipamentos sob pressão e o respectivo enquadramento nacional (nomeadamente o Decreto-Lei n.º 32/2015, de 4 de março, e legislação complementar aplicável aos equipamentos sob pressão).'

const TEXTO_BASE_DEPOIS_OUTROS =
  'do equipamento e que obtive todas as informações de manuseamento seguro do mesmo, comprometendo-me a manter registos das manutenções e intervenções realizadas, de acordo com as recomendações e manual do fabricante, bem como a preservar a documentação técnica pertinente ao equipamento (manuais, instruções e certificados quando aplicáveis), conservando os relatórios de manutenções e assistência técnica realizados pelo fornecedor NAVEL pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, em conformidade com a legislação e normas aplicáveis ao mesmo e com as regras de segurança e saúde no trabalho.'

/** Textos canónicos para «… na reparação …» — focam intervenção corretiva / assistência, não manutenção periódica. */
const TEXTO_REPARACAO_DEPOIS_ELEVADORES =
  'do equipamento relativamente à intervenção de reparação e assistência técnica realizada, que declarei compreender, e que obtive as informações necessárias ao manuseamento seguro do equipamento após a intervenção, comprometendo-me a conservar este relatório e a documentação técnica exigível (nomeadamente Manual de Utilizador e Declaração de Conformidade CE) pelo período mínimo de dois anos ou pelo prazo aplicável, no estrito cumprimento da legislação em vigor, nomeadamente: Norma Europeia EN 1493:2022, Diretiva Máquinas 2006/42/CE (e Regulamento (UE) 2023/1230, quando aplicável) e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho.'

const TEXTO_REPARACAO_DEPOIS_COMPRESSORES =
  'do equipamento relativamente à intervenção de reparação e assistência técnica realizada, que declarei compreender, e que obtive as informações necessárias ao manuseamento seguro do equipamento após a intervenção, comprometendo-me a conservar este e demais relatórios de intervenção realizados pelo fornecedor NAVEL e a documentação técnica pertinente (manuais, instruções e Declaração de Conformidade CE quando aplicável) pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, no estrito cumprimento da legislação em vigor, nomeadamente: Diretiva Máquinas 2006/42/CE e Decreto-Lei n.º 50/2005, relativo às prescrições mínimas de segurança e saúde para a utilização de equipamentos de trabalho, e no que respeita a equipamento sob pressão e instalações de ar comprimido, a Diretiva 2014/68/UE relativa aos equipamentos sob pressão e o respectivo enquadramento nacional (nomeadamente o Decreto-Lei n.º 32/2015, de 4 de março, e legislação complementar aplicável aos equipamentos sob pressão).'

const TEXTO_REPARACAO_DEPOIS_OUTROS =
  'do equipamento relativamente à intervenção de reparação e assistência técnica realizada, que declarei compreender, e que obtive as informações necessárias ao manuseamento seguro do equipamento após a intervenção, comprometendo-me a conservar este e demais relatórios de intervenção realizados pelo fornecedor NAVEL e a documentação técnica pertinente ao equipamento (manuais, instruções e certificados quando aplicáveis) pelo período mínimo de dois anos ou pelo prazo adequado à actividade e ao tipo de equipamento, em conformidade com a legislação e normas aplicáveis ao mesmo e com as regras de segurança e saúde no trabalho.'

const TIPO_LABEL = {
  montagem:  'montagem',
  periodica: 'manutenção',
  reparacao: 'reparação',
}

const DEPOIS_POR_VARIANTE = {
  elevadores: TEXTO_BASE_DEPOIS_ELEVADORES,
  compressores: TEXTO_BASE_DEPOIS_COMPRESSORES,
  outros: TEXTO_BASE_DEPOIS_OUTROS,
}

const DEPOIS_REPARACAO_POR_VARIANTE = {
  elevadores: TEXTO_REPARACAO_DEPOIS_ELEVADORES,
  compressores: TEXTO_REPARACAO_DEPOIS_COMPRESSORES,
  outros: TEXTO_REPARACAO_DEPOIS_OUTROS,
}

/**
 * @param {string} [nomeCategoria]
 * @returns {DeclaracaoLegislacaoId}
 */
export function declaracaoLegislacaoVariantFromCategoriaNome(nomeCategoria) {
  const n = String(nomeCategoria ?? '').toLowerCase()
  if (n.includes('levador')) return 'elevadores'
  if (n.includes('compressor')) return 'compressores'
  return 'outros'
}

/**
 * Sufixo canónico (parte após «na manutenção/montagem/reparação ») para pré-visualização / botão «Repor» no admin.
 * @param {string} [nomeCategoria]
 */
export function getCanonicalDeclaracaoDepoisSuffix(nomeCategoria) {
  const v = declaracaoLegislacaoVariantFromCategoriaNome(nomeCategoria)
  const key = v in DEPOIS_POR_VARIANTE ? v : 'outros'
  return DEPOIS_POR_VARIANTE[key]
}

/**
 * Categoria da máquina (ficha) via subcategoria.
 * @param {object|null|undefined} maquina
 * @param {(id: string) => object|undefined} getSubcategoria
 * @param {(id: string) => object|undefined} getCategoria
 * @returns {object|null}
 */
export function getCategoriaFromMaquina(maquina, getSubcategoria, getCategoria) {
  if (!maquina?.subcategoriaId || typeof getSubcategoria !== 'function' || typeof getCategoria !== 'function') {
    return null
  }
  const sub = getSubcategoria(maquina.subcategoriaId)
  const cid = sub?.categoriaId ?? sub?.categoria_id
  if (!cid) return null
  return getCategoria(cid) ?? null
}

export function categoriaNomeFromMaquina(maquina, getSubcategoria, getCategoria) {
  const cat = getCategoriaFromMaquina(maquina, getSubcategoria, getCategoria)
  return cat?.nome ? String(cat.nome) : ''
}

/**
 * Texto personalizado da declaração (sufixo) definido na categoria, se existir.
 * @param {object|null|undefined} maquina
 */
export function declaracaoClienteDepoisFromMaquina(maquina, getSubcategoria, getCategoria) {
  const cat = getCategoriaFromMaquina(maquina, getSubcategoria, getCategoria)
  if (!cat) return ''
  const raw = cat.declaracaoClienteDepois ?? cat.declaracao_cliente_depois
  return String(raw ?? '').trim()
}

export function getRelatorioModuloFlagsForCategoria(_nomeCategoria) {
  return {
    checklist: true,
    fotos: true,
    consumiveisOpcional: true,
    declaracao: true,
    proximasManutencoes: true,
    assinaturas: true,
  }
}

/**
 * Texto canónico completo (sem override de categoria).
 * @param {'montagem'|'periodica'|'reparacao'} tipo
 * @param {DeclaracaoLegislacaoId} [legislacaoVariante='outros']
 */
export function getDeclaracaoCliente(tipo, legislacaoVariante = 'outros') {
  const label = TIPO_LABEL[tipo] || 'manutenção'
  const key = legislacaoVariante in DEPOIS_POR_VARIANTE ? legislacaoVariante : 'outros'
  const depois =
    tipo === 'reparacao'
      ? DEPOIS_REPARACAO_POR_VARIANTE[key] || DEPOIS_REPARACAO_POR_VARIANTE.outros
      : DEPOIS_POR_VARIANTE[key]
  return `${TEXTO_BASE_ANTES} ${label} ${depois}`
}

/**
 * Texto final da declaração: override por categoria (sufixo) ou canónico.
 * @param {'montagem'|'periodica'|'reparacao'} tipo
 * @param {string} nomeCategoria
 * @param {string|null|undefined} declaracaoClienteDepois — começar tipicamente por «do equipamento…»; vazio = canónico
 */
export function resolveDeclaracaoCliente(tipo, nomeCategoria, declaracaoClienteDepois) {
  const label = TIPO_LABEL[tipo] || 'manutenção'
  const custom = String(declaracaoClienteDepois ?? '').trim()
  if (custom) {
    return `${TEXTO_BASE_ANTES} ${label} ${custom}`
  }
  const variant = declaracaoLegislacaoVariantFromCategoriaNome(nomeCategoria)
  return getDeclaracaoCliente(tipo, variant)
}

export function resolveDeclaracaoClienteForMaquina(tipo, maquina, getSubcategoria, getCategoria) {
  const nome = categoriaNomeFromMaquina(maquina, getSubcategoria, getCategoria)
  const depois = declaracaoClienteDepoisFromMaquina(maquina, getSubcategoria, getCategoria)
  return resolveDeclaracaoCliente(tipo, nome, depois)
}

/** Fallback genérico (manutenção periódica, variante «outros») */
export const DECLARACAO_CLIENTE = getDeclaracaoCliente('periodica', 'outros')
