import { formatDataHoraAzores, formatDataAzores } from '../utils/datasAzores'
import { safeHttpUrl } from '../utils/sanitize'
import { ExternalLink } from 'lucide-react'
import { TIPOS_DOCUMENTO } from '../context/DataContext'
import { DECLARACAO_CLIENTE } from '../constants/relatorio'
import './RelatorioView.css'

export default function RelatorioView({ relatorio, manutencao, maquina, cliente, checklistItems = [] }) {
  if (!relatorio) return null

  const dataCriacaoFormatada = relatorio.dataCriacao
    ? formatDataHoraAzores(relatorio.dataCriacao)
    : '—'
  const dataAssinaturaFormatada = relatorio.dataAssinatura
    ? formatDataHoraAzores(relatorio.dataAssinatura)
    : '—'

  return (
    <div className="relatorio-view">
      <section className="relatorio-section">
        <h3>Dados da manutenção</h3>
        <p><strong>Equipamento:</strong> {maquina ? `${maquina.marca} ${maquina.modelo} — Nº Série: ${maquina.numeroSerie}` : '—'}</p>
        {(maquina?.documentos ?? []).length > 0 && (
          <p className="doc-links-relatorio">
            <strong>Documentação:</strong>{' '}
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
        <p><strong>Data:</strong> {manutencao?.data ? formatDataAzores(manutencao.data) : '—'}</p>
        <p><strong>Técnico:</strong> {relatorio?.tecnico ?? manutencao?.tecnico ?? '—'}</p>
        {(manutencao?.horasTotais != null || manutencao?.horasServico != null) && (
          <p><strong>Contadores:</strong> {manutencao.horasTotais != null && `Total: ${manutencao.horasTotais}h`}{manutencao.horasTotais != null && manutencao.horasServico != null && ' · '}{manutencao.horasServico != null && `Serviço: ${manutencao.horasServico}h`}</p>
        )}
      </section>

      {checklistItems.length > 0 && (
        <section className="relatorio-section checklist-section">
          <h3>Checklist de verificação</h3>
          <table className="checklist-table">
            <tbody>
              {checklistItems.map((item, i) => (
                <tr key={item.id}>
                  <td className="checklist-num">{i + 1}.</td>
                  <td className="checklist-texto">{item.texto}</td>
                  <td className="checklist-resp">
                    {relatorio.checklistRespostas?.[item.id] === 'sim' && <span className="badge-sim">Sim</span>}
                    {relatorio.checklistRespostas?.[item.id] === 'nao' && <span className="badge-nao">Não</span>}
                    {!relatorio.checklistRespostas?.[item.id] && '—'}
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
          <p className="notas-texto">{relatorio.notas}</p>
        </section>
      )}

      <section className="relatorio-section">
        <h3>Registo do relatório</h3>
        <p><strong>Data de criação:</strong> {dataCriacaoFormatada}</p>
        {relatorio.assinadoPeloCliente && (
          <>
            <p><strong>Data de assinatura:</strong> {dataAssinaturaFormatada}</p>
            <p><strong>Nome de quem assinou:</strong> {relatorio.nomeAssinante ?? '—'}</p>
          </>
        )}
      </section>

      <section className="relatorio-section declaracao">
        <p className="declaracao-texto">{DECLARACAO_CLIENTE}</p>
      </section>

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
