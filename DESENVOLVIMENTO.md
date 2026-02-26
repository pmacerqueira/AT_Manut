# Guia de Desenvolvimento — AT_Manut / Navel

Referência para desenvolvimento contínuo. Ver também [DOCUMENTACAO.md](./DOCUMENTACAO.md).

**Versão:** 1.9.3 · **Última actualização:** 2026-02-26
**Localização:** `c:\AT_Manut\`

---

## 1. Convenções de código

- **Componentes:** React function components com hooks (`useState`, `useEffect`, `useNavigate`, etc.)
- **Estilos:** CSS por página/componente (cada `.jsx` tem o seu `.css`); globais em `index.css`
- **Datas:** `date-fns` com `pt` locale; formato interno `yyyy-MM-dd`; apresentação `DD-MM-YYYY` em PT
- **Ícones:** `lucide-react` — sempre com texto associado (nunca ícone sozinho)
- **Routing:** React Router DOM v7; basename `/manut`
- **Validação de formulários:** Nunca usar `required` HTML em campos com validação JS customizada
- **Toast:** Sempre `showToast()` — nunca `alert()`
- **Loading:** `showGlobalLoading()` / `hideGlobalLoading()` para operações > 500ms
- **Logging:** `logger.action()` para acções, `logger.error()` para erros

---

## 2. Pontos de entrada críticos

| Ficheiro | Responsabilidade |
|----------|-----------------|
| `src/App.jsx` | Rotas, Layout, ProtectedRoute |
| `src/context/DataContext.jsx` | Estado global: todas as entidades; CRUD; `recalcularPeriodicasAposExecucao` |
| `src/context/AuthContext.jsx` | Login, sessão JWT, `user`, `isAdmin` |
| `src/hooks/usePermissions.js` | `canDelete`, `canEditManutencao`, `isAdmin` |
| `src/config/alertasConfig.js` | `getDiasAviso()`, `getManutencoesPendentesAlertas()` |
| `src/config/version.js` | `APP_VERSION`, `APP_FOOTER_TEXT` — incrementar em cada deployment |
| `src/utils/logger.js` | `logger.action/error/fatal` — log de sistema |

---

## 3. Ficheiros por funcionalidade

| Funcionalidade | Ficheiros a editar |
|----------------|-------------------|
| Novo cliente / validação email | `Clientes.jsx`, `Clientes.css` |
| Execução de manutenção | `ExecutarManutencaoModal.jsx` |
| Reagendamento automático | `DataContext.jsx` → `recalcularPeriodicasAposExecucao` |
| Modal de alertas proactivos | `AlertaProactivoModal.jsx`, `alertasConfig.js` |
| Config "dias de aviso" | `Definicoes.jsx`, `alertasConfig.js` |
| QR Code — geração / etiqueta | `QrEtiquetaModal.jsx`, `QrEtiquetaModal.css` |
| QR Code — leitura (câmara) | `QrReaderModal.jsx`, `QrReaderModal.css`, `Layout.jsx` |
| Pesquisa global (Ctrl+K) | `PesquisaGlobal.jsx`, `PesquisaGlobal.css`, `Layout.jsx` |
| Dashboard de métricas / KPIs | `Metricas.jsx`, `Metricas.css`, `kpis.js`, `App.jsx`, `Layout.jsx` |
| Modo campo | `Definicoes.jsx`, `index.css` (`.modo-campo`), `App.jsx`, `Layout.jsx` |
| Indicador de armazenamento | `Definicoes.jsx`, `Definicoes.css` |
| Histórico PDF máquina | `gerarHtmlHistoricoMaquina.js`, `Equipamentos.jsx` |
| Relatório individual PDF | `relatorioHtml.js`, `gerarPdfRelatorio.js` |
| Envio de email | `emailService.js`, `servidor-cpanel/send-email.php` |
| Alertas automáticos (cron) | `servidor-cpanel/cron-alertas.php`, `docs/CRON-ALERTAS.md` |
| Agendamento novo | `Agendamento.jsx` |
| Lista de manutenções | `Manutencoes.jsx` |
| Calendário | `Calendario.jsx` |
| Clientes / Equipamentos | `Clientes.jsx`, `Equipamentos.jsx` |
| Categorias (Admin) | `Categorias.jsx` |
| Definições / Backup | `Definicoes.jsx` |
| Permissões | `usePermissions.js`, `ProtectedRoute.jsx` |
| **Reparações — página principal** | `Reparacoes.jsx`, `Reparacoes.css` |
| **Reparações — execução** | `ExecutarReparacaoModal.jsx` (fotos, peças, assinatura, email) |
| **Reparações — API** | `DataContext.jsx` → `addReparacao`, `updateReparacao`, `removeReparacao` |
| **Reparações — relatório mensal ISTOBAL** | `Reparacoes.jsx` → `RelatorioMensalISTOBAL`, `RelatorioReparacaoView` |

---

## 4. Modelo de dados — campos relevantes

### Clientes
```js
{ id, nif, nome, morada, codigoPostal, localidade, telefone, email }
// email: obrigatório (validação JS no handleSubmit)
```

### Máquinas
```js
{ id, clienteId, subcategoriaId, marca, modelo, numeroSerie, ano,
  localizacao, periodicidadeManut }
// periodicidadeManut: 'anual' | 'semestral' | 'trimestral' | 'mensal'
```

### Manutenções
```js
{ id, maquinaId, tipo, data, hora, tecnico, status, observacoes }
// tipo: 'montagem' | 'periodica'
// status: 'pendente' | 'agendada' | 'concluida'
```

### Relatórios de manutenção
```js
{ id, manutencaoId, dataCriacao, nomeAssinante, assinaturaDigital,
  assinadoPeloCliente, dataAssinatura, checklistItems, fotos,
  horasServico, tecnicoNome }
