import { ehMensagemCorrecaoRelevante } from '../../domain/relatorioElevadorPreventivo'

/**
 * Passo observações / notas rápidas do wizard de execução.
 */
export default function NotasStep({
  visible,
  isCorrectionMode,
  modoElevador = false,
  step,
  stepNotas,
  form,
  setForm,
  quickNotes,
  confirmacaoPendente,
  setConfirmacaoPendente,
  erroChecklist,
}) {
  const avisoCorrecao = ehMensagemCorrecaoRelevante(erroChecklist) ? erroChecklist : ''
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Observações</h3>}
      {!isCorrectionMode && (
        <p className="wizard-step-hint">
          As observações são <strong>obrigatórias</strong>. Use uma nota rápida ou escreva uma nota livre descritiva.
        </p>
      )}
      {modoElevador && (
        <>
          <label className="form-section notas-correcao">
            Foi realizada alguma correção ou reparação relevante nesta manutenção preventiva?
            <select
              aria-required="true"
              value={form.correcaoRelevante || ''}
              onChange={e => {
                const valor = e.target.value
                setForm(f => ({
                  ...f,
                  correcaoRelevante: valor,
                  correcaoRelevanteDescricao: valor === 'sim' ? (f.correcaoRelevanteDescricao || '') : '',
                }))
                if (confirmacaoPendente) setConfirmacaoPendente(null)
              }}
            >
              <option value="">Escolher...</option>
              <option value="sim">Sim</option>
              <option value="nao">Não</option>
            </select>
          </label>
          {avisoCorrecao && <p className="form-erro">{avisoCorrecao}</p>}
          {form.correcaoRelevante === 'sim' && (
            <label className="form-section notas-correcao">
              Descreva a correção ou reparação realizada
              <span className="req-star">*</span>
              <textarea
                aria-required="true"
                value={form.correcaoRelevanteDescricao || ''}
                onChange={e => {
                  setForm(f => ({ ...f, correcaoRelevanteDescricao: e.target.value.slice(0, 400) }))
                  if (confirmacaoPendente) setConfirmacaoPendente(null)
                }}
                rows={4}
                className="textarea-full"
                maxLength={400}
                placeholder="Escreva o que foi corrigido ou reparado nesta visita"
              />
            </label>
          )}
        </>
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
      {!avisoCorrecao && !isCorrectionMode && step === stepNotas && erroChecklist && <p className="form-erro">{erroChecklist}</p>}
    </div>
  )
}
