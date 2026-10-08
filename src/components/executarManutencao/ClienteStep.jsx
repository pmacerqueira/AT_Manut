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
  declaracaoTitulo = '',
  declaracaoTexto = '',
  notaAmbito = null,
  exigeComunicacaoUrgente = false,
}) {
  const multiSecao = opcoesAssinanteSecao.length > 0
  const nomeNorm = normTexto(form.nomeAssinante)

  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      {isCorrectionMode && <h3 className="admin-edit-section-title">Nome do cliente</h3>}
      {!isCorrectionMode && <p className="wizard-step-hint">Indique o nome do cliente responsável pela aceitação do serviço.</p>}
      {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

      {!isCorrectionMode && (
        <>
          {notaAmbito?.aberto && notaAmbito.pontos?.length > 0 && (
            <div className="declaracao-assinatura-box">
              <p className="declaracao-assinatura-titulo">{notaAmbito.titulo || 'Âmbito e limites do serviço'}</p>
              {notaAmbito.pontos.map(ponto => (
                <p key={ponto} className="declaracao-assinatura-texto">{ponto}</p>
              ))}
            </div>
          )}
          <div className="declaracao-assinatura-box">
            <p className="declaracao-assinatura-titulo">{declaracaoTitulo || 'Declaração de aceitação'}</p>
            <p className="declaracao-assinatura-texto">
              {declaracaoTexto || resolveDeclaracaoClienteForMaquina(
                manutencaoAtual?.tipo === 'montagem' ? 'montagem' : 'periodica',
                maq,
                getSubcategoria,
                getCategoria,
              )}
            </p>
          </div>
          {!notaAmbito?.aberto && notaAmbito?.pontos?.length > 0 && (
            <details className="declaracao-assinatura-box">
              <summary>{notaAmbito.titulo || 'Âmbito e limites do serviço'}</summary>
              {notaAmbito.pontos.map(ponto => (
                <p key={ponto} className="declaracao-assinatura-texto">{ponto}</p>
              ))}
            </details>
          )}
        </>
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

      {declaracaoTitulo && (
        <>
          <label className="form-section">
            Função de quem recebe
            <input
              type="text"
              value={form.funcaoAssinante || ''}
              maxLength={80}
              placeholder="Ex.: responsável de oficina"
              onChange={e => setForm(f => ({ ...f, funcaoAssinante: e.target.value }))}
            />
          </label>
          <label className="checklist-retirada">
            <input
              type="checkbox"
              checked={!!form.assinaturaRecusada}
              onChange={e => setForm(f => ({ ...f, assinaturaRecusada: e.target.checked }))}
            />
            O cliente não assina neste momento
          </label>
          {exigeComunicacaoUrgente && (
            <label className="form-section">
              Comunicação da recomendação urgente
              <select
                value={form.comunicacaoUrgente || ''}
                onChange={e => setForm(f => ({ ...f, comunicacaoUrgente: e.target.value }))}
              >
                <option value="">—</option>
                <option value="email">Pelo envio deste relatório por email</option>
                <option value="outro">Outro canal, já nesta visita</option>
              </select>
              {form.comunicacaoUrgente === 'outro' && (
                <input
                  type="text"
                  value={form.comunicacaoUrgenteNota || ''}
                  maxLength={160}
                  placeholder="Presencial, telefone ou outro meio"
                  onChange={e => setForm(f => ({ ...f, comunicacaoUrgenteNota: e.target.value }))}
                />
              )}
              <span className="form-hint">Não depende da assinatura. O email só conta se o relatório for enviado agora.</span>
            </label>
          )}
          {form.assinaturaRecusada && (
            <label className="form-section">
              Canal alternativo da receção
              <input
                type="text"
                value={form.canalAlternativo || ''}
                maxLength={120}
                placeholder="Email, telefone ou entrega presencial"
                onChange={e => setForm(f => ({ ...f, canalAlternativo: e.target.value }))}
              />
            </label>
          )}
        </>
      )}
    </div>
  )
}
