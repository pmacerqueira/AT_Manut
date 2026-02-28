import { useState, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import { SUBCATEGORIAS_COM_CONTADOR_HORAS, SUBCATEGORIAS_COMPRESSOR, SEQUENCIA_KAESER, tipoKaeserNaPosicao, descricaoCicloKaeser } from '../context/DataContext'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useToast } from './Toast'

const isElevadores = (getCategoria, categoriaId) => {
  const cat = getCategoria(categoriaId)
  return cat?.nome?.toLowerCase().includes('levador') ?? false
}

const isCompressorParafuso = (subcategoriaId) => ['sub5', 'sub14'].includes(subcategoriaId)
const isCompressor = (subcategoriaId) => SUBCATEGORIAS_COMPRESSOR.includes(subcategoriaId)
const temContadorHoras = (subcategoriaId) => SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(subcategoriaId)

function sortMarcasAZ(items = []) {
  return [...items].sort((a, b) => {
    const na = (a?.nome ?? '').trim()
    const nb = (b?.nome ?? '').trim()
    return na.localeCompare(nb, 'pt', { sensitivity: 'base' })
  })
}

function marcaOptionValue(m) {
  const id = String(m?.id ?? '').trim()
  if (id) return `id:${id}`
  const nome = (m?.nome ?? '').trim().toLowerCase()
  if (nome) return `name:${nome}`
  return ''
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

function optimizeLogoDataUrl(rawDataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onerror = reject
    img.onload = () => {
      const maxW = 1200
      const maxH = 360
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      const w = Math.max(1, Math.round(img.width * ratio))
      const h = Math.max(1, Math.round(img.height * ratio))
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/png', 0.92))
    }
    img.src = rawDataUrl
  })
}

