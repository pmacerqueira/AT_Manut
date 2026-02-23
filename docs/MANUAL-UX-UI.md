# Manual UX/UI — AT_Manut

Directrizes de interface e experiência do utilizador. **Todas as novas funcionalidades devem seguir estas regras.**

Última revisão: 2026-02-23 — v1.6.2

---

## 1. Notificações (Toast)

### Posicionamento
- **Sempre ao centro do ecrã** — `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`
- Funciona em desktop, tablet e mobile
- Máxima visibilidade em qualquer resolução

### Uso
```js
const { showToast } = useToast()

showToast('Operação concluída.', 'success')          // 4 s
showToast('Erro ao enviar.', 'error')                // 4 s
showToast('Atenção: limite atingido.', 'warning')    // 2.5 s
showToast('Dica: use o filtro.', 'info')             // 2.5 s
showToast('Mensagem importante.', 'success', 5000)  // duração custom
```

### Regras

| Situação | Tipo | Duração |
|----------|------|---------|
| Operação concluída (gravar, enviar, eliminar) | `success` | 4 s |
| Erro de rede / servidor | `error` | 4 s |
| Aviso de regra de negócio | `warning` | 2.5 s |
| Informação geral | `info` | 2.5 s |
| Validação de campo num formulário | Inline (próximo do campo) | — |
| Erro de login | Inline (padrão UX) | — |

### Nunca usar
- `alert()` — usar sempre `showToast()`
- Estados inline para feedback de operações assíncronas

---

## 2. Indicador de carregamento (Overlay "N")

### Quando usar
Sempre que uma operação assíncrona possa demorar mais de ~500 ms:
- Enviar email ou lembrete de conformidade
- Gerar ou abrir PDF (relatório individual ou histórico por máquina)
- Importar/exportar backup
- Sincronização de dados com o servidor

### Implementação
```js
const { showGlobalLoading, hideGlobalLoading } = useGlobalLoading()

const handleOperacao = async () => {
  showGlobalLoading()
  try {
    await operacaoPesada()
    showToast('Concluído.', 'success')
  } catch (err) {
    showToast(err.message, 'error')
  } finally {
    hideGlobalLoading()  // SEMPRE no finally
  }
}
```

### Aspecto
- Overlay semi-transparente ao centro do ecrã
- Ícone **"N"** (logo.png) a rodar — identidade visual Navel
- Backdrop com blur para destacar o indicador
- Contador interno: múltiplas operações em paralelo mantêm o overlay até todas terminarem

### Ficheiros
- Contexto: `src/context/GlobalLoadingContext.jsx`
- Estilos: `src/context/GlobalLoadingOverlay.css`
- Ícone: `ASSETS.LOGO_ICON` de `src/constants/assets.js`

---

## 3. Modais

### Comportamento obrigatório
- **Fechar com Escape** — todos os modais devem ter `useEffect` com handler de `keydown`:
  ```js
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])
  ```
- **Fechar com clique no overlay** — o `.modal-overlay` deve ter `onClick={onClose}` e o `.modal` deve ter `onClick={e => e.stopPropagation()}`
- **Fechar com botão X** — sempre presente no cabeçalho
- **Botão "Fechar" ou "Cancelar"** — sempre visível na área de acções
- **`role="dialog" aria-modal="true"`** — para acessibilidade

### Estrutura HTML padrão
```jsx
<div className="modal-overlay" onClick={onClose}>
  <div className="modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
    <div className="modal-header">
      <h2>Título</h2>
      <button type="button" className="icon-btn secondary" onClick={onClose} aria-label="Fechar">
        <X size={20} />
      </button>
    </div>
    <div className="modal-body">
      {/* conteúdo */}
    </div>
    <div className="modal-actions">
      <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
      <button type="submit" className="btn primary">Guardar</button>
    </div>
  </div>
</div>
```

---

## 4. Formulários e validação

### Regras
- **Nunca usar `required` HTML** em campos com validação JavaScript customizada — o browser mostrará o seu próprio popover e bloqueará o `handleSubmit`
- A validação deve correr em `handleSubmit` e exibir mensagens inline próximas do campo
- Classe `.form-erro` para mensagens de erro inline
- Confirmar eliminação com diálogo — nunca apagar imediatamente

