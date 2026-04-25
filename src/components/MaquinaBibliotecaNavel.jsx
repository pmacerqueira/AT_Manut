import { useState, useEffect, useCallback, useRef } from 'react'
import { Library, Search, Upload, FileDown, Unlink, Loader, X, Link2 } from 'lucide-react'
import {
  apiDocumentosBibliotecaSearch,
  apiDocumentosBibliotecaMachineLinksGet,
  apiDocumentosBibliotecaMachineLinksSet,
  apiDocumentosBibliotecaUploadFolderForMaquina,
  apiDocumentosBibliotecaUploadMultipart,
  apiDocumentosBibliotecaDownloadBlob,
} from '../services/apiService'
import { useToast } from './Toast'

const DOC_TYPES = [
  { id: 'MANUAL_UTILIZADOR', label: 'Manual de utilizador' },
  { id: 'MANUAL_TECNICO', label: 'Manual técnico' },
  { id: 'PLANO_MANUTENCAO', label: 'Plano de manutenção' },
  { id: 'OUTROS', label: 'Outros' },
]

/**
 * Documentos da biblioteca NAVEL (área reservada) associados a este equipamento.
 * Requer ATM_NAVEL_DOC_INTEGRATION_TOKEN no servidor + at_integration_bearer alinhado no navel-site.
 */
