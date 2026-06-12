/**
 * Passo «Horas e fase KAESER» do assistente de execução (extraído de ExecutarManutencaoModal).
 * Todo o estado vive no modal-pai; este componente é puramente apresentacional + callbacks.
 */
import { AlertTriangle, HelpCircle } from 'lucide-react'
import { INTERVALOS_KAESER } from '../../domain/equipamentoDomain'
import {
  KAESER_INTERVALO_HORAS_REF,
  KAESER_ANUAL_MIN_DIAS,
  tipoKaeserSugeridoPorHorasServico,
  descricaoCicloKaeser,
  proximaPosicaoKaeser,
} from '../../constants/kaeserCiclo.js'
import { sugerirFaseKaeser } from '../../utils/sugerirFaseKaeser.js'
import { getHojeAzores } from '../../utils/datasAzores'

export default function KaeserHorasStep({
  maq,
  form,
  setForm,
  showToast,
  conflitoHorasFichaVsUltimoRel,
  fallbackUltimaManutDataKaeser,
  temManutencaoConcluidaNaMaq,
  kaeserAuditoriaRef,
  kaeserIntervencaoAnual,
  setKaeserIntervencaoAnual,
  kaeserSugestaoLive,
  kaeserCalcDetalhesOpen,
  setKaeserCalcDetalhesOpen,
  aplicarTipoKaeserComPecas,
  pecasDoPlanoKaeser,
  erroChecklist,
}) {
  return (
    <div className="wizard-step-content" data-testid="kaeser-passo-horas">
      <p className="wizard-step-hint">
        Leia o <strong>contador de horas de serviço</strong>. A app combina <strong>Δh desde a última referência</strong> na ficha com a <strong>janela anual ({KAESER_ANUAL_MIN_DIAS} d)</strong> — sugere o tipo A/B/C/D; pode sempre alterar.
        <button
          type="button"
          className="btn-icon-hint kaeser-help-btn"
          aria-label="Ajuda: o que ocorrer primeiro (horas ou ano)"
          title="Regra: o que ocorrer primeiro — manutenção ao atingir o intervalo de horas do plano, ou pelo menos uma vez por ano se esse intervalo ainda não foi atingido. A sugestão não é obrigatória."
          onClick={() => showToast(`O que ocorrer primeiro: intervalo de horas (ex.: Δh ≥ ${KAESER_INTERVALO_HORAS_REF}) ou visita anual (≥ ${KAESER_ANUAL_MIN_DIAS} dias desde a última). Pode alterar o tipo e os consumíveis.`, 'info', 3500)}
        >
          <HelpCircle size={18} />
        </button>
      </p>
      {conflitoHorasFichaVsUltimoRel && (
        <div className="wizard-confirm" style={{ marginBottom: '0.75rem' }}>
          <AlertTriangle size={16} />
          <span>
            Diferença entre ficha e último relatório: ficha indica <strong>{conflitoHorasFichaVsUltimoRel.hm} h</strong> de serviço;
            última manutenção concluída ({conflitoHorasFichaVsUltimoRel.last.data}) registou <strong>{conflitoHorasFichaVsUltimoRel.hr} h</strong>.
            Confirme a referência antes de interpretar Δh.
          </span>
        </div>
      )}
      <div className="form-section">
        <label>
          Horas no contador (acumuladas) <span className="req-star">*</span>
          <span className="form-hint" style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 400 }}>
            Valor acumulado no compressor — usado para Δh e para a sugestão de fase A/B/C/D.
          </span>
          <input
            className="wizard-input-horas-compact"
            type="number"
            min={0}
            step={1}
            required
            value={form.horasServico}
            onChange={e => setForm(f => ({ ...f, horasServico: e.target.value }))}
            onBlur={() => {
              const hs = parseInt(String(form.horasServico).trim(), 10)
              if (!Number.isFinite(hs) || hs < 0) return
              const sug = sugerirFaseKaeser({
                maquina: maq,
                horasServicoAtuais: hs,
                dataExecucao: getHojeAzores(),
                fallbackUltimaData: fallbackUltimaManutDataKaeser,
                contadorFichaConfiavel: temManutencaoConcluidaNaMaq,
              })
              kaeserAuditoriaRef.current = { tipoSugerido: sug.tipoPreSelecao, motivo: sug.motivoPrincipal }
              if (kaeserIntervencaoAnual) return
              setForm(f => ({
                ...f,
                tipoManutKaeser: f.tipoManutKaeser || sug.tipoPreSelecao,
                pecasUsadas: f.tipoManutKaeser ? f.pecasUsadas : pecasDoPlanoKaeser(sug.tipoPreSelecao),
              }))
            }}
            placeholder="Ex: 6200"
          />
        </label>
      </div>
      <div className="form-section" style={{ marginTop: '0.25rem' }}>
        <label className="kaeser-anual-checkbox" style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', cursor: 'pointer', fontSize: '0.95rem' }}>
          <input
            type="checkbox"
            checked={kaeserIntervencaoAnual}
            onChange={e => setKaeserIntervencaoAnual(e.target.checked)}
            style={{ marginTop: '0.2rem' }}
          />
          <span>
            <strong>Intervenção anual</strong> — escolher livremente o kit (A/B/C/D). A sugestão automática deixa de alterar o tipo ao sair do campo das horas; escolha o kit no menu abaixo e carregue os consumíveis desse tipo.
          </span>
        </label>
      </div>
      {kaeserSugestaoLive?.tipoIndicadoPorContadorHoras && (
        <div className="form-section kaeser-aviso-tipo-horas" style={{
          marginTop: '0.35rem',
          padding: '0.6rem 0.75rem',
          borderRadius: 8,
          border: '1px solid var(--color-border, #e5e7eb)',
          background: 'var(--color-bg-elevated, #f8fafc)',
          fontSize: '0.9rem',
          lineHeight: 1.45,
        }}
        >
          Pelo número de horas indicado no contador, o tipo associado ao <strong>intervalo de horas</strong> do plano seria{' '}
          <strong>Tipo {kaeserSugestaoLive.tipoIndicadoPorContadorHoras}</strong>
          {INTERVALOS_KAESER[kaeserSugestaoLive.tipoIndicadoPorContadorHoras]
            ? ` (${INTERVALOS_KAESER[kaeserSugestaoLive.tipoIndicadoPorContadorHoras].label})`
            : ''}.
          {kaeserIntervencaoAnual
            ? ' Na intervenção anual pode manter este tipo ou seleccionar outro (A, B, C ou D) conforme a decisão no local.'
            : ' Pode aceitar a sugestão do resumo abaixo ou seleccionar outro tipo se a intervenção for diferente (ex.: emergência, outro kit).'}
        </div>
      )}
      {kaeserSugestaoLive && (
        <div className="form-section kaeser-sugestao-resumo">
          <p className="form-hint" style={{ marginTop: 0 }}>
            <strong>Sugestão:</strong>{' '}
            {kaeserSugestaoLive.motivoPrincipal === 'ambos' && 'calendário e horas indicam tipos diferentes — escolha abaixo.'}
            {kaeserSugestaoLive.motivoPrincipal === 'anual' && `janela anual (≥ ${KAESER_ANUAL_MIN_DIAS} d desde a referência).`}
            {kaeserSugestaoLive.motivoPrincipal === 'horas' && `Δh ≥ ${KAESER_INTERVALO_HORAS_REF} h desde a última referência na ficha.`}
            {kaeserSugestaoLive.motivoPrincipal === 'fallback' && 'sem critério anual/Δh — fallback pelo contador absoluto.'}
            {' '}
            <strong>Tipo pré-seleccionado: {kaeserSugestaoLive.tipoPreSelecao}</strong>
          </p>
          {kaeserSugestaoLive.mostrarDual && kaeserSugestaoLive.tipoSugeridoCalendario && kaeserSugestaoLive.tipoSugeridoHoras && (
            <div className="kaeser-dual-sugestao">
              <button
                type="button"
                className="btn secondary btn-sm"
                onClick={() => {
                  const t = kaeserSugestaoLive.tipoSugeridoCalendario
                  kaeserAuditoriaRef.current = { tipoSugerido: t, motivo: 'anual' }
                  aplicarTipoKaeserComPecas(t, { skipDirtyConfirm: true })
                }}
              >
                Aplicar sugestão (calendário): Tipo {kaeserSugestaoLive.tipoSugeridoCalendario}
              </button>
              <button
                type="button"
                className="btn secondary btn-sm"
                onClick={() => {
                  const t = kaeserSugestaoLive.tipoSugeridoHoras
                  kaeserAuditoriaRef.current = { tipoSugerido: t, motivo: 'horas' }
                  aplicarTipoKaeserComPecas(t, { skipDirtyConfirm: true })
                }}
              >
                Aplicar sugestão (horas): Tipo {kaeserSugestaoLive.tipoSugeridoHoras}
              </button>
            </div>
          )}
          <button
            type="button"
            className="btn-link-checklist"
            data-testid="kaeser-toggle-detalhes"
            onClick={() => setKaeserCalcDetalhesOpen(o => !o)}
          >
            {kaeserCalcDetalhesOpen ? 'Ocultar detalhes do cálculo' : 'Detalhes do cálculo'}
          </button>
          {kaeserCalcDetalhesOpen && (
            <ul className="kaeser-calc-detalhes text-muted" style={{ fontSize: '0.85rem', margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
              <li>Data de referência: {kaeserSugestaoLive.detalhes.dataUltimaReferencia ?? '—'}</li>
              <li>Dias desde a referência: {kaeserSugestaoLive.detalhes.diasDesdeUltima ?? '—'}</li>
              <li>
                Horas na ficha (última):{' '}
                {kaeserSugestaoLive.detalhes.contadorFichaConfiavel
                  ? (kaeserSugestaoLive.detalhes.horasUltima ?? '—')
                  : '0'}
                {!kaeserSugestaoLive.detalhes.contadorFichaConfiavel && (
                  <span className="text-muted"> (sem manutenção concluída — valores da ficha ignorados)</span>
                )}
              </li>
              <li>Δh (actual − ficha): {kaeserSugestaoLive.detalhes.deltaH ?? '—'}</li>
              <li>Limiar horas: {KAESER_INTERVALO_HORAS_REF} h · Limiar anual: {KAESER_ANUAL_MIN_DIAS} d</li>
              {kaeserSugestaoLive.tipoSugeridoCalendario && (
                <li>Sugestão por calendário (posição ciclo): Tipo {kaeserSugestaoLive.tipoSugeridoCalendario}</li>
              )}
              {kaeserSugestaoLive.tipoSugeridoHoras && (
                <li>Sugestão por Δh: Tipo {kaeserSugestaoLive.tipoSugeridoHoras}</li>
              )}
            </ul>
          )}
        </div>
      )}
      <div className="form-section">
        <label>
          Tipo de manutenção KAESER (A/B/C/D) <span className="req-star">*</span>
          <select
            value={form.tipoManutKaeser}
            onChange={e => aplicarTipoKaeserComPecas(e.target.value)}
          >
            <option value="">— Seleccionar —</option>
            {Object.entries(INTERVALOS_KAESER).map(([tipo, info]) => (
              <option key={tipo} value={tipo}>{info.label}</option>
            ))}
          </select>
        </label>
        <p className="form-hint" style={{ marginTop: '0.35rem' }}>
          Fallback absoluto (sem Δh fiável):{' '}
          <strong>
            {(() => {
              const hs = parseInt(String(form.horasServico).trim(), 10)
              return Number.isFinite(hs) && hs >= 0
                ? `Tipo ${tipoKaeserSugeridoPorHorasServico(hs)}`
                : '— (preencha as horas de serviço)'
            })()}
          </strong>
          {maq?.posicaoKaeser != null && (
            <>
              {' '}
              <span className="kaeser-ciclo-hint">
                · Ciclo na ficha: {descricaoCicloKaeser(maq.posicaoKaeser)}
                {' '}· Próximo: {descricaoCicloKaeser(proximaPosicaoKaeser(maq.posicaoKaeser))}
              </span>
            </>
          )}
        </p>
      </div>
      {erroChecklist && <p className="form-erro">{erroChecklist}</p>}
    </div>
  )
}
