import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Palette, PlusCircle, Save, Upload, CheckCircle2, AlertTriangle, Printer } from 'lucide-react'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { useToast } from '../components/Toast'
import { apiUploadMarcaLogo } from '../services/apiService'
import './Marcas.css'

const HEX_RE = /^#?[0-9a-fA-F]{6}$/

function normalizeHexColor(v) {
  if (!v) return ''
  const raw = String(v).trim()
  if (!HEX_RE.test(raw)) return ''
  return raw.startsWith('#') ? raw.toUpperCase() : `#${raw.toUpperCase()}`
}

function hexToRgb(hex) {
  const h = normalizeHexColor(hex)
  if (!h) return null
  return {
    r: Number.parseInt(h.slice(1, 3), 16),
    g: Number.parseInt(h.slice(3, 5), 16),
    b: Number.parseInt(h.slice(5, 7), 16),
  }
}

function channelToLinear(v) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return 0
  return (0.2126 * channelToLinear(rgb.r)) + (0.7152 * channelToLinear(rgb.g)) + (0.0722 * channelToLinear(rgb.b))
}

function contrastRatio(hexA, hexB) {
  const l1 = luminance(hexA)
  const l2 = luminance(hexB)
  const light = Math.max(l1, l2)
  const dark = Math.min(l1, l2)
  return (light + 0.05) / (dark + 0.05)
}

function bestTextColor(bgHex) {
  const whiteRatio = contrastRatio(bgHex, '#FFFFFF')
  const blackRatio = contrastRatio(bgHex, '#111111')
  return whiteRatio >= blackRatio ? '#FFFFFF' : '#111111'
}

function mixWithWhite(hex, amount = 0.86) {
  const rgb = hexToRgb(hex)
  if (!rgb) return '#EEF2F7'
  const pct = Math.max(0, Math.min(1, amount))
  const rr = Math.round(rgb.r + (255 - rgb.r) * pct)
  const gg = Math.round(rgb.g + (255 - rgb.g) * pct)
  const bb = Math.round(rgb.b + (255 - rgb.b) * pct)
  const toHex = (n) => n.toString(16).padStart(2, '0')
  return `#${toHex(rr)}${toHex(gg)}${toHex(bb)}`.toUpperCase()
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Falha ao ler ficheiro de imagem.'))
    reader.readAsDataURL(file)
  })
}

function optimizeLogoDataUrl(rawDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const MAX_W = 1200
      const MAX_H = 500
      const ratio = Math.min(MAX_W / img.width, MAX_H / img.height, 1)
      const w = Math.max(1, Math.round(img.width * ratio))
      const h = Math.max(1, Math.round(img.height * ratio))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Não foi possível processar a imagem.'))
        return
      }
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/webp', 0.9))
    }
    img.onerror = () => reject(new Error('Imagem inválida ou corrompida.'))
    img.src = rawDataUrl
  })
}

function newDraft() {
  return { id: '', nome: '', logoUrl: '', corHex: '#1A4880', ativo: true }
}

