import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useData, TIPOS_DOCUMENTO, INTERVALOS, tipoKaeserNaPosicao, isKaeserAbcdMaquina } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import MaquinaFormModal from '../components/MaquinaFormModal'
import DocumentacaoModal from '../components/DocumentacaoModal'
import PecasPlanoModal from '../components/PecasPlanoModal'
import '../components/PecasPlanoModal.css'
import { ArrowLeft, Pencil, Trash2, FolderPlus, Play, QrCode, FileText, PackageOpen, CalendarDays } from 'lucide-react'
import QrEtiquetaModal from '../components/QrEtiquetaModal'
import '../components/QrEtiquetaModal.css'
import { gerarHtmlHistoricoMaquina } from '../utils/gerarHtmlHistoricoMaquina'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { format, isBefore, startOfDay } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useToast } from '../components/Toast'
import { getHojeAzores, parseDateLocal } from '../utils/datasAzores'
import ContentLoader from '../components/ContentLoader'
import { useDeferredReady } from '../hooks/useDeferredReady'
import './Equipamentos.css'

export default function Equipamentos() {
  const {
    clientes,
    categorias,
    maquinas,
    getSubcategoriasByCategoria,
    getSubcategoria,
    manutencoes,
    relatorios,
    reparacoes,
    tecnicos,
    removeMaquina,
  } = useData()
  const contentReady = useDeferredReady(maquinas.length >= 0)
  const { canDelete, isAdmin } = usePermissions()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const [view, setView] = useState('categorias')
  const [selectedCategoria, setSelectedCategoria] = useState(null)
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null)
  const [modalEdit, setModalEdit] = useState(null)
  const [modalDoc, setModalDoc] = useState(null)
  const [modalQr, setModalQr] = useState(null)
  const [modalPecas, setModalPecas] = useState(null)
  const [loadingHistorico, setLoadingHistorico] = useState(null)
  const [modalConfirmDelete, setModalConfirmDelete] = useState(null)
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterAtraso = searchParams.get('filter') === 'atraso' // whitelist: apenas 'atraso' é aceite

  const [highlightMaqId, setHighlightMaqId] = useState(null)

  const navigateToMaquina = (maqId) => {
    const maq = maquinas.find(m => m.id === maqId)
    if (!maq) return
    const sub = getSubcategoria(maq.subcategoriaId)
    if (!sub) return
    const cat = categorias.find(c => c.id === sub.categoriaId)
    if (!cat) return
    setSelectedCategoria(cat)
    setSelectedSubcategoria(sub)
    setView('maquinas')
    setHighlightMaqId(maqId)
    setTimeout(() => {
      const el = document.getElementById(`maq-${maqId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.classList.add('maquina-row--highlight')
        setTimeout(() => el.classList.remove('maquina-row--highlight'), 3000)
      }
    }, 200)
  }

  // Abrir ficha directamente via ?maquina=ID (QR Code, link nº série, pesquisa)
  useEffect(() => {
    const maqId = searchParams.get('maquina')
    if (!maqId) return
    navigateToMaquina(maqId)
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.delete('maquina')
      return next
    }, { replace: true })
  }, [maquinas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight via state (pesquisa global)
  useEffect(() => {
    const hId = location.state?.highlightId
    if (!hId) return
    navigateToMaquina(hId)
  }, [location.state]) // eslint-disable-line react-hooks/exhaustive-deps

  const getCliente = (nif) => clientes.find(c => c.nif === nif)

  const handleHistoricoPdf = (maquina) => {
    setLoadingHistorico(maquina.id)
    showGlobalLoading()
    try {
      const sub      = getSubcategoria(maquina.subcategoriaId)
      const cat      = sub ? categorias.find(c => c.id === sub.categoriaId) : null
      const cli      = getCliente(maquina.clienteNif)
      const manutsMaq = manutencoes.filter(m => m.maquinaId === maquina.id)
      const repsMaq   = reparacoes.filter(r => r.maquinaId === maquina.id)
      const html = gerarHtmlHistoricoMaquina({
        maquina,
        cliente:      cli,
        subcategoria: sub,
        categoria:    cat,
        manutencoes:  manutsMaq,
        relatorios,
        reparacoes:   repsMaq,
        tecnicos,
      })
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 30000)
    } catch (err) {
      showToast('Erro ao gerar histórico.', 'error')
    } finally {
      hideGlobalLoading()
      setLoadingHistorico(null)
    }
  }
  const maquinasEmAtraso = maquinas.filter(e => e.proximaManut && isBefore(parseDateLocal(e.proximaManut), new Date()))

  const handleCategoriaClick = (cat) => {
    setSelectedCategoria(cat)
    setSelectedSubcategoria(null)
    setView('subcategorias')
  }

  const handleSubcategoriaClick = (sub) => {
    setSelectedSubcategoria(sub)
    setView('maquinas')
  }

  const handleBackCategorias = () => {
    setView('categorias')
    setSelectedCategoria(null)
    setSelectedSubcategoria(null)
  }

  const handleBackSubcategorias = () => {
    setView('subcategorias')
    setSelectedSubcategoria(null)
  }

  const subcategoriasDaCategoria = selectedCategoria ? getSubcategoriasByCategoria(selectedCategoria.id) : []
  const maquinasDaSubcategoria = selectedSubcategoria
    ? maquinas.filter(m => m.subcategoriaId === selectedSubcategoria.id)
    : []

  const maquinasAgrupadasPorCliente = maquinasDaSubcategoria.reduce((acc, m) => {
    const nomeCliente = getCliente(m.clienteNif)?.nome ?? 'Sem cliente'
    if (!acc[nomeCliente]) acc[nomeCliente] = []
    acc[nomeCliente].push(m)
    return acc
  }, {})
  const clientesOrdenados = Object.keys(maquinasAgrupadasPorCliente).sort((a, b) => a.localeCompare(b))

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <button type="button" className="btn-back" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
            Voltar atrás
          </button>
          <h1>Equipamentos</h1>
          <p className="page-sub">
            {filterAtraso ? 'Equipamentos em atraso de manutenção' : 'Navegação por categorias e subcategorias'}
          </p>
        </div>
        {filterAtraso && (
          <button type="button" className="secondary" onClick={() => setSearchParams({})}>
            Ver todos
          </button>
        )}
      </div>

      <ContentLoader loading={!contentReady} message="A carregar equipamentos…" hint="Por favor aguarde.">
      {filterAtraso ? (
        <div className="table-card card">
          {maquinasEmAtraso.length === 0 ? (
            <p className="text-muted" style={{ padding: '1.5rem' }}>Nenhum equipamento em atraso de manutenção.</p>
          ) : (
            <div className="maquinas-por-cliente-lista">
              {Object.entries(
                maquinasEmAtraso.reduce((acc, m) => {
                  const nome = getCliente(m.clienteNif)?.nome ?? 'Sem cliente'
                  if (!acc[nome]) acc[nome] = []
                  acc[nome].push(m)
                  return acc
                }, {})
              ).sort((a, b) => a[0].localeCompare(b[0])).map(([nomeCliente, list]) => (
                <div key={nomeCliente} className="maquinas-por-cliente">
                  <h4>{nomeCliente}</h4>
                  {list.map(m => {
                    const sub = getSubcategoria(m.subcategoriaId)
                    return (
                      <div key={m.id} id={`maq-${m.id}`} className="maquina-row maquina-row--atraso">
                        <div className="maquina-row-info">
                          <div className="equip-desc-block">
                            <strong>{sub?.nome || ''} — {m.marca} {m.modelo}</strong>
                            <span className="text-muted equip-num-serie">Nº Série: {m.numeroSerie}</span>
                          </div>
                          <div className="equip-badges-row">
                            {isKaeserAbcdMaquina(m) && m.posicaoKaeser != null && (
                              <span
                                className="badge kaeser-tipo-badge"
                                title={`Plano KAESER A/B/C/D — próxima: Tipo ${tipoKaeserNaPosicao(m.posicaoKaeser)}`}
                              >
                                KAESER {tipoKaeserNaPosicao(m.posicaoKaeser)}
                              </span>
                            )}
                            <span className="badge badge-danger">
                              Próx. manut.: {format(parseDateLocal(m.proximaManut), 'd MMM yyyy', { locale: pt })}
                            </span>
                          </div>
                        </div>
                        <div className="actions">
                          <button
                            type="button"
                            className="btn-executar-manut"
                            onClick={() => navigate(`/manutencoes?filter=proximas&maquinaId=${encodeURIComponent(m.id)}`)}
                            title="Ver manutenções próximas deste equipamento (executar a partir da lista)"
                          >
                            <CalendarDays size={12} /> Próximas
                          </button>
                          <button className="icon-btn secondary" onClick={() => handleHistoricoPdf(m)} title="Histórico completo em PDF" disabled={loadingHistorico === m.id}><FileText size={16} /></button>
                          <button className="icon-btn secondary" onClick={() => setModalQr(m)} title="Gerar etiqueta QR"><QrCode size={16} /></button>
                          <button className="icon-btn secondary" onClick={() => setModalDoc(m)} title="Documentação"><FolderPlus size={16} /></button>
                          {isAdmin && (
                            <>
                              <button className="icon-btn secondary" onClick={() => setModalPecas(m)} title="Plano de peças e consumíveis"><PackageOpen size={16} /></button>
                              <button className="icon-btn secondary" onClick={() => setModalEdit(m)} title="Editar"><Pencil size={16} /></button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
      {view === 'categorias' && (
        <div className="categorias-grid">
          {categorias.map(cat => (
            <button
              key={cat.id}
              type="button"
              className="categoria-card"
              onClick={() => handleCategoriaClick(cat)}
            >
              <h3>{cat.nome}</h3>
              <p>{maquinas.filter(m => {
                const sub = getSubcategoria(m.subcategoriaId)
                return sub?.categoriaId === cat.id
              }).length} equipamento(s)</p>
            </button>
          ))}
        </div>
      )}

      {view === 'subcategorias' && selectedCategoria && (
        <>
          <div className="equipamentos-nav">
            <button type="button" className="breadcrumb-btn" onClick={handleBackCategorias}>
              <ArrowLeft size={16} /> Equipamentos
            </button>
            <span className="breadcrumb">/ {selectedCategoria.nome}</span>
          </div>
          <div className="categorias-grid">
            {subcategoriasDaCategoria.map(sub => {
              const count = maquinas.filter(m => m.subcategoriaId === sub.id).length
              return (
                <button
                  key={sub.id}
                  type="button"
                  className="categoria-card"
                  onClick={() => handleSubcategoriaClick(sub)}
                >
                  <h3>{sub.nome}</h3>
                  <p>{count} equipamento(s)</p>
                </button>
              )
            })}
          </div>
        </>
      )}

      {view === 'maquinas' && selectedSubcategoria && selectedCategoria && (
        <>
          <div className="equipamentos-nav">
            <button type="button" className="breadcrumb-btn" onClick={handleBackCategorias}>
              <ArrowLeft size={16} /> Equipamentos
            </button>
            <span className="breadcrumb">/</span>
            <button type="button" className="breadcrumb-btn" onClick={handleBackSubcategorias}>{selectedCategoria.nome}</button>
            <span className="breadcrumb">/ {selectedSubcategoria.nome}</span>
          </div>
          <div className="maquinas-por-cliente-lista">
            {clientesOrdenados.length === 0 ? (
              <p className="text-muted">Nenhum equipamento registado nesta subcategoria.</p>
            ) : (
              clientesOrdenados.map(nomeCliente => (
                <div key={nomeCliente} className="maquinas-por-cliente">
                  <h4>{nomeCliente}</h4>
                  {maquinasAgrupadasPorCliente[nomeCliente].map(m => {
                    const hoje = startOfDay(new Date(getHojeAzores()))
                    const temProxima = !!m.proximaManut
                    const proxVencida = temProxima && isBefore(startOfDay(parseDateLocal(m.proximaManut)), hoje)
                    const docsCount = (m.documentos ?? []).length
                    const docsTotal = TIPOS_DOCUMENTO.length
                    return (
                    <div key={m.id} id={`maq-${m.id}`} className={`maquina-row${proxVencida ? ' maquina-row--atraso' : ''}`}>
                      <div className="maquina-row-info">
                        <div className="equip-desc-block">
                          <strong>{m.marca} {m.modelo}</strong>
                          <span className="text-muted equip-num-serie">Nº Série: {m.numeroSerie}</span>
                        </div>
                        <div className="equip-badges-row">
                          {isKaeserAbcdMaquina(m) && m.posicaoKaeser != null && (
                            <span
                              className="badge kaeser-tipo-badge"
                              title={`Plano KAESER A/B/C/D — próxima: Tipo ${tipoKaeserNaPosicao(m.posicaoKaeser)}`}
                            >
                              KAESER {tipoKaeserNaPosicao(m.posicaoKaeser)}
                            </span>
                          )}
                          {m.periodicidadeManut && INTERVALOS[m.periodicidadeManut] && (
                            <span className="badge badge-periodicidade" title="Periodicidade da manutenção">
                              {INTERVALOS[m.periodicidadeManut].label}
                            </span>
                          )}
                          {temProxima ? (
                            <span className={`badge ${proxVencida ? 'badge-danger' : 'badge-conforme-equip'}`}>
                              Próx.: {format(parseDateLocal(m.proximaManut), 'd MMM yyyy', { locale: pt })}
                            </span>
                          ) : (
                            <span className="badge badge-sem-data-equip">Sem manut. agendada</span>
                          )}
                          <span className={`badge badge-docs${docsCount === docsTotal ? ' badge-docs--ok' : ''}`} title="Documentação obrigatória">
                            {docsCount}/{docsTotal} docs
                          </span>
                        </div>
                      </div>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn-executar-manut"
                          onClick={() => navigate(`/manutencoes?filter=proximas&maquinaId=${encodeURIComponent(m.id)}`)}
                          title="Ver manutenções próximas deste equipamento (executar a partir da lista)"
                        >
                          <CalendarDays size={12} /> Próximas
                        </button>
                        <button className="icon-btn secondary" onClick={() => handleHistoricoPdf(m)} title="Histórico completo em PDF" disabled={loadingHistorico === m.id}><FileText size={16} /></button>
                        <button className="icon-btn secondary" onClick={() => setModalQr(m)} title="Gerar etiqueta QR"><QrCode size={16} /></button>
                        <button className="icon-btn secondary" onClick={() => setModalDoc(m)} title="Documentação"><FolderPlus size={16} /></button>
                        {isAdmin && (
                          <>
                            <button className="icon-btn secondary" onClick={() => setModalPecas(m)} title="Plano de peças e consumíveis"><PackageOpen size={16} /></button>
                            <button className="icon-btn secondary" onClick={() => setModalEdit(m)} title="Editar"><Pencil size={16} /></button>
                          </>
                        )}
                        {canDelete && (
                          <button className="icon-btn danger" onClick={() => setModalConfirmDelete(m)} title="Eliminar"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}
        </>
      )}
      </ContentLoader>

      {modalEdit && (
        <MaquinaFormModal
          isOpen
          onClose={() => setModalEdit(null)}
          mode="edit"
          maquina={modalEdit}
        />
      )}

      <DocumentacaoModal isOpen={!!modalDoc} onClose={() => setModalDoc(null)} maquina={modalDoc} />

      <QrEtiquetaModal
        isOpen={!!modalQr}
        onClose={() => setModalQr(null)}
        maquina={modalQr}
        subcategoria={modalQr ? getSubcategoria(modalQr.subcategoriaId) : null}
        cliente={modalQr ? getCliente(modalQr.clienteNif) : null}
      />

      <PecasPlanoModal
        isOpen={!!modalPecas}
        onClose={() => setModalPecas(null)}
        maquina={modalPecas}
      />

      {modalConfirmDelete && (
        <div className="modal-overlay" onClick={() => setModalConfirmDelete(null)}>
          <div className="modal modal-compact" onClick={e => e.stopPropagation()}>
            <h2>Confirmar eliminação</h2>
            <p>Tem a certeza que pretende eliminar <strong>{modalConfirmDelete.marca} {modalConfirmDelete.modelo}</strong> (S/N: {modalConfirmDelete.numeroSerie})?</p>
            <p className="text-danger">Todas as manutenções, reparações e relatórios deste equipamento serão eliminados.</p>
            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setModalConfirmDelete(null)}>Cancelar</button>
              <button type="button" className="danger" onClick={() => { removeMaquina(modalConfirmDelete.id); setModalConfirmDelete(null); showToast('Equipamento eliminado.', 'success') }}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
