import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { usePermissions } from '../hooks/usePermissions'
import { SUBCATEGORIAS_COM_CONTADOR_HORAS } from '../context/DataContext'
import MaquinaFormModal from '../components/MaquinaFormModal'
import DocumentacaoModal from '../components/DocumentacaoModal'
import ExecutarManutencaoModal from '../components/ExecutarManutencaoModal'
import { ChevronRight, ArrowLeft, Pencil, Trash2, FolderPlus, Play, QrCode, FileText } from 'lucide-react'
import QrEtiquetaModal from '../components/QrEtiquetaModal'
import '../components/QrEtiquetaModal.css'
import { gerarHtmlHistoricoMaquina } from '../utils/gerarHtmlHistoricoMaquina'
import { imprimirOuGuardarPdf } from '../utils/gerarPdfRelatorio'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { format, isBefore } from 'date-fns'
import { pt } from 'date-fns/locale'
import { useToast } from '../components/Toast'
import './Equipamentos.css'

export default function Equipamentos() {
  const {
    clientes,
    categorias,
    maquinas,
    INTERVALOS,
    getSubcategoriasByCategoria,
    getSubcategoria,
    manutencoes,
    relatorios,
    removeMaquina,
  } = useData()
  const { canDelete, isAdmin } = usePermissions()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const [view, setView] = useState('categorias')
  const [selectedCategoria, setSelectedCategoria] = useState(null)
  const [selectedSubcategoria, setSelectedSubcategoria] = useState(null)
  const [modalEdit, setModalEdit] = useState(null)
  const [modalDoc, setModalDoc] = useState(null)
  const [modalExecucao, setModalExecucao] = useState(null)
  const [modalQr, setModalQr] = useState(null)
  const [loadingHistorico, setLoadingHistorico] = useState(null) // id da máquina a gerar
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterAtraso = searchParams.get('filter') === 'atraso' // whitelist: apenas 'atraso' é aceite

  // Abrir ficha directamente via ?maquina=ID (QR Code ou pesquisa global)
  useEffect(() => {
    const maqId = searchParams.get('maquina')
    if (!maqId) return
    const maq = maquinas.find(m => m.id === maqId)
    if (!maq) return
    // Navegar até à subcategoria da máquina e seleccioná-la
    const sub = getSubcategoria(maq.subcategoriaId)
    if (sub) {
      const cat = categorias.find(c => c.id === sub.categoriaId)
      if (cat) {
        setSelectedCategoria(cat)
        setSelectedSubcategoria(sub)
        setView('maquinas')
      }
    }
    // Limpar o param para não re-activar no próximo render
    setSearchParams(prev => { prev.delete('maquina'); return prev }, { replace: true })
  }, [maquinas]) // eslint-disable-line react-hooks/exhaustive-deps

  // Highlight via state (pesquisa global) — apenas scroll visual, sem abrir modal
  useEffect(() => {
    const hId = location.state?.highlightId
    if (!hId) return
    const maq = maquinas.find(m => m.id === hId)
    if (!maq) return
    const sub = getSubcategoria(maq.subcategoriaId)
    if (sub) {
      const cat = categorias.find(c => c.id === sub.categoriaId)
      if (cat) {
        setSelectedCategoria(cat)
        setSelectedSubcategoria(sub)
        setView('maquinas')
      }
    }
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
      const html = gerarHtmlHistoricoMaquina({
        maquina,
        cliente:      cli,
        subcategoria: sub,
        categoria:    cat,
        manutencoes:  manutsMaq,
        relatorios,
      })
      imprimirOuGuardarPdf(html)
    } catch (err) {
      showToast('Erro ao gerar histórico PDF.', 'error')
    } finally {
      hideGlobalLoading()
      setLoadingHistorico(null)
    }
  }
  const maquinasEmAtraso = maquinas.filter(e => isBefore(new Date(e.proximaManut), new Date()))

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
                      <div key={m.id} className="maquina-row" style={{ borderLeft: '3px solid var(--color-danger)' }}>
                        <div className="maquina-row-info">
                          <div className="equip-desc-block">
                            <strong>{sub?.nome || ''} — {m.marca} {m.modelo}</strong>
                            <span className="text-muted equip-num-serie">Nº Série: {m.numeroSerie}</span>
                          </div>
                          <span className="badge badge-danger">
                            Próx. manut.: {format(new Date(m.proximaManut), 'd MMM yyyy', { locale: pt })}
                          </span>
                        </div>
                        <div className="actions">
                          <button type="button" className="btn-executar-manut" onClick={() => setModalExecucao({ maquina: m })} title="Executar manutenção">
                            <Play size={12} /> Executar
                          </button>
                          <button className="icon-btn secondary" onClick={() => handleHistoricoPdf(m)} title="Histórico completo em PDF" disabled={loadingHistorico === m.id}><FileText size={16} /></button>
                          <button className="icon-btn secondary" onClick={() => setModalQr(m)} title="Gerar etiqueta QR"><QrCode size={16} /></button>
                          <button className="icon-btn secondary" onClick={() => setModalDoc(m)} title="Documentação"><FolderPlus size={16} /></button>
                          {isAdmin && (
                            <button className="icon-btn secondary" onClick={() => setModalEdit(m)} title="Editar"><Pencil size={16} /></button>
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
              <ChevronRight size={20} style={{ marginTop: '0.5rem', opacity: 0.6 }} />
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
                  <ChevronRight size={20} style={{ marginTop: '0.5rem', opacity: 0.6 }} />
                </button>
              )
            })}
          </div>
        </>
      )}

      {view === 'maquinas' && selectedSubcategoria && selectedCategoria && (
        <>
          <div className="equipamentos-nav">
            <button type="button" className="breadcrumb-btn" onClick={handleBackCategorias}>Equipamentos</button>
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
                  {maquinasAgrupadasPorCliente[nomeCliente].map(m => (
                    <div key={m.id} className="maquina-row">
                      <div>
                        <strong>{m.marca} {m.modelo}</strong>
                        <span className="text-muted"> — Nº Série: {m.numeroSerie}</span>
                        {m.ultimaManutencaoData && (
                          <span className="text-muted" style={{ marginLeft: '0.5rem', fontSize: '0.85em' }}>
                            · Última manut.: {format(new Date(m.ultimaManutencaoData), 'd MMM yyyy', { locale: pt })}
                          </span>
                        )}
                      </div>
                      <div className="actions">
                        <button className="icon-btn secondary" onClick={() => handleHistoricoPdf(m)} title="Histórico completo em PDF" disabled={loadingHistorico === m.id}><FileText size={16} /></button>
                        <button className="icon-btn secondary" onClick={() => setModalQr(m)} title="Gerar etiqueta QR"><QrCode size={16} /></button>
                        <button className="icon-btn secondary" onClick={() => setModalDoc(m)} title="Documentação"><FolderPlus size={16} /></button>
                        {isAdmin && (
                          <button className="icon-btn secondary" onClick={() => setModalEdit(m)} title="Editar"><Pencil size={16} /></button>
                        )}
                        {canDelete && (
                          <button className="icon-btn danger" onClick={() => { removeMaquina(m.id); showToast('Equipamento eliminado.', 'info') }} title="Eliminar"><Trash2 size={16} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}
        </>
      )}

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

      {modalExecucao && (
        <ExecutarManutencaoModal
          isOpen
          onClose={() => setModalExecucao(null)}
          manutencao={null}
          maquina={modalExecucao.maquina}
        />
      )}
    </div>
  )
}
