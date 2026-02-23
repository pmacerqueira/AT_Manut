/**
 * mock-large.js — Dataset de performance para testes E2E AT_Manut
 *
 * ~180 registos realistas (Açores):
 *   20 clientes · 60 máquinas · 120 manutenções · 40 relatórios
 *
 * Uso:
 *   import { ML } from './mock-large.js'
 *   await setupApiMock(page, { customData: ML })
 *
 * Datas de referência: Fevereiro 2026.
 * Regras de isolamento:
 *   - Manutenções em atraso real: data < 2026-02-23
 *   - Manutenções futuras seguras: data >= 2026-05-01 (>60 dias — não activam modal de alertas)
 *   - Relatórios ligados a manutenções 'concluida'
 */

// ── Clientes (20) ─────────────────────────────────────────────────────────────

export const ML_CLIENTES = [
  { id: 'lc01', nif: '511000001', nome: 'Auto Ilha Verde Lda',          morada: 'Rua da Constituição, 45',    codigoPostal: '9500-112', localidade: 'Ponta Delgada',  telefone: '296281001', email: 'geral@autoilhaverde.pt' },
  { id: 'lc02', nif: '511000002', nome: 'Oficinas Faialense Lda',       morada: 'Av. 25 de Abril, 12',        codigoPostal: '9900-054', localidade: 'Horta',          telefone: '292292002', email: 'faialense@oficinas.pt' },
  { id: 'lc03', nif: '511000003', nome: 'Mecânica Terceirense SA',      morada: 'Rua de S. Pedro, 78',        codigoPostal: '9700-031', localidade: 'Angra do Heroísmo', telefone: '295215003', email: 'info@mecanicaterceirense.pt' },
  { id: 'lc04', nif: '511000004', nome: 'Automóveis Flores Unip.',      morada: 'Estrada do Porto, 3',        codigoPostal: '9960-011', localidade: 'Santa Cruz das Flores', telefone: '292590004', email: 'autoflores@mail.pt' },
  { id: 'lc05', nif: '511000005', nome: 'Graciosa Motors Lda',          morada: 'Rua do Município, 22',       codigoPostal: '9880-301', localidade: 'Santa Cruz da Graciosa', telefone: '295712005', email: 'graciosamotors@net.pt' },
  { id: 'lc06', nif: '511000006', nome: 'Reparações Corvo Unip.',       morada: 'Vila Nova do Corvo, s/n',    codigoPostal: '9980-001', localidade: 'Corvo',          telefone: '292596006', email: 'corvorepar@mail.pt' },
  { id: 'lc07', nif: '511000007', nome: 'São Jorge Auto SA',            morada: 'Rua Dr. Francisco Bettencourt, 5', codigoPostal: '9800-501', localidade: 'Velas', telefone: '295412007', email: 'sjauto@sjauto.pt' },
  { id: 'lc08', nif: '511000008', nome: 'Pico Elevadores Lda',          morada: 'Rua da Praça, 18',           codigoPostal: '9940-112', localidade: 'Madalena',       telefone: '292622008', email: 'pico.elevadores@pico.pt' },
  { id: 'lc09', nif: '511000009', nome: 'AçorLift Equipamentos SA',     morada: 'Parque Ind. de Ponta Delgada, Lote 12', codigoPostal: '9500-801', localidade: 'Ponta Delgada', telefone: '296205009', email: 'geral@acorlift.pt' },
  { id: 'lc10', nif: '511000010', nome: 'Ribeira Grande Serviços Lda',  morada: 'Av. do Atlântico, 67',       codigoPostal: '9600-050', localidade: 'Ribeira Grande',  telefone: '296472010', email: 'rgs@rgs.pt' },
  { id: 'lc11', nif: '511000011', nome: 'Nordeste Industrial Lda',      morada: 'Rua do Nordeste, 4',         codigoPostal: '9630-100', localidade: 'Nordeste',       telefone: '296488011', email: 'nordesteindustrial@mail.pt' },
  { id: 'lc12', nif: '511000012', nome: 'Vila do Porto Auto Unip.',     morada: 'Rua dos Açores, 9',          codigoPostal: '9580-510', localidade: 'Vila do Porto',  telefone: '296884012', email: 'vilaoportoauto@mail.pt' },
  { id: 'lc13', nif: '511000013', nome: 'Fenais da Luz Mecânica Lda',   morada: 'Estrada Fenais, 21',         codigoPostal: '9560-411', localidade: 'Fenais da Luz',  telefone: '296494013', email: 'fenaismecanica@pt.pt' },
  { id: 'lc14', nif: '511000014', nome: 'Lagoa Compressores SA',        morada: 'Rua da Lagoa, 33',           codigoPostal: '9560-080', localidade: 'Lagoa',          telefone: '296912014', email: 'lagoacompressores@mail.pt' },
  { id: 'lc15', nif: '511000015', nome: 'Capelas & Filhos Lda',         morada: 'Caminho das Capelas, 7',     codigoPostal: '9545-300', localidade: 'Capelas',        telefone: '296498015', email: '' },
  { id: 'lc16', nif: '511000016', nome: 'Sete Cidades Equipamentos Lda', morada: 'Rua das Sete Cidades, 2', codigoPostal: '9545-200', localidade: 'Sete Cidades',   telefone: '296499016', email: 'setecidades@eq.pt' },
  { id: 'lc17', nif: '511000017', nome: 'Maia Auto Center Lda',         morada: 'Av. da Maia, 15',            codigoPostal: '9545-050', localidade: 'Maia',           telefone: '296412017', email: 'maiaautocenter@mail.pt' },
  { id: 'lc18', nif: '511000018', nome: 'Furnas Técnica Unip.',         morada: 'Rua das Furnas, 8',          codigoPostal: '9675-040', localidade: 'Furnas',         telefone: '296549018', email: 'furnastecnica@mail.pt' },
  { id: 'lc19', nif: '511000019', nome: 'Povoação Industrial SA',       morada: 'Rua Principal, 44',          codigoPostal: '9650-030', localidade: 'Povoação',       telefone: '296550019', email: 'povoaindustrial@mail.pt' },
  { id: 'lc20', nif: '511000020', nome: 'Ribeirinha Service Lda',       morada: 'Caminho da Ribeirinha, 6',   codigoPostal: '9500-440', localidade: 'Ribeirinha',     telefone: '296281020', email: 'ribeirinhaservice@mail.pt' },
]

