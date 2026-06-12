/**
 * Domínio de equipamentos — constantes e funções puras partilhadas.
 * Extraído do DataContext (v1.16.85) para legibilidade; o DataContext re-exporta
 * tudo isto, pelo que os imports existentes continuam válidos.
 */

export const INTERVALOS = {
  trimestral: { dias: 90, label: 'Trimestral' },
  semestral: { dias: 180, label: 'Semestral' },
  anual: { dias: 365, label: 'Anual' },
}

// Subcategorias com contador de horas (compressores e geradores — elevadores não usam)
export const SUBCATEGORIAS_COM_CONTADOR_HORAS = ['sub5', 'sub6', 'sub7', 'sub10', 'sub11', 'sub14', 'sub15', 'sub16']

// Compressores (categoria) — vários tipos
export const SUBCATEGORIAS_COMPRESSOR = ['sub5', 'sub6', 'sub10', 'sub11', 'sub14', 'sub15']

/** Parafuso e parafuso com secador — aqui podem aplicar-se planos por fases (A/B/C/D, etc.). */
export const SUBCATEGORIAS_COMPRESSOR_PARAFUSO = ['sub5', 'sub14']

/** Valores de `planoManutencaoCompressor` (expandir quando houver planos Fini, LaPadana, …). */
export const PLANO_MANUT_COMPRESSOR_NONE = ''
export const PLANO_MANUT_COMPRESSOR_KAESER_ABCD = 'kaeser_abcd'

export const OPCOES_PLANO_MANUT_COMPRESSOR_PARAFUSO = [
  { value: PLANO_MANUT_COMPRESSOR_NONE, label: 'Sem plano por fases (manutenção periódica standard)' },
  { value: PLANO_MANUT_COMPRESSOR_KAESER_ABCD, label: 'KAESER — Plano A/B/C/D (consumíveis por fase · importação PDF)' },
]

// Marcas habituais por tipo de equipamento (para sugestão no formulário de máquina)
export const MARCAS_COMPRESSOR = ['KAESER', 'Fini', 'ECF', 'IES', 'LaPadana']
export const MARCAS_ELEVADOR   = ['Cascos', 'Ravaglioli', 'Space', 'Kroftools', 'TwinBusch', 'Sunshine', 'Werther', 'Velyen']

/** Indica se uma máquina é da marca KAESER (relatório e template de consumíveis específicos). */
export const isKaeserMarca = (marca) => (marca ?? '').toLowerCase() === 'kaeser'

/**
 * Compressor de parafuso (± secador) com plano KAESER A/B/C/D activo — ciclo, `posicaoKaeser`,
 * tabs A/B/C/D no plano de peças, fluxo no wizard e relatório dedicado.
 * Legado: sem `planoManutencaoCompressor` na BD, mantém-se se for KAESER com `posicaoKaeser` definida.
 */
export function isKaeserAbcdMaquina(maq) {
  if (!maq) return false
  if (!SUBCATEGORIAS_COMPRESSOR_PARAFUSO.includes(maq.subcategoriaId)) return false
  const plano = maq.planoManutencaoCompressor ?? maq.plano_manutencao_compressor ?? ''
  if (plano === PLANO_MANUT_COMPRESSOR_KAESER_ABCD) return true
  if (!plano && maq.posicaoKaeser != null && isKaeserMarca(maq.marca)) return true
  return false
}

// Intervalos de manutenção KAESER (horas de serviço de referência)
export const INTERVALOS_KAESER = {
  A: { horas: 3000,  label: 'Tipo A — 3.000h / 1 ano'  },
  B: { horas: 6000,  label: 'Tipo B — 6.000h / 2 anos' },
  C: { horas: 12000, label: 'Tipo C — 12.000h / 4 anos'},
  D: { horas: 36000, label: 'Tipo D — 36.000h / 12 anos'},
}

// Tipos de documentação técnica por máquina (cumprimento legal obrigatório)
export const TIPOS_DOCUMENTO = [
  { id: 'plano_manutencao', label: 'Plano de manutenção (PDF)' },
  { id: 'manual_utilizador', label: 'Manual do Utilizador' },
  { id: 'declaracao_conformidade_ce', label: 'Declaração de Conformidade CE' },
  { id: 'manual_manutencao', label: 'Manual de Manutenção' },
  { id: 'lista_pecas', label: 'Lista de peças' },
  { id: 'outros', label: 'Outros' },
]
