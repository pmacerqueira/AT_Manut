import { useRef } from 'react'
import { Camera, FolderOpen } from 'lucide-react'

/**
 * Foto da chapa de identificação: câmara (fica cópia em Transferências) ou galeria
 * (usa a imagem já existente). Em ambos os casos a imagem é reduzida antes de seguir
 * para o relatório (`comprimirFotoParaRelatorio`).
 *
 * `onChange(e, origem)` — `origem` é `'camara'` ou `'galeria'`.
 */
export default function FotoChapaCampo({ fotoChapa = '', carregando = false, onChange, inputRef }) {
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const galeriaRef = useRef(null)
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
        onChange={(e) => onChange?.(e, 'camara')}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="fotos-input-hidden"
        data-testid="foto-chapa-galeria-input"
        onChange={(e) => onChange?.(e, 'galeria')}
      />
      <div className="fotos-btns checklist-chapa-btns">
        <button type="button" className="btn-foto" disabled={carregando} onClick={() => ref.current?.click()}>
          <Camera size={15} /> {fotoChapa ? 'Tirar outra foto da chapa' : 'Tirar foto da chapa'}
        </button>
        <button
          type="button"
          className="btn-foto btn-foto-gallery"
          disabled={carregando}
          onClick={() => galeriaRef.current?.click()}
          aria-label="Escolher foto da chapa na galeria"
        >
          <FolderOpen size={15} /> Galeria
        </button>
      </div>
      {carregando && <span className="fotos-loading">A processar…</span>}
      {fotoChapa && (
        <div className="foto-thumb checklist-chapa-thumb">
          <img src={fotoChapa} alt="Chapa de identificação" />
        </div>
      )}
      <p className="fotos-limite-hint">
        Da câmara fica uma cópia na pasta Transferências do telemóvel. A imagem é reduzida automaticamente
        antes de entrar no relatório, mesmo que o original da galeria tenha vários MB.
      </p>
    </div>
  )
}
