/**
 * Consumíveis «manutenção regular» na ficha do equipamento (compressor parafuso).
 * Usado no Plano de peças — separador Periódica (KAESER) para espelhar a ficha.
 */

export function normCodigoConsumivel(c) {
  return String(c ?? '').replace(/\s+/g, '').toLowerCase()
}

/** @param {Record<string, unknown> | null | undefined} maquina */
export function consumiveisRegularRowsFromMaquina(maquina) {
  if (!maquina) return []
  const rows = []
  const add = (ref, desc) => {
    const codigo = String(ref ?? '').trim()
    if (!codigo) return
    rows.push({
      id: `ficha-${desc}`,
      codigoArtigo: codigo,
      descricao: desc,
      quantidade: 1,
      unidade: 'PÇ',
      fromFicha: true,
    })
  }
  add(maquina.refKitManut3000h, 'Refª kit manutenção 3000h')
  add(maquina.refKitManut6000h, 'Refª kit manutenção 6000h')
  add(maquina.refCorreia, 'Refª correia')
  add(maquina.refFiltroOleo, 'Refª filtro de óleo')
  add(maquina.refFiltroSeparador, 'Refª filtro separador')
  add(maquina.refFiltroAr, 'Refª filtro do ar')
  return rows
}
