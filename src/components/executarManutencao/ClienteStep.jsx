import { Bookmark } from 'lucide-react'
import { resolveDeclaracaoClienteForMaquina } from '../../constants/relatorio'
import { normTexto } from '../../domain/clienteAssinantesSecao.js'

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
  opcoesAssinanteSecao = [],
  secaoDetectada = null,
  onSelecionarAssinanteSecao,
}) {
  const multiSecao = opcoesAssinanteSecao.length > 0
  const nomeNorm = normTexto(form.nomeAssinante)

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

      {multiSecao && !isCorrectionMode && (
        <div className="form-section assinante-secao-block">
          <span className="assinante-secao-label">
            Secção do equipamento
            {secaoDetectada && (
              <span className="assinante-secao-detectada">
                — detectada: {secaoDetectada === 'colisao' ? 'Colisão' : 'Mecânica'}
              </span>
            )}
          </span>
          <div className="assinante-secao-opcoes" role="group" aria-label="Responsável pela secção">
            {opcoesAssinanteSecao.map(opcao => {
              const activo = nomeNorm === normTexto(opcao.nomeAssinante)
              return (
                <button
                  key={opcao.secao}
                  type="button"
                  className={`assinante-secao-chip${activo ? ' assinante-secao-chip--activo' : ''}`}
                  onClick={() => onSelecionarAssinanteSecao?.(opcao)}
                  title={opcao.assinaturaDigital ? 'Carregar assinatura histórica' : 'Sem assinatura histórica — assinar manualmente'}
                >
                  {opcao.label || opcao.nomeAssinante}
                </button>
              )
            })}
          </div>
          <p className="form-hint assinante-secao-hint">
            Escolha o responsável da secção. A assinatura histórica é reposta automaticamente quando existir.
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
            readOnly={multiSecao && !isCorrectionMode}
          />
          {!multiSecao && form.nomeAssinante.trim() && (
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