```

### Reparações
```js
{ id, maquinaId, data, tecnico, status, numeroAviso, descricaoAvaria, origem }
// status: 'pendente' | 'em_progresso' | 'concluida'
// origem: 'manual' | 'istobal'
// numeroAviso: referência ISTOBAL, ex.: 'ES-20260226-001' (apenas reparações ISTOBAL)
```

### Relatórios de reparação
```js
{ id, reparacaoId, dataConclucao, tecnico, trabalhoRealizado, horasMaoObra,
  pecasUsadas, fotos, assinaturaDigital, nomeAssinante,
  checklistRespostas, numeroRelatorio }
// pecasUsadas: [{ referencia, descricao, quantidade }]
// fotos: máx. 8 (base64 JPEG/PNG)
// numeroRelatorio: formato 'AAAA.RP.NNNNN' (sequencial por ano)
```

---

## 5. Fluxo de build e deployment

```powershell
# 1. Verificar lints nos ficheiros editados (ReadLints)
# 2. Build (prebuild corre optimize-images automaticamente)
npm run build

# 3. Verificar warnings/erros no output

# 4. Incrementar versão em src/config/version.js
#    MAJOR.MINOR.PATCH → patches para correcções, minor para novas funcionalidades

# 5. Novo build limpo após correcções
npm run build

# 6. Gerar zip
Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force

# 7. Actualizar CHANGELOG.md

# 8. Commit + tag + push
git add -A
git commit -m "v{versão} - resumo"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}

# 9. Upload dist_upload.zip para cPanel → public_html/manut/
# 10. Upload servidor-cpanel/send-email.php para cPanel → public_html/api/
```

---

## 6. Adicionar uma nova funcionalidade — checklist

1. **Ler** o ficheiro existente antes de editar (sempre)
2. **Criar** o componente/página com o seu CSS próprio
3. **Adicionar** a rota em `App.jsx` com o `ProtectedRoute` adequado
4. **Ligar** ao menu em `Layout.jsx` se for uma nova página
5. **Persistir** novos campos no `DataContext.jsx`:
   - Novo estado: `useState([])`
   - CRUD via `addXxx`, `updateXxx`, `removeXxx` com `persist()` (optimistic + API)
   - API no `fetchTodosOsDados` em `apiService.js`
6. **Usar** `showGlobalLoading/hideGlobalLoading` para operações assíncronas
7. **Usar** `showToast` para feedback (nunca `alert()`)
8. **Usar** `logger.action/error` para registo de acções importantes
9. **Handler de Escape** em todos os novos modais
10. **Rodapé Navel** (`APP_FOOTER_TEXT`) em todos os novos relatórios/emails
11. **Incrementar** `APP_VERSION` e actualizar `CHANGELOG.md`
12. **Escrever** testes E2E no spec correspondente (ou novo spec numerado)

---

## 7. Persistência e CRUD no DataContext

O padrão actual usa **optimistic updates** + fire-and-forget para a API:

```js
// DataContext.jsx — padrão para CRUD
const addXxx = useCallback((data) => {
  const id = 'xxx' + Date.now()
  setXxx(prev => [...prev, { ...data, id }])  // optimistic update imediato
  logger.action('DataContext', 'addXxx', '...', { id })
  import('../services/apiService').then(({ apiXxx }) =>
    persist(() => apiXxx.create({ ...data, id }),
            { resource: 'xxx', action: 'create', data: { ...data, id } })
  )
  return id
}, [persist])

// persist() — trata offline automaticamente:
// - Se navigator.onLine === false → enfileira na syncQueue
// - Se API falha por rede → enfileira e marca isOnline=false
// - Sem toast de erro — o optimistic update continua visível
```

---

## 8. Permissões por role

| Role | Clientes | Categorias | Eliminar | Editar manut. assinada | Definições | Alertas proactivos | Reparações eliminar | Data histórica reparação |
|------|----------|------------|----------|------------------------|------------|--------------------|---------------------|--------------------------|
| `admin` | CRUD | CRUD | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tecnico` | Ver | Não acede | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 9. Variáveis CSS relevantes

```css
/* index.css */
--color-accent: #0d2340           /* azul Navel — acções principais */
--color-accent-hover: ...
--color-danger: #b90211           /* vermelho — eliminar, atraso crítico */
--color-warning: #f59e0b          /* laranja — aviso, sem email */
--color-success: #22c55e          /* verde — concluído */

.btn-executar-manut { color: #39ff14 }  /* verde fluorescente — botão Executar */
.badge-sem-email { ... }                /* badge laranja clientes sem email */
.stat-card-pulse { animation: pulse }  /* card pulsante no Dashboard */

/* Reparações */
.rep-origem-istobal { ... }       /* badge ISTOBAL nas linhas de reparação */
.rel-section-equipamento { ... }  /* secção máquina/cliente no relatório */
.rel-footer { ... }               /* rodapé Navel no relatório de reparação */
```

---

## 10. Comandos úteis

```powershell
# Desenvolvimento
npm run dev                 # http://localhost:5173

# Testes — suite completa
npx playwright test tests/e2e/

# Testes — specs específicos
npx playwright test tests/e2e/16-reparacoes.spec.js tests/e2e/17-reparacoes-avancado.spec.js --reporter=list
npx playwright test tests/e2e/14-kaeser-features.spec.js tests/e2e/15-kaeser-pdf-import.spec.js --reporter=list

# Testes — filtrar por grupo
npx playwright test --grep "RA-8|RA-9" --reporter=list

# Build
npm run build               # inclui optimize-images (prebuild)
npm run preview             # preview do build local

# Linting
npm run lint

# Git
git log --oneline -10       # últimos 10 commits
git tag -l                  # listar tags de versão
```
