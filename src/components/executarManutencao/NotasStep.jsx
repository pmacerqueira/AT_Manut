/**
 * Passo observações / notas rápidas do wizard de execução.
 */
export default function NotasStep({
  visible,
  isCorrectionMode,
  step,
  stepNotas,
  form,
  setForm,
  quickNotes,
  confirmacaoPendente,
  setConfirmacaoPendente,
  erroChecklist,
}) {
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Observações</h3>}
      {!isCorrectionMode && (
        <p className="wizard-step-hint">
          As observações são <strong>obrigatórias</strong>. Use uma nota rápida ou escreva uma nota livre descritiva.
        </p>
      )}
      <label className="form-section">
        Notas importantes <span className="char-count">({form.notas.length}/300)</span>
        <textarea
          value={form.notas}
          onChange={e => {
            setForm(f => ({ ...f, notas: e.target.value.slice(0, 300) }))
            if (confirmacaoPendente) setConfirmacaoPendente(null)
          }}
          rows={6}
          className="textarea-full"
          maxLength={300}
          placeholder="Descreva o trabalho. Pode tocar numa nota rápida ou escrever texto livre suficiente…"
        />
      </label>

      <div className="quick-notes-section">
        <span className="quick-notes-label">Notas rápidas — toque para acelerar; texto livre também é aceite se for descritivo:</span>
        <div className="quick-notes-chips">
          {quickNotes.map((note, i) => {
            const isIncluded = form.notas.includes(note)
            return (
              <button key={i} type="button"
                className={`quick-note-chip${isIncluded ? ' quick-note-chip--active' : ''}`}
                onClick={() => {
                  setForm(f => {
                    const current = f.notas.trim()
                    const sep = current ? '\n' : ''
                    return { ...f, notas: (current + sep + note).slice(0, 300) }
                  })
                  if (confirmacaoPendente) setConfirmacaoPendente(null)
                }}>{isIncluded && '✓ '}{note}</button>
            )
          })}
        </div>
      </div>
      {!isCorrectionMode && step === stepNotas && erroChecklist && <p className="form-erro">{erroChecklist}</p>}
    </div>
  )
}
