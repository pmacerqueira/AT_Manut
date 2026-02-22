import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, ListChecks, ArrowLeft } from 'lucide-react'
import { useToast } from '../components/Toast'
import './Categorias.css'

export default function Categorias() {
  const { isAdmin } = usePermissions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const {
    categorias,
    maquinas,
    INTERVALOS,
    getSubcategoriasByCategoria,
    getChecklistBySubcategoria,
    addCategoria,
    updateCategoria,
    removeCategoria,
    addSubcategoria,
    updateSubcategoria,
    removeSubcategoria,
  } = useData()

  const [expandedCat, setExpandedCat] = useState(new Set(categorias.map(c => c.id)))
  const [expandedSub, setExpandedSub] = useState(new Set())
  const [addingCategoria, setAddingCategoria] = useState(false)
  const [addingSubcategoria, setAddingSubcategoria] = useState(null)
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [editingSubcategoria, setEditingSubcategoria] = useState(null)
  const [formCat, setFormCat] = useState({ nome: '', intervaloTipo: 'semestral' })
  const [formSub, setFormSub] = useState({ nome: '' })

  if (!isAdmin) return <Navigate to="/" replace />

  const toggleCat = (id) => {
    setExpandedCat(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSub = (id) => {
    setExpandedSub(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleAddCategoria = (e) => {
    e.preventDefault()
    const newId = addCategoria(formCat)
    if (newId) setExpandedCat(prev => new Set([...prev, newId]))
    setFormCat({ nome: '', intervaloTipo: 'semestral' })
    setAddingCategoria(false)
    showToast('Categoria adicionada.', 'success')
  }

  const handleAddSubcategoria = (e, categoriaId) => {
    e.preventDefault()
    addSubcategoria({ nome: formSub.nome, categoriaId })
    setFormSub({ nome: '' })
    setAddingSubcategoria(null)
    showToast('Subcategoria adicionada.', 'success')
  }

  const openEditCategoria = (cat) => {
    setFormCat({ nome: cat.nome, intervaloTipo: cat.intervaloTipo })
    setEditingCategoria(cat.id)
  }

  const handleEditCategoria = (e) => {
    e.preventDefault()
    updateCategoria(editingCategoria, formCat)
    setEditingCategoria(null)
    showToast('Categoria actualizada.', 'success')
  }

  const handleRemoveCategoria = (cat) => {
    const subs = getSubcategoriasByCategoria(cat.id)
    if (subs.length > 0) {
      showToast(`Elimine primeiro as ${subs.length} subcategoria(s) de "${cat.nome}".`, 'warning', 4000)
      return
    }
    if (window.confirm(`Eliminar a categoria "${cat.nome}"? Esta acção é irreversível.`)) {
      removeCategoria(cat.id)
      setExpandedCat(prev => { const n = new Set(prev); n.delete(cat.id); return n })
      showToast('Categoria eliminada.', 'info')
    }
  }

  const openEditSubcategoria = (sub) => {
    setFormSub({ nome: sub.nome })
    setEditingSubcategoria(sub.id)
  }

  const handleEditSubcategoria = (e) => {
    e.preventDefault()
    updateSubcategoria(editingSubcategoria, formSub)
    setEditingSubcategoria(null)
    showToast('Subcategoria actualizada.', 'success')
  }

  const canRemoveSubcategoria = (subId) => !maquinas.some(m => m.subcategoriaId === subId)

  const handleRemoveSubcategoria = (sub) => {
    if (!canRemoveSubcategoria(sub.id)) {
      showToast(`Não é possível eliminar: existem equipamentos associados a "${sub.nome}".`, 'warning', 4000)
      return
    }
    if (window.confirm(`Eliminar subcategoria "${sub.nome}"?`)) {
      removeSubcategoria(sub.id)
      setExpandedSub(prev => { const n = new Set(prev); n.delete(sub.id); return n })
      showToast('Subcategoria eliminada.', 'info')
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>Categorias e Subcategorias</h1>
          <p className="page-sub">Tipos de máquinas e checklists de verificação (conformidade legal)</p>
        </div>
        {!addingCategoria && (
          <button type="button" onClick={() => setAddingCategoria(true)}>
            <Plus size={18} /> Nova categoria
          </button>
        )}
      </div>

      {addingCategoria && (
        <div className="card add-form">
          <form onSubmit={handleAddCategoria}>
            <label>
              Nome da categoria
              <input required value={formCat.nome} onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Compressores" />
            </label>
            <label>
              Intervalo de manutenção
              <select value={formCat.intervaloTipo} onChange={e => setFormCat(f => ({ ...f, intervaloTipo: e.target.value }))}>
                {Object.entries(INTERVALOS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </label>
            <div className="form-actions">
              <button type="submit">Adicionar</button>
              <button type="button" className="secondary" onClick={() => { setAddingCategoria(false); setFormCat({ nome: '', intervaloTipo: 'semestral' }) }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      <div className="categorias-tree card">
        {categorias.map(cat => {
          const subs = getSubcategoriasByCategoria(cat.id)
          const isExpanded = expandedCat.has(cat.id)
          return (
            <div key={cat.id} className="categoria-block">
              {editingCategoria === cat.id ? (
                <div className="edit-form-inline card">
                  <form onSubmit={handleEditCategoria}>
                    <div className="form-field">
                      <label>Nome da categoria</label>
                      <input required value={formCat.nome} onChange={e => setFormCat(f => ({ ...f, nome: e.target.value }))} placeholder="Ex: Compressores" />
                    </div>
                    <div className="form-field">
                      <label>Intervalo de manutenção</label>
                      <select value={formCat.intervaloTipo} onChange={e => setFormCat(f => ({ ...f, intervaloTipo: e.target.value }))}>
                        {Object.entries(INTERVALOS).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-actions">
                      <button type="submit">Guardar</button>
                      <button type="button" className="secondary" onClick={() => setEditingCategoria(null)}>Cancelar</button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="categoria-row">
                  <button type="button" className="expand-btn" onClick={() => toggleCat(cat.id)}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <span className="categoria-nome">{cat.nome}</span>
                  <span className="badge badge-intervalo">{INTERVALOS[cat.intervaloTipo]?.label}</span>
                  <div className="categoria-actions">
                    <button type="button" className="icon-btn secondary" onClick={() => openEditCategoria(cat)} title="Editar categoria"><Pencil size={14} /></button>
                    <button type="button" className="icon-btn danger" onClick={() => handleRemoveCategoria(cat)} title="Eliminar categoria"><Trash2 size={14} /></button>
                  </div>
                </div>
              )}
              {isExpanded && (
                <div className="subcategorias-list">
                  {addingSubcategoria === cat.id ? (
                    <div className="add-form-inline">
                      <form onSubmit={e => handleAddSubcategoria(e, cat.id)}>
                        <input required value={formSub.nome} onChange={e => setFormSub({ nome: e.target.value })} placeholder="Nome da subcategoria" />
                        <button type="submit">Adicionar</button>
                        <button type="button" className="secondary" onClick={() => { setAddingSubcategoria(null); setFormSub({ nome: '' }) }}>Cancelar</button>
                      </form>
                    </div>
                  ) : (
                    <button type="button" className="btn-add-sub" onClick={() => setAddingSubcategoria(cat.id)}>
                      <Plus size={14} /> Nova subcategoria
                    </button>
                  )}
                  {subs.map(sub => {
                    const items = getChecklistBySubcategoria(sub.id)
                    const subExpanded = expandedSub.has(sub.id)
                    return (
                      <div key={sub.id} className="subcategoria-block">
                        <div className="subcategoria-row">
                          <button type="button" className="expand-btn sub" onClick={() => toggleSub(sub.id)}>
                            {subExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <span className="subcategoria-nome">{sub.nome}</span>
                          <span className="badge badge-count"><ListChecks size={12} /> {items.length} itens</span>
                        </div>
                        {subExpanded && (
                          <div className="checklist-list">
                            <strong>Checklist</strong>
                            {items.map((item, i) => (
                              <div key={item.id} className="checklist-item">
                                <span className="ordem">{i + 1}.</span>
                                <span className="texto">{item.texto}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