export default function MaquinaFormModal({ isOpen, onClose, mode, clienteNifLocked, maquina, onSave }) {
  const {
    clientes,
    categorias,
    marcas,
    maquinas,
    INTERVALOS,
    getSubcategoriasByCategoria,
    getSubcategoria,
    getCategoria,
    addMarca,
    addMaquina,
    updateMaquina,
  } = useData()
  const { showToast } = useToast()
  // Ref para detectar apenas a transição fechado→aberto e não re-inicializar
  // o formulário quando dependências do DataContext mudam em background (refresh silencioso)
  const wasOpenRef = useRef(false)
  const [form, setForm] = useState({
    clienteNif: '',
    categoriaId: '',
    subcategoriaId: '',
    periodicidadeManut: '',
    marcaId: '',
    marca: '',
    marcaLogoUrl: '',
    modelo: '',
    numeroSerie: '',
    anoFabrico: '',
    numeroDocumentoVenda: '',
    proximaManut: '',
    refKitManut3000h: '',
    refKitManut6000h: '',
    refCorreia: '',
    refFiltroOleo: '',
    refFiltroSeparador: '',
    refFiltroAr: '',
    posicaoKaeser: null,
  })
  const subcategoriasFiltradas = form.categoriaId ? getSubcategoriasByCategoria(form.categoriaId) : []
  const [showNovaMarca, setShowNovaMarca] = useState(false)
  const [novaMarca, setNovaMarca] = useState({ nome: '', logoUrl: '', corHex: '#1a4880' })
  const [logoUploading, setLogoUploading] = useState(false)

  const marcasOrdenadas = sortMarcasAZ(marcas)
  const findMarcaById = (id) => marcasOrdenadas.find(m => String(m?.id) === String(id))
  const findMarcaByNome = (nome) => marcasOrdenadas.find(m => (m?.nome ?? '').trim().toLowerCase() === String(nome ?? '').trim().toLowerCase())
  const findMarcaByOptionValue = (val) => marcasOrdenadas.find(m => marcaOptionValue(m) === val)

  const selectedMarcaOption = (() => {
    if (showNovaMarca) return '__new__'
    if (form.marcaId) {
      const byId = findMarcaById(form.marcaId)
      if (byId) return marcaOptionValue(byId)
    }
    if (form.marca) {
      const byNome = findMarcaByNome(form.marca)
      if (byNome) return marcaOptionValue(byNome)
    }
    return ''
  })()

  useEffect(() => {
    const justOpened = isOpen && !wasOpenRef.current
    wasOpenRef.current = isOpen
    // Só inicializar o formulário quando o modal passa de fechado → aberto.
    // Evita reset quando o DataContext faz refresh silencioso em background.
    if (!justOpened) return
    if (mode === 'add') {
      const firstCat = categorias[0]
      const catId = firstCat?.id || ''
      const subs = getSubcategoriasByCategoria(catId)
      const subId = subs[0]?.id || ''
      const periodicidade = isElevadores(getCategoria, catId) ? 'anual' : ''
      const dias = periodicidade ? (INTERVALOS[periodicidade]?.dias ?? 90) : (INTERVALOS[firstCat?.intervaloTipo]?.dias ?? 90)
      const proxima = new Date()
      proxima.setDate(proxima.getDate() + dias)
      setForm({
        clienteNif: clienteNifLocked || clientes[0]?.nif || '',
        categoriaId: catId,
        subcategoriaId: subId,
        periodicidadeManut: periodicidade,
        marcaId: '',
        marca: '',
        marcaLogoUrl: '',
    marcaCorHex: '',
        modelo: '',
        numeroSerie: '',
        anoFabrico: new Date().getFullYear(),
        numeroDocumentoVenda: '',
        proximaManut: format(proxima, 'yyyy-MM-dd'),
        refKitManut3000h: '',
        refKitManut6000h: '',
        refCorreia: '',
        refFiltroOleo: '',
        refFiltroSeparador: '',
        refFiltroAr: '',
        posicaoKaeser: isCompressorParafuso(subId) ? 0 : null,
      })
      setShowNovaMarca(false)
      setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
    } else if (maquina) {
      const sub = getSubcategoria(maquina.subcategoriaId)
      getCategoria(sub?.categoriaId)
      const periodicidade = maquina.periodicidadeManut ?? (isElevadores(getCategoria, sub?.categoriaId) ? 'anual' : '')
      const matchedMarca = marcas.find(m => (m.nome ?? '').toLowerCase() === (maquina.marca ?? '').toLowerCase())
      setForm({
        id: maquina.id,
        clienteNif: maquina.clienteNif,
        categoriaId: sub?.categoriaId || '',
        subcategoriaId: maquina.subcategoriaId,
        periodicidadeManut: periodicidade,
        marcaId: maquina.marcaId != null ? String(maquina.marcaId) : (matchedMarca?.id != null ? String(matchedMarca.id) : ''),
        marca: maquina.marca,
        marcaLogoUrl: maquina.marcaLogoUrl || '',
        marcaCorHex: maquina.marcaCorHex || matchedMarca?.corHex || '',
        modelo: maquina.modelo,
        numeroSerie: maquina.numeroSerie,
        anoFabrico: maquina.anoFabrico || '',
        numeroDocumentoVenda: maquina.numeroDocumentoVenda || '',
        proximaManut: maquina.proximaManut,
        refKitManut3000h: maquina.refKitManut3000h || '',
        refKitManut6000h: maquina.refKitManut6000h || '',
        refCorreia: maquina.refCorreia || '',
        refFiltroOleo: maquina.refFiltroOleo || '',
        refFiltroSeparador: maquina.refFiltroSeparador || '',
        refFiltroAr: maquina.refFiltroAr || '',
        posicaoKaeser: maquina.posicaoKaeser ?? (isCompressorParafuso(maquina.subcategoriaId) ? 0 : null),
      })
      setShowNovaMarca(false)
      setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
    }
  }, [isOpen, mode, clienteNifLocked, maquina, categorias, clientes, marcas, getSubcategoriasByCategoria, getSubcategoria, getCategoria, INTERVALOS])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const { categoriaId: _cid, id, ...payloadBase } = form
    let payload = { ...payloadBase }

    try {
      if (showNovaMarca) {
        const nome = novaMarca.nome.trim()
        if (!nome) {
          showToast('Indique o nome da nova marca.', 'warning')
          return
        }
        const logoUrl = novaMarca.logoUrl.trim()
        const corHex = (novaMarca.corHex || '').trim()
        const marcaIdRaw = await addMarca({ nome, logoUrl, corHex })
        const marcaId = marcaIdRaw != null ? String(marcaIdRaw) : ''
        payload = { ...payload, marcaId, marca: nome, marcaLogoUrl: logoUrl, marcaCorHex: corHex }
      } else if (payload.marcaId || payload.marca) {
        const selected = payload.marcaId
          ? marcas.find(m => String(m.id) === String(payload.marcaId))
          : marcas.find(m => (m?.nome ?? '').trim().toLowerCase() === String(payload.marca ?? '').trim().toLowerCase())
        if (selected) {
          payload = {
            ...payload,
            marcaId: selected.id != null && String(selected.id).trim() !== '' ? String(selected.id) : '',
            marca: selected.nome || payload.marca || '',
            marcaLogoUrl: selected.logoUrl || payload.marcaLogoUrl || '',
            marcaCorHex: selected.corHex || payload.marcaCorHex || '',
          }
        }
      }

      if (mode === 'add') {
        const novoId = await addMaquina(payload)
        showToast('Equipamento adicionado com sucesso.', 'success')
        onSave?.({ id: novoId, ...payload }, 'add')
      } else {
        await updateMaquina(id, payload)
        showToast('Equipamento actualizado com sucesso.', 'success')
        onSave?.({ id, ...payload }, 'edit')
      }
      onClose()
    } catch (err) {
      showToast(err?.message || 'Falha ao guardar equipamento/marca.', 'error', 4000)
    }
  }

  if (!isOpen) return null

  const handleUploadLogoMarca = async (file) => {
    if (!file) return
    if (!file.type?.startsWith('image/')) {
      showToast('Selecione um ficheiro de imagem válido.', 'warning')
      return
    }
    setLogoUploading(true)
    try {
      const raw = await fileToDataUrl(file)
      const optimized = await optimizeLogoDataUrl(raw)
      const { apiUploadMarcaLogo } = await import('../services/apiService')
      const nomeMarca = novaMarca.nome.trim() || 'marca'
      const res = await apiUploadMarcaLogo({ dataUrl: optimized, brandName: nomeMarca })
      setNovaMarca(prev => ({ ...prev, logoUrl: res?.url || '' }))
      showToast('Logotipo carregado e otimizado com sucesso.', 'success')
    } catch (err) {
      showToast(`Falha no upload do logotipo: ${err?.message || 'erro desconhecido'}`, 'error', 4000)
    } finally {
      setLogoUploading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{mode === 'add' ? 'Nova máquina' : 'Editar máquina'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            Cliente
            <select
              required
              value={form.clienteNif}
              onChange={e => setForm(f => ({ ...f, clienteNif: e.target.value }))}
              disabled={!!clienteNifLocked}
              className={clienteNifLocked ? 'readonly' : ''}
            >
              {[...clientes].sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt')).map(c => (
                <option key={c.nif} value={c.nif}>{c.nome} (NIF: {c.nif})</option>
              ))}
            </select>
          </label>
          <label>
            Categoria
            <select required value={form.categoriaId} onChange={e => {
              const catId = e.target.value
              const subs = getSubcategoriasByCategoria(catId)
              const defPeriodicidade = isElevadores(getCategoria, catId) ? 'anual' : ''
              setForm(f => ({ ...f, categoriaId: catId, subcategoriaId: subs[0]?.id || '', periodicidadeManut: defPeriodicidade }))
            }}>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({c.intervaloTipo})</option>
              ))}
            </select>
          </label>
          <label>
            Subcategoria (tipo de máquina)
            <select required value={form.subcategoriaId} onChange={e => setForm(f => ({ ...f, subcategoriaId: e.target.value }))}>
              {subcategoriasFiltradas.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </label>
          {isElevadores(getCategoria, form.categoriaId) && (
            <label>
              Periodicidade de manutenção
              <select required value={form.periodicidadeManut} onChange={e => setForm(f => ({ ...f, periodicidadeManut: e.target.value }))}>
                <option value="trimestral">3 meses (trimestral)</option>
                <option value="semestral">6 meses (semestral)</option>
                <option value="anual">1 ano (anual)</option>
              </select>
            </label>
          )}
          {!isElevadores(getCategoria, form.categoriaId) && form.categoriaId && (
            <label>
              Periodicidade de manutenção
              <select value={form.periodicidadeManut} onChange={e => setForm(f => ({ ...f, periodicidadeManut: e.target.value }))}>
                <option value="">Usar da categoria</option>
                <option value="trimestral">3 meses (trimestral)</option>
                <option value="semestral">6 meses (semestral)</option>
                <option value="anual">1 ano (anual)</option>
              </select>
            </label>
          )}
          <div className="form-row">
            <label>
              Marca
              <select
                value={selectedMarcaOption}
                onChange={e => {
                  const val = e.target.value
                  if (val === '__new__') {
                    setShowNovaMarca(true)
                    setForm(f => ({ ...f, marcaId: '', marca: '', marcaLogoUrl: '', marcaCorHex: '' }))
                    return
                  }
                  if (!val) {
                    setShowNovaMarca(false)
                    setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
                    setForm(f => ({ ...f, marcaId: '', marca: '', marcaLogoUrl: '', marcaCorHex: '' }))
                    return
                  }
                  const selected = findMarcaByOptionValue(val)
                  setShowNovaMarca(false)
                  setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
                  setForm(f => ({
                    ...f,
                    marcaId: selected?.id != null && String(selected.id).trim() !== '' ? String(selected.id) : '',
                    marca: selected?.nome || '',
                    marcaLogoUrl: selected?.logoUrl || '',
                    marcaCorHex: selected?.corHex || '',
                  }))
                }}
              >
                <option value="">— Selecionar marca —</option>
                {marcasOrdenadas.map(m => (
                  <option key={marcaOptionValue(m) || `marca-${(m?.nome ?? '').toLowerCase()}`} value={marcaOptionValue(m)}>{m.nome}</option>
                ))}
                <option value="__new__">+ Nova Marca…</option>
              </select>
              {!showNovaMarca && !form.marcaId && (
                <small className="text-muted">Selecione uma marca ou crie uma nova.</small>
              )}
            </label>
            {showNovaMarca && (
              <>
                <label>
                  Nova marca
                  <input
                    value={novaMarca.nome}
                    onChange={e => setNovaMarca(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Ex: ISTOBAL"
                  />
                </label>
                <label>
                  URL do logotipo da marca
                  <input
                    type="url"
                    value={novaMarca.logoUrl}
                    onChange={e => setNovaMarca(prev => ({ ...prev, logoUrl: e.target.value }))}
                    placeholder="https://.../logo-marca.png"
                  />
                </label>
                <label>
                  Cor institucional da marca
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      type="color"
                      value={novaMarca.corHex || '#1a4880'}
                      onChange={e => setNovaMarca(prev => ({ ...prev, corHex: e.target.value }))}
                      style={{ width: '48px', height: '34px', padding: 0 }}
                    />
                    <input
                      type="text"
                      value={novaMarca.corHex}
                      onChange={e => setNovaMarca(prev => ({ ...prev, corHex: e.target.value }))}
                      placeholder="#c8102e"
                    />
                  </div>
                </label>
                <label>
                  Upload do logotipo (recomendado)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={async (e) => {
                      const f = e.target.files?.[0]
                      await handleUploadLogoMarca(f)
                      e.target.value = ''
                    }}
                    disabled={logoUploading}
                  />
                  <small className="text-muted">
                    {logoUploading ? 'A otimizar e enviar logotipo...' : 'A imagem é otimizada automaticamente para documentos.'}
                  </small>
                </label>
                {novaMarca.logoUrl && (
                  <div className="form-group">
                    <small className="text-muted">Pré-visualização do logotipo:</small>
                    <div style={{ marginTop: '0.35rem', padding: '0.45rem', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff' }}>
                      <img src={novaMarca.logoUrl} alt="Preview logotipo da marca" style={{ maxHeight: '42px', maxWidth: '170px', objectFit: 'contain' }} />
                    </div>
                  </div>
                )}
              </>
            )}
            <label>
              Modelo
              <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))} placeholder="Ex: EV-4P" />
            </label>
            <label>
              Nº Série
              <input required value={form.numeroSerie} onChange={e => setForm(f => ({ ...f, numeroSerie: e.target.value }))} placeholder="Ex: NAV-EV-001" />
            </label>
          </div>
          <div className="form-row">
            <label>
              Ano de fabrico
              <input type="number" min={1900} max={2100} value={form.anoFabrico} onChange={e => setForm(f => ({ ...f, anoFabrico: e.target.value ? Number(e.target.value) : '' }))} placeholder="Ex: 2022" />
            </label>
            <label>
              Nº documento de venda
              <input value={form.numeroDocumentoVenda} onChange={e => setForm(f => ({ ...f, numeroDocumentoVenda: e.target.value }))} placeholder="Ex: FV-2022-001" />
            </label>
          </div>
          <label>
            Próxima data de manutenção
            <input type="date" required value={form.proximaManut} onChange={e => setForm(f => ({ ...f, proximaManut: e.target.value }))} />
          </label>
          {mode === 'edit' && (() => {
            const maqAtual = maquinas.find(x => x.id === form.id)
            if (!maqAtual || !temContadorHoras(maqAtual.subcategoriaId)) return null
            if (!maqAtual.ultimaManutencaoData && maqAtual.horasTotaisAcumuladas == null && maqAtual.horasServicoAcumuladas == null) return null
            return (
              <div className="form-section horas-acumuladas-section">
                <h3>Contadores (atualizados à última manutenção)</h3>
                <p className="horas-info">
                  {maqAtual.ultimaManutencaoData && <span>Última manutenção: {format(new Date(maqAtual.ultimaManutencaoData), 'd MMM yyyy', { locale: pt })}</span>}
                  {maqAtual.ultimaManutencaoData && (maqAtual.horasTotaisAcumuladas != null || maqAtual.horasServicoAcumuladas != null) && ' · '}
                  {maqAtual.horasTotaisAcumuladas != null && <span>Horas totais: {maqAtual.horasTotaisAcumuladas}h</span>}
                  {maqAtual.horasTotaisAcumuladas != null && maqAtual.horasServicoAcumuladas != null && ' · '}
                  {maqAtual.horasServicoAcumuladas != null && <span>Horas de serviço: {maqAtual.horasServicoAcumuladas}h</span>}
                </p>
              </div>
            )
          })()}
          {isCompressorParafuso(form.subcategoriaId) && (
            <div className="form-section">
              <h3>Ciclo de manutenção KAESER (A/B/C/D)</h3>
              <p className="horas-info">
                Sequência anual: A → B → A → C → A → B → A → C → A → B → A → D (ciclo de 12 anos)
              </p>
              <label>
                Posição actual no ciclo (0 = Ano 1 Tipo A, 1 = Ano 2 Tipo B, ...)
                <select
                  value={form.posicaoKaeser ?? 0}
                  onChange={e => setForm(f => ({ ...f, posicaoKaeser: Number(e.target.value) }))}
                >
                  {SEQUENCIA_KAESER.map((tipo, idx) => (
                    <option key={idx} value={idx}>
                      Ano {idx + 1} — Tipo {tipo}
                      {idx === (form.posicaoKaeser ?? 0) ? ' (actual)' : ''}
                    </option>
                  ))}
                </select>
              </label>
              {form.posicaoKaeser != null && (
                <p className="horas-info" style={{ marginTop: '0.25rem' }}>
                  <strong>Próxima manutenção:</strong> {descricaoCicloKaeser((form.posicaoKaeser + 1) % SEQUENCIA_KAESER.length)}
                </p>
              )}
            </div>
          )}
          {isCompressorParafuso(form.subcategoriaId) && (
            <div className="form-section consumiveis-section">
              <h3>Consumíveis (manutenção regular)</h3>
              <div className="form-row">
                <label>Refª kit manutenção 3000h<input value={form.refKitManut3000h} onChange={e => setForm(f => ({ ...f, refKitManut3000h: e.target.value }))} placeholder="Ex: 1900 1466 00" /></label>
                <label>Refª kit manutenção 6000h<input value={form.refKitManut6000h} onChange={e => setForm(f => ({ ...f, refKitManut6000h: e.target.value }))} placeholder="Ex: 1900 1467 00" /></label>
              </div>
              <div className="form-row">
                <label>Refª correia<input value={form.refCorreia} onChange={e => setForm(f => ({ ...f, refCorreia: e.target.value }))} placeholder="Ex: 1900 1468 00" /></label>
                <label>Refª filtro de óleo<input value={form.refFiltroOleo} onChange={e => setForm(f => ({ ...f, refFiltroOleo: e.target.value }))} placeholder="Ex: 1900 1469 00" /></label>
              </div>
              <div className="form-row">
                <label>Refª filtro separador<input value={form.refFiltroSeparador} onChange={e => setForm(f => ({ ...f, refFiltroSeparador: e.target.value }))} placeholder="Ex: 1900 1470 00" /></label>
                <label>Refª filtro do ar<input value={form.refFiltroAr} onChange={e => setForm(f => ({ ...f, refFiltroAr: e.target.value }))} placeholder="Ex: 1900 1471 00" /></label>
              </div>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" onClick={onClose}>Cancelar</button>
            <button type="submit">{mode === 'add' ? 'Adicionar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
