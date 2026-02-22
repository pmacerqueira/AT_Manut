/**
 * Utilitários de dias úteis — feriados Portugal (nacional) + Açores (regional) + Ponta Delgada (municipal).
 *
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  ACTUALIZAÇÃO AUTOMÁTICA — não é necessário alterar este ficheiro cada ano. ║
 * ║                                                                              ║
 * ║  Todos os feriados são calculados algoritmicamente para qualquer ano futuro: ║
 * ║  • Os feriados fixos usam `${ano}-MM-DD` e adaptam-se ao ano automaticamente.║
 * ║  • Os feriados móveis derivam da Páscoa, calculada pelo algoritmo de Butcher ║
 * ║    (válido para qualquer ano no calendário Gregoriano).                      ║
 * ║  • O feriado municipal de Ponta Delgada (Santo Cristo) é Páscoa + 36 dias,  ║
 * ║    igualmente calculado sem tabelas estáticas.                               ║
 * ║                                                                              ║
 * ║  A única situação que exige manutenção manual é uma alteração legislativa    ║
 * ║  (ex: criação ou supressão de feriado por diploma). Verificar em:           ║
 * ║  https://icalendario.pt/feriados/municipais/                                 ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 *
 * Feriados nacionais (Lei n.º 7/2009 e alterações, em vigor):
 *   fixos:  1/Jan, 25/Abr, 1/Mai, 10/Jun, 15/Ago, 5/Out, 1/Nov, 1/Dez, 8/Dez, 25/Dez
 *   moveis: Sexta-feira Santa, Domingo de Pascoa, Corpo de Deus
 *
 * Feriados regionais dos Acores:
 *   Terca-feira de Carnaval, Segunda-feira de Pascoa, 1/Jul (Autonomia Regional)
 *
 * Feriado municipal - Ponta Delgada:
 *   Segunda-feira das Festas do Senhor Santo Cristo dos Milagres (Pascoa + 36 dias)
 */

// ── Utilitários internos ──────────────────────────────────────────────────────

function _addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function _toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ── Páscoa (algoritmo Butcher — Gregoriano) ───────────────────────────────────

/**
 * Calcula o Domingo de Páscoa para um dado ano (calendário Gregoriano).
 * @param {number} ano
 * @returns {Date}
 */
export function calcularPascoa(ano) {
  const a = ano % 19
  const b = Math.floor(ano / 100)
  const c = ano % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m2 = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m2 + 114) / 31) // 3=Mar, 4=Abr
  const dia = ((h + l - 7 * m2 + 114) % 31) + 1
  return new Date(ano, mes - 1, dia)
}

// ── Feriados ──────────────────────────────────────────────────────────────────

/**
 * Devolve um Set<string> com todos os feriados do ano (nacionais PT + Açores).
 * @param {number} ano
 * @returns {Set<string>}
 */
export function getFeriadosAno(ano) {
  const pascoa = calcularPascoa(ano)
  return new Set([
    // ── Nacionais fixos ────────────────────────────────────────────────────
    `${ano}-01-01`, // Ano Novo
    `${ano}-04-25`, // Dia da Liberdade
    `${ano}-05-01`, // Dia do Trabalhador
    `${ano}-06-10`, // Dia de Portugal (Camões e das Comunidades)
    `${ano}-08-15`, // Assunção de Nossa Senhora
    `${ano}-10-05`, // Implantação da República
    `${ano}-11-01`, // Todos os Santos
    `${ano}-12-01`, // Restauração da Independência
    `${ano}-12-08`, // Imaculada Conceição
    `${ano}-12-25`, // Natal
    // ── Nacionais móveis (base Páscoa) ────────────────────────────────────
    _toISO(_addDays(pascoa, -2)),  // Sexta-feira Santa
    _toISO(pascoa),                // Domingo de Páscoa
    _toISO(_addDays(pascoa,  60)), // Corpo de Deus (Quinta-feira)
    // ── Regionais Açores ──────────────────────────────────────────────────
    _toISO(_addDays(pascoa, -47)), // Terça-feira de Carnaval (Mardi Gras)
    _toISO(_addDays(pascoa,   1)), // Segunda-feira de Páscoa
    `${ano}-07-01`,                // Dia dos Açores (Autonomia Regional)
    // ── Municipal — Ponta Delgada ─────────────────────────────────────────
    // Festas do Senhor Santo Cristo dos Milagres:
    // Segunda-feira após o 5.º Domingo depois da Páscoa = Páscoa + 36 dias
    // Fonte: icalendario.pt (verif. 2026=11Mai, 2027=3Mai, 2028=22Mai)
    _toISO(_addDays(pascoa, 36)),  // Feriado municipal de Ponta Delgada
  ])
}

/**
 * Constrói um Set com os feriados para todos os anos no intervalo [anoMin, anoMax].
 * @param {number} anoMin
 * @param {number} anoMax
 * @returns {Set<string>}
 */
