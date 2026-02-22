# Relatório de Auditoria — Navel Manutenções

**Data:** 2025  
**Âmbito:** Build de produção, segurança, compatibilidade browser/dispositivos

---

## 1. Build e testes

- **Build:** `npm run build` concluído com sucesso
- **Preview:** Serviço disponível em `npm run preview` para testes locais
- **Lint:** Regras ajustadas; restam warnings não críticos (set-state-in-effect, react-refresh)

---

## 2. Segurança — Correções aplicadas

### 2.1 HTML injection em emails

- **Ficheiro:** `src/utils/sanitize.js` (novo)
- **Funções:** `escapeHtml()`, `safeHttpUrl()`
- **Uso:** `relatorioParaHtml`, `EnviarDocumentoModal`
- Dados de utilizador (nome, notas, técnico, etc.) escapados antes de inclusão em HTML enviado por email
- URLs de documentos restritas a `http://` e `https://` para evitar links maliciosos (`javascript:` etc.)

### 2.2 PHP — Injeção em headers de email

- **Ficheiro:** `api/send-report.php`
- `assunto` sanitizado com `preg_replace('/[\r\n]+/', ' ', ...)` para evitar email header injection

### 2.3 CORS

- **PHP:** `Access-Control-Allow-Origin: *` — comentário adicionado para lembrar restrição em produção
- **Recomendação:** Em produção, definir `Access-Control-Allow-Origin: https://www.navel.pt` (ou domínio da app)

---

## 3. Pontos de atenção (não corrigidos)

### 3.1 Autenticação em memória

- Utilizadores e hashes bcrypt estão em `src/config/users.js` e fazem parte do bundle
- Em aplicação interna, pode ser aceitável
- **Recomendação para produção:** Backend com sessões, JWT ou autenticação externa

### 3.2 Armazenamento de sessão

- Sessão em `localStorage` (chave `navel_auth_session`)
- Em caso de XSS, um atacante poderia ler a sessão
- Não há uso de `dangerouslySetInnerHTML`, `eval`, `innerHTML` no código; risco reduzido
- **Recomendação:** Considerar cookies `HttpOnly` se houver backend

### 3.3 API de envio de email

- Endpoint sem autenticação — qualquer origem pode enviar pedidos
- **Risco:** Uso abusivo para envio de spam
- **Mitigações sugeridas:**
  - Rate limiting no servidor
  - Verificação de token/API key
  - Restringir CORS ao domínio da app

---

## 4. Compatibilidade browser e dispositivos

### 4.1 APIs utilizadas

| API | Suporte |
|-----|---------|
| `fetch` | Todos os browsers modernos; Vite não adiciona polyfill |
| `localStorage` | Universal |
| `queueMicrotask` | IE não; OK para alvos atuais |
| `Canvas API` (SignaturePad) | Universal |
| `touch-action: none` | Suportado em mobile |
| `env(safe-area-inset-*)` | iOS 11.2+ |
| `100dvh` | Chrome 108+, Safari 15.4+ |

### 4.2 Dispositivos móveis

- Layout responsivo com breakpoints 768px e 480px
- Sidebar colapsável em mobile
- Áreas de toque ≥ 44px
- `font-size: 16px` em inputs para evitar zoom automático no iOS
- `viewport-fit=cover` e `theme-color` no HTML

### 4.3 Casos extremos

- **Safari iOS:** Possível atraso em scroll com `-webkit-overflow-scrolling: touch`
- **Dispositivos antigos:** Sem polyfills; recomendado target ES2020+

---

## 5. Verificações manuais recomendadas

1. **Login:** Admin e técnico em vários browsers
2. **Fluxo Clientes → Ficha → Categorias → Máquina → Relatório**
3. **Assinatura digital** em touch (tablet/telemóvel)
4. **Envio de relatório por email** (requer API ativa)
5. **Envio de documento por email**
6. **Menu lateral** em mobile (abrir/fechar, navegação)

---

## 6. Resumo

| Categoria | Estado |
|-----------|--------|
| Build | OK |
| Lint | Avisos menores |
| XSS/HTML injection em emails | Mitigado |
| URL maliciosas em documentos | Mitigado |
| Header injection (PHP) | Mitigado |
| Auth/sessão | Risco aceitável em contexto interno |
| API sem autenticação | Recomenda-se rate limit e/ou token em produção |
| Responsividade | Implementada |
| Touch targets | Adequados |
