# Manual UX/UI — AT_Manut

Directrizes de interface e experiência do utilizador. **Todas as novas funcionalidades devem seguir estas regras.**

---

## 1. Notificações (Toast)

### Posicionamento
- **Sempre ao centro do ecrã** — `top: 50%`, `left: 50%`, `transform: translate(-50%, -50%)`
- Funciona em desktop, tablet e mobile
- Máxima visibilidade em qualquer resolução

### Uso
```js
const { showToast } = useToast()

// Sucesso (4 s)
showToast('Operação concluída.', 'success')

// Erro (4 s)
showToast('Erro ao enviar.', 'error')

// Aviso (2.5 s)
showToast('Atenção: limite atingido.', 'warning')

// Info (2.5 s)
showToast('Dica: use o filtro.', 'info')

// Duração custom
showToast('Mensagem importante.', 'success', 5000)
```

### Regras
| Situação | Tipo | Duração |
|----------|------|---------|
| Operação concluída (gravar, enviar, eliminar) | `success` | 4 s |
| Erro de rede / servidor | `error` | 4 s |
| Aviso de regra de negócio | `warning` | 2.5 s |
| Informação geral | `info` | 2.5 s |
| Validação de campo | Inline (próximo do campo) | — |
| Erro de login | Inline (padrão UX) | — |

### Nunca usar
- `alert()` — usar sempre `showToast()`
- Estados inline para feedback de operações assíncronas — usar Toast

---

## 2. Indicador de carregamento (Overlay "N")

### Quando usar
Sempre que uma operação assíncrona possa demorar mais de ~500 ms:
- Enviar email
- Gerar ou abrir PDF
- Importar/exportar backup
- Carregar dados do servidor
- Qualquer fetch ou processamento pesado

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
    hideGlobalLoading()
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

## 3. Resumo — Checklist para novas funcionalidades

Ao implementar uma nova operação assíncrona:

1. [ ] Usar `showGlobalLoading()` no início
2. [ ] Usar `hideGlobalLoading()` no `finally`
3. [ ] Usar `showToast()` para sucesso/erro (nunca `alert()`)
4. [ ] Toast com tipo `success` ou `error` para operações importantes (4 s)
5. [ ] Manter validações de formulário inline (próximo do campo)

---

## 4. Referências

| Componente | Ficheiro |
|------------|----------|
| Toast | `src/components/Toast.jsx`, `Toast.css` |
| GlobalLoading | `src/context/GlobalLoadingContext.jsx` |
| Assets (logos, ícones) | `src/constants/assets.js` |
| Imagens e ícones | `docs/IMAGENS-E-ICONES.md` |
| Regras de desenvolvimento | `.cursor/rules/at-manut-workflow.mdc` |
