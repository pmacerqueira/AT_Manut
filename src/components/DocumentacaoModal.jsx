import { useState, useRef, useEffect } from 'react'
import { useToast } from './Toast'
import { usePermissions } from '../hooks/usePermissions'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import {
  useData,
  TIPOS_DOCUMENTO,
  SUBCATEGORIAS_COM_CONTADOR_HORAS,
  SUBCATEGORIAS_COMPRESSOR_PARAFUSO,
} from '../context/DataContext'
import { safeHttpUrl } from '../utils/sanitize'
import { apiUploadMachinePdf } from '../services/apiService'
import { logger } from '../utils/logger'
import { Plus, ExternalLink, Trash2, Upload } from 'lucide-react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { parseDateLocal } from '../utils/datasAzores'
import { horasContadorNaFicha } from '../utils/horasContadorEquipamento'

const PDF_MAX_BYTES = 8 * 1024 * 1024

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(new Error('Falha ao ler o ficheiro'))
    r.readAsDataURL(file)
  })
}

/** Path `/uploads/machine-docs/...` a partir da URL pública guardada na ficha. */
function pathFromMachineDocUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const p = new URL(url).pathname
    return p.startsWith('/uploads/machine-docs/') ? p.split('?')[0] : null
  } catch {
    const s = url.trim()
    if (s.startsWith('/uploads/machine-docs/')) return s.split('?')[0]
    return null
  }
}

