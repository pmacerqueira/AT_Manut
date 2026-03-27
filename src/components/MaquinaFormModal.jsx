import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useData, SUBCATEGORIAS_COM_CONTADOR_HORAS, SEQUENCIA_KAESER, descricaoCicloKaeser, isKaeserMarca, PLANO_MANUT_COMPRESSOR_KAESER_ABCD, OPCOES_PLANO_MANUT_COMPRESSOR_PARAFUSO } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/users'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useToast } from './Toast'
import { getHojeAzores } from '../utils/datasAzores'
import { horasContadorNaFicha } from '../utils/horasContadorEquipamento'
import { getFeriadosAno, isFimDeSemana, isFeriado } from '../utils/diasUteis'
import { COPY_DOC_FIO_CONDUTOR, COPY_DOC_PARAFUSO_KAESER } from '../constants/documentacaoEquipamentoCopy'

const isElevadores = (getCategoria, categoriaId) => {
  const cat = getCategoria(categoriaId)
  return cat?.nome?.toLowerCase().includes('levador') ?? false
}

const isCompressorParafuso = (subcategoriaId) => ['sub5', 'sub14'].includes(subcategoriaId)
const temContadorHoras = (subcategoriaId) => SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(subcategoriaId)

function inicialPlanoManutCompressor(mq) {
  if (!mq) return ''
  const p = mq.planoManutencaoCompressor ?? mq.plano_manutencao_compressor ?? ''
  if (p) return p
  if (isCompressorParafuso(mq.subcategoriaId) && mq.posicaoKaeser != null && isKaeserMarca(mq.marca)) {
    return PLANO_MANUT_COMPRESSOR_KAESER_ABCD
  }
  return ''
}

