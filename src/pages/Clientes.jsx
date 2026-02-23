import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData, TIPOS_DOCUMENTO } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import MaquinaFormModal from '../components/MaquinaFormModal'
import DocumentacaoModal from '../components/DocumentacaoModal'
import RelatorioView from '../components/RelatorioView'
import EnviarEmailModal from '../components/EnviarEmailModal'
import EnviarDocumentoModal from '../components/EnviarDocumentoModal'
import { Plus, Pencil, Trash2, FolderPlus, ChevronRight, ArrowLeft, ExternalLink, Mail, Search, AlertTriangle } from 'lucide-react'
import { useDebounce } from '../hooks/useDebounce'
import { safeHttpUrl } from '../utils/sanitize'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useToast } from '../components/Toast'
import './Clientes.css'

const statusLabel = { pendente: 'Pendente', agendada: 'Agendada', concluida: 'Executada' }

export default function Clientes() {
  const {
    clientes,
    maquinas,
    manutencoes,
    addCliente,
    updateCliente,
    removeCliente,
    getSubcategoria,
    getCategoria,
    getChecklistBySubcategoria,
    getRelatorioByManutencao,
  } = useData()
  const { canDelete, canEditCliente, canAddCliente, isAdmin } = usePermissions()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [modal, setModal] = useState(null)
  const [fichaCliente, setFichaCliente] = useState(null)
  const [fichaView, setFichaView] = useState('categorias')
  const [fichaCategoria, setFichaCategoria] = useState(null)
  const [fichaSubcategoria, setFichaSubcategoria] = useState(null)
  const [fichaMaquina, setFichaMaquina] = useState(null)
  const [modalMaquina, setModalMaquina] = useState(null)
  const [modalDoc, setModalDoc] = useState(null)
  const [modalRelatorio, setModalRelatorio] = useState(null)
  const [modalEmail, setModalEmail] = useState(null)
  const [modalDocumentoEmail, setModalDocumentoEmail] = useState(null)
  const [form, setForm] = useState({ nif: '', nome: '', morada: '', codigoPostal: '', localidade: '', telefone: '', email: '' })
  const [erro, setErro] = useState('')
  const [searchCliente, setSearchCliente] = useState('')
  const searchClienteDebounced = useDebounce(searchCliente, 250)

  const openAdd = () => {
    setForm({ nif: '', nome: '', morada: '', codigoPostal: '', localidade: '', telefone: '', email: '' })
    setErro('')
    setModal('add')
  }

  const openEdit = (c) => {
    setForm({ nif: c.nif, nome: c.nome, morada: c.morada || '', codigoPostal: c.codigoPostal || '', localidade: c.localidade || '', telefone: c.telefone || '', email: c.email || '' })
    setErro('')
    setModal('edit')
  }

  const openFicha = (c) => {
    setFichaCliente(c)
    setFichaView('categorias')
    setFichaCategoria(null)
    setFichaSubcategoria(null)
    setFichaMaquina(null)
    setForm({ nif: c.nif, nome: c.nome, morada: c.morada || '', codigoPostal: c.codigoPostal || '', localidade: c.localidade || '', telefone: c.telefone || '', email: c.email || '' })
    setModal('ficha')
  }

  const closeFicha = () => {
    setModal(null)
    setFichaCliente(null)
    setFichaView('categorias')
    setFichaCategoria(null)
    setFichaSubcategoria(null)
    setFichaMaquina(null)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setErro('')
    if (!form.email?.trim()) {
      setErro('O email do cliente é obrigatório para envio de lembretes e relatórios.')
      return
    }
    if (modal === 'add') {
      const nif = addCliente(form)
      if (nif === null) { setErro('Já existe um cliente com este NIF.'); return }
      showToast('Cliente adicionado com sucesso.', 'success')
    } else {
      const { nif, ...data } = form
      updateCliente(nif, data)
      if (fichaCliente?.nif === nif) setFichaCliente(prev => prev ? { ...prev, ...data } : null)
      showToast('Dados do cliente actualizados.', 'success')
    }
    if (modal !== 'ficha') setModal(null)
  }

  const getMaquinasCount = (nif) => maquinas.filter(m => m.clienteNif === nif).length
  const getMaquinasDoCliente = (nif) => maquinas.filter(m => m.clienteNif === nif)

  const maquinasCliente = fichaCliente ? getMaquinasDoCliente(fichaCliente.nif) : []
  const categoriasComMaquinas = maquinasCliente.reduce((acc, m) => {
    const sub = getSubcategoria(m.subcategoriaId)
    const cat = sub ? getCategoria(sub.categoriaId) : null
    if (cat && !acc.find(c => c.id === cat.id)) acc.push(cat)
    return acc
  }, []).sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))

  const subcategoriasComMaquinas = fichaCategoria
    ? maquinasCliente
        .filter(m => {
          const sub = getSubcategoria(m.subcategoriaId)
          return sub?.categoriaId === fichaCategoria.id
        })
        .reduce((acc, m) => {
          const sub = getSubcategoria(m.subcategoriaId)
          if (sub && !acc.find(s => s.id === sub.id)) acc.push(sub)
          return acc
        }, [])
        .sort((a, b) => (a.nome || '').localeCompare(b.nome || ''))
    : []

  const maquinasDaSubcategoria = fichaSubcategoria
    ? maquinasCliente.filter(m => m.subcategoriaId === fichaSubcategoria.id)
    : []

  const getManutencoesDaMaquina = (maquinaId) =>
    manutencoes.filter(m => m.maquinaId === maquinaId).sort((a, b) => new Date(b.data) - new Date(a.data))

  const clientesFiltrados = useMemo(() => {
    const q = searchClienteDebounced.trim().toLowerCase()
    if (!q) return clientes
    const palavras = q.split(/\s+/).filter(Boolean)
    return clientes.filter(c => {
      const nifMatch = (c.nif || '').toLowerCase().includes(q)
      const nomeMatch = palavras.some(p => (c.nome || '').toLowerCase().includes(p))
      return nifMatch || nomeMatch
    })
  }, [searchClienteDebounced, clientes])

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>Clientes</h1>
          <p className="page-sub">Empresas e proprietários de equipamentos Navel</p>
        </div>
        {canAddCliente && (
          <button type="button" onClick={openAdd}><Plus size={18} /> Novo cliente</button>
        )}
      </div>
      <div className="search-bar">
        <Search size={18} className="search-icon" />
        <input
          type="search"
          value={searchCliente}
          onChange={e => setSearchCliente(e.target.value)}
          placeholder="Pesquisar por NIF ou palavra do nome..."
          aria-label="Pesquisar clientes"
        />
        {searchCliente && (
          <button type="button" className="search-clear" onClick={() => setSearchCliente('')} aria-label="Limpar pesquisa">
            ×
          </button>
        )}
      </div>
      <div className="table-card card clientes-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>NIF</th>
              <th>Nome do Cliente</th>
              <th>Morada</th>
              <th>Localidade</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Máquinas</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map(c => (
              <tr key={c.nif}>
                <td data-label="NIF"><code>{c.nif}</code></td>
                <td data-label="Nome">
                  <button type="button" className="btn-link-inline" onClick={() => openFicha(c)} title="Abrir ficha">
                    <strong>{c.nome}</strong>
                  </button>
                </td>
                <td data-label="Morada">{c.morada || '—'}</td>
                <td data-label="Localidade">{c.localidade || '—'}</td>
                <td data-label="Telefone">{c.telefone || '—'}</td>
                <td data-label="Email">
                  {c.email
                    ? c.email
                    : <span className="sem-email-aviso" title="Email em falta — edite o cliente para corrigir">
                        <AlertTriangle size={13} /> Sem email
                      </span>
                  }
                </td>
                <td data-label="Máquinas">{getMaquinasCount(c.nif)}</td>
                <td className="actions" data-label="">
                  {canEditCliente && (
                    <button className="icon-btn secondary" onClick={() => openEdit(c)} title="Editar"><Pencil size={16} /></button>
                  )}
                  {canDelete && (
                    <button className="icon-btn danger" onClick={() => { removeCliente(c.nif); showToast('Cliente eliminado.', 'info') }} disabled={getMaquinasCount(c.nif) > 0} title={getMaquinasCount(c.nif) > 0 ? 'Elimine as máquinas primeiro' : 'Eliminar'}><Trash2 size={16} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'ficha' && fichaCliente && (
        <div className="modal-overlay modal-ficha-overlay" onClick={closeFicha}>
          <div className="modal modal-ficha-cliente" onClick={e => e.stopPropagation()}>
            <h2>Ficha do cliente — {fichaCliente.nome}</h2>
            <div className="ficha-cliente-dados">
              <p><strong>NIF:</strong> {fichaCliente.nif} · <strong>Morada:</strong> {fichaCliente.morada || '—'}</p>
              <p><strong>Localidade:</strong> {fichaCliente.codigoPostal} {fichaCliente.localidade} · <strong>Telefone:</strong> {fichaCliente.telefone || '—'} · <strong>Email:</strong> {fichaCliente.email || '—'}</p>
            </div>

            {maquinasCliente.length === 0 ? (
              <div className="ficha-empty">
                <p className="text-muted">Este cliente ainda não tem máquinas registadas.</p>
                {canAddCliente && (
                  <button type="button" className="btn-add-maquina" onClick={() => setModalMaquina({ mode: 'add', clienteNif: fichaCliente.nif })}>
                    <Plus size={18} /> Adicionar máquina
                  </button>
                )}
              </div>
            ) : (
              <>
                {fichaView === 'categorias' && (
                  <div className="ficha-categorias">
                    <h3>Categorias</h3>
                    <div className="categorias-grid">
                      {categoriasComMaquinas.map(cat => {
                        const count = maquinasCliente.filter(m => getSubcategoria(m.subcategoriaId)?.categoriaId === cat.id).length
                        return (
                          <button key={cat.id} type="button" className="categoria-card" onClick={() => { setFichaCategoria(cat); setFichaView('subcategorias'); }}>
                            <h4>{cat.nome}</h4>
                            <p>{count} equipamento(s)</p>
                            <ChevronRight size={20} style={{ marginTop: '0.5rem', opacity: 0.6 }} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {fichaView === 'subcategorias' && fichaCategoria && (
                  <div className="ficha-subcategorias">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => { setFichaCategoria(null); setFichaView('categorias'); }}>
                        <ArrowLeft size={16} /> Categorias
                      </button>
                      <span className="breadcrumb">/ {fichaCategoria.nome}</span>
                    </div>
                    <h3>Subcategorias</h3>
                    <div className="categorias-grid">
                      {subcategoriasComMaquinas.map(sub => {
                        const count = maquinasCliente.filter(m => m.subcategoriaId === sub.id).length
                        return (
                          <button key={sub.id} type="button" className="categoria-card" onClick={() => { setFichaSubcategoria(sub); setFichaView('maquinas'); }}>
                            <h4>{sub.nome}</h4>
                            <p>{count} equipamento(s)</p>
                            <ChevronRight size={20} style={{ marginTop: '0.5rem', opacity: 0.6 }} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {fichaView === 'maquinas' && fichaSubcategoria && (
                  <div className="ficha-maquinas-view">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => { setFichaSubcategoria(null); setFichaView('subcategorias'); }}><ArrowLeft size={16} /> Subcategorias</button>
                      <span className="breadcrumb">/ {fichaSubcategoria.nome}</span>
                    </div>
                    <h3>Frota de máquinas</h3>
                    <div className="maquinas-ficha-lista">
                      {maquinasDaSubcategoria.map(m => (
                        <button key={m.id} type="button" className="maquina-ficha-card" onClick={() => { setFichaMaquina(m); setFichaView('maquina-detalhe'); }}>
                          <strong>{m.marca} {m.modelo}</strong>
                          <span className="text-muted"> — Nº Série: {m.numeroSerie}</span>
                          <ChevronRight size={18} style={{ marginLeft: 'auto', opacity: 0.6 }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {fichaView === 'maquina-detalhe' && fichaMaquina && (() => {
                    const maquinaAtual = maquinas.find(m => m.id === fichaMaquina.id) ?? fichaMaquina
                    const docs = maquinaAtual.documentos ?? []
                    const getDocPorTipo = (tipo) => docs.find(d => d.tipo === tipo)
                    const getDocLabel = (tipo) => TIPOS_DOCUMENTO.find(t => t.id === tipo)?.label ?? tipo
                    return (
                  <div className="ficha-maquina-detalhe">
                    <div className="equipamentos-nav">
                      <button type="button" className="breadcrumb-btn" onClick={() => { setFichaMaquina(null); setFichaView('maquinas'); }}><ArrowLeft size={16} /> Frota</button>
                      <span className="breadcrumb">/ {fichaMaquina.marca} {fichaMaquina.modelo}</span>
                    </div>
                    <div className="maquina-detalhe-header">
                      <h3>{fichaMaquina.marca} {fichaMaquina.modelo} — Nº Série: {fichaMaquina.numeroSerie}</h3>
                      <div className="maquina-detalhe-actions">
                        {isAdmin && (
                          <>
                            <button type="button" className="secondary" onClick={() => { setModalDoc(null); setModalMaquina({ mode: 'edit', maquina: fichaMaquina }); }}><Pencil size={16} /> Editar</button>
                            <button type="button" className="secondary" onClick={() => setModalDoc(fichaMaquina)}><FolderPlus size={16} /> Documentação</button>
                          </>
                        )}
                      </div>
                    </div>
                    <h4>Documentação obrigatória</h4>
                    <div className="doc-table-wrapper">
                      <table className="data-table doc-table">
                        <thead>
                          <tr>
                            <th>Documento</th>
                            <th>Existe</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TIPOS_DOCUMENTO.map(tipo => {
                            const doc = tipo.id === 'outros' ? docs.filter(d => d.tipo === 'outros')[0] : getDocPorTipo(tipo.id)
                            const existe = !!doc
                            return (
                              <tr key={tipo.id}>
                                <td data-label="Documento">{getDocLabel(tipo.id)}</td>
                                <td data-label="Existe"><span className={existe ? 'badge badge-sim' : 'badge badge-nao'}>{existe ? 'Sim' : 'Não'}</span></td>
                                <td className="doc-table-actions" data-label="Ações">
                                  {doc ? (
                                    <>
                                      <a href={safeHttpUrl(doc.url)} target="_blank" rel="noopener noreferrer" className="icon-btn secondary" title="Visualizar"><ExternalLink size={16} /></a>
                                      <button type="button" className="icon-btn secondary" onClick={() => setModalDocumentoEmail({ documento: doc, maquina: maquinaAtual })} title="Enviar por email"><Mail size={16} /></button>
                                    </>
                                  ) : (
                                    <span className="text-muted">—</span>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                    <h4>Histórico de manutenções</h4>
                    <div className="manutencoes-histórico">
                      {getManutencoesDaMaquina(fichaMaquina.id).length === 0 ? (
                        <p className="text-muted">Nenhuma manutenção registada.</p>
                      ) : (
                        getManutencoesDaMaquina(fichaMaquina.id).map(manut => {
                          const rel = getRelatorioByManutencao(manut.id)
                          return (
                            <div key={manut.id} className="manutencao-item">
                              <button
                                type="button"
                                className="manutencao-item-btn"
                                onClick={() => setModalRelatorio({ manutencao: manut, relatorio: rel, maquina: fichaMaquina, cliente: fichaCliente })}
                              >
                                <div>
                                  <strong>{format(new Date(manut.data), 'd MMM yyyy', { locale: pt })}</strong>
                                  <span className="text-muted"> — {manut.tecnico || (rel?.tecnico) || 'Não atribuído'}</span>
                                </div>
                                <span className={`badge badge-${manut.status}`}>{statusLabel[manut.status]}</span>
                              </button>
                              {rel?.assinadoPeloCliente && (
                                <button type="button" className="btn-enviar-email" onClick={e => { e.stopPropagation(); setModalEmail({ manutencao: manut, relatorio: rel, maquina: fichaMaquina, cliente: fichaCliente }); }}>
                                  Enviar relatório por email
                                </button>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                    )
                  })()}

                {canAddCliente && (
                  <button type="button" className="btn-add-maquina" onClick={() => setModalMaquina({ mode: 'add', clienteNif: fichaCliente.nif })} style={{ marginTop: '1rem' }}>
                    <Plus size={18} /> Adicionar máquina
                  </button>
                )}
              </>
            )}
            <div className="form-actions" style={{ marginTop: '1rem' }}>
              <button type="button" className="secondary" onClick={closeFicha}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {modalMaquina && (
        <MaquinaFormModal isOpen onClose={() => setModalMaquina(null)} mode={modalMaquina.mode} clienteNifLocked={modalMaquina.clienteNif} maquina={modalMaquina.maquina} />
      )}

      <DocumentacaoModal isOpen={!!modalDoc} onClose={() => setModalDoc(null)} maquina={modalDoc} />

      {modalRelatorio && (
        <div className="modal-overlay" onClick={() => setModalRelatorio(null)}>
          <div className="modal modal-relatorio modal-relatorio-ficha" onClick={e => e.stopPropagation()}>
            <div className="modal-relatorio-header">
              <h2>Relatório de manutenção</h2>
              <button type="button" className="secondary" onClick={() => setModalRelatorio(null)}>Fechar</button>
            </div>
            <RelatorioView
              relatorio={modalRelatorio.relatorio}
              manutencao={modalRelatorio.manutencao}
              maquina={modalRelatorio.maquina}
              cliente={modalRelatorio.cliente}
              checklistItems={modalRelatorio.maquina ? getChecklistBySubcategoria(modalRelatorio.maquina.subcategoriaId, modalRelatorio.manutencao?.tipo || 'periodica') : []}
            />
            {modalRelatorio.relatorio?.assinadoPeloCliente && (
              <div className="form-actions" style={{ marginTop: '1rem' }}>
                <button type="button" onClick={() => { setModalRelatorio(null); setModalEmail({ manutencao: modalRelatorio.manutencao, relatorio: modalRelatorio.relatorio, maquina: modalRelatorio.maquina, cliente: modalRelatorio.cliente }); }}>
                  Enviar relatório por email
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {modalEmail && (
        <EnviarEmailModal
          isOpen
          onClose={() => setModalEmail(null)}
          manutencao={modalEmail.manutencao}
          relatorio={modalEmail.relatorio}
          maquina={modalEmail.maquina}
          cliente={modalEmail.cliente}
        />
      )}

      {modalDocumentoEmail && (
        <EnviarDocumentoModal
          isOpen
          onClose={() => setModalDocumentoEmail(null)}
          documento={modalDocumentoEmail.documento}
          maquina={modalDocumentoEmail.maquina}
        />
      )}

      {modal && modal !== 'ficha' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{modal === 'add' ? 'Novo cliente' : 'Editar cliente'}</h2>
            {erro && <p className="form-erro">{erro}</p>}
            <form onSubmit={handleSubmit}>
              <label>NIF <span className="required">*</span><input required value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} placeholder="123456789" readOnly={modal === 'edit'} className={modal === 'edit' ? 'readonly' : ''} /></label>
              <label>Nome do Cliente <span className="required">*</span><input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Razão social" /></label>
              <label>Morada<input value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} /></label>
              <div className="form-row">
                <label>Código Postal<input value={form.codigoPostal} onChange={e => setForm(f => ({ ...f, codigoPostal: e.target.value }))} /></label>
                <label>Localidade<input value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} /></label>
              </div>
              <div className="form-row">
                <label>Telefone<input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} /></label>
                <label>Email <span className="required">*</span><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@cliente.pt" /></label>
              </div>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setModal(null)}>Cancelar</button>
                <button type="submit">{modal === 'add' ? 'Adicionar' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
