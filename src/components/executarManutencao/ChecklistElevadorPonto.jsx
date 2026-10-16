import { useState } from 'react'
import {
  aplicarForaDeServico,
  ehRegistoIntervencoes,
  papelDoPonto,
  pontoImplicaForaDeServico,
  respostaDocumento,
  respostaOperacao,
  respostaTeste,
  testeConfirmaCargaVeiculo,
} from '../../domain/relatorioElevadorPreventivo'
import { limparCitacaoNormaChecklist } from '../../domain/notaLegalColocacaoMercado'

function Botoes({ opcoes, valor, onPick, aria }) {
  return (
    <div className="checklist-item-btns checklist-item-btns--elevador" role="group" aria-label={aria}>
      {opcoes.map(op => (
        <button
          key={op.id}
          type="button"
          className={`btn-simnao${op.largo ? ' btn-simnao--largo' : ''} ${valor === op.id ? op.activo : ''}`}
          onClick={() => onPick(op.id)}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}

function Campo({ label, value, onChange }) {
  return (
    <label>
      {label}
      <textarea value={value} onChange={e => onChange(e.target.value)} />
    </label>
  )
}

/** Atalho «Não Aplicável» nestes pontos, com o mesmo cartão dos pontos correntes. */
function atalhoNaoAplicavelVisivel(item) {
  const t = String(item?.texto ?? '')
  return /alimenta[cç][aã]o el[eé]trica e dispositivos de seguran[cç]a/i.test(t)
    || /n[ií]vel de [oó]leo da central hidr[aá]ulica/i.test(t)
    || /v[aá]lvula limitadora de press[aã]o/i.test(t)
    || /v[aá]lvulas reguladoras de press[aã]o/i.test(t)
    || /cilindros hidr[aá]ulicos/i.test(t)
    || /suportes de carga/i.test(t)
    || /fins? de curso/i.test(t)
    || /moto-redutor e a transmiss/i.test(t)
    || /microswitches e fins de curso/i.test(t)
    || /fusos e porcas de transmiss/i.test(t)
}

/**
 * Um ponto da checklist de elevador: documento, teste ou operação.
 * O detalhe só aparece quando a resposta o exige.
 */
export default function ChecklistElevadorPonto({ item, index, valor, onChange }) {
  const papel = valor?.papel || papelDoPonto(item)
  const critico = pontoImplicaForaDeServico(item)
  /**
   * Pontos correntes (com atalho): os grupos «O que foi feito» / «O que foi observado» ficam
   * recolhidos até o técnico tocar em «Responder em detalhe» — ou até haver uma resposta que
   * não seja o atalho. Nos pontos de segurança estão sempre visíveis, excepto a válvula
   * limitadora, os suportes de carga e os fins de curso, que usam o mesmo cartão dos pontos correntes (v1.17.37).
   */
  const [detalhePedido, setDetalhePedido] = useState(false)
  const set = (next) => {
    if (critico && (next?.observacao === 'anomalia' || next?.r === 'nao')) {
      onChange(aplicarForaDeServico([item], { [item.id]: next })[item.id])
      return
    }
    onChange(next)
  }

  if (papel === 'documento') {
    return (
      <div className="checklist-item-row checklist-item-row--elevador">
        <span className="checklist-item-num">{index + 1}.</span>
        <span className="checklist-item-texto">{limparCitacaoNormaChecklist(item.texto)}</span>
        <span className="checklist-papel">
          {/marca[cç][aã]o ce/i.test(String(item.texto ?? ''))
            ? 'Tem de estar visível na chapa de identificação do elevador'
            : 'Documento — não é uma anomalia do equipamento'}
        </span>
        <Botoes
          aria={`Documento ${index + 1}`}
          valor={valor?.documento || ''}
          onPick={(estado) => set(respostaDocumento(estado, {
            descricao: valor?.descricao || '',
            recomendacao: valor?.recomendacao || '',
            fundamento: valor?.fundamento || '',
          }))}
          opcoes={[
            { id: 'analisado', label: 'OK / Analisado', activo: 'active-sim' },
            { id: 'nao_disponibilizado', label: 'Não Existente', activo: 'active-na' },
            ...(ehRegistoIntervencoes(item) ? [{
              id: 'gerido_pelo_cliente',
              label: 'Não Disponibilizado - Gerido pelo Cliente',
              activo: 'active-na',
              largo: true,
            }] : []),
          ]}
        />
      </div>
    )
  }

  if (papel === 'teste') {
    return (
      <div className="checklist-item-row checklist-item-row--elevador">
        <span className="checklist-item-num">{index + 1}.</span>
        <span className="checklist-item-texto">{limparCitacaoNormaChecklist(item.texto)}</span>
        <span className="checklist-papel">
          {testeConfirmaCargaVeiculo(item)
            ? 'Com carga: elevar um veículo na função habitual, com 2 ciclos completos de subida e descida. Não é ensaio formal de carga.'
            : 'Teste funcional. Não é ensaio formal de carga.'}
        </span>
        <Botoes
          aria={`Execução do teste ${index + 1}`}
          valor={valor?.executado === true ? 'sim' : valor?.executado === false ? 'nao' : ''}
          onPick={(id) => set(respostaTeste({
            executado: id === 'sim',
            carga: valor?.carga || '',
            observacao: valor?.observacao || '',
            motivo: valor?.motivo || '',
            limitacao: '',
            descricao: valor?.descricao || '',
            recomendacao: valor?.recomendacao || '',
          }))}
          opcoes={[
            { id: 'sim', label: 'Executado', activo: 'active-sim' },
            { id: 'nao', label: 'Não executado', activo: 'active-nao' },
          ]}
        />
        {valor?.executado === true && testeConfirmaCargaVeiculo(item) && (
          <div className="checklist-subrow">
            <span>Condição</span>
            <Botoes
              aria={`Carga do teste ${index + 1}`}
              valor={valor.carga || ''}
              onPick={(carga) => set(respostaTeste({ ...valor, carga }))}
              opcoes={[
                { id: 'sem_carga', label: 'Sem carga', activo: 'active-sim' },
                { id: 'com_carga', label: 'Com carga — veículo, 2 ciclos', activo: 'active-na' },
              ]}
            />
          </div>
        )}
        {valor?.executado === true && (
          <div className="checklist-subrow">
            <span>O que se observou</span>
            <Botoes
              aria={`Observação do teste ${index + 1}`}
              valor={valor.observacao || ''}
              onPick={(observacao) => set(respostaTeste({ ...valor, observacao }))}
              opcoes={[
                { id: 'sem_anomalia', label: 'Sem anomalia observada', activo: 'active-sim' },
                { id: 'anomalia', label: 'Anomalia', activo: 'active-nao' },
                { id: 'nao_observado', label: 'Não observado', activo: 'active-na' },
              ]}
            />
          </div>
        )}
        <div className="checklist-detalhe">
          {valor?.executado === false && (
            <Campo label="Porque não foi executado" value={valor.motivo || ''} onChange={motivo => set(respostaTeste({ ...valor, executado: false, motivo }))} />
          )}
          {valor?.executado && valor?.observacao === 'nao_observado' && (
            <Campo label="Porque não foi observado" value={valor.motivo || ''} onChange={motivo => set(respostaTeste({ ...valor, motivo }))} />
          )}
          {valor?.observacao === 'anomalia' && (
            <>
              <Campo label="O que observou" value={valor.descricao || ''} onChange={descricao => set(respostaTeste({ ...valor, descricao }))} />
              <Campo label="Recomendação transmitida ao cliente" value={valor.recomendacao || ''} onChange={recomendacao => set(respostaTeste({ ...valor, recomendacao }))} />
              {critico && <p className="checklist-retirada">Fora de serviço: recomendação obrigatória neste ponto.</p>}
            </>
          )}
        </div>
      </div>
    )
  }

  const executadoSemAnomalia = valor?.execucao === 'executado' && valor?.observacao === 'sem_anomalia'
  const atalhoNaoAplicavel = atalhoNaoAplicavelVisivel(item)
  const naoAplicavel = valor?.execucao === 'na' && valor?.observacao === 'na'
  const temRespostaForaDoAtalho = !executadoSemAnomalia && !(atalhoNaoAplicavel && naoAplicavel) && !!(valor?.execucao || valor?.observacao)
  const mostrarDetalhe = (critico && !atalhoNaoAplicavel) || detalhePedido || temRespostaForaDoAtalho
  return (
    <div className={`checklist-item-row checklist-item-row--elevador${critico && !atalhoNaoAplicavel ? ' checklist-item-row--seguranca' : ''}`}>
      <span className="checklist-item-num">{index + 1}.</span>
      <span className="checklist-item-texto">{limparCitacaoNormaChecklist(item.texto)}</span>
      {critico && !atalhoNaoAplicavel ? (
        <span className="checklist-papel checklist-papel--seguranca">
          Ponto de segurança: responda à execução e à observação em separado.
        </span>
      ) : (
        <>
          <span className="checklist-papel">Execução e observação são respostas diferentes</span>
          <div className="checklist-atalho-linha">
            <button
              type="button"
              className={`btn-simnao btn-simnao--atalho ${executadoSemAnomalia ? 'active-sim' : ''}`}
              aria-label={`Ponto ${index + 1}: executado, sem anomalia`}
              onClick={() => { setDetalhePedido(false); set(respostaOperacao({
                execucao: 'executado',
                observacao: 'sem_anomalia',
                descricao: '',
                recomendacao: '',
                fundamento: '',
                motivo: '',
                recomendaRetirada: false,
              })) }}
            >
              Executado, sem anomalia
            </button>
            {atalhoNaoAplicavel && (
              <button
                type="button"
                className={`btn-simnao btn-simnao--atalho ${naoAplicavel ? 'active-na' : ''}`}
                aria-label={`Ponto ${index + 1}: não aplicável`}
                onClick={() => { setDetalhePedido(false); set(respostaOperacao({
                  execucao: 'na',
                  observacao: 'na',
                  descricao: '',
                  recomendacao: '',
                  fundamento: '',
                  motivo: '',
                  recomendaRetirada: false,
                })) }}
              >
                Não Aplicável
              </button>
            )}
            <button
              type="button"
              className={`btn-link-checklist checklist-detalhe-toggle${mostrarDetalhe ? ' is-open' : ''}`}
              aria-expanded={mostrarDetalhe}
              onClick={() => setDetalhePedido(v => !v)}
              disabled={temRespostaForaDoAtalho}
              title={temRespostaForaDoAtalho ? 'Há uma resposta em detalhe neste ponto' : undefined}
            >
              {mostrarDetalhe ? 'Ocultar detalhe' : 'Responder em detalhe'}
            </button>
          </div>
        </>
      )}
      {mostrarDetalhe && (
      <div className="checklist-subrow">
        <span>O que foi feito</span>
        <Botoes
          aria={`Execução ${index + 1}`}
          valor={valor?.execucao || ''}
          onPick={(execucao) => set(respostaOperacao({
            execucao,
            observacao: execucao === 'na' ? 'na' : (valor?.observacao === 'na' ? '' : (valor?.observacao || '')),
            descricao: valor?.descricao || '',
            recomendacao: valor?.recomendacao || '',
            fundamento: valor?.fundamento || '',
            motivo: valor?.motivo || '',
            recomendaRetirada: !!valor?.recomendaRetirada,
          }))}
          opcoes={[
            { id: 'executado', label: 'Executado', activo: 'active-sim' },
            { id: 'parcial', label: 'Parcial', activo: 'active-na' },
            { id: 'nao_executado', label: 'Não executado', activo: 'active-nao' },
            { id: 'na', label: 'Não aplicável', activo: 'active-na' },
          ]}
        />
      </div>
      )}
      {mostrarDetalhe && (
      <div className="checklist-subrow">
        <span>O que foi observado</span>
        <Botoes
          aria={`Observação ${index + 1}`}
          valor={valor?.observacao || ''}
          onPick={(observacao) => set(respostaOperacao({
            execucao: observacao === 'na' ? 'na' : (valor?.execucao === 'na' ? '' : (valor?.execucao || '')),
            observacao,
            descricao: valor?.descricao || '',
            recomendacao: valor?.recomendacao || '',
            fundamento: valor?.fundamento || '',
            motivo: valor?.motivo || '',
            recomendaRetirada: !!valor?.recomendaRetirada,
          }))}
          opcoes={[
            { id: 'sem_anomalia', label: 'Sem anomalia observada', activo: 'active-sim' },
            { id: 'anomalia', label: 'Anomalia', activo: 'active-nao' },
            { id: 'nao_observado', label: 'Não observado', activo: 'active-na' },
            { id: 'na', label: 'Não aplicável', activo: 'active-na' },
          ]}
        />
      </div>
      )}
      <div className="checklist-detalhe">
        {(valor?.execucao === 'parcial' || valor?.execucao === 'nao_executado' || valor?.observacao === 'nao_observado') && (
          <Campo label="Motivo" value={valor.motivo || ''} onChange={motivo => set(respostaOperacao({ ...valor, motivo }))} />
        )}
        {valor?.execucao === 'na' && (
          <Campo label="Fundamento (opcional)" value={valor.fundamento || ''} onChange={fundamento => set(respostaOperacao({ ...valor, fundamento }))} />
        )}
        {valor?.observacao === 'anomalia' && (
          <>
            <Campo label="O que observou" value={valor.descricao || ''} onChange={descricao => set(respostaOperacao({ ...valor, descricao }))} />
            <Campo label="Recomendação transmitida ao cliente" value={valor.recomendacao || ''} onChange={recomendacao => set(respostaOperacao({ ...valor, recomendacao }))} />
            {critico ? (
              <p className="checklist-retirada">Fora de serviço: recomendação obrigatória neste ponto.</p>
            ) : (
              <label className="checklist-retirada">
                <input
                  type="checkbox"
                  checked={!!valor.recomendaRetirada}
                  onChange={e => set(respostaOperacao({ ...valor, recomendaRetirada: e.target.checked }))}
                />
                Recomendar não utilização até correção
              </label>
            )}
          </>
        )}
      </div>
    </div>
  )
}
