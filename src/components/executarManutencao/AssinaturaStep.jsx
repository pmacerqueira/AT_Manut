import { Bookmark, Trash2 } from 'lucide-react'

/**
 * Passo assinatura digital do cliente (canvas ou modo correcção admin).
 */
export default function AssinaturaStep({
  visible,
  isCorrectionMode,
  isAdmin,
  rel,
  form,
  setForm,
  erroAssinatura,
  assinaturaFeita,
  canvasRef,
  startDraw,
  draw,
  stopDraw,
  onLimparAssinatura,
  onGuardarAssinaturaContacto,
}) {
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode ? (
        <>
          <h3 className="admin-edit-section-title">Assinatura digital</h3>
          {rel?.assinaturaDigital && !form.limparAssinatura ? (
            <div className="admin-edit-assinatura-preview">
              <img src={rel.assinaturaDigital} alt="Assinatura do cliente" className="assinatura-preview-img" />
              <div className="assinatura-preview-info">
                <span className="assinatura-ok">Assinado por: {rel.nomeAssinante || '(sem nome)'}</span>
                <button
                  type="button"
                  className="btn danger btn-sm"
                  style={{ marginTop: '0.5rem' }}
                  onClick={() => setForm(f => ({ ...f, nomeAssinante: '', limparAssinatura: true }))}
                >
                  <Trash2 size={13} /> Limpar assinatura
                </button>
                <span className="form-hint" style={{ display: 'block', marginTop: '0.35rem' }}>
                  Após limpar, use &quot;Recolher assinatura&quot; para obter nova assinatura do cliente.
                </span>
              </div>
            </div>
          ) : form.limparAssinatura ? (
            <div className="admin-edit-assinatura-cleared">
              <p className="form-hint">Assinatura será removida ao guardar. Use depois &quot;Recolher assinatura&quot; no menu da manutenção.</p>
              <button
                type="button"
                className="btn secondary btn-sm"
                onClick={() => setForm(f => ({ ...f, nomeAssinante: rel?.nomeAssinante || '', limparAssinatura: false }))}
              >
                Cancelar remoção
              </button>
            </div>
          ) : (
            <p className="form-hint">Sem assinatura registada.</p>
          )}
        </>
      ) : (
        <>
          <p className="wizard-step-hint">O cliente deve assinar digitalmente para confirmar a aceitação do serviço.</p>
          {rel?.assinaturaDigital && (
            <p className="wizard-step-hint" style={{ marginTop: '0.35rem', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>
              Se o relatório já tinha assinatura, ela é reposta abaixo. Use «Limpar assinatura» para o cliente voltar a assinar, se necessário.
            </p>
          )}
          {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

          <div className="assinatura-canvas-wrap">
            <div className="assinatura-canvas-label">
              Assinatura digital do cliente {!isAdmin && <span className="req-star">*</span>}
            </div>
            <canvas
              ref={canvasRef}
              width={480}
              height={140}
              className={`assinatura-canvas ${assinaturaFeita ? 'assinatura-canvas--feita' : ''}`}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={stopDraw}
            />
            <div className="assinatura-canvas-actions">
              <button type="button" className="btn-link-checklist assinatura-limpar" onClick={onLimparAssinatura}>
                <Trash2 size={12} /> Limpar assinatura
              </button>
              {assinaturaFeita && (
                <>
                  <span className="assinatura-ok">✓ Assinatura registada</span>
                  <button
                    type="button"
                    className="btn-guardar-contacto"
                    onClick={onGuardarAssinaturaContacto}
                    title="Guardar esta assinatura para futuras intervenções deste cliente"
                  >
                    <Bookmark size={14} /> Guardar assinatura
                  </button>
                </>
              )}
            </div>
          </div>
          {isAdmin && !assinaturaFeita && (
            <p className="wizard-step-hint" style={{ marginTop: '0.75rem', fontStyle: 'italic' }}>
              Como Admin, pode avançar sem assinatura e gravar posteriormente.
            </p>
          )}
        </>
      )}
    </div>
  )
}
