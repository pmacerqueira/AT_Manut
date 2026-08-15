/**
 * Assinantes por secção de equipamento (ex.: ANTERO REGO — Mecânica vs Colisão).
 */
import { normEntityId } from '../utils/frotaReportHelpers.js'

/** NIF ANTERO REGO-CONS.AUTO I.V.LDA */
export const ANTERO_REGO_NIF = '512025860'

export const ASSINANTES_SECAO_ANTERO_REGO = [
  {
    secao: 'mecanica',
    keywords: ['mecanica', 'mecânica'],
    nomeAssinante: 'Fabio Cordeiro - MECANICA',
    label: 'Fábio Cordeiro — Mecânica',
    /** Relatório com assinatura histórica correcta (Abr/2026 ANTERO REGO). */
    relatorioRefAssinatura: '2026.MP.00059',
  },
  {
    secao: 'colisao',
    keywords: ['colisao', 'colisão'],
    nomeAssinante: 'Paulo Sousa - COLISAO',
    label: 'Paulo Sousa — Colisão',
    relatorioRefAssinatura: '2026.MP.00048',
  },
]

const CONFIG_POR_NIF = {
  [ANTERO_REGO_NIF]: ASSINANTES_SECAO_ANTERO_REGO,
}

export function normTexto(s) {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
}

/** Texto combinado da ficha do equipamento para detectar secção. */
export function textoEquipamentoParaSecao(maq) {
  return [maq?.marca, maq?.modelo, maq?.numeroSerie, maq?.observacoes, maq?.localizacao]
    .filter(Boolean)
    .join(' ')
}

export function getClienteAssinantesSecaoConfig(clienteNif) {
  const nif = normEntityId(clienteNif)
  return CONFIG_POR_NIF[nif] ?? null
}

/** Detecta secção (mecanica | colisao) a partir do rótulo do equipamento. */
export function detectarSecaoEquipamento(maq, config) {
  if (!maq || !config?.length) return null
  const texto = normTexto(textoEquipamentoParaSecao(maq))
  if (!texto) return null

  // Colisão antes de genéricos — evita falsos positivos
  for (const entry of config) {
    if (entry.secao === 'colisao') {
      if (entry.keywords.some(kw => texto.includes(normTexto(kw)))) return entry.secao
    }
  }
  for (const entry of config) {
    if (entry.secao !== 'colisao') {
      if (entry.keywords.some(kw => texto.includes(normTexto(kw)))) return entry.secao
    }
  }
  return null
}

function tsRelatorio(r) {
  return String(r?.dataAssinatura || r?.dataCriacao || '')
}

/** Última assinatura com nome **exactamente** igual ao canónico (evita cruzar pessoas). */
export function ultimaAssinaturaHistoricaExata(relatorios, nomeAssinanteAlvo) {
  if (!nomeAssinanteAlvo || !Array.isArray(relatorios)) return null
  const alvoNorm = normTexto(nomeAssinanteAlvo)
  let bestSig = null
  let bestTs = ''
  for (const r of relatorios) {
    if (!r?.assinaturaDigital || !r?.nomeAssinante) continue
    if (normTexto(r.nomeAssinante) !== alvoNorm) continue
    const ts = tsRelatorio(r)
    if (ts >= bestTs) {
      bestTs = ts
      bestSig = r.assinaturaDigital
    }
  }
  return bestSig
}

/** Assinatura canónica: relatório de referência → histórico exacto. */
export function assinaturaCanonicaAssinante(relatorios, entry) {
  if (!entry) return null
  if (entry.relatorioRefAssinatura) {
    const ref = relatorios.find(r => r.numeroRelatorio === entry.relatorioRefAssinatura)
    if (ref?.assinaturaDigital) return ref.assinaturaDigital
  }
  return ultimaAssinaturaHistoricaExata(relatorios, entry.nomeAssinante)
}

/** @deprecated Preferir ultimaAssinaturaHistoricaExata — mantido para compat. */
export function ultimaAssinaturaHistorica(relatorios, nomeAssinanteAlvo) {
  return ultimaAssinaturaHistoricaExata(relatorios, nomeAssinanteAlvo)
}