### Exemplo de validação customizada
```jsx
const handleSubmit = (e) => {
  e.preventDefault()
  if (!form.email?.trim()) {
    setErro('O email é obrigatório para enviar lembretes de conformidade.')
    return
  }
  // ... prosseguir
}

// No JSX:
{erro && <p className="form-erro">{erro}</p>}
<input type="email" value={form.email} onChange={...} placeholder="email@cliente.pt" />
// SEM atributo required
```

---

## 5. Alertas de conformidade (v1.6.0)

### Badge "Sem email" nos clientes
- Classe `.badge-sem-email` — visível na lista de clientes quando `email` está vazio
- Texto: "Sem email"
- Cor: laranja/aviso
- O formulário de cliente deve validar email no submit (não com `required` HTML)

### Modal proactivo (`AlertaProactivoModal`)
- Aparece apenas ao **Admin**, apenas no **Dashboard**
- Disparado se `atm_alertas_dismiss` não for a data de hoje E houver manutenções dentro da janela de aviso
- Agrupado por cliente; cada grupo é expansível/colapsável
- "Dispensar hoje" → guarda `new Date().toISOString().slice(0,10)` em `atm_alertas_dismiss`
- "Fechar" (X ou botão) → fecha sem dispensar — voltará a aparecer na próxima navegação ao Dashboard
- Botão "Enviar lembrete" → chama `enviarLembreteEmail` com `showGlobalLoading`

### Configuração de dias de aviso
- Chave `localStorage`: `atm_config_alertas` → `{ diasAviso: 7 }`
- Apenas visível ao Admin nas Definições
- Validação: 1–60 dias
- `alertasConfig.js` — `getDiasAviso()`, `getManutencoesPendentesAlertas()`

---

## 6. QR Code e etiquetas

### Etiqueta (90×50mm)
- Layout em duas colunas: info da máquina + QR code
- Coluna esquerda: logo Navel, nome da subcategoria, marca/modelo, nº de série, cliente, localização
- Coluna direita: QR code (400px de resolução para impressão nítida)
- Rodapé: `Navel-Açores, Lda · AT_Manut v{versão}`
- Classe de impressão: `#qr-etiqueta-print` (imprime apenas a etiqueta, sem o modal)

### QR code gerado
- URL codificado: `{origin}/manut/equipamentos?maquina={id}`
- Opções: `width: 400`, `margin: 1`, `color: { dark: '#0d2340', light: '#ffffff' }`, `errorCorrectionLevel: 'H'`

---

## 7. Rodapé em relatórios

**Obrigatório em todos os relatórios** (HTML, PDF, email):

```js
import { APP_FOOTER_TEXT } from '../config/version'
// APP_FOOTER_TEXT = "Navel-Açores, Lda — Todos os direitos reservados · v1.6.2"
```

Aplicar em: `relatorioHtml.js`, `gerarPdfRelatorio.js`, `gerarHtmlHistoricoMaquina.js`, `send-email.php`, `EnviarDocumentoModal`, e qualquer novo relatório.

---

## 8. Checklist para novas funcionalidades

Ao implementar uma nova operação assíncrona:

- [ ] `showGlobalLoading()` no início
- [ ] `hideGlobalLoading()` no `finally`
- [ ] `showToast()` para sucesso/erro (nunca `alert()`)
- [ ] Validação de formulário inline (nunca `required` HTML em campos com validação JS)
- [ ] Modais com handler de Escape + clique no overlay
- [ ] Rodapé Navel em todos os relatórios e emails
- [ ] `logger.action()` para acções importantes
- [ ] `logger.error()` para erros recuperáveis

---

## 9. Referências de ficheiros

| Componente | Ficheiro |
|------------|----------|
| Toast | `src/components/Toast.jsx`, `Toast.css` |
| GlobalLoading | `src/context/GlobalLoadingContext.jsx` |
| AlertaProactivoModal | `src/components/AlertaProactivoModal.jsx` |
| QrEtiquetaModal | `src/components/QrEtiquetaModal.jsx` |
| Assets (logos, ícones) | `src/constants/assets.js` |
| Config alertas | `src/config/alertasConfig.js` |
| Versão/rodapé | `src/config/version.js` |
| Logger | `src/utils/logger.js` |
| Regras de desenvolvimento | `.cursor/rules/at-manut-workflow.mdc` |
| Imagens e ícones | `docs/IMAGENS-E-ICONES.md` |
