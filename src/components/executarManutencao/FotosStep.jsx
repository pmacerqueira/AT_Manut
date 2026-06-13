import { AlertTriangle, Camera, FolderOpen, X } from 'lucide-react'
import { MAX_FOTOS } from '../../config/limits'

/**
 * Passo fotografias do wizard de execução.
 */
export default function FotosStep({
  visible,
  isCorrectionMode,
  fotos,
  fotoCarregando,
  fotoCameraRef,
  fotoInputRef,
  handleFotoChange,
  removerFoto,
  confirmacaoPendente,
  setConfirmacaoPendente,
  onConfirmAdvance,
}) {
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Fotografias</h3>}
      {!isCorrectionMode && <p className="wizard-step-hint">Adicione fotografias de apoio à manutenção.</p>}
      <div className="form-section fotos-section">
        <div className="fotos-header">
          <span className="fotos-label">
            Fotografias de apoio
            <span className="fotos-count"> ({fotos.length}/{MAX_FOTOS})</span>
          </span>
          {fotos.length < MAX_FOTOS && !fotoCarregando && (
            <div className="fotos-btns">
              <input ref={fotoCameraRef} type="file" accept="image/*" capture="environment" className="fotos-input-hidden" onChange={handleFotoChange} />
              <button type="button" className="btn-foto" onClick={() => fotoCameraRef.current?.click()}>
                <Camera size={15} /> Tirar foto
              </button>
              <input ref={fotoInputRef} type="file" accept="image/*" multiple className="fotos-input-hidden" onChange={handleFotoChange} />
              <button type="button" className="btn-foto btn-foto-gallery" onClick={() => fotoInputRef.current?.click()}>
                <FolderOpen size={15} /> Galeria
              </button>
            </div>
          )}
          {fotoCarregando && <span className="fotos-loading">A processar…</span>}
        </div>
        <p className="fotos-limite-hint">
          Máximo de <strong>{MAX_FOTOS}</strong> fotografias por relatório (PDF e envio por email). As imagens são comprimidas no dispositivo.
          {fotos.length >= MAX_FOTOS && (
            <span className="fotos-limite-atingido"> Limite atingido — remova uma foto para adicionar outra.</span>
          )}
        </p>
        {fotos.length > 0 && (
          <div className="fotos-grid">
            {fotos.map((src, idx) => (
              <div key={idx} className="foto-thumb">
                <img src={src} alt={`Foto ${idx + 1}`} />
                <button type="button" className="foto-remover" onClick={() => removerFoto(idx)} aria-label={`Remover foto ${idx + 1}`}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {fotos.length === 0 && <p className="fotos-vazio">Nenhuma fotografia adicionada.</p>}
      </div>
      {confirmacaoPendente === 'fotos' && (
        <div className="wizard-confirm">
          <AlertTriangle size={16} />
          <span>Pretende continuar sem fotografias?</span>
          <div className="wizard-confirm-actions">
            <button type="button" className="btn primary btn-sm" onClick={onConfirmAdvance}>
              Sim, avançar
            </button>
            <button type="button" className="btn secondary btn-sm" onClick={() => setConfirmacaoPendente(null)}>
              Não
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
