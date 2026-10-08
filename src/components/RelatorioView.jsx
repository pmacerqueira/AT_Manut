import { formatDataHoraAzores, formatDataAzores } from '../utils/datasAzores'
import { safeHttpUrl } from '../utils/sanitize'
import { ExternalLink } from 'lucide-react'
import { TIPOS_DOCUMENTO } from '../context/DataContext'
import { useData } from '../context/DataContext'
import { categoriaNomeFromMaquina, resolveDeclaracaoClienteForMaquina } from '../constants/relatorio'
import { resolveChecklist } from '../utils/resolveChecklist'
import { AVISO_FORA_DE_SERVICO, codigoResposta, decisaoOperacionalElevador, emissaoDoRelatorio, NOTA_AMBITO_TITULO, pontosNotaAmbito, TEXTO_PEDIDO_FORA_AMBITO, textoRececaoVisivel } from '../domain/relatorioElevadorPreventivo'
import { aplicaNotaLegalColocacao, limparCitacaoNormaChecklist, NOTA_LEGAL_COLOCACAO_INTRO, NOTA_LEGAL_COLOCACAO_LINHAS, NOTA_LEGAL_COLOCACAO_TITULO } from '../domain/notaLegalColocacaoMercado'
import { horasContadorParaRelatorio } from '../utils/horasContadorEquipamento'
import { linhasNotasRelatorio } from '../components/executarManutencao/execWizardHelpers'
import { SUBCATEGORIAS_COM_CONTADOR_HORAS } from '../context/DataContext'
import './RelatorioView.css'

