import { AlertTriangle, History } from 'lucide-react'
import { formatarDataPT } from '../../utils/diasUteis'

const ESTADO_DOC = {
  nao_disponibilizado: 'não disponibilizado',
  ilegivel: 'ilegível',
}

/**
 * «Na última visita» — primeiro passo do assistente.
 * Mostra ao técnico o que ficou registado da última intervenção concluída no mesmo equipamento,
 * para dar continuidade às anomalias e não as perder entre relatórios.
 */
export default function UltimaVisitaPanel({ resumo }) {
  if (!resumo) {
    return (
      <p className="ultima-visita-vazia text-muted">
        <History size={14} /> Primeira intervenção registada neste equipamento.
      </p>
    )
  }

  const cabecalho = [
    formatarDataPT(resumo.data),
    resumo.diasDesde != null && resumo.diasDesde >= 0 ? `há ${resumo.diasDesde} dia${resumo.diasDesde === 1 ? '' : 's'}` : '',
    resumo.tecnico,
    resumo.numeroRelatorio ? `relatório ${resumo.numeroRelatorio}` : '',
  ].filter(Boolean).join(' · ')

  return (
    <details className={`ultima-visita${resumo.temPendencias ? ' ultima-visita--pendencias' : ''}`} open data-testid="ultima-visita">
      <summary>
        <History size={15} />
        <span className="ultima-visita-titulo">Na última visita</span>
        <span className="ultima-visita-meta">{cabecalho}</span>
      </summary>

      {resumo.foraDeServico && (
        <p className="ultima-visita-alerta">
          <AlertTriangle size={14} /> Foi recomendado colocar o equipamento fora de serviço. Confirme com o cliente o que foi corrigido.
        </p>
      )}

      {resumo.anomalias.length > 0 && (
        <div className="ultima-visita-bloco">
          <strong>Anomalias registadas</strong>
          <ul>
            {resumo.anomalias.map(a => (
              <li key={a.n}>
                <span className="ultima-visita-ponto">{a.n}. {a.texto}</span>
                {a.descricao && <span className="ultima-visita-detalhe">{a.descricao}</span>}
                {a.recomendacao && <span className="ultima-visita-detalhe">Recomendação: {a.recomendacao}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {resumo.documentosEmFalta.length > 0 && (
        <div className="ultima-visita-bloco">
          <strong>Documentos em falta</strong>
          <ul>
            {resumo.documentosEmFalta.map(d => (
              <li key={d.n}><span className="ultima-visita-ponto">{d.n}. {d.texto}</span> <span className="ultima-visita-detalhe">({ESTADO_DOC[d.estado] || d.estado})</span></li>
            ))}
          </ul>
        </div>
      )}

      {resumo.naoExecutados.length > 0 && (
        <div className="ultima-visita-bloco">
          <strong>Ficou por fazer ou por observar</strong>
          <ul>
            {resumo.naoExecutados.map(p => (
              <li key={p.n}><span className="ultima-visita-ponto">{p.n}. {p.texto}</span>{p.motivo && <span className="ultima-visita-detalhe">{p.motivo}</span>}</li>
            ))}
          </ul>
        </div>
      )}

      {resumo.pedidoReparacao && (
        <div className="ultima-visita-bloco">
          <strong>Reparação pedida pelo cliente</strong>
          <p>{resumo.pedidoReparacao}</p>
        </div>
      )}

      {!resumo.temPendencias && (
        <p className="ultima-visita-ok">Sem anomalias nem pendências registadas.</p>
      )}

      {(resumo.notas.length > 0 || resumo.horas != null) && (
        <div className="ultima-visita-bloco ultima-visita-bloco--secundario">
          {resumo.horas != null && <p>Contador: <strong>{resumo.horas} h</strong></p>}
          {resumo.notas.length > 0 && (
            <ul className="ultima-visita-notas">
              {resumo.notas.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          )}
        </div>
      )}
    </details>
  )
}
