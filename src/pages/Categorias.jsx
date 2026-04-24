import { useState, useCallback, useEffect } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, ListChecks, Package, ArrowLeft, ArrowUp, ArrowDown, Check, X, MessageSquareText } from 'lucide-react'
import { useToast } from '../components/Toast'
import { getCanonicalDeclaracaoDepoisSuffix } from '../constants/relatorio'
import { atmTaxonomyAsciiName } from '../utils/taxonomyAsciiName'
import './Categorias.css'

const QUICK_NOTES_DEFAULT = [
  'Equipamento em bom estado geral',
  'Desgaste normal, dentro do esperado',
  'Necessita acompanhamento na próxima visita',
  'Cliente informado de anomalia',
  'Peça substituída preventivamente',
  'Ruído anormal detetado — monitorizar',
  'Lubrificação efetuada em todos os pontos',
  'Alinhamento verificado e corrigido',
  'Filtros substituídos conforme plano',
  'Sem observações adicionais',
]

function loadQuickNotes() {
  try {
    const stored = JSON.parse(localStorage.getItem('atm_quick_notes') || 'null')
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch { /* fallback */ }
  return [...QUICK_NOTES_DEFAULT]
}

function saveQuickNotes(notes) {
  localStorage.setItem('atm_quick_notes', JSON.stringify(notes))
}

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
  const [formCat, setFormCat] = useState({ nome: '', intervaloTipo: 'semestral', declaracaoClienteDepois: '' })
  const [formSub, setFormSub] = useState({ nome: '' })

  const [editingCheckItem, setEditingCheckItem] = useState(null)
  const [editCheckTexto, setEditCheckTexto] = useState('')
  const [addingCheckSub, setAddingCheckSub] = useState(null)
  const [newCheckTexto, setNewCheckTexto] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const [quickNotes, setQuickNotes] = useState(loadQuickNotes)
  const [qnExpanded, setQnExpanded] = useState(false)
  const [qnAdding, setQnAdding] = useState(false)
  const [qnNewText, setQnNewText] = useState('')
  const [qnEditing, setQnEditing] = useState(null)
  const [qnEditText, setQnEditText] = useState('')

  useEffect(() => { saveQuickNotes(quickNotes) }, [quickNotes])

  const qnAdd = useCallback(() => {
    const t = qnNewText.trim()
    if (!t) return
    setQuickNotes(prev => [...prev, t])
    setQnNewText('')
    setQnAdding(false)
    showToast('Nota rápida adicionada.', 'success')
  }, [qnNewText, showToast])

  const qnSaveEdit = useCallback((idx) => {
    const t = qnEditText.trim()
    if (!t) return
    setQuickNotes(prev => prev.map((n, i) => i === idx ? t : n))
    setQnEditing(null)
    showToast('Nota rápida actualizada.', 'success')
  }, [qnEditText, showToast])

  const qnRemove = useCallback((idx) => {
    setQuickNotes(prev => prev.filter((_, i) => i !== idx))
    showToast('Nota rápida eliminada.', 'success')
  }, [showToast])

  const qnMove = useCallback((idx, dir) => {
    setQuickNotes(prev => {
      const next = [...prev]
      const target = idx + dir
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }, [])

  const qnReset = useCallback(() => {
    setQuickNotes([...QUICK_NOTES_DEFAULT])
    showToast('Notas rápidas repostas para os valores originais.', 'success')
  }, [showToast])

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
    const newId = addCategoria({
      ...formCat,
      nome: atmTaxonomyAsciiName(formCat.nome),
      declaracaoClienteDepois: (formCat.declaracaoClienteDepois ?? '').trim(),
    })
    if (newId) setExpandedCat(prev => new Set([...prev, newId]))
    setFormCat({ nome: '', intervaloTipo: 'semestral', declaracaoClienteDepois: '' })
    setAddingCategoria(false)
    showToast('Categoria adicionada.', 'success')
  }

  const handleAddSubcategoria = (e, categoriaId) => {
    e.preventDefault()
    addSubcategoria({ nome: atmTaxonomyAsciiName(formSub.nome), categoriaId })
    setFormSub({ nome: '' })
    setAddingSubcategoria(null)
    showToast('Subcategoria adicionada.', 'success')
  }

  const openEditCategoria = (cat) => {
    setFormCat({
      nome: cat.nome,
      intervaloTipo: cat.intervaloTipo,
      declaracaoClienteDepois: cat.declaracaoClienteDepois ?? cat.declaracao_cliente_depois ?? '',
    })
    setEditingCategoria(cat.id)
  }

  const handleEditCategoria = (e) => {
    e.preventDefault()
    const decl = (formCat.declaracaoClienteDepois ?? '').trim()
    updateCategoria(editingCategoria, { ...formCat, nome: atmTaxonomyAsciiName(formCat.nome), declaracaoClienteDepois: decl })
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
    updateSubcategoria(editingSubcategoria, { nome: atmTaxonomyAsciiName(formSub.nome) })
    setEditingSubcategoria(null)
    showToast('Subcategoria actualizada.', 'success')
  }

  const normSubId = (id) => (id == null || id === '' ? '' : String(id))
  const canRemoveSubcategoria = (subId) =>
    !maquinas.some(m => normSubId(m.subcategoriaId ?? m.subcategoria_id) === normSubId(subId))

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
          <p className="page-sub">
            Tipos de máquinas e checklists de verificação (conformidade legal). O rótulo «N equip.» por subcategoria conta
            equipamentos registados; passe o rato para ver também quantos itens tem a checklist legal.
          </p>
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
            <label className="label-declaracao-cat">
              Declaração do cliente (opcional)
              <textarea
                rows={5}
                maxLength={8000}
                value={formCat.declaracaoClienteDepois}
                onChange={e => setFormCat(f => ({ ...f, declaracaoClienteDepois: e.target.value }))}
                placeholder="Vazio = texto legal canónico da aplicação para esta família de equipamento. Se preencher, comece por «do equipamento…» (o início «Declaro… na manutenção/montagem» é gerado automaticamente)."
              />
            </label>
            <div className="form-actions">
              <button type="submit">Adicionar</button>
              <button type="button" className="secondary" onClick={() => { setAddingCategoria(false); setFormCat({ nome: '', intervaloTipo: 'semestral', declaracaoClienteDepois: '' }) }}>Cancelar</button>
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
                    <div className="form-field label-declaracao-cat">
                      <label>Declaração de aceitação do cliente (opcional)</label>
                      <p className="field-hint text-muted">
                        Sobrepõe o texto legal canónico só para esta categoria. Deixe vazio para usar o modelo da aplicação (elevadores / compressores / outros).
                        O texto aqui é o <strong>sufixo</strong> após «…na manutenção / montagem / reparação » — deve começar tipicamente por «do equipamento…».
                        Se usar um sufixo longo orientado a manutenção periódica, avalie se o mesmo texto faz sentido após «…na reparação »; casos contrários mantenha vazio e a app aplica modelos distintos (manutenção vs reparação) automaticamente.
                      </p>
                      <textarea
                        rows={6}
                        maxLength={8000}
                        value={formCat.declaracaoClienteDepois}
                        onChange={e => setFormCat(f => ({ ...f, declaracaoClienteDepois: e.target.value }))}
                        placeholder="do equipamento e que obtive…"
                      />
                      <div className="form-actions-inline">
                        <button
                          type="button"
                          className="secondary btn-sm"
                          onClick={() => setFormCat(f => ({
                            ...f,
                            declaracaoClienteDepois: getCanonicalDeclaracaoDepoisSuffix(f.nome, 'periodica'),
                          }))}
                        >
                          Repor canónico (manutenção / montagem)
                        </button>
                        <button
                          type="button"
                          className="secondary btn-sm"
                          onClick={() => setFormCat(f => ({
                            ...f,
                            declaracaoClienteDepois: getCanonicalDeclaracaoDepoisSuffix(f.nome, 'reparacao'),
                          }))}
                        >
                          Repor canónico (reparação)
                        </button>
                        <button
                          type="button"
                          className="secondary btn-sm"
                          onClick={() => setFormCat(f => ({ ...f, declaracaoClienteDepois: '' }))}
                        >
                          Limpar (usar canónico automático)
                        </button>
                      </div>
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
                  {String(cat.declaracaoClienteDepois ?? cat.declaracao_cliente_depois ?? '').trim() ? (
                    <span className="badge badge-decl-custom" title="Declaração personalizada na categoria">Decl. custom</span>
                  ) : null}
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
                    const equipCount = maquinas.filter(
                      m => normSubId(m.subcategoriaId ?? m.subcategoria_id) === normSubId(sub.id),
                    ).length
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
                            <span
                              className="badge badge-count"
                              title={`${equipCount} equipamento(s) registados · ${items.length} itens na checklist legal`}
                            >
                              <Package size={12} aria-hidden /> {equipCount} equip.
                            </span>
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

      {/* ── Secção: Notas rápidas para observações ────────────────────────── */}
      <div className="card qn-section">
        <div className="qn-header" onClick={() => setQnExpanded(v => !v)}>
          <button type="button" className="expand-btn">
            {qnExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
          <MessageSquareText size={18} className="qn-header-icon" />
          <h2 className="qn-title">Notas rápidas para observações</h2>
          <span className="badge badge-count">{quickNotes.length} notas</span>
        </div>
        {qnExpanded && (
          <div className="qn-body">
            <p className="qn-desc">
              Estes textos aparecem como chips no passo "Observações" ao executar uma manutenção.
              O técnico toca para inserir rapidamente no campo de notas.
            </p>
            <div className="qn-list">
              {quickNotes.map((note, i) => (
                <div key={i} className={`qn-item${qnEditing === i ? ' edit' : ''}`}>
                  {qnEditing === i ? (
                    <>
                      <span className="ordem">{i + 1}.</span>
                      <div className="inline-edit">
                        <input
                          value={qnEditText}
                          onChange={e => setQnEditText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') qnSaveEdit(i); if (e.key === 'Escape') setQnEditing(null) }}
                          autoFocus
                        />
                        <button type="button" className="icon-btn success" onClick={() => qnSaveEdit(i)} title="Guardar"><Check size={14} /></button>
                        <button type="button" className="icon-btn secondary" onClick={() => setQnEditing(null)} title="Cancelar"><X size={14} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="ordem">{i + 1}.</span>
                      <span className="texto">{note}</span>
                      <div className="checklist-item-actions">
                        <button type="button" className="icon-btn secondary" onClick={() => qnMove(i, -1)} disabled={i === 0} title="Mover para cima"><ArrowUp size={13} /></button>
                        <button type="button" className="icon-btn secondary" onClick={() => qnMove(i, 1)} disabled={i === quickNotes.length - 1} title="Mover para baixo"><ArrowDown size={13} /></button>
                        <button type="button" className="icon-btn secondary" onClick={() => { setQnEditing(i); setQnEditText(note) }} title="Editar texto"><Pencil size={13} /></button>
                        <button type="button" className="icon-btn danger" onClick={() => qnRemove(i)} title="Eliminar nota"><Trash2 size={13} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
            {qnAdding ? (
              <div className="qn-item edit">
                <span className="ordem">{quickNotes.length + 1}.</span>
                <div className="inline-edit">
                  <input
                    value={qnNewText}
                    onChange={e => setQnNewText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') qnAdd(); if (e.key === 'Escape') { setQnAdding(false); setQnNewText('') } }}
                    placeholder="Texto da nova nota rápida"
                    autoFocus
                  />
                  <button type="button" className="icon-btn success" onClick={qnAdd} title="Adicionar"><Check size={14} /></button>
                  <button type="button" className="icon-btn secondary" onClick={() => { setQnAdding(false); setQnNewText('') }} title="Cancelar"><X size={14} /></button>
                </div>
              </div>
            ) : (
              <div className="qn-actions-row">
                <button type="button" className="btn-add-check" onClick={() => { setQnAdding(true); setQnNewText('') }}>
                  <Plus size={13} /> Adicionar nota
                </button>
                <button type="button" className="btn-qn-reset secondary" onClick={qnReset}>
                  Repor originais
                </button>
              </div>
            )}
          </div>
        )}
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
