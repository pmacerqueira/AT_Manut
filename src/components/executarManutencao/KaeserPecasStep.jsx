/**
 * Passo «Consumíveis» KAESER A/B/C/D do assistente de execução (extraído de ExecutarManutencaoModal).
 * Estado no modal-pai; aqui apenas a tabela editável de peças e a confirmação «sem consumíveis».
 */
import { X, Plus } from 'lucide-react'

export default function KaeserPecasStep({
  form,
  setForm,
  setKaeserPecasDirty,
  kaeserSemConsumiveis,
  setKaeserSemConsumiveis,
  erroChecklist,
}) {
  return (
    <div className="wizard-step-content">
      <p className="wizard-step-hint">
        Lista do plano para o <strong>Tipo {form.tipoManutKaeser || '—'}</strong>. Pré-preenchida com <strong>1 un.</strong> por linha — ajuste as quantidades (0 = não aplicável) ou acrescente artigos extra.
      </p>
      <div className="kaeser-pecas-table-wrap">
        {form.pecasUsadas.length === 0 ? (
          <p className="text-muted">Nenhum consumível no plano para este tipo. Adicione linhas manualmente ou configure o plano em Equipamentos.</p>
        ) : (
          <table className="data-table kaeser-pecas-table">
            <thead><tr><th>Cód.</th><th>Descrição</th><th className="col-peca-qtd">Qtd</th><th className="col-peca-un">Un.</th><th className="col-peca-act" aria-label="Acções" /></tr></thead>
            <tbody>
              {form.pecasUsadas.map((p, idx) => (
                <tr key={p.id ?? `k-${idx}`}>
                  <td><input className="kaeser-peca-cell" value={p.codigoArtigo ?? ''} onChange={e => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, codigoArtigo: e.target.value } : pp) })) }} /></td>
                  <td><input className="kaeser-peca-cell" value={p.descricao ?? ''} onChange={e => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, descricao: e.target.value } : pp) })) }} /></td>
                  <td className="col-peca-qtd">
                    <input type="number" min={0} step={0.5} className="kaeser-peca-cell kaeser-peca-qty"
                      value={p.quantidadeUsada ?? p.quantidade ?? 0}
                      onChange={e => {
                        const q = Math.max(0, parseFloat(e.target.value) || 0)
                        setKaeserPecasDirty(true)
                        setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, quantidadeUsada: q, quantidade: q, usado: q > 0 } : pp) }))
                      }}
                    />
                  </td>
                  <td className="col-peca-un">
                    <select className="kaeser-peca-un-select" value={p.unidade || 'PÇ'} aria-label={`Unidade da linha ${idx + 1}`} onChange={e => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.map((pp, i) => i === idx ? { ...pp, unidade: e.target.value } : pp) })) }}>
                      {['PÇ', 'TER', 'L', 'KG', 'M', 'UN'].map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className="col-peca-act">
                    <button type="button" className="icon-btn danger" aria-label="Remover linha" onClick={() => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: f.pecasUsadas.filter((_, i) => i !== idx) })) }}><X size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button type="button" className="btn secondary btn-sm" style={{ marginTop: '0.5rem' }}
          onClick={() => { setKaeserPecasDirty(true); setForm(f => ({ ...f, pecasUsadas: [...f.pecasUsadas, { id: 'manual_' + Date.now(), posicao: '', codigoArtigo: '', descricao: '', quantidadeUsada: 1, quantidade: 1, unidade: 'PÇ', usado: true, manual: true }] })) }}>
          <Plus size={14} /> Adicionar linha
        </button>
      </div>
      <label className="exec-equip-confirm-label form-section" style={{ marginTop: '0.75rem' }}>
        <input
          type="checkbox"
          checked={kaeserSemConsumiveis}
          onChange={e => setKaeserSemConsumiveis(e.target.checked)}
        />
        <span>Confirmo que nesta intervenção não houve substituição nem consumo de materiais do plano (lista vazia ou só inspecção).</span>
      </label>
      {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
    </div>
  )
}