export default function Marcas() {
  const navigate = useNavigate()
  const { isAdmin } = usePermissions()
  const { showToast } = useToast()
  const { marcas, maquinas, addMarca, updateMarca, getSubcategoria, getCategoria } = useData()

  const [selectedId, setSelectedId] = useState('')
  const [draft, setDraft] = useState(newDraft)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const marcasOrdenadas = useMemo(
    () => [...(marcas || [])].sort((a, b) => String(a?.nome || '').localeCompare(String(b?.nome || ''), 'pt', { sensitivity: 'base' })),
    [marcas],
  )

  const marcaAtiva = useMemo(
    () => marcasOrdenadas.find(m => String(m.id) === String(selectedId)) || null,
    [marcasOrdenadas, selectedId],
  )

  const preview = useMemo(() => {
    const color = normalizeHexColor(draft.corHex) || '#1A4880'
    const textColor = bestTextColor(color)
    const ratio = contrastRatio(color, textColor)
    const soft = mixWithWhite(color, 0.88)
    return { color, textColor, ratio, soft }
  }, [draft.corHex])

  if (!isAdmin) return null

  const mapDraftFromBrand = (m) => ({
    id: m?.id || '',
    nome: m?.nome || '',
    logoUrl: m?.logoUrl || m?.logo_url || '',
    corHex: normalizeHexColor(m?.corHex || m?.cor_hex || '#1A4880') || '#1A4880',
    ativo: m?.ativo !== false,
  })

  const countByBrand = (brand) => {
    const normalize = (v) => String(v || '').trim().toLowerCase()
    const nome = normalize(brand?.nome)
    return (maquinas || []).filter((mq) => {
      const brandId = String(brand?.id || '')
      const mqMarcaId = String(mq?.marcaId || mq?.marca_id || '')
      if (mqMarcaId && brandId && mqMarcaId === brandId) return true

      const mqMarcaNome = normalize(mq?.marca)
      if (mqMarcaNome && mqMarcaNome === nome) return true

      // Fallback para legado: marca inferida pela categoria/subcategoria do equipamento.
      // Ex.: categoria "ISTOBAL - Equipamentos de Lavagem" sem marca preenchida na máquina.
      const sub = getSubcategoria(mq?.subcategoriaId || mq?.subcategoria_id)
      const cat = getCategoria(sub?.categoriaId || sub?.categoria_id)
      const subNome = normalize(sub?.nome)
      const catNome = normalize(cat?.nome)
      return !!nome && (subNome.includes(nome) || catNome.includes(nome))
    }).length
  }

  const beginNew = () => {
    setSelectedId('')
    setDraft(newDraft())
  }

  const selectBrand = (brand) => {
    setSelectedId(String(brand.id))
    setDraft(mapDraftFromBrand(brand))
  }

  const validateDraft = () => {
    if (!draft.nome.trim()) {
      showToast('Indique o nome da marca.', 'warning')
      return false
    }
    if (!normalizeHexColor(draft.corHex)) {
      showToast('Cor inválida. Use formato HEX (#RRGGBB).', 'warning')
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateDraft()) return
    setSaving(true)
    try {
      const payload = {
        nome: draft.nome.trim(),
        logoUrl: draft.logoUrl.trim(),
        corHex: normalizeHexColor(draft.corHex),
        ativo: !!draft.ativo,
      }
      if (selectedId) {
        await updateMarca(selectedId, payload)
        showToast('Marca actualizada com sucesso.', 'success')
      } else {
        const created = await addMarca(payload)
        const nextId = created != null ? String(created) : ''
        if (nextId) {
          setSelectedId(nextId)
          setDraft(prev => ({ ...prev, id: nextId }))
        }
        showToast(`Marca "${payload.nome}" criada com sucesso.`, 'success')
      }
    } catch (err) {
      showToast(err?.message || 'Falha ao guardar marca.', 'error', 4000)
    } finally {
      setSaving(false)
    }
  }

  const handleUploadLogo = async (file) => {
    if (!file) return
    if (!/^image\//.test(file.type)) {
      showToast('Seleccione um ficheiro de imagem válido.', 'warning')
      return
    }
    setUploading(true)
    try {
      const raw = await fileToDataUrl(file)
      const optimized = await optimizeLogoDataUrl(raw)
      const res = await apiUploadMarcaLogo({ dataUrl: optimized, brandName: draft.nome.trim() || 'marca' })
      const nextUrl = String(res?.url || '').trim()
      setDraft(prev => ({ ...prev, logoUrl: nextUrl }))
      showToast('Logotipo carregado e optimizado.', 'success')
    } catch (err) {
      showToast(`Falha no upload do logotipo: ${err?.message || 'erro desconhecido'}`, 'error', 4000)
    } finally {
      setUploading(false)
    }
  }

  const ratioFmt = Number.isFinite(preview.ratio) ? preview.ratio.toFixed(2) : '0.00'
  const ratioOk = preview.ratio >= 4.5

  return (
    <div className="marcas-page">
      <div className="marcas-header">
        <button type="button" className="btn-back marcas-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>Voltar atrás</span>
        </button>
        <div className="marcas-title-wrap">
          <Palette size={22} />
          <h1>Gestão de Marcas</h1>
        </div>
      </div>

      <div className="marcas-grid">
        <section className="marcas-card">
          <div className="marcas-list-head">
            <h2>Marcas registadas</h2>
            <button type="button" className="marcas-btn marcas-btn-primary" onClick={beginNew}>
              <PlusCircle size={16} />
              <span>Nova Marca</span>
            </button>
          </div>
          <div className="marcas-list">
            {marcasOrdenadas.map((brand) => {
              const isSel = String(brand.id) === String(selectedId)
              const cor = normalizeHexColor(brand?.corHex || brand?.cor_hex || '#1A4880') || '#1A4880'
              return (
                <button
                  key={brand.id}
                  type="button"
                  className={`marcas-item ${isSel ? 'is-selected' : ''}`}
                  onClick={() => selectBrand(brand)}
                >
                  <span className="marcas-swatch" style={{ background: cor }} />
                  <span className="marcas-name">{brand.nome}</span>
                  {!brand.ativo && <span className="marcas-badge marcas-badge-muted">Inactiva</span>}
                  <span className="marcas-badge">{countByBrand(brand)} máquinas</span>
                </button>
              )
            })}
            {marcasOrdenadas.length === 0 && <p className="marcas-empty">Sem marcas registadas.</p>}
          </div>
        </section>

        <section className="marcas-card">
          <div className="marcas-editor-head">
            <h2>{selectedId ? 'Editar marca' : 'Nova marca'}</h2>
          </div>

          <label className="marcas-label">
            Nome da marca
            <input
              type="text"
              className="marcas-input"
              value={draft.nome}
              onChange={e => setDraft(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex.: ISTOBAL"
            />
          </label>

          <label className="marcas-label">
            Cor institucional
            <div className="marcas-color-row">
              <input
                type="color"
                className="marcas-color-picker"
                value={normalizeHexColor(draft.corHex) || '#1A4880'}
                onChange={e => setDraft(prev => ({ ...prev, corHex: e.target.value }))}
              />
              <input
                type="text"
                className="marcas-input"
                value={draft.corHex}
                onChange={e => setDraft(prev => ({ ...prev, corHex: e.target.value }))}
                placeholder="#1A4880"
              />
            </div>
          </label>

          <label className="marcas-label">
            Logotipo da marca
            <input
              type="text"
              className="marcas-input"
              value={draft.logoUrl}
              onChange={e => setDraft(prev => ({ ...prev, logoUrl: e.target.value }))}
              placeholder="/uploads/brand-logos/marca.webp"
            />
          </label>

          <label className="marcas-upload">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                await handleUploadLogo(f)
                e.target.value = ''
              }}
              disabled={uploading}
            />
            <Upload size={15} />
            <span>{uploading ? 'A carregar logo...' : 'Upload de logotipo'}</span>
          </label>

          <label className="marcas-check">
            <input
              type="checkbox"
              checked={!!draft.ativo}
              onChange={e => setDraft(prev => ({ ...prev, ativo: e.target.checked }))}
            />
            <span>Marca activa (disponível no formulário de máquinas)</span>
          </label>

          <button type="button" className="marcas-btn marcas-btn-primary" onClick={handleSave} disabled={saving}>
            <Save size={16} />
            <span>{saving ? 'A guardar...' : 'Guardar marca'}</span>
          </button>
        </section>
      </div>

      <section className="marcas-card">
        <div className="marcas-preview-head">
          <h2>Preview live do cabeçalho de relatório</h2>
          <span className={`marcas-contrast ${ratioOk ? 'ok' : 'warn'}`}>
            {ratioOk ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
            <span>Contraste {ratioFmt}:1 {ratioOk ? '(OK para impressão)' : '(ajustar cor)'}</span>
          </span>
        </div>

        <div className="marcas-contrast-help">
          <Printer size={14} />
          <span>
            O sistema valida legibilidade automaticamente e escolhe texto claro/escuro para melhor leitura nos blocos do relatório.
          </span>
        </div>

        <div className="marcas-preview">
          <div className="rpt-head" style={{ borderColor: preview.color }}>
            <div className="rpt-logos">
              <img src={`${import.meta.env.BASE_URL}logo-navel.png`} alt="Navel" />
              {draft.logoUrl
                ? <img src={draft.logoUrl} alt={draft.nome || 'Marca'} />
                : <div className="rpt-logo-placeholder">Logo Marca</div>}
            </div>
            <div className="rpt-title" style={{ background: preview.color, color: preview.textColor }}>
              Relatório Técnico
            </div>
            <div className="rpt-meta" style={{ background: preview.soft }}>
              <span>Cliente: Exemplo Cliente</span>
              <span>Equipamento: {draft.nome || 'Marca'} · Série 12345</span>
              <span>Data de realização: 27/02/2026</span>
            </div>
          </div>
        </div>
      </section>

      {marcaAtiva && (
        <p className="marcas-note">
          A editar: <strong>{marcaAtiva.nome}</strong>
        </p>
      )}
    </div>
  )
}
