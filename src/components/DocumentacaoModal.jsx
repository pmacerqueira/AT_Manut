import { useState } from 'react'
import { useData } from '../context/DataContext'
import { useToast } from './Toast'
import { usePermissions } from '../hooks/usePermissions'
import { TIPOS_DOCUMENTO, SUBCATEGORIAS_COM_CONTADOR_HORAS } from '../context/DataContext'
import { safeHttpUrl } from '../utils/sanitize'
import { Plus, ExternalLink, Trash2, FolderPlus } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

export default function DocumentacaoModal({ isOpen, onClose, maquina }) {
  const { maquinas, addDocumentoMaquina, removeDocumentoMaquina } = useData()
  const { showToast } = useToast()
  const { isAdmin } = usePermissions()
  const [formDoc, setFormDoc] = useState({ tipo: 'manual_utilizador', titulo: '', url: '' })

  if (!isOpen) return null

  const maq = maquinas.find(m => m.id === maquina?.id) ?? maquina
  const documentos = maq ? (maq.documentos ?? []) : []
  const getTipoLabel = (tipo) => TIPOS_DOCUMENTO.find(t => t.id === tipo)?.label ?? tipo

  const handleAddDoc = (e) => {
    e.preventDefault()
    if (!formDoc.titulo.trim() || !formDoc.url.trim()) return
    const url = safeHttpUrl(formDoc.url.trim())
    if (url === '#') {
      showToast('URL inválida. Use um link que comece por https:// ou http://', 'warning')
      return
    }
    addDocumentoMaquina(maq.id, { tipo: formDoc.tipo, titulo: formDoc.titulo.trim(), url })
    setFormDoc({ tipo: 'manual_utilizador', titulo: '', url: '' })
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-documentacao" onClick={e => e.stopPropagation()}>
        <h2>Documentação — {maq?.marca} {maq?.modelo}</h2>
        <p className="modal-hint">Adicione manuais, esquemas e planos de manutenção para os técnicos consultarem.</p>
        {SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maq?.subcategoriaId) && (maq?.ultimaManutencaoData || maq?.horasTotaisAcumuladas != null || maq?.horasServicoAcumuladas != null) && (
          <div className="consumiveis-card">
            <h4>Contadores (à data da última manutenção)</h4>
            <div className="consumiveis-grid">
              {maq.ultimaManutencaoData && <span><strong>Última manut.:</strong> {format(new Date(maq.ultimaManutencaoData), 'd MMM yyyy', { locale: pt })}</span>}
              {maq.horasTotaisAcumuladas != null && <span><strong>Horas totais:</strong> {maq.horasTotaisAcumuladas}h</span>}
              {maq.horasServicoAcumuladas != null && <span><strong>Horas serviço:</strong> {maq.horasServicoAcumuladas}h</span>}
            </div>
          </div>
        )}
        {['sub5', 'sub14'].includes(maq?.subcategoriaId) && (maq?.refKitManut3000h || maq?.refKitManut6000h || maq?.refCorreia || maq?.refFiltroOleo || maq?.refFiltroSeparador || maq?.refFiltroAr) && (
          <div className="consumiveis-card">
            <h4>Consumíveis</h4>
            <div className="consumiveis-grid">
              {maq.refKitManut3000h && <span><strong>Kit 3000h:</strong> {maq.refKitManut3000h}</span>}
              {maq.refKitManut6000h && <span><strong>Kit 6000h:</strong> {maq.refKitManut6000h}</span>}
              {maq.refCorreia && <span><strong>Correia:</strong> {maq.refCorreia}</span>}
              {maq.refFiltroOleo && <span><strong>Filtro óleo:</strong> {maq.refFiltroOleo}</span>}
              {maq.refFiltroSeparador && <span><strong>Filtro separador:</strong> {maq.refFiltroSeparador}</span>}
              {maq.refFiltroAr && <span><strong>Filtro ar:</strong> {maq.refFiltroAr}</span>}
            </div>
          </div>
        )}
        <div className="doc-lista">
          {documentos.map(d => (
            <div key={d.id} className="doc-item">
              <div className="doc-item-info">
                <span className="doc-tipo">{getTipoLabel(d.tipo)}</span>
                <span className="doc-titulo">{d.titulo}</span>
              </div>
              <div className="doc-item-actions">
                <a href={safeHttpUrl(d.url)} target="_blank" rel="noopener noreferrer" className="icon-btn secondary" title="Abrir"><ExternalLink size={16} /></a>
                {isAdmin && (
                  <button type="button" className="icon-btn danger" onClick={() => removeDocumentoMaquina(maq.id, d.id)} title="Remover"><Trash2 size={16} /></button>
                )}
              </div>
            </div>
          ))}
          {documentos.length === 0 && <p className="doc-empty">Nenhum documento associado.</p>}
        </div>
        {isAdmin && (
          <form onSubmit={handleAddDoc} className="form-add-doc">
            <div className="form-row">
              <label>
                Tipo
                <select value={formDoc.tipo} onChange={e => setFormDoc(f => ({ ...f, tipo: e.target.value }))}>
                  {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </label>
              <label style={{ flex: 1 }}>
                Título
                <input value={formDoc.titulo} onChange={e => setFormDoc(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Manual GA-22" required />
              </label>
            </div>
            <label>
              URL (link para PDF ou ficheiro)
              <input type="url" value={formDoc.url} onChange={e => setFormDoc(f => ({ ...f, url: e.target.value }))} placeholder="https://..." required />
            </label>
            <button type="submit" className="btn-add-doc"><Plus size={16} /> Adicionar documento</button>
          </form>
        )}
        <div className="form-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