// ── Categorias e Subcategorias ────────────────────────────────────────────────

export const ML_CATEGORIAS = [
  { id: 'lcat1', nome: 'Elevadores de veículos',       intervaloTipo: 'anual' },
  { id: 'lcat2', nome: 'Compressores de ar',            intervaloTipo: 'trimestral' },
  { id: 'lcat3', nome: 'Geradores e grupos electrogénios', intervaloTipo: 'semestral' },
  { id: 'lcat4', nome: 'Equipamentos de trabalho em altura', intervaloTipo: 'anual' },
]

export const ML_SUBCATEGORIAS = [
  { id: 'lsub1', categoriaId: 'lcat1', nome: 'Elevador electromecânico de ligeiros' },
  { id: 'lsub2', categoriaId: 'lcat1', nome: 'Elevador electro-hidráulico de 2 colunas' },
  { id: 'lsub3', categoriaId: 'lcat1', nome: 'Elevador de tesoura' },
  { id: 'lsub4', categoriaId: 'lcat2', nome: 'Compressor de pistão monofásico' },
  { id: 'lsub5', categoriaId: 'lcat2', nome: 'Compressor de pistão trifásico' },
  { id: 'lsub6', categoriaId: 'lcat3', nome: 'Grupo electrogéneo diesel' },
  { id: 'lsub7', categoriaId: 'lcat4', nome: 'Plataforma elevatória de tesoura' },
  { id: 'lsub8', categoriaId: 'lcat4', nome: 'Plataforma articulada telescópica' },
]

