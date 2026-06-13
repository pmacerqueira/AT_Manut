import { Bookmark } from 'lucide-react'
import { resolveDeclaracaoClienteForMaquina } from '../../constants/relatorio'

/**
 * Passo nome do cliente + declaração de aceitação.
 */
export default function ClienteStep({
  visible,
  isCorrectionMode,
  form,
  setForm,
  setErroAssinatura,
  erroAssinatura,
  manutencaoAtual,
  maq,
  cli,
  getSubcategoria,
  getCategoria,
  onGuardarNomeContacto,
}) {
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Nome do cliente</h3>}
      {!isCorrectionMode && <p className="wizard-step-hint">Indique o nome do cliente responsável pela aceitação do serviço.</p>}
      {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

      {!isCorrectionMode && (
        <div className="declaracao-assinatura-box">
          <p className="declaracao-assinatura-titulo">Declaração de aceitação</p>
          <p className="declaracao-assinatura-texto">
            {resolveDeclaracaoClienteForMaquina(
              manutencaoAtual?.tipo === 'montagem' ? 'montagem' : 'periodica',
              maq,
              getSubcategoria,
              getCategoria,
            )}
          </p>
        </div>
      )}

      <label className={`${isCorrectionMode ? '' : 'label-required'} form-section`}>
        <span>
          {isCorrectionMode ? 'Nome do cliente que assinou' : 'Nome do cliente que assina'}
          {!isCorrectionMode && <span className="req-star">*</span>}
        </span>
        <div className="campo-com-guardar">
          <input
            type="text"
            value={form.nomeAssinante}
            onChange={e => { setForm(f => ({ ...f, nomeAssinante: e.target.value })); setErroAssinatura('') }}
            placeholder="Nome completo do responsável"
            maxLength={80}
          />
          {form.nomeAssinante.trim() && (
            <button
              type="button"
              className="btn-guardar-contacto"
              onClick={onGuardarNomeContacto}
              title="Guardar este nome para futuras intervenções deste cliente"
            >
              <Bookmark size={14} />
              {cli?.nomeContacto === form.nomeAssinante.trim() ? 'Guardado' : 'Guardar'}
            </button>
          )}
        </div>
      </label>
    </div>
  )
}
