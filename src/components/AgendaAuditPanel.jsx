/**
 * Painel admin — auditoria de lapsos na agenda periódica.
 */
import { useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Search, AlertTriangle, CheckCircle, Copy, ExternalLink } from 'lucide-react'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'
import {
  auditarAgendaPeriodica,
  AGENDA_AUDIT_TIPOS,
  formatAgendaAuditReportText,
} from '../domain/agendaAuditDomain.js'
import { getHojeAzores } from '../utils/datasAzores.js'
import { logger } from '../utils/logger.js'

const SEVERIDADE_CLASS = {
  alta: 'agenda-audit-sev--alta',
  media: 'agenda-audit-sev--media',
  baixa: 'agenda-audit-sev--baixa',
}

export default function AgendaAuditPanel() {
  const { maquinas, manutencoes, clientes, subcategorias, categorias } = useData()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)

  const result = useMemo(() => {
    if (!expanded) return null
    return auditarAgendaPeriodica({
      maquinas,
      manutencoes,
      clientes,
      subcategorias,
      categorias,
      hojeStr: getHojeAzores(),
    })
  }, [expanded, maquinas, manutencoes, clientes, subcategorias, categorias])

  const handleAnalisar = useCallback(() => {
    setExpanded(true)
    logger.action('AgendaAuditPanel', 'analisar', 'Auditoria agenda periódica')
  }, [])

  const handleCopy = useCallback(async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(formatAgendaAuditReportText(result))
      showToast('Relatório copiado para a área de transferência.', 'success')
    } catch {
      showToast('Não foi possível copiar o relatório.', 'error')
    }
  }, [result, showToast])

  const goEquipamento = useCallback((issue) => {
    if (issue.maquinaId) {
      navigate(`/equipamentos?qr=${encodeURIComponent(issue.maquinaId)}`)
    }
  }, [navigate])

  return (
    <section className="def-section agenda-audit-section">
      <h2 className="def-section-title">
        <ClipboardList size={17} />
        Auditoria da agenda periódica
      </h2>
      <p className="def-section-desc">
        Varrimento completo além do «Sincronizar agenda»: detecta buracos entre manutenções concluídas,
        saltos Abr→Out sem trimestre intermédio, slots que a sync criaria em atraso e fichas desalinhadas.
      </p>

      <div className="agenda-audit-actions">
        <button type="button" className="def-btn def-btn--primary def-btn--sm" onClick={handleAnalisar}>
          <Search size={16} />
          {expanded ? 'Actualizar análise' : 'Analisar agenda'}
        </button>
        {result && (
          <button type="button" className="def-btn def-btn--secondary def-btn--sm" onClick={handleCopy}>
            <Copy size={16} />
            Copiar relatório
          </button>
        )}
      </div>

      {result && (
        <>
          <div className={`def-alert ${result.resumo.limpo ? 'def-alert--info' : 'def-alert--warn'}`}>
            {result.resumo.limpo ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <div>
              {result.resumo.limpo ? (
                <>
                  <strong>Nenhuma anomalia</strong> — {result.analisadas} equipamento(s) periódicos analisados
                  ({result.hojeStr}).
                </>
              ) : (
                <>
                  <strong>{result.resumo.total} anomalia(s)</strong> em {result.analisadas} equipamento(s)
                  ({result.hojeStr}).
                  {' '}Buracos concluídas: {result.resumo.porTipo.buraco_concluidas ?? 0};
                  saltos agenda: {result.resumo.porTipo.salto_agenda_aberta ?? 0};
                  sync em falta: {result.resumo.porTipo.sync_slot_em_falta ?? 0}.
                </>
              )}
            </div>
          </div>

          {!result.resumo.limpo && (
            <div className="agenda-audit-table-wrap">
              <table className="agenda-audit-table">
                <thead>
                  <tr>
                    <th>Severidade</th>
                    <th>Tipo</th>
                    <th>Cliente / Equipamento</th>
                    <th>Detalhe</th>
                    <th aria-label="Acções" />
                  </tr>
                </thead>
                <tbody>
                  {result.issues.map((issue, idx) => {
                    const meta = AGENDA_AUDIT_TIPOS[issue.tipo]
                    return (
                      <tr key={`${issue.maquinaId}-${issue.tipo}-${idx}`}>
                        <td>
                          <span className={`agenda-audit-sev ${SEVERIDADE_CLASS[issue.severidade] ?? ''}`}>
                            {issue.severidade}
                          </span>
                        </td>
                        <td>{meta?.label ?? issue.tipo}</td>
                        <td>
                          <div className="agenda-audit-equip">
                            <strong>{issue.clienteNome || '—'}</strong>
                            <span>{issue.modelo} · S/N {issue.numeroSerie}</span>
                          </div>
                        </td>
                        <td className="agenda-audit-detalhe">{issue.detalhe}</td>
                        <td>
                          {issue.maquinaId && (
                            <button
                              type="button"
                              className="icon-btn secondary"
                              title="Abrir equipamento"
                              onClick={() => goEquipamento(issue)}
                            >
                              <ExternalLink size={15} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <p className="def-section-desc def-section-desc--hint">
            <strong>Acções:</strong> «Sincronizar agenda» corrige slots abertos em falta (até 1 período em atraso).
            Buracos entre concluídas exigem registar a execução em falta ou script de reposição (como ELGE/MONTALVERNE).
          </p>
        </>
      )}
    </section>
  )
}