/** Garante `planoManutencaoCompressor` + `posicaoKaeser` coerentes com a subcategoria. */
function aplicarRegrasPlanoParafuso(f, patch) {
  const next = { ...f, ...patch }
  const subId = next.subcategoriaId
  if (!isCompressorParafuso(subId)) {
    return { ...next, planoManutencaoCompressor: '', posicaoKaeser: null }
  }
  const pl = next.planoManutencaoCompressor ?? ''
  if (pl === PLANO_MANUT_COMPRESSOR_KAESER_ABCD) {
    return { ...next, posicaoKaeser: next.posicaoKaeser === undefined ? null : next.posicaoKaeser }
  }
  return { ...next, posicaoKaeser: null }
}

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
    addManutencao,
    manutencoes,
    updateManutencao,
  } = useData()
  const { showToast } = useToast()
  const { user } = useAuth()
  const isAdmin = user?.role === ROLES.ADMIN
  const [avisoData, setAvisoData] = useState('')
  const feriadosSet = useMemo(() => {
    const ano = new Date().getFullYear()
    const set = new Set()
    for (let a = ano - 1; a <= ano + 3; a++) getFeriadosAno(a).forEach(f => set.add(f))
    return set
  }, [])

  const validarDataManut = useCallback((dateStr) => {
    if (!dateStr) { setAvisoData(''); return true }
    const d = new Date(dateStr + 'T12:00:00')
    if (isFimDeSemana(d)) {
      const dia = d.getDay() === 0 ? 'Domingo' : 'Sábado'
      setAvisoData(`${dia} — não é dia útil. Escolha um dia de semana.`)
      return false
    }
    if (isFeriado(d, feriadosSet)) {
      setAvisoData('Esta data é feriado. Escolha outro dia.')
      return false
    }
    setAvisoData('')
    return true
  }, [feriadosSet])

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
    planoManutencaoCompressor: '',
    posicaoKaeser: null,
  })

  /** Há pelo menos uma intervenção concluída — aí a ficha pode mostrar contador/data actualizados pela última execução. */
  const temManutencaoConcluidaNaMaq = useMemo(() => {
    if (!form.id) return false
    return manutencoes.some(
      m => String(m.maquinaId) === String(form.id) && m.status === 'concluida',
    )
  }, [manutencoes, form.id])

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
        proximaManut: getHojeAzores(),
        refKitManut3000h: '',
        refKitManut6000h: '',
        refCorreia: '',
        refFiltroOleo: '',
        refFiltroSeparador: '',
        refFiltroAr: '',
        planoManutencaoCompressor: '',
        posicaoKaeser: null,
      })
      setShowNovaMarca(false)
      setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
    } else if (maquina) {
      const sub = getSubcategoria(maquina.subcategoriaId)
      getCategoria(sub?.categoriaId)
      const periodicidade = maquina.periodicidadeManut ?? (isElevadores(getCategoria, sub?.categoriaId) ? 'anual' : '')
      const matchedMarca = marcas.find(m => (m.nome ?? '').toLowerCase() === (maquina.marca ?? '').toLowerCase())
      const planoIni = inicialPlanoManutCompressor(maquina)
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
        planoManutencaoCompressor: planoIni,
        posicaoKaeser: planoIni === PLANO_MANUT_COMPRESSOR_KAESER_ABCD ? (maquina.posicaoKaeser ?? null) : null,
      })
      setShowNovaMarca(false)
      setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
    }
  }, [isOpen, mode, clienteNifLocked, maquina, categorias, clientes, marcas, getSubcategoriasByCategoria, getSubcategoria, getCategoria, INTERVALOS])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin && !validarDataManut(form.proximaManut)) {
      showToast('A data escolhida não é dia útil. Selecione outro dia.', 'warning')
      return
    }
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

      if (!isCompressorParafuso(payload.subcategoriaId)) {
        payload.planoManutencaoCompressor = ''
        payload.posicaoKaeser = null
      } else if (payload.planoManutencaoCompressor === PLANO_MANUT_COMPRESSOR_KAESER_ABCD) {
        /* posicaoKaeser pode ficar null — definida na 1ª execução com horas no local */
      } else {
        payload.planoManutencaoCompressor = ''
        payload.posicaoKaeser = null
      }

      if (mode === 'add') {
        const novoId = await addMaquina(payload)
        if (payload.proximaManut) {
          addManutencao({
            maquinaId: novoId,
            data: payload.proximaManut,
            tipo: 'periodica',
            status: 'pendente',
            observacoes: '',
            tecnico: '',
          })
        }
        showToast('Equipamento adicionado com sucesso.', 'success')
        onSave?.({ id: novoId, ...payload }, 'add')
      } else {
        await updateMaquina(id, payload)
        // A5: Se proximaManut mudou, sincronizar manutenção pendente
        if (payload.proximaManut && payload.proximaManut !== maquina?.proximaManut) {
          const pendente = manutencoes.find(m =>
            String(m.maquinaId) === String(id) && (m.status === 'pendente' || m.status === 'agendada')
          )
          if (pendente) {
            updateManutencao(pendente.id, { data: payload.proximaManut })
          } else {
            addManutencao({
              maquinaId: id,
              data: payload.proximaManut,
              tipo: 'periodica',
              status: 'pendente',
              observacoes: '',
              tecnico: '',
            })
          }
        }
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
              const subId = subs[0]?.id || ''
              const defPeriodicidade = isElevadores(getCategoria, catId) ? 'anual' : ''
              setForm(f => aplicarRegrasPlanoParafuso(f, { categoriaId: catId, subcategoriaId: subId, periodicidadeManut: defPeriodicidade }))
            }}>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome} ({c.intervaloTipo})</option>
              ))}
            </select>
          </label>
          <label>
            Subcategoria (tipo de máquina)
            <select required value={form.subcategoriaId} onChange={e => {
              const subId = e.target.value
              setForm(f => aplicarRegrasPlanoParafuso(f, { subcategoriaId: subId }))
            }}>
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
                    setForm(f => {
                      const next = { ...f, marcaId: '', marca: '', marcaLogoUrl: '', marcaCorHex: '' }
                      if (!isCompressorParafuso(next.subcategoriaId)) return { ...next, posicaoKaeser: null, planoManutencaoCompressor: '' }
                      if ((next.planoManutencaoCompressor ?? '') === PLANO_MANUT_COMPRESSOR_KAESER_ABCD) {
                        return { ...next, posicaoKaeser: next.posicaoKaeser ?? null }
                      }
                      return { ...next, posicaoKaeser: null }
                    })
                    return
                  }
                  if (!val) {
                    setShowNovaMarca(false)
                    setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
                    setForm(f => {
                      const next = { ...f, marcaId: '', marca: '', marcaLogoUrl: '', marcaCorHex: '' }
                      if (!isCompressorParafuso(next.subcategoriaId)) return { ...next, posicaoKaeser: null, planoManutencaoCompressor: '' }
                      if ((next.planoManutencaoCompressor ?? '') === PLANO_MANUT_COMPRESSOR_KAESER_ABCD) {
                        return { ...next, posicaoKaeser: next.posicaoKaeser ?? null }
                      }
                      return { ...next, posicaoKaeser: null }
                    })
                    return
                  }
                  const selected = findMarcaByOptionValue(val)
                  setShowNovaMarca(false)
                  setNovaMarca({ nome: '', logoUrl: '', corHex: '#1a4880' })
                  setForm(f => {
                    const marcaNome = selected?.nome || ''
                    const base = {
                      ...f,
                      marcaId: selected?.id != null && String(selected.id).trim() !== '' ? String(selected.id) : '',
                      marca: marcaNome,
                      marcaLogoUrl: selected?.logoUrl || '',
                      marcaCorHex: selected?.corHex || '',
                    }
                    if (!isCompressorParafuso(base.subcategoriaId)) {
                      return { ...base, posicaoKaeser: null, planoManutencaoCompressor: '' }
                    }
                    if ((base.planoManutencaoCompressor ?? '') === PLANO_MANUT_COMPRESSOR_KAESER_ABCD) {
                      return { ...base, posicaoKaeser: base.posicaoKaeser ?? null }
                    }
                    return { ...base, posicaoKaeser: null }
                  })
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
            <input type="date" required value={form.proximaManut}
              onChange={e => {
                const v = e.target.value
                setForm(f => ({ ...f, proximaManut: v }))
                validarDataManut(v)
              }} />
            {avisoData && <span className="form-aviso-data">{avisoData}</span>}
          </label>
          {mode === 'edit' && (() => {
            const maqAtual = maquinas.find(x => String(x.id) === String(form.id))
            if (!maqAtual || !temContadorHoras(maqAtual.subcategoriaId)) return null
            const horasFicha = horasContadorNaFicha(maqAtual)
            const temOrfaosNaFicha = !temManutencaoConcluidaNaMaq && (!!maqAtual.ultimaManutencaoData || horasFicha != null)

            if (!temManutencaoConcluidaNaMaq) {
              return (
                <div className="form-section horas-acumuladas-section">
                  <h3>Contador</h3>
                  {!temOrfaosNaFicha ? (
                    <p className="horas-info">
                      Sem manutenções <strong>concluídas</strong> neste equipamento. Referência na ficha: <strong>0 h</strong> até à primeira intervenção finalizada com relatório.
                    </p>
                  ) : (
                    <>
                      <p className="horas-info">
                        Não há manutenções concluídas, mas a ficha na base ainda tem data/horas de intervenções que já não existem.
                        A referência correcta é <strong>0 h</strong> até voltar a concluir uma visita.
                      </p>
                      {isAdmin && (
                        <p className="horas-info" style={{ marginTop: '0.5rem' }}>
                          <span className="text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                            Valores órfãos na base: {maqAtual.ultimaManutencaoData
                              ? `última data ${format(new Date(maqAtual.ultimaManutencaoData + 'T12:00:00'), 'd MMM yyyy', { locale: pt })}`
                              : 'sem data'}
                            {horasFicha != null ? ` · ${horasFicha} h` : ''}
                          </span>
                          <button
                            type="button"
                            className="btn secondary btn-sm"
                            onClick={async () => {
                              if (!window.confirm('Limpar na ficha a data da última manutenção e as horas acumuladas? (Recomendado após apagar intervenções antigas.)')) return
                              try {
                                await updateMaquina(maqAtual.id, {
                                  ultimaManutencaoData: null,
                                  horasServicoAcumuladas: null,
                                  horasTotaisAcumuladas: null,
                                })
                                showToast('Contador e data repostos na ficha.', 'success')
                              } catch (err) {
                                showToast(err?.message || 'Não foi possível limpar a ficha.', 'error', 4000)
                              }
                            }}
                          >
                            Limpar contador e data na ficha
                          </button>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )
            }

            if (!maqAtual.ultimaManutencaoData && horasFicha == null) return null
            return (
              <div className="form-section horas-acumuladas-section">
                <h3>Contador (atualizado à última manutenção)</h3>
                <p className="horas-info">
                  {maqAtual.ultimaManutencaoData && <span>Última manutenção: {format(new Date(maqAtual.ultimaManutencaoData + 'T12:00:00'), 'd MMM yyyy', { locale: pt })}</span>}
                  {maqAtual.ultimaManutencaoData && horasFicha != null && ' · '}
                  {horasFicha != null && <span>Horas no contador: {horasFicha} h</span>}
                </p>
              </div>
            )
          })()}
          {isCompressorParafuso(form.subcategoriaId) && (
            <div className="form-section">
              <h3>Escolha o plano de manutenção a aplicar</h3>
              <p className="horas-info">
                Cada fabricante pode ter o seu plano (Fini, LaPadana, IES, ECF, …). Por agora está disponível o plano <strong>KAESER A/B/C/D</strong>,
                com consumíveis por fase e por número de série — importação a partir do PDF do template no <strong>Plano de peças</strong>.
              </p>
              <label>
                Plano de manutenção
                <select
                  value={form.planoManutencaoCompressor ?? ''}
                  onChange={e => {
                    const v = e.target.value
                    setForm(f => aplicarRegrasPlanoParafuso(f, { planoManutencaoCompressor: v }))
                  }}
                >
                  {OPCOES_PLANO_MANUT_COMPRESSOR_PARAFUSO.map(o => (
                    <option key={o.value || 'none'} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </label>
              {form.planoManutencaoCompressor === PLANO_MANUT_COMPRESSOR_KAESER_ABCD && (
                <>
                  <p className="horas-info" style={{ marginTop: '0.75rem' }}>
                    Ciclo de 12 anos (referência horas de serviço): A → B → A → C → A → B → A → C → A → B → A → D.
                    A importação PDF preenche os consumíveis das fases A, B, C e D para este número de série.
                  </p>
                  <label>
                    Posição no ciclo A/B/C/D (opcional no cadastro)
                    <select
                      value={form.posicaoKaeser == null ? '' : String(form.posicaoKaeser)}
                      onChange={e => {
                        const v = e.target.value
                        setForm(f => ({ ...f, posicaoKaeser: v === '' ? null : Number(v) }))
                      }}
                    >
                      <option value="">A definir na 1ª execução (horas de serviço no compressor)</option>
                      {SEQUENCIA_KAESER.map((tipo, idx) => (
                        <option key={idx} value={String(idx)}>
                          Ano {idx + 1} — Tipo {tipo}
                          {form.posicaoKaeser != null && idx === form.posicaoKaeser ? ' (actual)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  {form.posicaoKaeser != null ? (
                    <p className="horas-info" style={{ marginTop: '0.25rem' }}>
                      <strong>Próxima manutenção:</strong> {descricaoCicloKaeser((form.posicaoKaeser + 1) % SEQUENCIA_KAESER.length)}
                    </p>
                  ) : (
                    <p className="horas-info" style={{ marginTop: '0.25rem' }}>
                      Sem posição fixa: no agendamento não é necessário saber a fase. Na execução, o técnico regista as <strong>horas de serviço</strong> e confirma o tipo A/B/C/D.
                    </p>
                  )}
                </>
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
          {isCompressorParafuso(form.subcategoriaId) && (
            <div className="form-section">
              <h3>Documentação técnica do equipamento</h3>
              <p className="horas-info">{COPY_DOC_FIO_CONDUTOR}</p>
              <p className="horas-info" style={{ marginTop: '0.5rem' }}>{COPY_DOC_PARAFUSO_KAESER}</p>
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn">{mode === 'add' ? 'Adicionar' : 'Guardar'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}
