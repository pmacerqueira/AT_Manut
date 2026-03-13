import { useState, useCallback } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, ListChecks, ArrowLeft, ArrowUp, ArrowDown, Check, X } from 'lucide-react'
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
    addChecklistItem,
    updateChecklistItem,
    removeChecklistItem,
  } = useData()

  const [expandedCat, setExpandedCat] = useState(new Set())
  const [expandedSub, setExpandedSub] = useState(new Set())
  const [addingCategoria, setAddingCategoria] = useState(false)
  const [addingSubcategoria, setAddingSubcategoria] = useState(null)
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [editingSubcategoria, setEditingSubcategoria] = useState(null)
  const [formCat, setFormCat] = useState({ nome: '', intervaloTipo: 'semestral' })
  const [formSub, setFormSub] = useState({ nome: '' })

  const [editingCheckItem, setEditingCheckItem] = useState(null)
  const [editCheckTexto, setEditCheckTexto] = useState('')
  const [addingCheckSub, setAddingCheckSub] = useState(null)
  const [newCheckTexto, setNewCheckTexto] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleAddCheckItem = useCallback((subcategoriaId, items) => {
    const texto = newCheckTexto.trim()
    if (!texto) return
    const maxOrdem = items.length > 0 ? Math.max(...items.map(it => it.ordem)) : 0
    addChecklistItem({ subcategoriaId, texto, ordem: maxOrdem + 1, tipo: 'periodica' })
    setNewCheckTexto('')
    showToast('Item adicionado à checklist.', 'success')
  }, [newCheckTexto, addChecklistItem, showToast])

  const handleEditCheckItem = useCallback((item) => {
    const texto = editCheckTexto.trim()
    if (!texto || texto === item.texto) { setEditingCheckItem(null); return }
    updateChecklistItem(item.id, { texto })
    setEditingCheckItem(null)
    showToast('Item actualizado.', 'success')
  }, [editCheckTexto, updateChecklistItem, showToast])

  const handleRemoveCheckItem = useCallback((item) => {
    setConfirmDelete({ type: 'checklist', id: item.id, label: item.texto?.slice(0, 60) })
  }, [])

  const handleMoveCheckItem = useCallback((items, index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= items.length) return
    const a = items[index]
    const b = items[targetIndex]
    updateChecklistItem(a.id, { ordem: b.ordem })
    updateChecklistItem(b.id, { ordem: a.ordem })
  }, [updateChecklistItem])

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
    setConfirmDelete({ type: 'categoria', id: cat.id, label: cat.nome })
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
    setConfirmDelete({ type: 'subcategoria', id: sub.id, label: sub.nome })
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
                    const isEditingSub = editingSubcategoria === sub.id
                    return (
                      <div key={sub.id} className="subcategoria-block">
                        {isEditingSub ? (
                          <div className="edit-form-inline card">
                            <form onSubmit={handleEditSubcategoria}>
                              <div className="form-field">
                                <label>Nome da subcategoria</label>
                                <input
                                  required
                                  value={formSub.nome}
                                  onChange={e => setFormSub({ nome: e.target.value })}
                                  placeholder="Ex: Gerador diesel"
                                />
                              </div>
                              <div className="form-actions">
                                <button type="submit">Guardar</button>
                                <button type="button" className="secondary" onClick={() => setEditingSubcategoria(null)}>Cancelar</button>
                              </div>
                            </form>
                          </div>
                        ) : (
                          <div className="subcategoria-row">
                            <button type="button" className="expand-btn sub" onClick={() => toggleSub(sub.id)}>
                              {subExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                            <span className="subcategoria-nome">{sub.nome}</span>
                            <span className="badge badge-count"><ListChecks size={12} /> {items.length} itens</span>
                            <div className="subcategoria-actions">
                              <button
                                type="button"
                                className="icon-btn secondary"
                                onClick={() => openEditSubcategoria(sub)}
                                title="Editar subcategoria"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                type="button"
                                className="icon-btn danger"
                                onClick={() => handleRemoveSubcategoria(sub)}
                                title={canRemoveSubcategoria(sub.id) ? 'Eliminar subcategoria' : 'Existem equipamentos associados'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                        {subExpanded && (
                          <div className="checklist-list">
                            <div className="checklist-header">
                              <strong>Checklist ({items.length} itens)</strong>
                            </div>
                            {items.map((item, i) => (
                              <div key={item.id} className={`checklist-item${editingCheckItem === item.id ? ' edit' : ''}`}>
                                {editingCheckItem === item.id ? (
                                  <>
                                    <span className="ordem">{i + 1}.</span>
                                    <div className="inline-edit">
                                      <input
                                        value={editCheckTexto}
                                        onChange={e => setEditCheckTexto(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleEditCheckItem(item); if (e.key === 'Escape') setEditingCheckItem(null) }}
                                        autoFocus
                                      />
                                      <button type="button" className="icon-btn success" onClick={() => handleEditCheckItem(item)} title="Guardar"><Check size={14} /></button>
                                      <button type="button" className="icon-btn secondary" onClick={() => setEditingCheckItem(null)} title="Cancelar"><X size={14} /></button>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <span className="ordem">{i + 1}.</span>
                                    <span className="texto">{item.texto}</span>
                                    <div className="checklist-item-actions">
                                      <button type="button" className="icon-btn secondary" onClick={() => handleMoveCheckItem(items, i, -1)} disabled={i === 0} title="Mover para cima"><ArrowUp size={13} /></button>
                                      <button type="button" className="icon-btn secondary" onClick={() => handleMoveCheckItem(items, i, 1)} disabled={i === items.length - 1} title="Mover para baixo"><ArrowDown size={13} /></button>
                                      <button type="button" className="icon-btn secondary" onClick={() => { setEditingCheckItem(item.id); setEditCheckTexto(item.texto) }} title="Editar texto"><Pencil size={13} /></button>
                                      <button type="button" className="icon-btn danger" onClick={() => handleRemoveCheckItem(item)} title="Eliminar item"><Trash2 size={13} /></button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                            {addingCheckSub === sub.id ? (
                              <div className="checklist-item edit">
                                <span className="ordem">{items.length + 1}.</span>
                                <div className="inline-edit">
                                  <input
                                    value={newCheckTexto}
                                    onChange={e => setNewCheckTexto(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { handleAddCheckItem(sub.id, items); } if (e.key === 'Escape') { setAddingCheckSub(null); setNewCheckTexto('') } }}
                                    placeholder="Texto do novo item de verificação"
                                    autoFocus
                                  />
                                  <button type="button" className="icon-btn success" onClick={() => handleAddCheckItem(sub.id, items)} title="Adicionar"><Check size={14} /></button>
                                  <button type="button" className="icon-btn secondary" onClick={() => { setAddingCheckSub(null); setNewCheckTexto('') }} title="Cancelar"><X size={14} /></button>
                                </div>
                              </div>
                            ) : (
                              <button type="button" className="btn-add-check" onClick={() => { setAddingCheckSub(sub.id); setNewCheckTexto('') }}>
                                <Plus size={13} /> Adicionar item
                              </button>
                            )}
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

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal modal-compact" onClick={e => e.stopPropagation()}>
            <h2>Confirmar eliminação</h2>
            <p>Eliminar {confirmDelete.type === 'categoria' ? 'a categoria' : confirmDelete.type === 'subcategoria' ? 'a subcategoria' : 'o item'} <strong>"{confirmDelete.label}"</strong>?</p>
            {confirmDelete.type === 'checklist' && <p className="text-muted" style={{ fontSize: '0.85rem' }}>Relatórios já emitidos mantêm o snapshot da checklist original.</p>}
            <p className="text-danger" style={{ fontSize: '0.85rem' }}>Esta acção é irreversível.</p>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button type="button" className="danger" onClick={() => {
                const { type, id } = confirmDelete
                if (type === 'categoria') {
                  removeCategoria(id)
                  setExpandedCat(prev => { const n = new Set(prev); n.delete(id); return n })
                } else if (type === 'subcategoria') {
                  removeSubcategoria(id)
                  setExpandedSub(prev => { const n = new Set(prev); n.delete(id); return n })
                } else {
                  removeChecklistItem(id)
                }
                showToast(`${type === 'categoria' ? 'Categoria' : type === 'subcategoria' ? 'Subcategoria' : 'Item'} eliminado(a).`, 'success')
                setConfirmDelete(null)
              }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