export const ML_CHECKLIST = [
  { id: 'lch1', subcategoriaId: 'lsub1', ordem: 1, texto: 'Marcação CE e placa de identificação' },
  { id: 'lch2', subcategoriaId: 'lsub1', ordem: 2, texto: 'Dispositivos de bloqueio mecânico' },
  { id: 'lch3', subcategoriaId: 'lsub1', ordem: 3, texto: 'Sistema hidráulico (nível e estanquicidade)' },
  { id: 'lch4', subcategoriaId: 'lsub2', ordem: 1, texto: 'Alinhamento das colunas' },
  { id: 'lch5', subcategoriaId: 'lsub2', ordem: 2, texto: 'Cabo de segurança e polias' },
  { id: 'lch6', subcategoriaId: 'lsub2', ordem: 3, texto: 'Limitador de curso superior e inferior' },
  { id: 'lch7', subcategoriaId: 'lsub4', ordem: 1, texto: 'Pressão de trabalho (bar)' },
  { id: 'lch8', subcategoriaId: 'lsub4', ordem: 2, texto: 'Filtro de ar e válvula de segurança' },
  { id: 'lch9', subcategoriaId: 'lsub6', ordem: 1, texto: 'Nível de óleo motor' },
  { id: 'lch10', subcategoriaId: 'lsub6', ordem: 2, texto: 'Sistema de arrefecimento' },
]

// ── Helper: gerar datas ───────────────────────────────────────────────────────

function dataRelativa(dias) {
  const d = new Date('2026-02-23')
  d.setDate(d.getDate() + dias)
  return d.toISOString().slice(0, 10)
}

// ── Máquinas (60) ─────────────────────────────────────────────────────────────

const MARCAS = ['Navel', 'Rotary', 'BendPak', 'Atlas', 'Compair', 'Atlas Copco', 'Genie', 'JLG', 'Cummins', 'Pramac']
const PERIODICIDADES = ['anual', 'semestral', 'trimestral', 'anual', 'anual', 'semestral'] // anual é mais comum

function gerarMaquinas() {
  const maquinas = []
  const clienteIds = ML_CLIENTES.map(c => c.id)
  const subIds     = ML_SUBCATEGORIAS.map(s => s.id)
  let mIdx = 1

  for (let ci = 0; ci < clienteIds.length; ci++) {
    const numMaquinas = ci < 5 ? 4 : ci < 12 ? 3 : 2   // primeiros clientes têm mais máquinas
    for (let mi = 0; mi < numMaquinas; mi++) {
      const sub  = subIds[(mIdx - 1) % subIds.length]
      const marca = MARCAS[(mIdx - 1) % MARCAS.length]
      const per  = PERIODICIDADES[(mIdx - 1) % PERIODICIDADES.length]
      const serie = `AZ${String(mIdx).padStart(4, '0')}`
      const ano  = 2018 + ((mIdx - 1) % 7)
      // ultimaManutencaoData: alterna entre datas passadas
      const diasUltima = -30 - ((mIdx - 1) % 365)
      const ultimaData = dataRelativa(diasUltima)
      // proximaManut: baseada na periodicidade + última manutenção
      const intervaloDias = per === 'anual' ? 365 : per === 'semestral' ? 182 : 91
      const diasProxima = diasUltima + intervaloDias
      const proximaData = dataRelativa(diasProxima)

      maquinas.push({
        id: `lm${String(mIdx).padStart(2, '0')}`,
        clienteId: clienteIds[ci],
        subcategoriaId: sub,
        marca,
        modelo: `${marca.replace(' ', '')}-${100 + mIdx}`,
        numeroSerie: serie,
        anoFabrico: ano,
        periodicidadeManut: per,
        ultimaManutencaoData: ultimaData,
        proximaManut: proximaData,
        documentos: [],
      })
      mIdx++
    }
  }
  return maquinas
}

export const ML_MAQUINAS = gerarMaquinas()   // 60 máquinas

// ── Manutenções (120) ─────────────────────────────────────────────────────────

