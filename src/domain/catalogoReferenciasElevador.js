/**
 * Referências mencionadas na reflexão, ainda por validar por uma pessoa.
 * referenciasCitaveisNoPdf() só devolve as marcadas validado: true.
 * O PDF e o email não chamam esta lista para imprimir normas.
 */
export const CATALOGO_REFERENCIAS_ELEVADOR = [
  { id: 'en-1493-2022', citacao: 'EN 1493:2022', validado: false },
  { id: 'en-1493-2020', citacao: 'EN 1493:2020', validado: false },
  { id: 'en-16625', citacao: 'EN 16625', validado: false },
  { id: 'reg-2023-1230', citacao: 'Regulamento (UE) 2023/1230', validado: false },
]

export function referenciasCitaveisNoPdf() {
  return CATALOGO_REFERENCIAS_ELEVADOR
    .filter(r => r.validado === true)
    .map(r => r.citacao)
}
