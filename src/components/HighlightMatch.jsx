/**
 * Destaca (mark) a primeira ocorrência de `query` em `text` (case-insensitive).
 */
export default function HighlightMatch({ text, query, className = '' }) {
  const str = text ?? ''
  if (!str) return null
  const q = (query || '').trim()
  if (!q) return <span className={className}>{str}</span>

  const lower = str.toLowerCase()
  const ql = q.toLowerCase()
  const idx = lower.indexOf(ql)
  if (idx < 0) return <span className={className}>{str}</span>

  return (
    <span className={className}>
      {str.slice(0, idx)}
      <mark className="exec-highlight-match">{str.slice(idx, idx + q.length)}</mark>
      {str.slice(idx + q.length)}
    </span>
  )
}