export default function DocumentacaoModal({ isOpen, onClose, maquina }) {
  const { maquinas, addDocumentoMaquina, removeDocumentoMaquina } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const { isAdmin } = usePermissions()
  const pdfInputRef = useRef(null)
  const [formDoc, setFormDoc] = useState({ tipo: 'manual_utilizador', titulo: '', url: '' })
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState(null)

  const maq = maquinas.find(m => String(m.id) === String(maquina?.id)) ?? maquina

  useEffect(() => {
    if (!isOpen || !maq) return
    const parafuso = SUBCATEGORIAS_COMPRESSOR_PARAFUSO.includes(maq.subcategoriaId)
    setFormDoc(f => ({ ...f, tipo: parafuso ? 'plano_manutencao' : 'manual_utilizador' }))
  }, [isOpen, maq?.id, maq?.subcategoriaId])

  if (!isOpen) return null

  const documentos = maq ? (maq.documentos ?? []) : []
  const getTipoLabel = (tipo) => TIPOS_DOCUMENTO.find(t => t.id === tipo)?.label ?? tipo

  const handleAddDoc = async (e) => {
    e.preventDefault()
    if (!formDoc.titulo.trim() || !formDoc.url.trim()) {
      showToast('Preencha título e URL para adicionar por link.', 'warning')
      return
    }
    const url = safeHttpUrl(formDoc.url.trim())
    if (url === '#') {
      showToast('URL inválida. Use um link que comece por https:// ou http://', 'warning')
      return
    }
    const res = await addDocumentoMaquina(maq.id, { tipo: formDoc.tipo, titulo: formDoc.titulo.trim(), url })
    if (res?.ok) {
      showToast('Documento associado ao equipamento.', 'success')
      setFormDoc(f => ({ ...f, titulo: '', url: '' }))
    } else {
      showToast('Não foi possível associar o documento. Verifique a ligação ou tente de novo.', 'error', 4000)
    }
  }

  const handlePdfSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !maq?.id) return
    const name = file.name || ''
    if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Seleccione um ficheiro PDF.', 'warning')
      return
    }
    if (file.size > PDF_MAX_BYTES) {
      showToast('PDF demasiado grande (máx. 8 MB).', 'warning')
      return
    }
    showGlobalLoading()
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const existing = (maq.documentos ?? []).find(
        d =>
          d.tipo === formDoc.tipo &&
          d.uploadFileName === name &&
          Number(d.uploadFileSize) === file.size
      )
      const replacePath = existing?.url ? pathFromMachineDocUrl(existing.url) : null
      const uploadRes = await apiUploadMachinePdf({
        dataUrl,
        maquinaId: maq.id,
        ...(replacePath ? { replacePath } : {}),
      })
      const url = uploadRes?.url
      if (!url) {
        showToast('Resposta do servidor sem URL do PDF.', 'error', 4000)
        return
      }
      const titulo = (formDoc.titulo.trim() || name.replace(/\.pdf$/i, '')).slice(0, 200)
      const saveRes = await addDocumentoMaquina(maq.id, {
        tipo: formDoc.tipo,
        titulo,
        url,
        uploadFileName: name,
        uploadFileSize: file.size,
      })
      if (saveRes?.ok) {
        showToast(
          saveRes.replaced
            ? 'PDF actualizado (substituiu o envio anterior com o mesmo nome e tamanho).'
            : 'PDF carregado e associado ao equipamento.',
          'success'
        )
        setFormDoc(f => ({ ...f, titulo: '' }))
      } else {
        showToast('O PDF foi enviado mas não ficou guardado na ficha. Verifique a ligação ou tente de novo.', 'error', 4500)
      }
    } catch (err) {
      logger.error('DocumentacaoModal', 'uploadPdf', err?.message || String(err))
      showToast(err?.message || 'Falha ao enviar PDF.', 'error', 4000)
    } finally {
      hideGlobalLoading()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-documentacao" onClick={e => e.stopPropagation()}>
        <h2>Documentação — {maq?.marca} {maq?.modelo}</h2>
        <p className="modal-hint">
          {SUBCATEGORIAS_COMPRESSOR_PARAFUSO.includes(maq?.subcategoriaId)
            ? 'Plano de manutenção, manual do utilizador e outros PDFs ficam disponíveis aqui, na ficha do equipamento e nos ecrãs de execução de manutenção e reparação.'
            : 'Adicione manuais, esquemas e planos para os técnicos consultarem durante o serviço e no preenchimento de relatórios.'}
        </p>
        {SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maq?.subcategoriaId) && (() => {
          const hc = horasContadorNaFicha(maq)
          if (!maq?.ultimaManutencaoData && hc == null) return null
          return (
            <div className="consumiveis-card">
              <h4>Contador (à data da última manutenção)</h4>
              <div className="consumiveis-grid">
                {maq.ultimaManutencaoData && <span><strong>Última manut.:</strong> {format(parseDateLocal(maq.ultimaManutencaoData), 'd MMM yyyy', { locale: pt })}</span>}
                {hc != null && <span><strong>Horas no contador:</strong> {hc} h</span>}
              </div>
            </div>
          )
        })()}
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
                {isAdmin && confirmDeleteDocId === d.id ? (
                  <>
                    <button
                      type="button"
                      className="icon-btn danger"
                      onClick={async () => {
                        setConfirmDeleteDocId(null)
                        const r = await removeDocumentoMaquina(maq.id, d.id)
                        showToast(
                          r?.ok ? 'Documento removido.' : 'Não foi possível remover o documento.',
                          r?.ok ? 'success' : 'error',
                          4000
                        )
                      }}
                      title="Confirmar"
                    >
                      Sim
                    </button>
                    <button type="button" className="icon-btn secondary" onClick={() => setConfirmDeleteDocId(null)} title="Cancelar">Não</button>
                  </>
                ) : isAdmin && (
                  <button type="button" className="icon-btn danger" onClick={() => setConfirmDeleteDocId(d.id)} title="Remover"><Trash2 size={16} /></button>
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
                <input value={formDoc.titulo} onChange={e => setFormDoc(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Plano 3000 h / Manual GA-22" />
              </label>
            </div>
            <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handlePdfSelected} />
            <div className="form-row doc-upload-row" style={{ alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn secondary btn-add-doc"
                onClick={() => pdfInputRef.current?.click()}
              >
                <Upload size={16} /> Importar PDF (servidor)
              </button>
              <span className="text-muted" style={{ fontSize: '0.85rem' }}>Máx. 8 MB · usa o tipo seleccionado acima</span>
            </div>
            <label>
              Ou URL (link para PDF alojado noutro sítio)
              <input type="url" value={formDoc.url} onChange={e => setFormDoc(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
            </label>
            <button type="submit" className="btn-add-doc"><Plus size={16} /> Adicionar por URL</button>
          </form>
        )}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
