/**
 * PecasPlanoModal — Gestão do plano de peças e consumíveis por máquina.
 * Suporta tipos de manutenção A/B/C/D (KAESER) e Periódica (outros equipamentos).
 * KAESER: importar plano a partir de PDF (explorador de ficheiros).
 */
import { useState, useMemo, useRef, useEffect } from 'react'
import { useData, SUBCATEGORIAS_COMPRESSOR, isKaeserMarca } from '../context/DataContext'
import { useToast } from './Toast'
import { useGlobalLoading } from '../context/GlobalLoadingContext'
import { parseKaeserPlanoPdf } from '../utils/parseKaeserPlanoPdf'
import { Plus, Trash2, Upload, X, Save, ChevronDown, PackageOpen } from 'lucide-react'
import './PecasPlanoModal.css'

const TIPOS_MANUT = [
  { id: 'A', label: 'Tipo A', hint: '3.000h / 1 ano' },
  { id: 'B', label: 'Tipo B', hint: '6.000h' },
  { id: 'C', label: 'Tipo C', hint: '12.000h' },
  { id: 'D', label: 'Tipo D', hint: '36.000h' },
  { id: 'periodica', label: 'Periódica', hint: 'Manutenção periódica standard' },
]

const UNIDADES = ['PÇ', 'TER', 'L', 'KG', 'M', 'UN']

const PECA_VAZIA = { posicao: '', codigoArtigo: '', descricao: '', quantidade: 1, unidade: 'PÇ' }