/**
 * Opções de assinante com assinatura histórica para um cliente multi-secção.
 */
export function buildOpcoesAssinanteSecao(config, relatorios) {
  return config.map(entry => ({
    secao: entry.secao,
    nomeAssinante: entry.nomeAssinante,
    label: entry.label || entry.nomeAssinante,
    assinaturaDigital: assinaturaCanonicaAssinante(relatorios, entry),
  }))
}

/**
 * Resolve assinante + assinatura para um equipamento.
 * Prioridade: relatório actual → secção detectada → contacto cliente.
 */
export function resolverAssinanteEquipamento({
  maq,
  clienteNif,
  relatorios = [],
  existingRel = null,
  nomeContactoCliente = '',
}) {
  const config = getClienteAssinantesSecaoConfig(clienteNif ?? maq?.clienteNif ?? maq?.clienteId)
  if (!config?.length || !maq) {
    return {
      multiSecao: false,
      opcoes: [],
      secaoDetectada: null,
      nomeAssinante: existingRel?.nomeAssinante || nomeContactoCliente || '',
      assinaturaDigital: existingRel?.assinaturaDigital || null,
    }
  }

  const opcoes = buildOpcoesAssinanteSecao(config, relatorios)
  const secaoDetectada = detectarSecaoEquipamento(maq, config)
  const entrySecao = secaoDetectada
    ? config.find(e => e.secao === secaoDetectada)
    : null

  if (existingRel?.nomeAssinante) {
    const entryMatch = config.find(e => normTexto(e.nomeAssinante) === normTexto(existingRel.nomeAssinante))
    const hist = existingRel.assinaturaDigital
      || assinaturaCanonicaAssinante(relatorios, entryMatch)
      || ultimaAssinaturaHistoricaExata(relatorios, existingRel.nomeAssinante)
    return {
      multiSecao: true,
      opcoes,
      secaoDetectada,
      nomeAssinante: existingRel.nomeAssinante,
      assinaturaDigital: hist,
    }
  }

  const nomeAuto = entrySecao?.nomeAssinante || nomeContactoCliente || opcoes[0]?.nomeAssinante || ''
  const assinaturaAuto = entrySecao
    ? assinaturaCanonicaAssinante(relatorios, entrySecao)
    : null

  return {
    multiSecao: true,
    opcoes,
    secaoDetectada,
    nomeAssinante: nomeAuto,
    assinaturaDigital: assinaturaAuto,
  }
}

export function findOpcaoAssinante(opcoes, nomeAssinante) {
  const alvo = normTexto(nomeAssinante)
  return opcoes.find(o => normTexto(o.nomeAssinante) === alvo) ?? null
}

/** Bloqueia gravação se assinante não corresponde à secção do equipamento. */
export function validarAssinanteSecaoEquipamento({ maq, clienteNif, nomeAssinante }) {
  const config = getClienteAssinantesSecaoConfig(clienteNif ?? maq?.clienteNif ?? maq?.clienteId)
  if (!config?.length || !maq || !nomeAssinante?.trim()) return null

  const secao = detectarSecaoEquipamento(maq, config)
  if (!secao) return null

  const entry = config.find(e => e.secao === secao)
  const esperado = entry?.nomeAssinante
  if (!esperado) return null

  const n = normTexto(nomeAssinante)
  const e = normTexto(esperado)
  if (n === e) return null

  const labelSecao = secao === 'colisao' ? 'Colisão' : 'Mecânica'
  if (secao === 'colisao' && (n.includes('fabio') || n.includes('mecanica'))) {
    return `Este elevador é da secção ${labelSecao}. O assinante deve ser «${esperado}».`
  }
  if (secao === 'mecanica' && (n.includes('paulo') || n.includes('colisao'))) {
    return `Este elevador é da secção ${labelSecao}. O assinante deve ser «${esperado}».`
  }
  return `Assinante não corresponde à secção ${labelSecao}. Use «${esperado}».`
}
