import { CheckCircle2, Eye, FileDown, History, Mail } from 'lucide-react'
import { formatarDataPT } from '../../utils/diasUteis'
import { getHojeAzores } from '../../utils/datasAzores'
import { isEmailConfigured } from '../../config/emailConfig'
import { MAX_FOTOS } from '../../config/limits'

/**
 * Passo final: revisão, data histórica, email e pré-visualização PDF.
 */
export default function FinalizarStep({
  visible,
  isAdmin,
  manutencaoAtual,
  form,
  setForm,
  erroAssinatura,
  resumoFinalizacao,
  emailDestinatario,
  setEmailDestinatario,
  previewLoading,
  previewPdfUrl,
  onPreviewToggle,
}) {
  return (
    <div className="wizard-step-content" style={{ display: visible ? 'block' : 'none' }}>
      <p className="wizard-step-hint">Reveja os dados, pré-visualize o relatório e finalize a manutenção.</p>
      {erroAssinatura && <p className="form-erro">{erroAssinatura}</p>}

      <div className="exec-review-panel">
        <div className="exec-review-header">
          <CheckCircle2 size={18} />
          <div>
            <strong>Revisão antes de gravar</strong>
            <p>Confirme datas, assinatura, próxima manutenção e envio antes de fechar a intervenção.</p>
          </div>
        </div>
        <div className="exec-review-grid">
          <div><span>Agendada</span><strong>{resumoFinalizacao.dataAgendada ? formatarDataPT(resumoFinalizacao.dataAgendada) : '—'}</strong></div>
          <div><span>Execução</span><strong>{resumoFinalizacao.dataExecucao ? formatarDataPT(resumoFinalizacao.dataExecucao) : '—'}</strong></div>
          <div><span>Técnico</span><strong>{resumoFinalizacao.tecnico}</strong></div>
          <div><span>Assinatura</span><strong>{resumoFinalizacao.assinatura}</strong></div>
          <div><span>Fotos</span><strong>{resumoFinalizacao.fotos}/{MAX_FOTOS}</strong></div>
          <div><span>Email</span><strong>{resumoFinalizacao.destinoEmail}</strong></div>
          <div className="exec-review-wide">
            <span>Próxima manutenção prevista</span>
            <strong>{resumoFinalizacao.proxima ? formatarDataPT(resumoFinalizacao.proxima) : '—'}</strong>
          </div>
          <div className="exec-review-wide">
            <span>Agenda futura</span>
            <strong>
              {resumoFinalizacao.periodicidade
                ? `Recalcular a partir de ${resumoFinalizacao.dataExecucao || 'hoje'}`
                : 'Sem periodicidade definida'}
            </strong>
          </div>
        </div>
      </div>

      {(isAdmin || (manutencaoAtual?.data && manutencaoAtual.data < getHojeAzores())) && (
        <div className="form-section-historica">
          <label className="historica-label">
            <History size={14} />
            Data de realização
            <span className="historica-hint">
              {isAdmin
                ? '(preencher apenas para registos históricos — deixar vazio para usar hoje)'
                : '(esta manutenção estava em atraso — pode indicar a data real de execução, ou deixar vazio para usar hoje)'}
            </span>
            <input
              type="date"
              max={getHojeAzores()}
              value={form.dataRealizacao}
              onChange={e => setForm(f => ({ ...f, dataRealizacao: e.target.value }))}
            />
          </label>
          {form.dataRealizacao && (
            <p className="historica-aviso">
              ⚠ Registo histórico: manutenção, relatório e próxima data serão registados como <strong>{form.dataRealizacao}</strong>
            </p>
          )}
        </div>
      )}

      <div className="form-section email-section">
        <h3 className="assinatura-titulo"><Mail size={16} /> Envio do comprovativo</h3>
        <label className="label-required">
          <span>Email do cliente para envio do relatório</span>
          <input
            type="email"
            value={emailDestinatario}
            onChange={e => setEmailDestinatario(e.target.value)}
            placeholder="exemplo@empresa.pt"
            autoComplete="email"
          />
          {!isEmailConfigured() && (
            <small className="email-config-aviso">
              ⚠ Endpoint de email não configurado — o botão abrirá o cliente de email local.
            </small>
          )}
        </label>

        <button type="button" className="btn-preview" onClick={onPreviewToggle} disabled={previewLoading}>
          <Eye size={15} /> {previewLoading ? 'A gerar…' : previewPdfUrl ? 'Fechar pré-visualização' : 'Pré-visualizar relatório'}
        </button>
      </div>

      {previewPdfUrl && (
        <div className="wizard-preview">
          <iframe src={previewPdfUrl} title="Pré-visualização do relatório" className="wizard-preview-iframe" />
          <div className="wizard-preview-actions">
            <button type="button" className="btn secondary btn-sm" onClick={() => window.open(previewPdfUrl, '_blank')}>
              <Eye size={14} /> Abrir noutra janela
            </button>
            <button
              type="button"
              className="btn secondary btn-sm"
              onClick={() => {
                const a = document.createElement('a')
                a.href = previewPdfUrl
                a.download = 'relatorio-manutencao.pdf'
                a.click()
              }}
            >
              <FileDown size={14} /> Transferir PDF
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