export default function PecasPlanoModal({ isOpen, onClose, maquina, modoInicial = false }) {
  const { getPecasPlanoByMaquina, addPecaPlano, addPecasPlanoLote, updatePecaPlano, removePecaPlano, removePecasPlanoByMaquina, getSubcategoria } = useData()
  const { showToast } = useToast()
  const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()
  const fileInputRef = useRef(null)
  const [tipoAtivo, setTipoAtivo] = useState('A')
  const [formNova, setFormNova] = useState(PECA_VAZIA)
  const [editandoId, setEditandoId] = useState(null)
  const [formEdit, setFormEdit] = useState(PECA_VAZIA)
  const [confirmarLimpar, setConfirmarLimpar] = useState(false)

  const sub          = maquina ? getSubcategoria(maquina.subcategoriaId) : null
  const isCompressor = maquina && SUBCATEGORIAS_COMPRESSOR.includes(maquina.subcategoriaId)
  const isKaeser     = maquina && isKaeserMarca(maquina.marca)

  // Tipos a mostrar: A/B/C/D + Periódica só para KAESER; outras marcas só "periódica" (manual)
  const tiposVisiveis = isKaeser ? TIPOS_MANUT : TIPOS_MANUT.filter(t => t.id === 'periodica')

  // Garantir que tipoAtivo é válido (ex.: não-KAESER só tem "periodica")
  useEffect(() => {
    if (tiposVisiveis.length > 0 && !tiposVisiveis.some(t => t.id === tipoAtivo)) {
      setTipoAtivo(tiposVisiveis[0].id)
    }
  }, [maquina?.id, tiposVisiveis, tipoAtivo])

  const pecasTipo = useMemo(
    () => maquina ? getPecasPlanoByMaquina(maquina.id, tipoAtivo) : [],
    [maquina, tipoAtivo, getPecasPlanoByMaquina]
  )

  const totalMaquina = useMemo(
    () => maquina ? getPecasPlanoByMaquina(maquina.id).length : 0,
    [maquina, getPecasPlanoByMaquina]
  )

  if (!isOpen || !maquina) return null

  const handleAddPeca = (e) => {
    e.preventDefault()
    if (!formNova.codigoArtigo.trim() || !formNova.descricao.trim()) {
      showToast('Código de artigo e descrição são obrigatórios.', 'warning')
      return
    }
    addPecaPlano({ ...formNova, maquinaId: maquina.id, tipoManut: tipoAtivo })
    setFormNova(PECA_VAZIA)
    showToast('Peça adicionada ao plano.', 'success')
  }

  const handleSaveEdit = (id) => {
    if (!formEdit.codigoArtigo.trim() || !formEdit.descricao.trim()) {
      showToast('Código de artigo e descrição são obrigatórios.', 'warning')
      return
    }
    updatePecaPlano(id, formEdit)
    setEditandoId(null)
    showToast('Peça actualizada.', 'success')
  }

  const handleImportarPdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !maquina) return
    e.target.value = ''

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      showToast('Seleccione um ficheiro PDF.', 'warning')
      return
    }

    showGlobalLoading()
    try {
      const { PDFParse } = await import('pdf-parse')
      // Worker obrigatório no browser (pdfjs-dist)
      PDFParse.setWorker(`${import.meta.env.BASE_URL}pdf.worker.mjs`)
      const arrayBuffer = await file.arrayBuffer()
      const parser = new PDFParse({ data: new Uint8Array(arrayBuffer) })
      const { text } = await parser.getText()
      parser.destroy?.()

      const parsed = parseKaeserPlanoPdf(text || '')
      const todas = []
      for (const tipo of ['A', 'B', 'C', 'D']) {
        for (const p of parsed[tipo] || []) {
          todas.push({ ...p, maquinaId: maquina.id, tipoManut: tipo })
        }
      }

      if (todas.length === 0) {
        showToast('Não foi possível extrair peças do PDF. Verifique se o formato é um plano KAESER A/B/C/D.', 'warning')
        return
      }

      // Substituir plano existente
      removePecasPlanoByMaquina(maquina.id)
      addPecasPlanoLote(todas)
      const porTipo = { A: 0, B: 0, C: 0, D: 0 }
      todas.forEach(p => { porTipo[p.tipoManut] = (porTipo[p.tipoManut] || 0) + 1 })
      showToast(`${todas.length} peças importadas (A: ${porTipo.A}, B: ${porTipo.B}, C: ${porTipo.C}, D: ${porTipo.D}).`, 'success')
    } catch (err) {
      showToast(`Erro ao ler PDF: ${err?.message || 'desconhecido'}`, 'error')
    } finally {
      hideGlobalLoading()
    }
  }

  const handleLimparTipo = () => {
    pecasTipo.forEach(p => removePecaPlano(p.id))
    setConfirmarLimpar(false)
    showToast(`Plano Tipo ${tipoAtivo} limpo.`, 'success')
  }

  const handleLimparTudo = () => {
    removePecasPlanoByMaquina(maquina.id)
    setConfirmarLimpar(false)
    showToast('Todos os planos desta máquina foram eliminados.', 'success')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-pecas-plano" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-pecas-header">
          <div>
            <h2><PackageOpen size={20} /> Plano de peças e consumíveis</h2>
            <p className="modal-pecas-sub">
              {maquina.marca} {maquina.modelo} — Nº Série: <strong>{maquina.numeroSerie}</strong>
              {sub && <> &nbsp;·&nbsp; {sub.nome}</>}
            </p>
          </div>
          <button className="icon-btn" onClick={onClose} title="Fechar"><X size={20} /></button>
        </div>

        {/* Tabs tipos */}
        <div className="modal-pecas-tabs">
          {tiposVisiveis.map(t => {
            const count = maquina ? getPecasPlanoByMaquina(maquina.id, t.id).length : 0
            return (
              <button
                key={t.id}
                className={`tab-tipo ${tipoAtivo === t.id ? 'active' : ''}`}
                onClick={() => { setTipoAtivo(t.id); setEditandoId(null); setFormNova(PECA_VAZIA) }}
              >
                <span className="tab-tipo-label">{t.label}</span>
                <span className="tab-tipo-hint">{t.hint}</span>
                {count > 0 && <span className="tab-tipo-count">{count}</span>}
              </button>
            )
          })}
          <span className="tab-total">{totalMaquina > 0 ? `${totalMaquina} peças no total` : 'Sem peças configuradas'}</span>
        </div>

        {/* Banner de boas-vindas — primeiro setup do plano */}
        {modoInicial && totalMaquina === 0 && (
          <div className="modal-pecas-boas-vindas">
            <strong>Equipamento criado!</strong>
            {isKaeser
              ? <> Configure o plano de consumíveis deste compressor KAESER. Use <em>"Importar template para esta máquina"</em> para carregar o plano a partir do PDF e ajuste os artigos ao número de série.</>
              : <> Configure os consumíveis recomendados para as manutenções periódicas deste equipamento. Adicione cada artigo manualmente.</>
            }
          </div>
        )}

        {/* Importar plano KAESER a partir de PDF — exclusivo para máquinas KAESER */}
        {isKaeser && tipoAtivo !== 'periodica' && (
          <div className="modal-pecas-import">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden-file-input"
              onChange={handleImportarPdf}
              aria-label="Seleccionar PDF do plano de manutenção"
            />
            <span className="import-hint">
              Selecione o PDF do plano de manutenção desta máquina (formato KAESER A/B/C/D).
            </span>
            <button
              type="button"
              className="btn btn-sm primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> Importar template para esta máquina
            </button>
          </div>
        )}

        {/* Tabela de peças */}
        <div className="modal-pecas-table-wrap">
          {pecasTipo.length === 0 ? (
            <p className="modal-pecas-vazio">
              Sem peças configuradas para <strong>Tipo {tipoAtivo === 'periodica' ? 'Periódica' : tipoAtivo}</strong>.
              {isKaeser && tipoAtivo !== 'periodica' && ' Use "Importar template para esta máquina" para carregar o plano a partir de um PDF.'}
              {!isKaeser && ' Adicione cada consumível manualmente no formulário abaixo.'}
            </p>
          ) : (
            <table className="tabela-pecas">
              <thead>
                <tr>
                  <th>Pos.</th>
                  <th>Código artigo</th>
                  <th>Descrição</th>
                  <th>Qtd</th>
                  <th>Un.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pecasTipo.map(p => editandoId === p.id ? (
                  <tr key={p.id} className="row-edit">
                    <td><input className="input-sm" value={formEdit.posicao} onChange={e => setFormEdit(f => ({ ...f, posicao: e.target.value }))} placeholder="Ex: 0512" style={{ width: '60px' }} /></td>
                    <td><input className="input-sm" value={formEdit.codigoArtigo} onChange={e => setFormEdit(f => ({ ...f, codigoArtigo: e.target.value }))} required style={{ width: '130px' }} /></td>
                    <td><input className="input-sm" value={formEdit.descricao} onChange={e => setFormEdit(f => ({ ...f, descricao: e.target.value }))} required style={{ width: '100%' }} /></td>
                    <td><input className="input-sm" type="number" min={0.01} step={0.01} value={formEdit.quantidade} onChange={e => setFormEdit(f => ({ ...f, quantidade: parseFloat(e.target.value) || 1 }))} style={{ width: '60px' }} /></td>
                    <td>
                      <select className="input-sm" value={formEdit.unidade} onChange={e => setFormEdit(f => ({ ...f, unidade: e.target.value }))}>
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="cell-actions">
                      <button className="icon-btn success" onClick={() => handleSaveEdit(p.id)} title="Guardar"><Save size={14} /></button>
                      <button className="icon-btn" onClick={() => setEditandoId(null)} title="Cancelar"><X size={14} /></button>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id}>
                    <td className="cell-pos">{p.posicao || '—'}</td>
                    <td className="cell-code">{p.codigoArtigo}</td>
                    <td>{p.descricao}</td>
                    <td className="cell-qty">{p.quantidade}</td>
                    <td className="cell-un">{p.unidade}</td>
                    <td className="cell-actions">
                      <button className="icon-btn secondary" onClick={() => { setEditandoId(p.id); setFormEdit({ posicao: p.posicao || '', codigoArtigo: p.codigoArtigo, descricao: p.descricao, quantidade: p.quantidade, unidade: p.unidade }) }} title="Editar">
                        <ChevronDown size={14} />
                      </button>
                      <button className="icon-btn danger" onClick={() => removePecaPlano(p.id)} title="Remover"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Adicionar nova peça */}
        <form className="modal-pecas-add-row" onSubmit={handleAddPeca}>
          <input
            className="input-sm"
            placeholder="Posição"
            value={formNova.posicao}
            onChange={e => setFormNova(f => ({ ...f, posicao: e.target.value }))}
            style={{ width: '65px', flexShrink: 0 }}
          />
          <input
            className="input-sm"
            placeholder="Código artigo *"
            value={formNova.codigoArtigo}
            onChange={e => setFormNova(f => ({ ...f, codigoArtigo: e.target.value }))}
            style={{ width: '135px', flexShrink: 0 }}
          />
          <input
            className="input-sm"
            placeholder="Descrição *"
            value={formNova.descricao}
            onChange={e => setFormNova(f => ({ ...f, descricao: e.target.value }))}
            style={{ flex: 1 }}
          />
          <input
            className="input-sm"
            type="number"
            min={0.01}
            step={0.01}
            value={formNova.quantidade}
            onChange={e => setFormNova(f => ({ ...f, quantidade: parseFloat(e.target.value) || 1 }))}
            style={{ width: '60px', flexShrink: 0 }}
          />
          <select
            className="input-sm"
            value={formNova.unidade}
            onChange={e => setFormNova(f => ({ ...f, unidade: e.target.value }))}
            style={{ width: '70px', flexShrink: 0 }}
          >
            {UNIDADES.map(u => <option key={u}>{u}</option>)}
          </select>
          <button type="submit" className="btn btn-sm primary" style={{ flexShrink: 0 }}>
            <Plus size={14} /> Adicionar
          </button>
        </form>

        {/* Rodapé com acção de limpar */}
        <div className="modal-pecas-footer">
          {confirmarLimpar ? (
            <div className="confirmar-limpar">
              <span>Eliminar:</span>
              <button className="btn btn-sm danger" onClick={handleLimparTipo}>Só Tipo {tipoAtivo === 'periodica' ? 'Periódica' : tipoAtivo} ({pecasTipo.length})</button>
              <button className="btn btn-sm danger" onClick={handleLimparTudo}>Toda a máquina ({totalMaquina})</button>
              <button className="btn btn-sm" onClick={() => setConfirmarLimpar(false)}>Cancelar</button>
            </div>
          ) : (
            <>
              {totalMaquina > 0 && (
                <button className="btn btn-sm btn-outline-muted" onClick={() => setConfirmarLimpar(true)}>
                  <Trash2 size={13} /> Limpar plano…
                </button>
              )}
              <button className="btn secondary" onClick={onClose} style={{ marginLeft: 'auto' }}>Fechar</button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}
