/**
 * Passo seleção de técnico no wizard de execução.
 */
export default function TecnicoStep({
  visible,
  isCorrectionMode,
  form,
  setForm,
  setErroAssinatura,
  nomesTecnicos,
  erroAssinatura,
}) {
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Técnico</h3>}
      {!isCorrectionMode && <p className="wizard-step-hint">Selecione o técnico responsável pela manutenção.</p>}
      {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}
      <label className="label-required form-section">
        <span>Técnico que realizou a manutenção <span className="req-star">*</span></span>
        <select
          value={form.tecnico}
          onChange={e => { setForm(f => ({ ...f, tecnico: e.target.value })); setErroAssinatura('') }}
        >
          <option value="">— Selecionar técnico —</option>
          {nomesTecnicos.map(nome => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
      </label>
    </div>
  )
}
