import { useState, useRef, useEffect, useMemo } from 'react'
import { useToast } from './Toast'
import { usePermissions } from '../hooks/usePermissions'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import {
  useData,
  TIPOS_DOCUMENTO,
  SUBCATEGORIAS_COM_CONTADOR_HORAS,
  SUBCATEGORIAS_COMPRESSOR_PARAFUSO,
  isKaeserAbcdMaquina,
  isKaeserMarca,
} from '../context/DataContext'
import { safeHttpUrl } from '../utils/sanitize'
import { apiUploadMachinePdf, apiUploadMachinePhoto } from '../services/apiService'
import { logger } from '../utils/logger'
import { Plus, ExternalLink, Trash2, Upload, PackageOpen, Camera, Images, Save } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'
import { horasContadorNaFicha } from '../utils/horasContadorEquipamento'
import { COPY_DOC_FIO_CONDUTOR, COPY_DOC_PARAFUSO_KAESER } from '../constants/documentacaoEquipamentoCopy'
import { buildPecasPlanoItemsFromPdfArrayBuffer, contagemPorTipoKaeser } from '../utils/kaeserPlanoPdfImport'
import { fileToMemory, comprimirFotoParaRelatorio } from '../utils/comprimirImagemRelatorio'
import MaquinaBibliotecaNavel from './MaquinaBibliotecaNavel'

const PDF_MAX_BYTES = 8 * 1024 * 1024
const FOTO_EQUIPAMENTO_TIPO = '__foto_equipamento'
const FOTO_MAX_FILES = 8

function nomeEquipamentoParaFoto(maq) {
  return [maq?.marca, maq?.modelo]
    .map(v => String(v || '').trim())
    .filter(Boolean)
    .join(' ')
}