export default function RelatorioView({ relatorio, manutencao, maquina, cliente, checklistItems = [] }) {
  const { getSubcategoria, getCategoria } = useData()
  if (!relatorio) return null
  const items = resolveChecklist(relatorio, checklistItems)
  const emissao = emissaoDoRelatorio(relatorio)
  const decisao = decisaoOperacionalElevador(items, relatorio?.checklistRespostas, {
    recomendaRetirada: !!emissao?.recomendaRetirada,
  })
  const equipComContadorHoras = maquina &&
    SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maquina.subcategoriaId)
  const horasContador = horasContadorParaRelatorio(maquina, manutencao, null, relatorio)

  const dataCriacaoFormatada = relatorio.dataCriacao
    ? formatDataHoraAzores(relatorio.dataCriacao)
    : '—'
  const dataAssinaturaFormatada = relatorio.dataAssinatura
    ? formatDataHoraAzores(relatorio.dataAssinatura)
    : '—'

  return (
    <div className="relatorio-view">
      <section className="relatorio-section">
        <h3>{NOTA_AMBITO_TITULO}</h3>
        {pontosNotaAmbito({
          categoriaNome: categoriaNomeFromMaquina(maquina, getSubcategoria, getCategoria),
          tipoManutencao: manutencao?.tipo,
        }).map(ponto => (
          <p key={ponto}>{ponto}</p>
        ))}
      </section>
      <section className="relatorio-section">
        <h3>Dados da manutenção</h3>
        <p><strong>Equipamento:</strong> {maquina ? `${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}` : '—'}</p>
        {(maquina?.documentos ?? []).length > 0 && (
          <p className="doc-links-relatorio">
            <strong>Documentação técnica:</strong>{' '}
            {maquina.documentos.map((d, i) => {
              const tipoLabel = TIPOS_DOCUMENTO.find(t => t.id === d.tipo)?.label ?? d.tipo
              return (
                <span key={d.id}>
                  {i > 0 && ', '}
                  <a href={safeHttpUrl(d.url)} target="_blank" rel="noopener noreferrer" className="doc-link">
                    {d.titulo || tipoLabel} <ExternalLink size={12} />
                  </a>
                </span>
              )
            })}
          </p>
        )}
        <p><strong>Cliente:</strong> {cliente?.nome ?? '—'}</p>
        <p><strong>Data agendada:</strong> {manutencao?.data ? formatDataAzores(manutencao.data) : '—'}</p>
        <p><strong>Data de execução:</strong> {
          manutencao?.dataExecucao
            ? formatDataAzores(manutencao.dataExecucao)
            : relatorio?.dataAssinatura
              ? formatDataAzores(relatorio.dataAssinatura.slice(0, 10))
              : '—'
        }</p>
        <p><strong>Técnico:</strong> {relatorio?.tecnico ?? manutencao?.tecnico ?? '—'}</p>
        {equipComContadorHoras && (
          <p><strong>Horas no contador (acumuladas):</strong> {horasContador != null ? `${horasContador} h` : '—'}</p>
        )}
      </section>

      {emissao?.pedidoExtra === 'sim' && emissao.pedidoExtraDescricao && (
        <section className="relatorio-section">
          <h3>Pedido fora do âmbito</h3>
          <p>{emissao.pedidoExtraDescricao}. {TEXTO_PEDIDO_FORA_AMBITO}</p>
        </section>
      )}

      {items.length > 0 && (
        <section className="relatorio-section checklist-section">
          <h3>Checklist de verificação</h3>
          <table className="checklist-table">
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id}>
                  <td className="checklist-num">{i + 1}.</td>
                  <td className="checklist-texto">{limparCitacaoNormaChecklist(item.texto)}</td>
                  <td className="checklist-resp">
                    {codigoResposta(relatorio.checklistRespostas?.[item.id]) === 'sim' && <span className="badge-sim">{emissao ? 'Sem anomalia' : 'Sim'}</span>}
                    {codigoResposta(relatorio.checklistRespostas?.[item.id]) === 'nao' && <span className="badge-nao">{emissao ? 'Anomalia' : 'Não'}</span>}
                    {codigoResposta(relatorio.checklistRespostas?.[item.id]) === 'na' && <span>Não aplicável</span>}
                    {!codigoResposta(relatorio.checklistRespostas?.[item.id]) && '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {relatorio.notas && (
        <section className="relatorio-section notas-section">
          <h3>Notas importantes</h3>
          <div className="notas-texto">
            {linhasNotasRelatorio(relatorio.notas).map((line, i) => (
              <p key={i} className="notas-linha">{line}</p>
            ))}
          </div>
        </section>
      )}

      <section className="relatorio-section">
        <h3>Registo do relatório</h3>
        <p><strong>Data de criação:</strong> {dataCriacaoFormatada}</p>
        {relatorio.assinadoPeloCliente && (
          <>
            <p><strong>Data de assinatura:</strong> {dataAssinaturaFormatada}</p>
            <p><strong>Nome de quem assinou:</strong> {relatorio.nomeAssinante ?? '—'}</p>
            {emissao?.funcaoAssinante && <p><strong>Função:</strong> {emissao.funcaoAssinante}</p>}
          </>
        )}
        {emissao?.assinaturaRecusada && (
          <p><strong>Assinatura recusada.</strong> Canal: {emissao.canalAlternativo || '—'}</p>
        )}
        {emissao?.recomendaRetirada && (
          <p>{AVISO_FORA_DE_SERVICO}</p>
        )}
      </section>

      <section className="relatorio-section declaracao">
        {emissao?.declaracaoTitulo && <h3>{emissao.declaracaoTitulo}</h3>}
        <p className="declaracao-texto">{textoRececaoVisivel(emissao?.declaracaoTexto) || resolveDeclaracaoClienteForMaquina(
          manutencao?.tipo === 'montagem' ? 'montagem' : 'periodica',
          maquina,
          getSubcategoria,
          getCategoria,
        )}</p>
      </section>

      {aplicaNotaLegalColocacao({
        categoriaNome: categoriaNomeFromMaquina(maquina, getSubcategoria, getCategoria),
        isReparacao: false,
      }) && (
        <section className="relatorio-section">
          <h3>{NOTA_LEGAL_COLOCACAO_TITULO}</h3>
          <p>{NOTA_LEGAL_COLOCACAO_INTRO}</p>
          <table>
            <tbody>
              {NOTA_LEGAL_COLOCACAO_LINHAS.map(linha => (
                <tr key={linha.referencia}>
                  <td><strong>{linha.referencia}</strong></td>
                  <td>{linha.vigencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {decisao && (
        <section className="relatorio-section decisao-operacional">
          <h3>{decisao.titulo}</h3>
          <p>{decisao.motivo}</p>
        </section>
      )}

      {relatorio.assinadoPeloCliente && (
        <section className="relatorio-section assinatura-block assinatura-final">
          <h3>Assinatura do cliente</h3>
          <div className="assinatura-imagem">
            {relatorio.assinaturaDigital ? (
              <img src={relatorio.assinaturaDigital} alt="Assinatura manuscrita" />
            ) : (
              <span className="assinatura-placeholder">Assinatura manuscrita</span>
            )}
          </div>
          <p className="assinatura-nome">{relatorio.nomeAssinante ?? '—'}</p>
          <p className="assinatura-data">{dataAssinaturaFormatada}</p>
        </section>
      )}
    </div>
  )
}
