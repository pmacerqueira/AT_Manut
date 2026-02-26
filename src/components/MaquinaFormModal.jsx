import { useState, useEffect, useRef } from 'react'
import { useData } from '../context/DataContext'
import { SUBCATEGORIAS_COM_CONTADOR_HORAS, SUBCATEGORIAS_COMPRESSOR, SEQUENCIA_KAESER, tipoKaeserNaPosicao, descricaoCicloKaeser, MARCAS_COMPRESSOR, MARCAS_ELEVADOR } from '../context/DataContext'
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

export default function MaquinaFormModal({ isOpen, onClose, mode, clienteNifLocked, maquina, onSave }) {
  const {
    clientes,
    categorias,
    maquinas,
    INTERVALOS,
    getSubcategoriasByCategoria,
    getSubcategoria,
    getCategoria,
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
    marca: '',
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
        marca: '',
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
    } else if (maquina) {
      const sub = getSubcategoria(maquina.subcategoriaId)
      getCategoria(sub?.categoriaId)
      const periodicidade = maquina.periodicidadeManut ?? (isElevadores(getCategoria, sub?.categoriaId) ? 'anual' : '')
      setForm({
        id: maquina.id,
        clienteNif: maquina.clienteNif,
        categoriaId: sub?.categoriaId || '',
        subcategoriaId: maquina.subcategoriaId,
        periodicidadeManut: periodicidade,
        marca: maquina.marca,
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
    }
  }, [isOpen, mode, clienteNifLocked, maquina, categorias, clientes, getSubcategoriasByCategoria, getSubcategoria, getCategoria, INTERVALOS])

  const handleSubmit = (e) => {
    e.preventDefault()
    const { categoriaId: _cid, id, ...payload } = form
    if (mode === 'add') {
      const novoId = addMaquina(payload)
      showToast('Equipamento adicionado com sucesso.', 'success')
      onSave?.({ id: novoId, ...payload }, 'add')
    } else {
      updateMaquina(id, payload)
      showToast('Equipamento actualizado com sucesso.', 'success')
      onSave?.({ id, ...payload }, 'edit')
    }
    onClose()
  }

  if (!isOpen) return null

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
              <input
                value={form.marca}
                onChange={e => setForm(f => ({ ...f, marca: e.target.value }))}
                placeholder={isCompressor(form.subcategoriaId) ? 'Ex: KAESER, Fini, ECF…' : 'Ex: Cascos, Ravaglioli…'}
                list="marcas-sugestoes"
              />
              <datalist id="marcas-sugestoes">
                {(isCompressor(form.subcategoriaId) ? MARCAS_COMPRESSOR : MARCAS_ELEVADOR).map(m => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
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