/** Texto embutido no píxel (rodapé do JPEG): equipamento_série_data/hora. */
function linhaRodapeFotoArquivo(maq, iso) {
  const nome = (nomeEquipamentoParaFoto(maq) || 'Equipamento').replace(/\s+/g, ' ').trim()
  const sn = String(maq?.numeroSerie || maq?.numero_serie || '').trim() || 's/n'
  const raw = typeof iso === 'string' ? parseISO(iso) : iso
  const d = raw instanceof Date && !Number.isNaN(raw.getTime()) ? raw : new Date()
  const when = format(d, 'dd/MM/yyyy HH:mm')
  return `${nome}_${sn}_${when}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(new Error('Falha ao ler o ficheiro'))
    r.readAsDataURL(file)
  })
}

/** Path `/uploads/machine-docs/...` a partir da URL pública guardada na ficha. */
function pathFromMachineDocUrl(url) {
  if (!url || typeof url !== 'string') return null
  try {
    const p = new URL(url).pathname
    return p.startsWith('/uploads/machine-docs/') ? p.split('?')[0] : null
  } catch {
    const s = url.trim()
    if (s.startsWith('/uploads/machine-docs/')) return s.split('?')[0]
    return null
  }
}

export default function DocumentacaoModal({ isOpen, onClose, maquina, onOpenPlanoPecas }) {
  const {
    maquinas,
    manutencoes,
    addDocumentoMaquina,
    removeDocumentoMaquina,
    updateMaquina,
    getPecasPlanoByMaquina,
    replacePecasPlanoMaquina,
  } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const { isAdmin } = usePermissions()
  const pdfInputRef = useRef(null)
  const fotoInputRef = useRef(null)
  const [formDoc, setFormDoc] = useState({ tipo: 'manual_utilizador', titulo: '', url: '' })
  const [confirmDeleteDocId, setConfirmDeleteDocId] = useState(null)
  const [activeDocTab, setActiveDocTab] = useState('ficha')
  const [fotoBusy, setFotoBusy] = useState(false)
  const [fotoTitulos, setFotoTitulos] = useState({})

  const maq = maquinas.find(m => String(m.id) === String(maquina?.id)) ?? maquina
  const maqId = maq?.id
  const maqSubcategoriaId = maq?.subcategoriaId

  const temManutencaoConcluidaNaMaq = useMemo(() => {
    if (!maq?.id) return false
    return manutencoes.some(
      m => String(m.maquinaId) === String(maq.id) && m.status === 'concluida',
    )
  }, [manutencoes, maq?.id])

  const mostrarPlanoKaeserNaDoc =
    !!maq && isKaeserAbcdMaquina(maq) && isKaeserMarca(maq.marca)

  const docPlanoManutPdf = useMemo(
    () => (maq?.documentos ?? []).find(d => d.tipo === 'plano_manutencao'),
    [maq?.documentos],
  )

  useEffect(() => {
    if (!isOpen || !maqId) return
    const parafuso = SUBCATEGORIAS_COMPRESSOR_PARAFUSO.includes(maqSubcategoriaId)
    setFormDoc(f => ({ ...f, tipo: parafuso ? 'plano_manutencao' : 'manual_utilizador' }))
    setActiveDocTab('ficha')
    setFotoTitulos({})
  }, [isOpen, maqId, maqSubcategoriaId])

  if (!isOpen) return null

  const todosDocumentos = maq ? (maq.documentos ?? []) : []
  const documentos = todosDocumentos.filter(d => d.tipo !== FOTO_EQUIPAMENTO_TIPO)
  const fotosEquipamento = todosDocumentos
    .filter(d => d.tipo === FOTO_EQUIPAMENTO_TIPO)
    .sort((a, b) => String(b.criadoEm || b.data || '').localeCompare(String(a.criadoEm || a.data || '')))
  const getTipoLabel = (tipo) => TIPOS_DOCUMENTO.find(t => t.id === tipo)?.label ?? tipo
  const tiposComDocumento = new Set(documentos.map(d => d.tipo).filter(Boolean))
  const tiposEmFalta = TIPOS_DOCUMENTO.filter(t => !tiposComDocumento.has(t.id))
  const docCompleta = tiposEmFalta.length === 0

  const handleAddDoc = async (e) => {
    e.preventDefault()
    if (!formDoc.titulo.trim() || !formDoc.url.trim()) {
      showToast('Preencha título e URL para adicionar por link.', 'warning')
      return
    }
    const url = safeHttpUrl(formDoc.url.trim())
    if (url === '#') {
      showToast('URL inválida. Use um link que comece por https:// ou http://', 'warning')
      return
    }
    const res = await addDocumentoMaquina(maq.id, { tipo: formDoc.tipo, titulo: formDoc.titulo.trim(), url })
    if (res?.ok) {
      showToast('Documento associado ao equipamento.', 'success')
      setFormDoc(f => ({ ...f, titulo: '', url: '' }))
    } else {
      showToast('Não foi possível associar o documento. Verifique a ligação ou tente de novo.', 'error', 4000)
    }
  }

  const handlePdfSelected = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !maq?.id) return
    const name = file.name || ''
    if (!name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      showToast('Seleccione um ficheiro PDF.', 'warning')
      return
    }
    if (file.size > PDF_MAX_BYTES) {
      showToast('PDF demasiado grande (máx. 8 MB).', 'warning')
      return
    }
    showGlobalLoading()
    try {
      const dataUrl = await readFileAsDataUrl(file)
      const existing = (maq.documentos ?? []).find(
        d =>
          d.tipo === formDoc.tipo &&
          d.uploadFileName === name &&
          Number(d.uploadFileSize) === file.size
      )
      const replacePath = existing?.url ? pathFromMachineDocUrl(existing.url) : null
      const uploadRes = await apiUploadMachinePdf({
        dataUrl,
        maquinaId: maq.id,
        ...(replacePath ? { replacePath } : {}),
      })
      const url = uploadRes?.url
      if (!url) {
        showToast('Resposta do servidor sem URL do PDF.', 'error', 4000)
        return
      }
      const titulo = (formDoc.titulo.trim() || name.replace(/\.pdf$/i, '')).slice(0, 200)
      const saveRes = await addDocumentoMaquina(maq.id, {
        tipo: formDoc.tipo,
        titulo,
        url,
        uploadFileName: name,
        uploadFileSize: file.size,
      })
      if (saveRes?.ok) {
        showToast(
          saveRes.replaced
            ? 'PDF actualizado (substituiu o envio anterior com o mesmo nome e tamanho).'
            : 'PDF carregado e associado ao equipamento.',
          'success'
        )
        setFormDoc(f => ({ ...f, titulo: '' }))
      } else {
        showToast('O PDF foi enviado mas não ficou guardado na ficha. Verifique a ligação ou tente de novo.', 'error', 4500)
      }
    } catch (err) {
      logger.error('DocumentacaoModal', 'uploadPdf', err?.message || String(err))
      showToast(err?.message || 'Falha ao enviar PDF.', 'error', 4000)
    } finally {
      hideGlobalLoading()
    }
  }

  const handleFotosSelected = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length || !maq?.id) return

    const selecionadas = files.slice(0, FOTO_MAX_FILES)
    if (files.length > selecionadas.length) {
      showToast(`Foram seleccionadas ${files.length}; serão gravadas as primeiras ${FOTO_MAX_FILES}.`, 'warning')
    }

    const invalidas = selecionadas.filter(f => !String(f.type || '').startsWith('image/'))
    if (invalidas.length > 0) {
      showToast('Seleccione apenas fotografias/imagens.', 'warning')
      return
    }

    setFotoBusy(true)
    showGlobalLoading()
    try {
      const novas = []
      for (const file of selecionadas) {
        const blob = await fileToMemory(file)
        const criadoEm = new Date().toISOString()
        const dataUrl = await comprimirFotoParaRelatorio(blob, {
          footerLine: linhaRodapeFotoArquivo(maq, criadoEm),
        })
        const uploadRes = await apiUploadMachinePhoto({
          dataUrl,
          maquinaId: maq.id,
          equipamentoNome: nomeEquipamentoParaFoto(maq),
          numeroSerie: maq.numeroSerie || maq.numero_serie || '',
          capturedAt: criadoEm,
        })
        if (!uploadRes?.url) {
          throw new Error('Resposta do servidor sem URL da fotografia.')
        }
        const nomeBase = (uploadRes.filename || file.name || '').replace(/\.[^.]+$/i, '').trim()
        novas.push({
          id: `foto-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
          tipo: FOTO_EQUIPAMENTO_TIPO,
          titulo: (nomeBase || `Foto ${format(new Date(criadoEm), 'dd/MM/yyyy HH:mm')}`).slice(0, 120),
          url: uploadRes.url,
          criadoEm,
          uploadFileName: uploadRes.filename || file.name || '',
          originalFileName: file.name || '',
          uploadFileSize: file.size || 0,
          uploadBytes: uploadRes.bytes || null,
          width: uploadRes.width || null,
          height: uploadRes.height || null,
        })
      }

      await updateMaquina(maq.id, { documentos: [...todosDocumentos, ...novas] })
      showToast(`${novas.length} fotografia(s) adicionada(s) ao arquivo do equipamento.`, 'success')
      setActiveDocTab('fotos')
    } catch (err) {
      logger.error('DocumentacaoModal', 'uploadFotosEquipamento', err?.message || String(err), {
        maquinaId: maq?.id,
        stack: err?.stack?.slice(0, 400),
      })
      showToast(err?.message || 'Não foi possível gravar a fotografia.', 'error', 4500)
    } finally {
      hideGlobalLoading()
      setFotoBusy(false)
    }
  }

  const handleGuardarFotoTitulo = async (foto) => {
    if (!maq?.id || !foto?.id) return
    const titulo = (fotoTitulos[foto.id] ?? foto.titulo ?? '').trim()
    if (!titulo) {
      showToast('Indique um nome para a fotografia.', 'warning')
      return
    }
    const nextDocs = todosDocumentos.map(d =>
      String(d.id) === String(foto.id) ? { ...d, titulo: titulo.slice(0, 120) } : d
    )
    try {
      await updateMaquina(maq.id, { documentos: nextDocs })
      setFotoTitulos(prev => {
        const next = { ...prev }
        delete next[foto.id]
        return next
      })
      showToast('Nome da fotografia actualizado.', 'success')
    } catch (err) {
      showToast(err?.message || 'Não foi possível actualizar o nome da fotografia.', 'error', 4000)
    }
  }

  const handleImportarPecasDoPdfNaFicha = async () => {
    if (!isAdmin || !maq?.id || !docPlanoManutPdf?.url) {
      showToast('É necessário um documento «Plano de manutenção (PDF)» na lista abaixo.', 'warning')
      return
    }
    const href = safeHttpUrl(docPlanoManutPdf.url)
    if (href === '#') {
      showToast('URL do PDF inválida.', 'warning')
      return
    }
    showGlobalLoading()
    try {
      const res = await fetch(href, { credentials: 'same-origin', mode: 'cors' })
      if (!res.ok) {
        showToast(`Não foi possível obter o PDF (${res.status}). Abra o documento num separador e importe pelo plano de peças, se preferir.`, 'error', 4500)
        return
      }
      const arrayBuffer = await res.arrayBuffer()
      const todas = await buildPecasPlanoItemsFromPdfArrayBuffer(arrayBuffer, maq.id)
      if (todas.length === 0) {
        showToast('Não foi possível extrair peças deste PDF. Confirme que é um plano KAESER A/B/C/D ou importe a partir do ficheiro original no plano de peças.', 'warning', 4500)
        return
      }
      const kept = getPecasPlanoByMaquina(maq.id).filter(p => !['A', 'B', 'C', 'D'].includes(p.tipoManut))
      await replacePecasPlanoMaquina(maq.id, [...kept, ...todas])
      const porTipo = contagemPorTipoKaeser(todas)
      showToast(
        `Importação concluída: ${todas.length} linhas (A: ${porTipo.A}, B: ${porTipo.B}, C: ${porTipo.C}, D: ${porTipo.D}).`,
        'success',
        5000,
      )
      logger.action('DocumentacaoModal', 'importarPecasDoPdfFicha', 'Consumíveis KAESER importados do PDF na ficha', {
        maquinaId: maq.id,
        linhas: todas.length,
        porTipo,
      })
    } catch (err) {
      logger.error('DocumentacaoModal', 'importarPecasDoPdfFicha', err?.message || String(err), {
        maquinaId: maq?.id,
        stack: err?.stack?.slice(0, 400),
      })
      showToast(
        err?.message?.includes('Failed to fetch') || err?.name === 'TypeError'
          ? 'Não foi possível ler o PDF (rede ou permissões). Use «Abrir plano de peças» e importe o ficheiro localmente.'
          : (err?.message || 'Falha ao importar consumíveis.'),
        'error',
        5000,
      )
    } finally {
      hideGlobalLoading()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-documentacao" onClick={e => e.stopPropagation()}>
        <div className="doc-modal-header">
          <div>
            <h2>Documentação — {maq?.marca} {maq?.modelo}</h2>
            <p className="modal-hint">{COPY_DOC_FIO_CONDUTOR}</p>
          </div>
          <div className={`doc-status-card ${docCompleta ? 'doc-status-card--ok' : 'doc-status-card--warning'}`}>
            <strong>{docCompleta ? 'Documentação completa' : 'Documentação incompleta'}</strong>
            <span>{documentos.length}/{TIPOS_DOCUMENTO.length} tipos associados</span>
          </div>
        </div>

        {SUBCATEGORIAS_COMPRESSOR_PARAFUSO.includes(maq?.subcategoriaId) && (
          <p className="modal-hint doc-modal-note">{COPY_DOC_PARAFUSO_KAESER}</p>
        )}

        <div className="doc-tabs" role="tablist" aria-label="Secções de documentação">
          <button type="button" className={activeDocTab === 'ficha' ? 'active' : ''} onClick={() => setActiveDocTab('ficha')}>
            Documentos da ficha
          </button>
          <button type="button" className={activeDocTab === 'biblioteca' ? 'active' : ''} onClick={() => setActiveDocTab('biblioteca')}>
            Biblioteca NAVEL
          </button>
          <button type="button" className={activeDocTab === 'fotos' ? 'active' : ''} onClick={() => setActiveDocTab('fotos')}>
            Fotografias ({fotosEquipamento.length})
          </button>
          {mostrarPlanoKaeserNaDoc && (
            <button type="button" className={activeDocTab === 'plano' ? 'active' : ''} onClick={() => setActiveDocTab('plano')}>
              Plano / consumíveis
            </button>
          )}
          {isAdmin && (
            <button type="button" className={activeDocTab === 'adicionar' ? 'active' : ''} onClick={() => setActiveDocTab('adicionar')}>
              Adicionar ficheiro
            </button>
          )}
        </div>

        {activeDocTab === 'ficha' && (
          <section className="doc-panel">
            {!docCompleta && (
              <div className="doc-missing-card">
                <strong>Faltam documentos na ficha:</strong>
                <span>{tiposEmFalta.map(t => t.label).join(', ')}</span>
              </div>
            )}
            <div className="doc-lista doc-lista--cards">
              {documentos.map(d => (
                <div key={d.id} className="doc-item">
                  <div className="doc-item-info">
                    <span className="doc-tipo">{getTipoLabel(d.tipo)}</span>
                    <span className="doc-titulo">{d.titulo}</span>
                  </div>
                  <div className="doc-item-actions">
                    <a href={safeHttpUrl(d.url)} target="_blank" rel="noopener noreferrer" className="equip-action-btn secondary" title="Abrir documento">
                      <ExternalLink size={16} aria-hidden /> <span>Abrir</span>
                    </a>
                    {isAdmin && confirmDeleteDocId === d.id ? (
                      <>
                        <button
                          type="button"
                          className="equip-action-btn danger"
                          onClick={async () => {
                            setConfirmDeleteDocId(null)
                            const r = await removeDocumentoMaquina(maq.id, d.id)
                            showToast(
                              r?.ok ? 'Documento removido.' : 'Não foi possível remover o documento.',
                              r?.ok ? 'success' : 'error',
                              4000
                            )
                          }}
                          title="Confirmar remoção"
                        >
                          Sim
                        </button>
                        <button type="button" className="equip-action-btn secondary" onClick={() => setConfirmDeleteDocId(null)} title="Cancelar remoção">Não</button>
                      </>
                    ) : isAdmin && (
                      <button type="button" className="equip-action-btn danger" onClick={() => setConfirmDeleteDocId(d.id)} title="Remover documento">
                        <Trash2 size={16} aria-hidden /> <span>Remover</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {documentos.length === 0 && <p className="doc-empty">Nenhum documento associado a esta ficha.</p>}
            </div>
          </section>
        )}

        {activeDocTab === 'biblioteca' && (
          <section className="doc-panel doc-panel--biblioteca">
            <div className="doc-source-intro">
              <strong>Biblioteca NAVEL</strong>
              <span>Documentos partilhados/externos à ficha deste equipamento.</span>
            </div>
            {maq?.id ? <MaquinaBibliotecaNavel maquina={maq} /> : null}
          </section>
        )}

        {activeDocTab === 'fotos' && (
          <section className="doc-panel doc-panel--fotos">
            <div className="doc-source-intro">
              <strong>Arquivo fotográfico do equipamento</strong>
              <span>Fotos tiradas no terreno, organizadas da mais recente para a mais antiga.</span>
            </div>

            <input
              ref={fotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              style={{ display: 'none' }}
              onChange={handleFotosSelected}
            />
            <div className="doc-photo-actions">
              <button
                type="button"
                className="btn secondary btn-add-doc"
                onClick={() => fotoInputRef.current?.click()}
                disabled={fotoBusy}
              >
                <Camera size={16} /> {fotoBusy ? 'A gravar fotografias…' : 'Tirar/adicionar fotografia'}
              </button>
              <span className="text-muted">
                A aplicação redimensiona automaticamente para JPEG leve antes do upload.
              </span>
            </div>

            {fotosEquipamento.length > 0 ? (
              <div className="doc-photo-grid">
                {fotosEquipamento.map(foto => {
                  const criado = foto.criadoEm || foto.data || ''
                  const tituloAtual = fotoTitulos[foto.id] ?? foto.titulo ?? ''
                  const tituloMudou = tituloAtual.trim() !== String(foto.titulo ?? '').trim()
                  return (
                    <article key={foto.id} className="doc-photo-card">
                      <a href={safeHttpUrl(foto.url)} target="_blank" rel="noopener noreferrer" className="doc-photo-thumb" title="Abrir fotografia">
                        <img src={safeHttpUrl(foto.url)} alt={foto.titulo || 'Fotografia do equipamento'} loading="lazy" />
                      </a>
                      <div className="doc-photo-meta">
                        <label>
                          Nome da foto
                          <input
                            value={tituloAtual}
                            onChange={e => setFotoTitulos(prev => ({ ...prev, [foto.id]: e.target.value }))}
                            placeholder="Ex: Ligações eléctricas após intervenção"
                          />
                        </label>
                        <div className="doc-photo-footer">
                          <span className="text-muted">
                            <Images size={14} aria-hidden />
                            {criado ? format(new Date(criado), 'dd/MM/yyyy HH:mm', { locale: pt }) : 'Sem data'}
                          </span>
                          <button
                            type="button"
                            className="equip-action-btn secondary"
                            onClick={() => handleGuardarFotoTitulo(foto)}
                            disabled={!tituloMudou}
                          >
                            <Save size={14} aria-hidden /> Guardar nome
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <p className="doc-empty">Ainda não existem fotografias arquivadas neste equipamento.</p>
            )}
          </section>
        )}

        {activeDocTab === 'plano' && mostrarPlanoKaeserNaDoc && (
          <section className="doc-panel">
            <div className="consumiveis-card doc-plano-kaeser-card">
              <h4>Plano de peças KAESER (A / B / C / D)</h4>
              <p className="modal-hint" style={{ marginTop: 0 }}>
                Os consumíveis por fase ficam na base após importação. Pode abrir o gestor de plano aqui ou importar directamente a partir do PDF «Plano de manutenção» já associado a este equipamento.
              </p>
              <div className="form-row doc-kaeser-actions" style={{ flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.65rem' }}>
                {typeof onOpenPlanoPecas === 'function' && (
                  <button type="button" className="btn secondary btn-sm" onClick={() => onOpenPlanoPecas(maq)}>
                    <PackageOpen size={14} aria-hidden /> Abrir plano de peças (A/B/C/D)
                  </button>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    className="btn primary btn-sm"
                    onClick={handleImportarPecasDoPdfNaFicha}
                    disabled={!docPlanoManutPdf}
                    title={docPlanoManutPdf ? 'Lê o PDF do plano na lista e grava consumíveis A-D na base' : 'Associe primeiro um PDF como «Plano de manutenção (PDF)»'}
                  >
                    Importar consumíveis do PDF já na ficha
                  </button>
                )}
              </div>
              {!isAdmin && typeof onOpenPlanoPecas === 'function' && (
                <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: 0, marginTop: '0.5rem' }}>
                  A importação a partir de PDF é feita pelo administrador. Use «Abrir plano de peças» para consultar as linhas já gravadas.
                </p>
              )}
            </div>

            {SUBCATEGORIAS_COM_CONTADOR_HORAS.includes(maq?.subcategoriaId) && (() => {
              if (!maq) return null
              const horasFicha = horasContadorNaFicha(maq)
              const temOrfaosNaFicha = !temManutencaoConcluidaNaMaq && (!!maq.ultimaManutencaoData || horasFicha != null)

              if (!temManutencaoConcluidaNaMaq) {
                return (
                  <div className="consumiveis-card">
                    <h4>Contador</h4>
                    {!temOrfaosNaFicha ? (
                      <p className="modal-hint" style={{ margin: 0 }}>
                        Sem manutenções <strong>concluídas</strong> neste equipamento. Referência: <strong>0 h</strong> até à primeira intervenção finalizada com relatório.
                      </p>
                    ) : (
                      <>
                        <p className="modal-hint" style={{ margin: 0 }}>
                          Não há manutenções concluídas, mas a ficha na base ainda tem data ou horas antigas. A referência correcta é <strong>0 h</strong> até voltar a concluir uma visita.
                        </p>
                        {isAdmin && (
                          <p className="modal-hint" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
                            <span className="text-muted" style={{ display: 'block', marginBottom: '0.35rem' }}>
                              Valores órfãos: {maq.ultimaManutencaoData
                                ? `última data ${format(new Date(maq.ultimaManutencaoData + 'T12:00:00'), 'd MMM yyyy', { locale: pt })}`
                                : 'sem data'}
                              {horasFicha != null ? ` · ${horasFicha} h` : ''}
                            </span>
                            <button
                              type="button"
                              className="btn secondary btn-sm"
                              onClick={async () => {
                                if (!window.confirm('Limpar na ficha a data da última manutenção e as horas acumuladas? (Recomendado após apagar intervenções antigas.)')) return
                                try {
                                  await updateMaquina(maq.id, {
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

              if (!maq.ultimaManutencaoData && horasFicha == null) return null
              return (
                <div className="consumiveis-card">
                  <h4>Contador (à data da última manutenção)</h4>
                  <div className="consumiveis-grid">
                    {maq.ultimaManutencaoData && (
                      <span>
                        <strong>Última manut.:</strong>{' '}
                        {format(new Date(maq.ultimaManutencaoData + 'T12:00:00'), 'd MMM yyyy', { locale: pt })}
                      </span>
                    )}
                    {horasFicha != null && <span><strong>Horas no contador:</strong> {horasFicha} h</span>}
                  </div>
                </div>
              )
            })()}
            {['sub5', 'sub14'].includes(maq?.subcategoriaId) && (maq?.refKitManut3000h || maq?.refKitManut6000h || maq?.refCorreia || maq?.refFiltroOleo || maq?.refFiltroSeparador || maq?.refFiltroAr) && (
              <div className="consumiveis-card">
                <h4>Consumíveis</h4>
                <div className="consumiveis-grid">
                  {maq.refKitManut3000h && <span><strong>Kit 3000h:</strong> {maq.refKitManut3000h}</span>}
                  {maq.refKitManut6000h && <span><strong>Kit 6000h:</strong> {maq.refKitManut6000h}</span>}
                  {maq.refCorreia && <span><strong>Correia:</strong> {maq.refCorreia}</span>}
                  {maq.refFiltroOleo && <span><strong>Filtro óleo:</strong> {maq.refFiltroOleo}</span>}
                  {maq.refFiltroSeparador && <span><strong>Filtro separador:</strong> {maq.refFiltroSeparador}</span>}
                  {maq.refFiltroAr && <span><strong>Filtro ar:</strong> {maq.refFiltroAr}</span>}
                </div>
              </div>
            )}
          </section>
        )}

        {activeDocTab === 'adicionar' && isAdmin && (
          <section className="doc-panel">
            <form onSubmit={handleAddDoc} className="form-add-doc form-add-doc--panel">
              <div className="form-row">
                <label>
                  Tipo
                  <select value={formDoc.tipo} onChange={e => setFormDoc(f => ({ ...f, tipo: e.target.value }))}>
                    {TIPOS_DOCUMENTO.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </label>
                <label style={{ flex: 1 }}>
                  Título
                  <input value={formDoc.titulo} onChange={e => setFormDoc(f => ({ ...f, titulo: e.target.value }))} placeholder="Ex: Plano 3000 h / Manual GA-22" />
                </label>
              </div>
              <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={handlePdfSelected} />
              <div className="doc-upload-card">
                <button type="button" className="btn secondary btn-add-doc" onClick={() => pdfInputRef.current?.click()}>
                  <Upload size={16} /> Importar PDF para o servidor
                </button>
                <span className="text-muted">Máx. 8 MB. Usa o tipo seleccionado acima.</span>
              </div>
              <label>
                Ou URL (link para PDF alojado noutro sítio)
                <input type="url" value={formDoc.url} onChange={e => setFormDoc(f => ({ ...f, url: e.target.value }))} placeholder="https://..." />
              </label>
              <button type="submit" className="btn-add-doc"><Plus size={16} /> Adicionar por URL</button>
            </form>
          </section>
        )}
        <div className="form-actions">
          <button type="button" className="btn secondary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}
