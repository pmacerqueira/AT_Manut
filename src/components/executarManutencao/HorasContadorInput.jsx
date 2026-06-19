/**
 * Campo de leitura do contador de horas + referência da manutenção anterior.
 */
import { formatDataAzores } from '../../utils/datasAzores'

export default function HorasContadorInput({
  value,
  onChange,
  onBlur,
  horasAnterior = null,
  hint = 'Leitura acumulada no equipamento (actualiza a ficha ao concluir).',
  placeholder = 'Ex: 3050',
  required = true,
  className = 'wizard-input-horas-compact',
}) {
  return (
    <label>
      Horas no contador (acumuladas){required ? <> <span className="req-star">*</span></> : null}
      {hint ? (
        <span className="form-hint" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 400 }}>
          {hint}
        </span>
      ) : null}
      <div className="horas-contador-field-row">
        <input
          className={className}
          type="number"
          min={0}
          step={1}
          required={required}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
        />
        {horasAnterior != null && (
          <span className="horas-anterior-ref" title="Referência da intervenção anterior">
            Manutenção anterior ({formatDataAzores(horasAnterior.data)}):{' '}
            <strong>{horasAnterior.horas} h</strong>
          </span>
        )}
      </div>
    </label>
  )
}
