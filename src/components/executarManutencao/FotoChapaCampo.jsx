import { useRef } from 'react'
import { Camera } from 'lucide-react'

/** Foto da chapa de identificação: cópia no telemóvel e no relatório. */
export default function FotoChapaCampo({ fotoChapa = '', carregando = false, onChange, inputRef }) {
  const localRef = useRef(null)
  const ref = inputRef || localRef
  return (
    <div className="checklist-chapa">
      <span className="label-required">Foto da chapa de identificação</span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="fotos-input-hidden"
        data-testid="foto-chapa-input"
        onChange={onChange}
      />
      <button type="button" className="btn-foto" disabled={carregando} onClick={() => ref.current?.click()}>
        <Camera size={15} /> {fotoChapa ? 'Tirar outra foto da chapa' : 'Tirar foto da chapa'}
      </button>
      {carregando && <span className="fotos-loading">A processar…</span>}
      {fotoChapa && (
        <div className="foto-thumb checklist-chapa-thumb">
          <img src={fotoChapa} alt="Chapa de identificação" />
        </div>
      )}
      <p className="fotos-limite-hint">A cópia fica na pasta Transferências do telemóvel e entra no PDF com as outras fotos.</p>
    </div>
  )
}