export function buildFeriadosSet(anoMin, anoMax) {
  const set = new Set()
  for (let ano = anoMin; ano <= anoMax; ano++) {
    getFeriadosAno(ano).forEach(f => set.add(f))
  }
  return set
}

// ── Verificações ──────────────────────────────────────────────────────────────

/** Devolve true se a data for sábado ou domingo. */
export function isFimDeSemana(date) {
  const dow = date.getDay()
  return dow === 0 || dow === 6
}

/** Devolve true se a data for feriado (nacional PT ou regional Açores). */
export function isFeriado(date, feriadosSet) {
  return feriadosSet.has(_toISO(date))
}

/** Devolve true se a data for dia não útil (fim de semana ou feriado). */
export function isDiaNaoUtil(date, feriadosSet) {
  return isFimDeSemana(date) || isFeriado(date, feriadosSet)
}

// ── Lógica de agendamento ─────────────────────────────────────────────────────

/**
 * Avança `date` até ao próximo dia útil (inclusive).
 * Se já for dia útil, retorna sem alterar a data.
 * @param {Date}        date
 * @param {Set<string>} feriadosSet
 * @returns {Date}
 */
export function proximoDiaUtil(date, feriadosSet) {
  let d = new Date(date)
  d.setHours(12, 0, 0, 0) // normalizar para meio-dia evita problemas com DST
  while (isDiaNaoUtil(d, feriadosSet)) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

/**
 * Procura o próximo dia útil livre (sem manutenção existente) dentro de `janelasDias` dias.
 * Se não encontrar, devolve o primeiro dia útil do período com `conflito: true`.
 *
 * @param {Date}        dataAlvo     - data de partida (não tem de ser dia útil)
 * @param {Set<string>} feriadosSet
 * @param {Set<string>} diasOcupados - strings 'yyyy-MM-dd' com manutenções existentes
 * @param {number}      janelasDias  - largura da janela de procura (default 7)
 * @returns {{ data: Date, conflito: boolean }}
 */
export function encontrarDiaLivre(dataAlvo, feriadosSet, diasOcupados, janelasDias = 7) {
  const limite = new Date(dataAlvo)
  limite.setDate(limite.getDate() + janelasDias)

  let d = proximoDiaUtil(dataAlvo, feriadosSet)

  while (d <= limite) {
    if (!diasOcupados.has(_toISO(d))) {
      return { data: new Date(d), conflito: false }
    }
    d.setDate(d.getDate() + 1)
    d = proximoDiaUtil(d, feriadosSet)
  }

  // Nenhum dia livre na janela — devolve o primeiro dia útil com flag de conflito
  return { data: proximoDiaUtil(dataAlvo, feriadosSet), conflito: true }
}

/**
 * Procura o próximo dia útil absolutamente livre, sem limite de janela.
 * Usado como resolução de conflito quando o user escolhe "avançar para dia livre".
 * @param {Date}        dataAlvo
 * @param {Set<string>} feriadosSet
 * @param {Set<string>} diasOcupados
 * @returns {Date}
 */
export function proximoDiaUtilLivre(dataAlvo, feriadosSet, diasOcupados) {
  let d = proximoDiaUtil(dataAlvo, feriadosSet)
  while (diasOcupados.has(_toISO(d))) {
    d.setDate(d.getDate() + 1)
    d = proximoDiaUtil(d, feriadosSet)
  }
  return new Date(d)
}

// ── Distribuição de horários ──────────────────────────────────────────────────

/**
 * Distribui N serviços num dia de trabalho (09:00 → 17:00), espaçados equitativamente.
 * Devolve array de strings 'HH:MM'.
 * Exemplos:  n=1 → ['09:00']   n=2 → ['09:00','17:00']   n=4 → ['09:00','11:40','14:20','17:00']
 * @param {number} n
 * @returns {string[]}
 */
export function distribuirHorarios(n) {
  if (n <= 1) return ['09:00']
  const inicioMin = 9 * 60   // 09:00
  const fimMin    = 17 * 60  // 17:00
  const intervalo = Math.round((fimMin - inicioMin) / (n - 1))
  return Array.from({ length: n }, (_, i) => {
    const totalMin = inicioMin + i * intervalo
    const h = Math.floor(totalMin / 60)
    const m = totalMin % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  })
}

// ── Formatação amigável ───────────────────────────────────────────────────────

const DIAS_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']
const MESES_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

/**
 * Formata uma data no estilo "Terça-feira, 15 de Junho de 2026".
 * @param {Date|string} date
 * @returns {string}
 */
export function formatarDataPT(date) {
  const d = typeof date === 'string' ? new Date(date + 'T12:00:00') : new Date(date)
  return `${DIAS_PT[d.getDay()]}, ${d.getDate()} de ${MESES_PT[d.getMonth()]} de ${d.getFullYear()}`
}
