import { History, X } from 'lucide-react'
import MaquinaDocumentacaoLinks from '../MaquinaDocumentacaoLinks'
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
}) {
  const isKaeserPeriodicExec = !!(isKaeserAbcdMaq && manutencaoAtual?.tipo !== 'montagem')
  /** Em «Corrigir relatório» KAESER A/B/C/D o modal já tem tabela editável — evitar duplicar lista só-leitura. */
  const showPecasConsumiveis = !(isCorrectionMode && isKaeserPeriodicExec)
    && (isCorrectionMode || !useKaeserPipeline)
    && (form.pecasUsadas.length > 0 || (isKaeserAbcdMaq && form.tipoManutKaeser))

  const updatePeca = (idx, patch) => setForm(f => ({
    ...f,
    pecasUsadas: f.pecasUsadas.map((pp, i) => (i === idx ? { ...pp, ...patch } : pp)),
  }))

  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Checklist de verificação</h3>}
      {!isCorrectionMode && <p className="wizard-step-hint">Confirme ponto a ponto se a tarefa foi executada (Sim/Não).</p>}

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
          <span className="checklist-obrigatorio-badge">✱ Preenchimento obrigatório — todos os itens Sim / Não</span>
          <div className="checklist-quick-actions">
            <button type="button" className="btn-link-checklist"
              onClick={() => {
                const all = {}
                items.forEach(it => { all[it.id] = 'sim' })
                setForm(f => ({ ...f, checklistRespostas: all }))
              }}>
              Marcar todos
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
          <div className="checklist-respostas">
            {items.map((item, i) => (
              <div key={item.id} className="checklist-item-row">
                <span className="checklist-item-num">{i + 1}.</span>
                <span className="checklist-item-texto">{item.texto}</span>
                <div className="checklist-item-btns">
                  <button type="button"
                    className={`btn-simnao ${form.checklistRespostas[item.id] === 'sim' ? 'active-sim' : ''}`}
                    onClick={() => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: 'sim' } }))}>
                    Sim
                  </button>
                  <button type="button"
                    className={`btn-simnao ${form.checklistRespostas[item.id] === 'nao' ? 'active-nao' : ''}`}
                    onClick={() => setForm(f => ({ ...f, checklistRespostas: { ...f.checklistRespostas, [item.id]: 'nao' } }))}>
                    Não
                  </button>
                </div>
              </div>
            ))}
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