export default function MaquinaBibliotecaNavel({ maquina }) {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [modalSearch, setModalSearch] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchType, setSearchType] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState('MANUAL_TECNICO')
  const fileInputRef = useRef(null)

  const load = useCallback(async () => {
    if (!maquina?.id) {
      setItems([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await apiDocumentosBibliotecaSearch({ machineId: String(maquina.id) })
      setItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      const msg = e?.message || ''
      if (String(msg).includes('não configurada') || e?.status === 503) {
        showToast('Biblioteca NAVEL: integração não configurada no servidor.', 'warning', 5000)
      } else {
        showToast(msg || 'Não foi possível carregar a biblioteca NAVEL.', 'error')
      }
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [maquina?.id, showToast])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!modalSearch) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setModalSearch(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalSearch])

  const handleUnlink = async (path) => {
    if (!window.confirm('Remover a associação deste documento a este equipamento?')) return
    try {
      const cur = await apiDocumentosBibliotecaMachineLinksGet(path)
      const ml = cur?.machineLinks?.machineIds ?? []
      const next = ml.filter((id) => String(id) !== String(maquina.id))
      await apiDocumentosBibliotecaMachineLinksSet({ path, machineIds: next, source: 'MANUAL' })
      showToast('Associação removida.', 'success')
      load()
    } catch (e) {
      showToast(e?.message || 'Erro ao atualizar vínculos.', 'error')
    }
  }

  const handleLink = async (row) => {
    const path = row.path
    if (!path) return
    try {
      const cur = await apiDocumentosBibliotecaMachineLinksGet(path)
      const ml = Array.isArray(cur?.machineLinks?.machineIds) ? [...cur.machineLinks.machineIds] : []
      if (ml.some((id) => String(id) === String(maquina.id))) {
        showToast('Este documento já está associado a este equipamento.', 'info')
        return
      }
      ml.push(String(maquina.id))
      await apiDocumentosBibliotecaMachineLinksSet({ path, machineIds: ml, source: 'MANUAL' })
      showToast('Documento associado.', 'success')
      setModalSearch(false)
      load()
    } catch (e) {
      showToast(e?.message || 'Erro ao associar.', 'error')
    }
  }

  const runSearch = async () => {
    setSearchLoading(true)
    setSearchResults([])
    try {
      const data = await apiDocumentosBibliotecaSearch({
        q: searchQ.trim(),
        documentType: searchType || undefined,
      })
      setSearchResults(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      showToast(e?.message || 'Pesquisa falhou.', 'error')
    } finally {
      setSearchLoading(false)
    }
  }

  const handleOpen = async (path) => {
    try {
      const blob = await apiDocumentosBibliotecaDownloadBlob(path, true)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener,noreferrer')
      setTimeout(() => URL.revokeObjectURL(url), 120000)
    } catch (e) {
      showToast(e?.message || 'Download falhou.', 'error')
    }
  }

  const handlePickFile = async (ev) => {
    const file = ev.target?.files?.[0]
    ev.target.value = ''
    if (!file) return
    if (!docType) {
      showToast('Seleccione o tipo de documento.', 'warning')
      return
    }
    setUploading(true)
    try {
      const folder = await apiDocumentosBibliotecaUploadFolderForMaquina(maquina.id)
      const basePath = folder?.path
      if (!basePath) {
        throw new Error('Pasta de destino indisponível.')
      }
      await apiDocumentosBibliotecaUploadMultipart({
        maquinaId: String(maquina.id),
        path: basePath,
        file,
        documentType: docType,
        taxonomyNodeId: String(maquina.subcategoriaId ?? ''),
        versionLabel: file.name.replace(/\.[^.]+$/, '') || file.name,
        linkMachineIds: [String(maquina.id)],
      })
      showToast('Ficheiro enviado para a biblioteca NAVEL.', 'success')
      load()
    } catch (e) {
      showToast(e?.message || 'Upload falhou.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const metaLabel = (meta) => {
    const dt = meta?.documentType
    if (!dt) return '—'
    return DOC_TYPES.find((d) => d.id === dt)?.label ?? dt
  }

  return (
    <div className="biblioteca-navel-card">
      <div className="library-hero">
        <div className="library-hero-icon">
          <Library size={20} aria-hidden />
        </div>
        <div>
          <h4>Biblioteca NAVEL</h4>
          <p>Manuais e planos no mesmo repositório que navel.pt/area-reservada. As associações são referências: o ficheiro não é duplicado.</p>
        </div>
      </div>

      <div className="library-toolbar">
        <button type="button" className="equip-action-btn primary" onClick={() => setModalSearch(true)}>
          <Search size={15} aria-hidden /> Associar existente
        </button>
        <label className={`equip-action-btn secondary ${uploading ? 'is-disabled' : ''}`} htmlFor="bib-navel-upload">
          <Upload size={15} aria-hidden />
          {uploading ? 'A enviar…' : 'Enviar novo'}
          <input
            id="bib-navel-upload"
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={handlePickFile}
          />
        </label>
        <label className="library-type-picker">
          <span>Tipo de documento</span>
          <select value={docType} onChange={(e) => setDocType(e.target.value)}>
            {DOC_TYPES.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="library-empty">
          <Loader size={16} aria-hidden /> A carregar…
        </p>
      ) : items.length === 0 ? (
        <p className="library-empty">Nenhum documento da biblioteca associado a este equipamento.</p>
      ) : (
        <div className="library-card-grid">
          {items.map((row) => (
            <article key={row.path} className="library-doc-card">
              <div className="library-doc-main">
                <span className="library-doc-type">{metaLabel(row.metadata)}</span>
                <strong title={row.name || row.path}>{row.name || row.path}</strong>
                <span className="library-doc-date">
                  {row.updatedAt ? new Date(row.updatedAt).toLocaleString('pt-PT') : 'Sem data de actualização'}
                </span>
              </div>
              <div className="library-doc-actions">
                <button type="button" className="equip-action-btn secondary" onClick={() => handleOpen(row.path)}>
                  <FileDown size={16} aria-hidden /> Abrir
                </button>
                <button type="button" className="equip-action-btn danger" onClick={() => handleUnlink(row.path)}>
                  <Unlink size={16} aria-hidden /> Remover
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modalSearch && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bib-navel-search-title"
          onClick={() => setModalSearch(false)}
        >
          <div className="modal library-search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="library-search-header">
              <h3 id="bib-navel-search-title">Pesquisar na biblioteca</h3>
              <button type="button" className="icon-btn secondary" onClick={() => setModalSearch(false)} aria-label="Fechar">
                <X size={18} />
              </button>
            </div>
            <div className="library-search-controls">
              <input
                type="search"
                placeholder="Nome do ficheiro…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    runSearch()
                  }
                }}
              />
              <select value={searchType} onChange={(e) => setSearchType(e.target.value)}>
                <option value="">Todos os tipos</option>
                {DOC_TYPES.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
              <button type="button" onClick={runSearch} disabled={searchLoading}>
                {searchLoading ? '…' : 'Pesquisar'}
              </button>
            </div>
            <ul className="library-search-results">
              {searchResults.map((r) => (
                <li key={r.path}>
                  <span>{r.name}</span>
                  <button type="button" className="equip-action-btn primary" onClick={() => handleLink(r)}>
                    <Link2 size={14} aria-hidden /> Associar
                  </button>
                </li>
              ))}
            </ul>
            {searchResults.length === 0 && !searchLoading && (
              <p className="library-empty">Sem resultados. Tente outro termo.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
