import { useEffect, useRef } from 'react'
import { History, X } from 'lucide-react'
import FotoChapaCampo from './FotoChapaCampo'
import MaquinaDocumentacaoLinks from '../MaquinaDocumentacaoLinks'
import ChecklistElevadorPonto from './ChecklistElevadorPonto'
import { limparCitacaoNormaChecklist } from '../../domain/notaLegalColocacaoMercado'
import {
  codigoResposta,
  ESTADOS_MANUTENCAO_ELEVADOR,
  fundamentoInaplicavel,
  mensagemIncoerenciaGrupo,
  papelDoPonto,
  respostaInaplicavel,
  respostaOperacao,
} from '../../domain/relatorioElevadorPreventivo'
import { INTERVALOS_KAESER } from '../../domain/equipamentoDomain'
import { tipoKaeserNaPosicao, proximaPosicaoKaeser, descricaoCicloKaeser } from '../../constants/kaeserCiclo'

/**
 * Passo checklist do wizard de execução de manutenção.
 * Inclui peças/consumíveis no fluxo standard (não-KAESER pipeline).
 */
export default function ChecklistStep({
  visible,
  isCorrectionMode,
  preFilledFromLast,
  items,
  form,
  setForm,
  setPreFilledFromLast,
  erroChecklist,
  maq,
  useKaeserPipeline,
  isKaeserAbcdMaq,
  manutencaoAtual,
  aplicarTipoKaeserComPecas,
  modoElevador = false,
  onFotoChapa,
  fotoChapaCarregando = false,
}) {
  const isKaeserPeriodicExec = !!(isKaeserAbcdMaq && manutencaoAtual?.tipo !== 'montagem')
  /** Em «Corrigir relatório» KAESER A/B/C/D o modal já tem tabela editável — evitar duplicar lista só-leitura. */
  const showPecasConsumiveis = !(isCorrectionMode && isKaeserPeriodicExec)
    && (isCorrectionMode || !useKaeserPipeline)
    && (form.pecasUsadas.length > 0 || (isKaeserAbcdMaq && form.tipoManutKaeser))
  const identificacaoRef = useRef(null)
  const forcarIdentificacao = modoElevador && /pedido|pediu|s[eé]rie|limita|esclarecimento|dispositivo de seguran|chapa/i.test(erroChecklist || '')
  const chapaInputRef = useRef(null)
  const pedeFotoChapa = form.serieConfirmada === 'sim' || form.serieConfirmada === 'nao'

  useEffect(() => {
    if (!forcarIdentificacao || !identificacaoRef.current) return
    identificacaoRef.current.open = true
    identificacaoRef.current.scrollIntoView({ block: 'nearest' })
  }, [forcarIdentificacao, erroChecklist])

  const updatePeca = (idx, patch) => setForm(f => ({
    ...f,
    pecasUsadas: f.pecasUsadas.map((pp, i) => (i === idx ? { ...pp, ...patch } : pp)),
  }))

  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Checklist de verificação</h3>}
      {!isCorrectionMode && (
        <p className="wizard-step-hint">
          {modoElevador
            ? 'Em cada ponto: sem anomalia observada, anomalia (com descrição e recomendação) ou não aplicável.'
            : 'Confirme ponto a ponto se a tarefa foi executada (Sim/Não).'}
        </p>
      )}

      {preFilledFromLast && (
        <div className="prefill-banner">
          <History size={15} />
          <span>Checklist pré-preenchida com base na última execução. Reveja antes de avançar.</span>
          <button type="button" className="btn-link-checklist" onClick={() => {
            const empty = {}
            items.forEach(it => { empty[it.id] = '' })
            setForm(f => ({ ...f, checklistRespostas: empty }))
            setPreFilledFromLast(false)
          }}>Limpar tudo</button>
        </div>
      )}

      <MaquinaDocumentacaoLinks maquina={maq} />

      {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
      {items.length > 0 && (
        <div className="checklist-section-wizard">
          <h3>Checklist de verificação</h3>
          <span className="checklist-obrigatorio-badge">
            {modoElevador
              ? '✱ Preenchimento obrigatório — sem anomalia, anomalia ou não aplicável'
              : '✱ Preenchimento obrigatório — todos os itens Sim / Não'}
          </span>
          {modoElevador && (
            <label className="checklist-elevador-estado">
              Estado da manutenção
              <select
                value={form.estadoManutencaoElevador || 'concluida_ambito'}
                onChange={e => setForm(f => ({ ...f, estadoManutencaoElevador: e.target.value }))}
              >
                {Object.entries(ESTADOS_MANUTENCAO_ELEVADOR).map(([id, label]) => (
                  <option key={id} value={id}>{label}</option>
                ))}
              </select>
            </label>
          )}
          <div className="checklist-quick-actions">
            <button type="button" className="btn-link-checklist"
              onClick={() => {
                const all = {}
                items.forEach(it => {
                  if (!modoElevador) {
                    all[it.id] = 'sim'
                    return
                  }
                  const fund = fundamentoInaplicavel(it, maq?.subcategoriaId)
                  const papel = papelDoPonto(it)
                  if (fund) {
                    all[it.id] = respostaInaplicavel(it, fund)
                    return
                  }
                  if (papel === 'documento' || papel === 'teste') {
                    all[it.id] = ''
                    return
                  }
                  all[it.id] = respostaOperacao({ execucao: 'executado', observacao: 'sem_anomalia' })
                })
                setForm(f => ({ ...f, checklistRespostas: all }))
              }}>
              {modoElevador ? 'Sem anomalia nos pontos aplicáveis' : 'Marcar todos'}
            </button>
            <span className="checklist-quick-sep">/</span>
            <button type="button" className="btn-link-checklist"
              onClick={() => {
                const empty = {}
                items.forEach(it => { empty[it.id] = '' })
                setForm(f => ({ ...f, checklistRespostas: empty }))
              }}>
              Desmarcar todos
            </button>
          </div>
          {modoElevador && (
            <>
            <details className="checklist-identificacao" open ref={identificacaoRef}>
              <summary>Identificação desta visita e pedido</summary>
              <label className="label-required">
                Série confirmada no local
                <select
                  value={form.serieConfirmada || ''}
                  onChange={e => {
                    const valor = e.target.value
                    setForm(f => ({ ...f, serieConfirmada: valor }))
                    if ((valor === 'sim' || valor === 'nao') && !form.fotoChapa) chapaInputRef.current?.click()
                  }}
                >
                  <option value="">—</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                  <option value="desconhecido">Não foi possível ver a chapa</option>
                </select>
              </label>
              {pedeFotoChapa && (
                <FotoChapaCampo
                  fotoChapa={form.fotoChapa}
                  carregando={fotoChapaCarregando}
                  onChange={onFotoChapa}
                  inputRef={chapaInputRef}
                />
              )}
              <label>
                Ano de fabrico (ou «desconhecido»)
                <input value={form.anoFabrico || ''} maxLength={20} onChange={e => setForm(f => ({ ...f, anoFabrico: e.target.value }))} />
              </label>
              <label>
                Capacidade comunicada pelo cliente
                <input value={form.capacidadeComunicada || ''} maxLength={40} onChange={e => setForm(f => ({ ...f, capacidadeComunicada: e.target.value }))} />
              </label>
              <label>
                Fornecido pela NAVEL
                <select value={form.fornecidoPelaNavel || ''} onChange={e => setForm(f => ({ ...f, fornecidoPelaNavel: e.target.value }))}>
                  <option value="">—</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                  <option value="desconhecido">Desconhecido</option>
                </select>
              </label>
              <label>
                Instalado pela NAVEL
                <select value={form.instaladoPelaNavel || ''} onChange={e => setForm(f => ({ ...f, instaladoPelaNavel: e.target.value }))}>
                  <option value="">—</option>
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                  <option value="desconhecido">Desconhecido</option>
                </select>
              </label>
              <label className="checklist-retirada">
                <input type="checkbox" checked={!!form.pedidoSoPreventiva} onChange={e => setForm(f => ({ ...f, pedidoSoPreventiva: e.target.checked }))} />
                O pedido desta visita é manutenção preventiva
              </label>
              <label>
                O cliente pediu reparação?
                <select value={form.pedidoReparacao || ''} onChange={e => setForm(f => ({ ...f, pedidoReparacao: e.target.value, pedidoReparacaoDescricao: e.target.value === 'sim' ? f.pedidoReparacaoDescricao : '' }))}>
                  <option value="">—</option>
                  <option value="nao">Não</option>
                  <option value="sim">Sim — será preparada ordem de serviço NAVEL</option>
                </select>
              </label>
              {form.pedidoReparacao === 'sim' && (
                <label>
                  Reparação pedida (não é executada nesta visita)
                  <textarea
                    value={form.pedidoReparacaoDescricao || ''}
                    maxLength={240}
                    placeholder="Ex.: substituir o fim de curso"
                    onChange={e => setForm(f => ({ ...f, pedidoReparacaoDescricao: e.target.value }))}
                  />
                </label>
              )}
              <label>
                O cliente pediu alteração ou certificação?
                <select value={form.pedidoFora || ''} onChange={e => setForm(f => ({ ...f, pedidoFora: e.target.value, pedidoForaDescricao: e.target.value === 'sim' ? f.pedidoForaDescricao : '' }))}>
                  <option value="">—</option>
                  <option value="nao">Não</option>
                  <option value="sim">Sim — fora do âmbito, não é executado</option>
                </select>
              </label>
              {form.pedidoFora === 'sim' && (
                <label>
                  Alteração ou certificação pedida
                  <textarea
                    value={form.pedidoForaDescricao || ''}
                    maxLength={240}
                    placeholder="Ex.: alteração da capacidade"
                    onChange={e => setForm(f => ({ ...f, pedidoForaDescricao: e.target.value }))}
                  />
                </label>
              )}
              <label>
                Limitações do pedido
                <textarea value={form.limitacoesAdmissao || ''} onChange={e => setForm(f => ({ ...f, limitacoesAdmissao: e.target.value }))} />
              </label>
            </details>
            {mensagemIncoerenciaGrupo(items, form.checklistRespostas, '') && (
              <label className="form-section">
                Esclarecimento obrigatório
                <textarea
                  value={form.esclarecimentoIncoerencia || ''}
                  maxLength={400}
                  placeholder="O que está danificado e o que o grupo sem anomalia realmente abrange"
                  onChange={e => setForm(f => ({ ...f, esclarecimentoIncoerencia: e.target.value }))}
                />
                <span className="form-hint">{mensagemIncoerenciaGrupo(items, form.checklistRespostas, form.esclarecimentoIncoerencia)}</span>
              </label>
            )}
            </>
          )}
          <div className="checklist-respostas">
            {items.map((item, i) => {
              const valor = form.checklistRespostas[item.id]
              const codigo = codigoResposta(valor)
              if (!modoElevador) {
                return (
                  <div key={item.id} className="checklist-item-row">
                    <span className="checklist-item-num">{i + 1}.</span>
                    <span className="checklist-item-texto">{limparCitacaoNormaChecklist(item.texto)}</span>
                    <div className="checklist-item-btns">
                      <button type="button"
                        className={`btn-simnao ${codigo === 'sim' ? 'active-sim' : ''}`}
                        onClick={() => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: 'sim' } }))}>
                        Sim
                      </button>
                      <button type="button"
                        className={`btn-simnao ${codigo === 'nao' ? 'active-nao' : ''}`}
                        onClick={() => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: 'nao' } }))}>
                        Não
                      </button>
                    </div>
                  </div>
                )
              }
              const legadoSemPapel = valor && !valor.papel && (typeof valor === 'string' || valor.r)
              if (legadoSemPapel) {
                const setCodigo = (novo) => setForm(f => {
                  const prev = f.checklistRespostas[item.id]
                  let next = 'sim'
                  if (novo === 'nao') {
                    next = {
                      r: 'nao',
                      descricao: prev && typeof prev === 'object' ? (prev.descricao || '') : '',
                      recomendacao: prev && typeof prev === 'object' ? (prev.recomendacao || '') : '',
                    }
                  } else if (novo === 'na') {
                    next = {
                      r: 'na',
                      fundamento: prev && typeof prev === 'object' ? (prev.fundamento || '') : '',
                    }
                  }
                  return { ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: next } }
                })
                return (
                  <div key={item.id} className="checklist-item-row checklist-item-row--elevador">
                    <span className="checklist-item-num">{i + 1}.</span>
                    <span className="checklist-item-texto">{limparCitacaoNormaChecklist(item.texto)}</span>
                    <div className="checklist-item-btns checklist-item-btns--elevador" role="group" aria-label={`Ponto ${i + 1}`}>
                      <button type="button" className={`btn-simnao ${codigo === 'sim' ? 'active-sim' : ''}`} onClick={() => setCodigo('sim')}>Sem anomalia</button>
                      <button type="button" className={`btn-simnao ${codigo === 'nao' ? 'active-nao' : ''}`} onClick={() => setCodigo('nao')}>Anomalia</button>
                      <button type="button" className={`btn-simnao ${codigo === 'na' ? 'active-na' : ''}`} onClick={() => setCodigo('na')}>Não aplicável</button>
                    </div>
                    {codigo === 'nao' && (
                      <div className="checklist-detalhe">
                        <label>O que observou<textarea value={valor?.descricao || ''} onChange={e => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: { ...(typeof valor === 'object' ? valor : { r: 'nao' }), r: 'nao', descricao: e.target.value } } }))} /></label>
                        <label>Recomendação transmitida ao cliente<textarea value={valor?.recomendacao || ''} onChange={e => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: { ...(typeof valor === 'object' ? valor : { r: 'nao' }), r: 'nao', recomendacao: e.target.value } } }))} /></label>
                      </div>
                    )}
                    {codigo === 'na' && (
                      <div className="checklist-detalhe">
                        <label>Fundamento<textarea value={valor?.fundamento || ''} onChange={e => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: { r: 'na', fundamento: e.target.value } } }))} /></label>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <ChecklistElevadorPonto
                  key={item.id}
                  item={item}
                  index={i}
                  valor={typeof valor === 'object' ? valor : null}
                  onChange={next => setForm(f => ({
                    ...f,
                    checklistRespostas: { ...f.checklistRespostas, [item.id]: next },
                  }))}
                />
              )
            })}
          </div>
        </div>
      )}

      {(isCorrectionMode || !useKaeserPipeline) && isKaeserAbcdMaq && manutencaoAtual?.tipo !== 'montagem' && (
        <div className="form-section">
          <label>
            Tipo de manutenção KAESER (A/B/C/D)
            {maq?.posicaoKaeser != null && (
              <span className="kaeser-ciclo-hint">
                Ciclo: {descricaoCicloKaeser(maq.posicaoKaeser)}
                {' '}· Próximo ciclo: {descricaoCicloKaeser(proximaPosicaoKaeser(maq.posicaoKaeser))}
              </span>
            )}
            <select
              value={form.tipoManutKaeser}
              onChange={e => aplicarTipoKaeserComPecas(e.target.value)}
            >
              <option value="">Periódica (sem plano específico)</option>
              {Object.entries(INTERVALOS_KAESER).map(([tipo, info]) => (
                <option key={tipo} value={tipo}>
                  {info.label}
                  {maq?.posicaoKaeser != null && tipoKaeserNaPosicao(maq.posicaoKaeser) === tipo ? ' ✓ (sugerido)' : ''}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {showPecasConsumiveis && (
        <div className="form-section">
          <div className="pecas-checklist-header">
            <h3>Consumíveis e peças</h3>
            {form.pecasUsadas.length > 0 && (
              <div className="pecas-checklist-actions">
                <button type="button" className="btn-checklist-all btn-marcar"
                  onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map(p => ({ ...p, usado: true })) }))}>
                  ✓ Marcar todos
                </button>
                <button type="button" className="btn-checklist-all btn-desmarcar"
                  onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map(p => ({ ...p, usado: false })) }))}>
                  ✗ Desmarcar todos
                </button>
              </div>
            )}
          </div>
          {form.pecasUsadas.length === 0 ? (
            <p className="text-muted" style={{ fontSize: '0.85rem' }}>
              Nenhum plano configurado para este tipo. Adicione consumíveis abaixo ou configure o plano em Equipamentos → Plano de peças.
            </p>
          ) : (
            <div className="pecas-checklist-lista">
              {form.pecasUsadas.map((p, idx) => (
                p.manual ? (
                  <div key={p.id ?? idx} className={`peca-checklist-row peca-manual-row${p.usado ? ' peca-usada' : ' peca-nao-usada'}`}>
                    <input type="checkbox" checked={!!p.usado}
                      onChange={e => updatePeca(idx, { usado: e.target.checked })}
                      className="peca-checkbox" aria-label={`Utilizado: ${p.descricao || p.codigoArtigo || 'artigo manual'}`} />
                    <div className="peca-checklist-manual-fields">
                      <input type="text" className="peca-manual-codigo kaeser-peca-cell" placeholder="Código"
                        value={p.codigoArtigo ?? ''}
                        onChange={e => updatePeca(idx, { codigoArtigo: e.target.value })} />
                      <input type="text" className="peca-manual-desc kaeser-peca-cell" placeholder="Descrição do artigo"
                        value={p.descricao ?? ''}
                        onChange={e => updatePeca(idx, { descricao: e.target.value })} />
                      <input type="number" min={0} step={0.5} className="peca-manual-qty kaeser-peca-cell kaeser-peca-qty"
                        value={p.quantidadeUsada ?? p.quantidade ?? 1}
                        aria-label="Quantidade"
                        onChange={e => {
                          const q = Math.max(0, parseFloat(e.target.value) || 0)
                          updatePeca(idx, { quantidadeUsada: q, quantidade: q, usado: q > 0 })
                        }} />
                      <select className="kaeser-peca-un-select peca-manual-un" value={p.unidade || 'PÇ'} aria-label="Unidade"
                        onChange={e => updatePeca(idx, { unidade: e.target.value })}>
                        {['PÇ', 'TER', 'L', 'KG', 'M', 'UN'].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <button type="button" className="icon-btn danger peca-remove-btn"
                      onClick={() => setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.filter((_, i) => i !== idx) }))} title="Remover" aria-label="Remover linha">
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <label key={p.id ?? idx} className={`peca-checklist-row${p.usado ? ' peca-usada' : ' peca-nao-usada'}`}>
                    <input type="checkbox" checked={!!p.usado}
                      onChange={e => updatePeca(idx, { usado: e.target.checked })}
                      className="peca-checkbox" />
                    <span className="peca-checklist-info">
                      {p.posicao && <span className="peca-pos">{p.posicao}</span>}
                      {p.codigoArtigo && <span className="peca-codigo">{p.codigoArtigo}</span>}
                      <span className="peca-desc">{p.descricao || '—'}</span>
                      <span className="peca-qty-un">{p.quantidadeUsada ?? p.quantidade} {p.unidade}</span>
                    </span>
                  </label>
                )
              ))}
            </div>
          )}
          <button type="button" className="btn-link-checklist" style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}
            onClick={() => setForm(f => ({
              ...f,
              pecasUsadas: [...f.pecasUsadas, {
                id: 'manual_' + Date.now(),
                posicao: '',
                codigoArtigo: '',
                descricao: '',
                quantidadeUsada: 1,
                quantidade: 1,
                unidade: 'PÇ',
                usado: true,
                manual: true,
              }],
            }))}>
            + Adicionar consumível manualmente
          </button>
        </div>
      )}
    </div>
  )
}