function gerarManutencoes() {
  const manutencoes = []
  let mtIdx = 1

  ML_MAQUINAS.forEach((maq, i) => {
    // 1. Manutenção concluída (histórico) — todas as máquinas
    manutencoes.push({
      id: `lmt${String(mtIdx).padStart(3, '0')}`,
      maquinaId: maq.id,
      tipo: 'periodica',
      data: maq.ultimaManutencaoData,
      tecnico: i % 2 === 0 ? 'Aurélio Almeida' : 'Paulo Medeiros',
      status: 'concluida',
      observacoes: 'Revisão periódica concluída conforme plano.',
    })
    mtIdx++

    // 2. Próxima manutenção (pendente ou agendada ou em atraso)
    const diasProxima = parseInt(maq.proximaManut.replace(/-/g, '')) - 20260223
    const status = i < 10
      ? 'pendente'    // primeiros 10: em atraso (data no passado)
      : i < 20
        ? 'agendada'  // seguintes 10: agendadas
        : 'pendente'  // restantes: pendentes futuras
    manutencoes.push({
      id: `lmt${String(mtIdx).padStart(3, '0')}`,
      maquinaId: maq.id,
      tipo: 'periodica',
      data: maq.proximaManut,
      tecnico: status === 'agendada' ? 'Aurélio Almeida' : '',
      status,
      observacoes: '',
    })
    mtIdx++
  })

  return manutencoes
}

export const ML_MANUTENCOES = gerarManutencoes()  // 120 manutenções

// ── Relatórios (40) ───────────────────────────────────────────────────────────

function gerarRelatorios() {
  const relatorios = []
  const manutConc = ML_MANUTENCOES.filter(m => m.status === 'concluida').slice(0, 40)
  const tecnicos = ['Aurélio Almeida', 'Paulo Medeiros']
  const assinantes = [
    'João Bettencourt', 'Maria Faial', 'António Terceiro', 'Rosa Flores',
    'Carlos Graciosa', 'Sofia Jorge', 'Manuel Pico', 'Teresa Ribeira',
    'Rui Nordeste', 'Ana Lagoa',
  ]

  manutConc.forEach((mt, i) => {
    const ano = mt.data.slice(0, 4)
    const num = String(i + 1).padStart(5, '0')
    relatorios.push({
      id: `lrr${String(i + 1).padStart(2, '0')}`,
      manutencaoId: mt.id,
      numeroRelatorio: `${ano}.MP.${num}`,
      dataCriacao:    `${mt.data}T09:00:00.000Z`,
      dataAssinatura: `${mt.data}T11:00:00.000Z`,
      tecnico: tecnicos[i % 2],
      nomeAssinante: assinantes[i % assinantes.length],
      assinadoPeloCliente: true,
      assinaturaDigital: null,
      checklistRespostas: { lch1: 'sim', lch2: 'sim', lch3: 'sim' },
      notas: i % 5 === 0 ? 'Substituída correia de transmissão.' : 'Sem anomalias.',
      fotos: [],
      ultimoEnvio: `${mt.data}T12:00:00.000Z`,
    })
  })
  return relatorios
}

export const ML_RELATORIOS = gerarRelatorios()   // 40 relatórios

// ── Dataset completo ──────────────────────────────────────────────────────────

export const ML = {
  clientes:       ML_CLIENTES,
  categorias:     ML_CATEGORIAS,
  subcategorias:  ML_SUBCATEGORIAS,
  checklistItems: ML_CHECKLIST,
  maquinas:       ML_MAQUINAS,
  manutencoes:    ML_MANUTENCOES,
  relatorios:     ML_RELATORIOS,
}

// ── Sumário (para logs de testes) ─────────────────────────────────────────────

export const ML_SUMMARY = {
  clientes:    ML_CLIENTES.length,
  maquinas:    ML_MAQUINAS.length,
  manutencoes: ML_MANUTENCOES.length,
  relatorios:  ML_RELATORIOS.length,
  emAtraso:    ML_MANUTENCOES.filter(m => m.status === 'pendente' && m.data < '2026-02-23').length,
  semEmail:    ML_CLIENTES.filter(c => !c.email).length,
  total:       ML_CLIENTES.length + ML_MAQUINAS.length + ML_MANUTENCOES.length + ML_RELATORIOS.length,
}
