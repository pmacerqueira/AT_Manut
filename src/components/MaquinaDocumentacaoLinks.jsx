import { FolderOpen } from 'lucide-react'
import { TIPOS_DOCUMENTO } from '../context/DataContext'
import { safeHttpUrl } from '../utils/sanitize'

/** Links rápidos para PDFs / URLs registados na ficha do equipamento (todos os perfis). */
export default function MaquinaDocumentacaoLinks({ maquina }) {
  const docs = maquina?.documentos ?? []
  if (!docs.length) return null

  const getTipoLabel = (tipo) => TIPOS_DOCUMENTO.find(t => t.id === tipo)?.label ?? tipo

  return (
    <div className="doc-links-inline" role="region" aria-label="Documentação técnica do equipamento">
      <FolderOpen size={14} aria-hidden />
      <span className="doc-links-inline-label">Documentação técnica</span>
      {docs.map(d => (
        <a
          key={d.id}
          href={safeHttpUrl(d.url)}
          target="_blank"
          rel="noopener noreferrer"
          className="doc-link-inline"
          title={d.titulo || getTipoLabel(d.tipo)}
        >
          {getTipoLabel(d.tipo)}
        </a>
      ))}
    </div>
  )
}
