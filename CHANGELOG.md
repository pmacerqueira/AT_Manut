# CHANGELOG — AT_Manut (Navel Manutenções)

Registo das alterações implementadas por sessão de desenvolvimento.

---

## [1.1.0] — 2026-02-22 — Documentação, Git e fluxo de deploy

### Documentação
- DOCUMENTACAO.md: versão 1.4, data 22/02/2026
- docs/GIT-SETUP.md: atualizado com repo GitHub (pmacerqueira/AT_Manut), fluxo de push após build
- docs/DEPLOY_CHECKLIST.md: instruções com dist_upload.zip e Compress-Archive

### Git e workflow
- .gitignore: dist_upload.zip, .env, Thumbs.db
- Boas práticas Git documentadas em at-manut-workflow.mdc
- README: secção Git/GitHub com link do repositório

---

## [1.0.0] — 2026-02-21 — Primeira versão estável

**Marco:** Primeira release considerada estável para produção.

### Incluído nesta versão
- Gestão de clientes, equipamentos, manutenções e relatórios
- Checklist de manutenção, assinatura digital, fotos
- Envio de relatórios por email (HTML e PDF)
- Agendamento e calendário de manutenções
- Backup/restauro de dados (Definicoes)
- Logs do sistema (local e servidor)
- Autenticação (Admin, ATecnica)
- PWA instalável (ícone "N", ecrã inicial)
- Logotipo Navel no login e sidebar
- Indicador de carregamento global (ícone N a rodar)
- Toast centrado, manual UX/UI documentado
- Fuso horário Atlantic/Azores
- Correções de segurança (CORS, sanitização, validações)

### Tag Git
```bash
git tag -a v1.0.0 -m "Primeira versão estável"
git push origin v1.0.0
```

---

## [2026-02-21 v7] — Sessão: Indicador de carregamento global e Toast centrado

### GlobalLoadingOverlay
- Novo contexto `GlobalLoadingContext` com overlay ao centro do ecrã
- Ícone "N" (logo.png) a rodar durante operações assíncronas
- Contador interno: múltiplas operações podem decorrer em paralelo; overlay só desaparece quando todas terminarem

### Operações com indicador de carregamento
- EnviarEmailModal, EnviarDocumentoModal — envio de email
- ExecutarManutencaoModal — envio de email após conclusão
- Manutencoes — envio de email (modal inline), abrir PDF
- Definicoes — importar/restaurar backup
- Logs — carregar logs do servidor

### Toast
- Posicionamento ao centro do ecrã (top: 50%, left: 50%) para máxima visibilidade
- Duração aumentada para success/error: 4 s (antes 2.5 s)

- APP_VERSION → 1.10.0 (posteriormente 1.0.0 para release estável)

---

## [2026-02-21 v6] — Sessão: Otimização de imagens e ícones

### Script `scripts/optimize-images.js`
- Otimiza **todas** as imagens em `public/` e `src/assets/` (incluindo subpastas)
- **PNG**: redimensiona (conforme config) e comprime nível 9
- **JPG/JPEG**: comprime com qualidade 85 (mozjpeg)
- **WebP**: comprime com qualidade 85
- **SVG**: minifica com SVGO (preset-default, multipass)
- Config `DIMENSIONS` para PNGs que precisam redimensionamento (icon-192, icon-512, logo, logo-navel)

### Integração no build
- `prebuild` executa `optimize-images` automaticamente antes de cada `npm run build`
- Comando manual: `npm run optimize-images`

### Documentação
- `docs/IMAGENS-E-ICONES.md` — regras, procedimentos, dimensões recomendadas
- Regra em `.cursor/rules/at-manut-workflow.mdc`: imagens devem ser otimizadas; ao adicionar novas, configurar DIMENSIONS

### Resultados
- icon-192.png, icon-512.png, logo.png: redimensionados de 2048×2048 para tamanhos corretos (~96% redução)
- SVG (vite.svg, react.svg): minificados com SVGO

---

## [2026-02-21 v5] — Sessão: Logotipo Navel no login e biblioteca de assets

### Login
- Substituído texto "NAVEL" pelo logotipo da empresa (`logo-navel.png`)
- Estilos `.login-logo` para exibição centralizada e responsiva

### Biblioteca de assets (`src/constants/assets.js`)
- `ASSETS.LOGO_NAVEL` — logotipo Navel (palavra completa)
- `ASSETS.LOGO_ICON` — ícone "N" azul (sidebar, PWA)
- `ASSETS.ICON_192`, `ASSETS.ICON_512` — ícones PWA

### Favicon
- index.html: favicon alterado de vite.svg para icon-192.png

### Deploy cPanel
- Todos os assets em `public/` (logo-navel.png, logo.png, icon-192.png, icon-512.png) são copiados para `dist/` no build e incluídos no zip de upload

- APP_VERSION → 1.9.0

---

## [2026-02-21 v4] — Sessão: Correções de segurança (audit)

### send-report.php
- Autenticação obrigatória: `auth_token` no body (mesmo token de emailConfig.js)
- CORS restrito às origens permitidas (navel.pt, localhost)
- Sanitização de `assunto` (strip_tags, limite 200 chars)
- Sanitização de `corpoHtml` (strip_tags com tags seguras, remoção de javascript:, limite 500 KB)

### EnviarEmailModal e EnviarDocumentoModal
- Passam `auth_token` nas chamadas ao send-report.php

### URLs de documentos (XSS / open redirect)
- `safeHttpUrl()` em todos os `href` de documentos: Manutencoes, RelatorioView, ExecutarManutencaoModal, Clientes, DocumentacaoModal
- DocumentacaoModal: valida URL ao adicionar documento; apenas http/https aceites; Toast se inválida

### Imagens em relatório HTML
- `safeDataImageUrl()` em relatorioHtml.js para fotos e assinatura digital (apenas data:image/jpeg|png|gif|webp)

### Login
- Validação de `from` antes do redireccionamento pós-login (evita open redirect)

### Credenciais
- config.php, send-email.php, log-receiver.php, send-report.php: suportam variáveis de ambiente (ATM_DB_*, ATM_JWT_SECRET, ATM_REPORT_AUTH_TOKEN)
- Ficheiro servidor-cpanel/env.example.txt com documentação

### Restauro de backup
- Validação de schema JSON (campo dados, arrays esperados)
- Limite de tamanho: 50 MB

### Parâmetros de filtro
- Manutencoes: whitelist de valores permitidos em `?filter=`

### Dependências
- npm audit fix (ajv, jspdf actualizados; restam 4 high em eslint/minimatch — devDependencies)

- APP_VERSION → 1.8.0

---

## [2026-02-21 v3] — Sessão: Fuso horário Atlantic/Azores (Ponta Delgada)

### Objetivo
Garantir que todas as datas e horas exibidas pela aplicação e todos os timestamps seguem o fuso horário de Ponta Delgada, Açores (`Atlantic/Azores`).

### Alterações

**Utilitário `src/utils/datasAzores.js`** (já existente, em uso):
- `getHojeAzores()`, `nowISO()`, `formatDataHoraAzores()`, `formatDataAzores()`, `formatDataHoraCurtaAzores()`, `formatISODateAzores()`

**Ficheiros actualizados nesta sessão**:
- **Logs.jsx** — `fmtTs`, `stats.oldest` e `s.first` com `timeZone: 'Atlantic/Azores'`; correcção de chaves duplicadas no objecto de formatação
- **logger.js** — `_today()` para nomes de ficheiros de log usa `timeZone: 'Atlantic/Azores'`
- **DataContext.jsx** — data do backup (`exportadoEm`) formatada com `timeZone: 'Atlantic/Azores'`
- **relatorioHtml.js** — removidos imports não usados de `date-fns` (já usava funções de `datasAzores.js`)

**Armazenamento**: timestamps continuam em ISO (UTC); exibição usa sempre o fuso Atlantic/Azores.

---

## [2026-02-21 v2] — Sessão: UX mobile, PDF, assinatura, sessão, fotos, limpeza

### Coluna Técnico e painel Manutenções
- Técnico vazio mostra "Não atribuído" em vez de "—"
- Concluídas: usa técnico do relatório quando manutenção.tecnico está vazio
- Formulário criar/editar: campo Técnico destacado com hint "(recomendado atribuir ao agendar)"
- Badge "Em atraso" corrigido (white-space: nowrap) — deixa de partir em duas linhas

### PDF em mobile
- Em dispositivos móveis: "Obter PDF" abre visualizador nativo (blob URL) em vez do diálogo de impressão
- Em desktop: mantém comportamento anterior (diálogo de impressão/guardar)

### Ver manutenção (antes "Ver relatório")
- Ícone renomeado para "Ver manutenção"
- Painel mostra assinatura digital em destaque no topo (imagem, nome, data e hora)

### Fotografias no modal de execução (mobile)
- Fotos da câmara deixam de desaparecer: cópia imediata para memória (ArrayBuffer → Blob) antes de comprimir
- Processamento sequencial reduz revogação de ficheiros temporários pelo SO
- Removido `capture="environment"` — abre seletor (câmara ou biblioteca) em vez de ir direto à câmara

### Autenticação — sessão termina ao fechar janela
- JWT em `sessionStorage` em vez de `localStorage`
- Ao fechar separador/janela, o utilizador tem de reintroduzir credenciais na próxima entrada

### Otimizações e limpeza
- Dependências não usadas removidas: `@emailjs/browser`, `bcryptjs`
- `console.error` em gerarPdfRelatorio substituído por `logger.error`
- Pastas obsoletas removidas: `deploy_upload/`, `dist_upload/`
- Ficheiros obsoletos removidos: `manut-build.zip`, `rav261_extract.txt`, `deploy-INSTRUCOES.txt`
- APP_VERSION → 1.6.0

---

## [2026-02-21] — Sessão: Responsividade e orientação em tablets

### Painéis e orientação do dispositivo

**Problema**: Em tablets, ao rodar o dispositivo entre vertical e horizontal, alguns painéis (especialmente os maiores) não se ajustavam bem ao tamanho e orientação do ecrã.

**Solução**: Melhorias em overlays, modais e painéis para adaptarem corretamente à rotação.

- **Viewport dinâmica (dvh)**: Uso de `100dvh` (com fallback `100vh`) em layout, sidebar, overlays de modais e painéis — reage à mudança de orientação e à barra de endereço do browser mobile
- **Modais e painéis**: `flex: 1` + `min-height: 0` em vez de alturas fixas, permitindo reflow correcto do flexbox
- **Alturas flexíveis**: `max-height: min(280px, 35dvh)` em listas (doc-lista, maquinas-lista, checklist-respostas) e calendário — adaptam à altura disponível em portrait/landscape
- **Media queries de orientação**: `@media (max-width: 1024px) and (orientation: landscape)` para ajustes específicos em landscape (painéis mais compactos, calendário, grelha de fotos)
- **Ficheiros alterados**: `index.css`, `Layout.css`, `Dashboard.css`, `Calendario.css`, `Manutencoes.css`

---

## [2026-02-20] — Sessão: Persistência localStorage, fix 404 SPA, sistema de Toast global

### Persistência de dados (DataContext.jsx)

**Problema**: Todos os dados viviam apenas em memória React. Qualquer refresh, pull-to-refresh mobile ou navegação directa apagava todos os registos criados pelo utilizador.

**Solução**: Adicionada persistência completa em `localStorage` com lazy initialization e sincronização automática.

```javascript
// Padrão implementado para cada slice de dados:
function fromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw !== null) return JSON.parse(raw)
  } catch {}
  return fallback
}

// Inicialização lazy (lê localStorage apenas 1 vez, no mount):
const [clientes, setClientes] = useState(() => fromStorage('atm_clientes', initialClientes))

// Sincronização automática a cada alteração:
useEffect(() => { localStorage.setItem('atm_clientes', JSON.stringify(clientes)) }, [clientes])
```

**Chaves localStorage utilizadas** (prefixo `atm_`):
| Chave | Conteúdo |
|---|---|
| `atm_clientes` | Array de clientes |
| `atm_categorias` | Categorias de equipamento |
| `atm_subcategorias` | Subcategorias |
| `atm_checklist` | Itens de checklist |
| `atm_maquinas` | Máquinas/equipamentos |
| `atm_manutencoes` | Registos de manutenção |
| `atm_relatorios` | Relatórios completos |
| `atm_app_version` | Versão da app (para cache busting) |
| `atm_api_token` | JWT em sessionStorage (sessão termina ao fechar janela) |

**Comportamento**:
- Primeira abertura da app (localStorage vazio) → carrega dados iniciais (seed/mock)
- Sessões seguintes → lê sempre do localStorage
- Dados do utilizador **nunca são apagados** por refresh/pull-to-refresh
- Para repor dados iniciais: limpar `localStorage` via Definições do browser para o domínio

---

### Fix 404 no refresh / pull-to-refresh (public/.htaccess)

**Problema**: `BrowserRouter` com `basename="/manut"` — ao fazer refresh numa rota como `/manut/clientes`, o servidor Apache tentava servir um ficheiro que não existia → 404.

**Solução**: Ficheiro `.htaccess` em `public/` (copiado para `dist/` pelo Vite):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /manut/
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule ^ index.html [L]
</IfModule>
```

**Cache-Control** (também em `.htaccess`):
- `index.html`: `no-cache, no-store` — sempre busca versão nova após deployment
- `assets/*.js` / `*.css`: `max-age=31536000, immutable` — cache 1 ano (ficheiros content-hashed)

---

### Pull-to-refresh desactivado (index.css)

```css
body {
  overscroll-behavior-y: none; /* desactiva gesto pull-to-refresh nos browsers mobile */
}
```

---

### Limpeza automática de cache no arranque (main.jsx)

```javascript
const APP_VERSION = '1.6.0' // incrementar em cada deployment

;(async () => {
  const storedVersion = localStorage.getItem('atm_app_version')
  if (storedVersion !== APP_VERSION) {
    if ('caches' in window) {
      const names = await caches.keys()
      await Promise.all(names.map(n => caches.delete(n)))
    }
    sessionStorage.clear()
    localStorage.setItem('atm_app_version', APP_VERSION)
  }
})()
```

**Como usar em deployments futuros**: incrementar `APP_VERSION` em `src/main.jsx` antes de cada build. Na próxima abertura da app por qualquer utilizador, os caches obsoletos são limpos automaticamente.

---

### Sistema global de Toast (src/components/Toast.jsx + Toast.css)

**Objectivo**: substituir mensagens de feedback dispersas (inline no fundo de formulários, invisíveis em mobile) por notificações centralizadas, visíveis imediatamente no centro-topo do ecrã em todos os dispositivos.

#### Arquitectura

```
src/components/Toast.jsx    — ToastProvider (context) + useToast (hook) + render
src/components/Toast.css    — Estilos: pílula colorida, animação, responsivo
src/main.jsx                — <ToastProvider> envolve toda a app
```

#### API de uso

```javascript
// 1. Importar o hook em qualquer componente dentro da app:
import { useToast } from '../components/Toast'

// 2. Obter a função showToast:
const { showToast } = useToast()

// 3. Mostrar notificações:
showToast('Guardado com sucesso!', 'success')           // verde,  2.5s
showToast('Erro ao enviar email.', 'error', 4000)       // vermelho, 4s
showToast('Elimine as subcategorias primeiro.', 'warning', 4000)  // âmbar
showToast('Operação concluída.', 'info')                // azul, 2.5s

// Parâmetros: showToast(mensagem, tipo, duração_ms)
// tipo: 'success' | 'error' | 'warning' | 'info'
// duração: opcional, padrão 2500ms
```

#### Comportamento
- Aparece centrado no topo do viewport (`position: fixed`, `z-index: 99999`)
- Suporta múltiplos toasts em simultâneo (stack vertical)
- Clique no toast para dispensar antecipadamente
- Animação de entrada: desliza de cima com efeito elástico
- Funciona em desktop e mobile sem diferenças
- `aria-live="polite"` para acessibilidade (leitores de ecrã anunciam a mensagem)

#### Regra de utilização (quando Toast vs inline)

| Situação | Toast | Inline |
|---|---|---|
| Operação concluída (gravar, enviar, eliminar) | ✅ Toast | ❌ |
| Erro de rede / servidor | ✅ Toast | ❌ |
| Aviso de regra de negócio (ex: "NIF duplicado") | ✅ Toast | ❌ |
| Validação de campo obrigatório num formulário | ❌ | ✅ Inline (próximo do campo) |
| Erro de autenticação (login) | ❌ | ✅ Inline (standard UX) |
| Validação de checklist / assinatura no modal de execução | ❌ | ✅ Inline (visível no passo relevante) |

#### Ficheiros migrados para Toast

| Ficheiro | Operações com Toast |
|---|---|
| `Manutencoes.jsx` | Envio de email (sucesso/erro) |
| `ExecutarManutencaoModal.jsx` | Envio de email interno (sucesso/erro) |
| `EnviarEmailModal.jsx` | Envio de email (sucesso) |
| `EnviarDocumentoModal.jsx` | Envio de email (sucesso) |
| `Agendamento.jsx` | Agendamento registado (sucesso) |
| `Clientes.jsx` | Add/edit/delete cliente |
| `Categorias.jsx` | Add/edit/delete categorias e subcategorias; alertas de bloqueio |
| `MaquinaFormModal.jsx` | Add/edit equipamento |
| `Equipamentos.jsx` | Delete equipamento |

---

### Ficheiros alterados nesta sessão

| Ficheiro | Tipo | Descrição |
|---|---|---|
| `src/context/DataContext.jsx` | JSX | localStorage persistence para todos os dados |
| `src/main.jsx` | JSX | ToastProvider, version check, cache cleanup |
| `src/context/AuthContext.jsx` | JSX | logout limpa sessionStorage + SW caches |
| `public/.htaccess` | Apache | SPA routing + cache headers |
| `src/index.css` | CSS | overscroll-behavior-y: none |
| `src/components/Toast.jsx` | JSX | Novo componente — sistema global de notificações |
| `src/components/Toast.css` | CSS | Estilos Toast (pílula, cores, animação, responsivo) |
| `src/pages/Clientes.jsx` | JSX | Migração para Toast |
| `src/pages/Categorias.jsx` | JSX | Migração para Toast + alertas sem window.alert |
| `src/pages/Equipamentos.jsx` | JSX | Migração para Toast |
| `src/components/MaquinaFormModal.jsx` | JSX | Migração para Toast |
| `src/components/ExecutarManutencaoModal.jsx` | JSX | Migração para Toast |
| `src/pages/Agendamento.jsx` | JSX | Migração para Toast |
| `src/components/EnviarEmailModal.jsx` | JSX | Migração para Toast |
| `src/components/EnviarDocumentoModal.jsx` | JSX | Migração para Toast |

---

## [2026-02-19 v2] — Sessão: Layout mobile cards, auditoria CSS responsiva completa

### Frontend — Manutencoes.jsx / Manutencoes.css

#### Layout mobile em cards (novo)
- Em dispositivos móveis (≤768px), a lista de manutenções substitui a tabela por **cards compactos** baseados em flexbox.
- Cada card contém: barra de status lateral colorida, tipo de intervenção, número de relatório, categoria e nome do equipamento, nº de série, cliente, data de execução, técnico, e botões de acção no rodapé do card.
- Cards ordenados por data de execução descendente (mais recente primeiro).
- Tabela original permanece em desktop — sem alterações.
- A `div.manutencoes-cards` é `display: none` em desktop e `display: flex; flex-direction: column` em mobile.

#### Alinhamento ícones acção (fix adicional)
- Forçado `display: table-cell !important` em `td.actions` para evitar conflito com regras globais `display: flex` do `index.css` em mobile.
- Adicionado `vertical-align: middle !important` em todos os breakpoints.
- O wrapper `div.actions-inner` mantém o flex apenas para os botões internos.

### Auditoria CSS responsiva — todos os ficheiros (67 pontos auditados)

#### Dashboard.css
- `.dashboard-grid`: passa de `repeat(auto-fit, minmax(320px, 1fr))` para `1fr` em mobile — evita cards truncados.
- `.day-panel` e `.action-sheet`: `max-width: 100%` em mobile para ocupar a largura total do ecrã.
- `.dashboard-grid .card .list`: `max-height: 40vh` em mobile — listas internas com scroll limitado.

#### Clientes.css
- Tabela com `font-size: 0.88em` e `th font-size: 0.78em` em mobile.
- Colunas de ID e telefone com `min-width` reduzido em mobile.

#### Categorias.css
- `expand-btn`: padding aumentado de `0.15rem` para `0.4rem`, com `min-width/height: 2rem` — área de toque mínima 44px equivalente.
- `.checklist-header button.small`: `min-height: 2.5rem` em mobile.
- `.btn-add-sub`: `font-size: 0.9em; min-height: 2.5rem` em mobile.

#### Agendamento.css
- `.agendamento-page`: `max-width: 100%` em mobile.
- `.form-row`: passa de 2 colunas para 1 coluna em mobile.
- `.agendamento-hint`: `font-size: 0.88em` em mobile.

#### RelatorioView.css
- `.relatorio-view`: `max-width: 100%` em mobile (era `700px` fixo).
- `.assinatura-placeholder`: `font-size: 0.9em` em mobile.

#### index.css (fixes adicionais)
- `.foto-remover`: tamanho 24px, `min-width/height: 24px`, tap highlight transparente.
- Modais `.modal-documentacao`, `.modal-conflitos`, `.modal-ficha-overlay .modal`: `max-width: calc(100vw - 1.5rem)`.
- `.assinatura-canvas`: `max-width: 100%`.
- `.doc-lista`: `max-height: 30vh`.
- `.form-add-doc .form-row`: `flex-direction: column`.
- `.btn-foto`, `.assinatura-limpar`, `.assinatura-ok`: `font-size: 0.9rem` em mobile.

### Ficheiros alterados nesta sessão (v2)

| Ficheiro | Tipo | Descrição |
|---|---|---|
| `src/pages/Manutencoes.jsx` | JSX | Layout mobile em cards compactos |
| `src/pages/Manutencoes.css` | CSS | Cards mobile, fix td.actions !important |
| `src/pages/Dashboard.css` | CSS | Grid 1 coluna + day-panel/action-sheet full width mobile |
| `src/pages/Clientes.css` | CSS | Font-size e min-width mobile |
| `src/pages/Categorias.css` | CSS | expand-btn touch target + form mobile |
| `src/pages/Agendamento.css` | CSS | max-width + form-row stack mobile |
| `src/components/RelatorioView.css` | CSS | max-width 100% mobile |
| `src/index.css` | CSS | Touch targets, modais, canvas, listas mobile |

---

## [2026-02-19] — Sessão: Email, PDF multi-página, UI responsiva

### PDF (send-email.php — servidor cPanel)

#### Cabeçalho e rodapé automáticos em todas as páginas
- Substituído o gerador `FPDF` simples pela subclasse `NavelPDF` que sobrescreve os métodos nativos `Header()` e `Footer()`.
- **Cabeçalho** (todas as páginas): fundo azul escuro (#1e3a5f), nome "NAVEL-ACORES" em destaque, contactos à direita, referência do relatório.
- **Rodapé** (todas as páginas): fundo azul escuro, dados empresa à esquerda, **"Pagina X de Y"** à direita usando `AliasNbPages('{nb}')`.
- PDF agora suporta múltiplas páginas para checklists longas — sem limite artificial.

#### Nota de fotografias no PDF
- Quando o relatório contém fotos, aparece uma caixa âmbar com:
  - "Fotografias adicionadas ao processo (N fotografia(s))"
  - "Consulte as fotografias a cores no email enviado para: [email]"

---

### Email HTML (send-email.php)

#### Bug corrigido: `< /span>` visível em clientes Outlook
- O Outlook exibia `< /span>` como texto simples quando `<span>` continha emojis Unicode altos (`&#128196;`).
- **Fix**: Substituída toda a estrutura `<span>` por `<div>` com texto direto sem emojis. Bloco "Relatório PDF em anexo" reescrito.

#### Assinatura com nome e data completa
- Bloco "Relatório assinado digitalmente" agora mostra:
  > *Assinado por **Nome do Cliente**, em 5 de fevereiro de 2026 às 12:30. Assinatura arquivada no sistema.*

#### Galeria de fotografias no email
- Fotos adicionadas como thumbnails a cores no body HTML (disposição em mosaico, 3 por linha).
- Máx. 5 fotos, até 160px de largura, 40% qualidade JPEG → ~3-4 KB cada (seguro para ModSecurity).

#### Próxima intervenção agendada (caixa amarela)
- Nova secção no email com a data da próxima manutenção agendada para o equipamento.
- Texto: *"A próxima intervenção encontra-se agendada para **[data]**. Caso pretenda agendar para nova data, contacte os nossos serviços."*
- Dados enviados do frontend via campo `proxima_manut` (formatado por `emailService.js`).

---

### Frontend — emailService.js

- **Removida função `gerarEmailHtml`** (~150 linhas de código morto): o HTML do email é agora gerado pelo PHP no servidor.
- **Extraída função `resizirParaThumb(dataUrl, maxW, qualidade)`**: lógica de redimensionamento de fotos para thumbnail reutilizável.
- **Novos campos enviados ao PHP**: `data_assinatura`, `proxima_manut` (data formatada em português da ficha da máquina).

---

### Frontend — UI/UX (Manutencoes.jsx / Manutencoes.css)

#### Alinhamento vertical dos ícones de acção
- **Problema**: `display: flex` aplicado directamente no `<td class="actions">` anulava o `vertical-align: middle` da tabela, deslocando os ícones para o topo em linhas com nome longo.
- **Fix**: Adicionado `<div class="actions-inner">` dentro do `<td>`. O flex é aplicado no div interno; o `<td>` mantém `vertical-align: middle` como célula de tabela normal.

---

### Responsivo / Mobile (auditoria e correcções)

#### Layout.css
- Corrigido breakpoint inconsistente: `769px` → `768px` (alinhado com os restantes breakpoints do projecto).

#### index.css
- `foto-remover`: tamanho aumentado de 20px para 24px para melhor área de toque em mobile. Adicionado `-webkit-tap-highlight-color: transparent`.
- `@media (max-width: 768px)`: modais agora com `max-width: calc(100vw - 1.5rem)` — evita overflow lateral em ecrãs estreitos.

#### Manutencoes.css
- `@media (max-width: 768px)`: font-size da tabela aumentado de 0.78em para 0.85em (mais legível em mobile); modais `.modal-assinatura`, `.modal-relatorio`, `.modal-email-envio` com `max-width` responsivo; botões SIM/NÃO com área de toque aumentada.
- `@media (max-width: 480px)`: coluna de acções com min-width reduzido; checklist items fazem wrap em ecrãs muito pequenos.

#### Agendamento.css
- `@media (max-width: 768px)`: formulário `.form-row` passa de 2 colunas para 1 coluna em mobile (campos de data e hora já não ficam espremidos).

---

### Ficheiros alterados nesta sessão

| Ficheiro | Tipo | Descrição |
|---|---|---|
| `servidor-cpanel/send-email.php` | PHP (servidor) | Subclasse NavelPDF, header/footer automático, email melhorado |
| `src/services/emailService.js` | JS (frontend) | Remoção código morto, extracção thumb, novos campos |
| `src/pages/Manutencoes.jsx` | JSX | div.actions-inner para alinhamento |
| `src/pages/Manutencoes.css` | CSS | Fix alinhamento + responsivo mobile |
| `src/components/Layout.css` | CSS | Fix breakpoint 769→768px |
| `src/index.css` | CSS | foto-remover touch target, modais mobile |
| `src/pages/Agendamento.css` | CSS | form-row stacking mobile |

---

## Arquitectura geral do projecto

```
C:\AT_Manut\
├── src/                        # Código React (Vite)
│   ├── components/             # Componentes reutilizáveis
│   │   ├── Layout.jsx/.css     # Sidebar + layout geral
│   │   ├── ExecutarManutencaoModal.jsx  # Modal de execução de manutenção
│   │   ├── RelatorioView.jsx   # Visualizador de relatório
│   │   ├── SignaturePad.jsx    # Assinatura digital (canvas)
│   │   └── ...
│   ├── pages/                  # Painéis principais
│   │   ├── Dashboard.jsx       # Visão geral / KPIs
│   │   ├── Manutencoes.jsx     # Lista de manutenções (principal)
│   │   ├── Clientes.jsx        # Gestão de clientes
│   │   ├── Equipamentos.jsx    # Gestão de equipamentos/máquinas
│   │   ├── Agendamento.jsx     # Agendar nova manutenção
│   │   ├── Calendario.jsx      # Calendário visual
│   │   └── Categorias.jsx      # Categorias e subcategorias
│   ├── context/
│   │   └── DataContext.jsx     # Estado global (React Context + localStorage)
│   ├── services/
│   │   └── emailService.js     # Envio de relatórios por email
│   ├── config/
│   │   └── emailConfig.js      # Token e URL do endpoint PHP
│   └── utils/
│       ├── relatorioHtml.js    # Gerador HTML do relatório (view local)
│       └── gerarPdfRelatorio.js # PDF client-side (jsPDF, para download)
├── servidor-cpanel/            # Ficheiros para upload no cPanel (navel.pt)
│   ├── send-email.php          # Endpoint de envio de email + geração PDF (FPDF)
│   └── fpdf184/                # Biblioteca FPDF v1.84
│       └── font/               # Fontes FPDF (necessário em public_html/api/font/)
├── dist/                       # Build de produção (gerado por `npm run build`)
├── dist_upload.zip             # Zip do dist para upload directo ao cPanel
└── CHANGELOG.md                # Este ficheiro
```

### Deployment

1. `npm run build` → gera `dist/`
2. `Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force` → cria zip
3. Upload `dist_upload.zip` → extrair em `public_html/manut/` no cPanel
4. Upload `servidor-cpanel/send-email.php` → `public_html/api/send-email.php`

### Configuração de email

- Ficheiro: `src/config/emailConfig.js`
- `ENDPOINT_URL`: `https://www.navel.pt/api/send-email.php`
- `AUTH_TOKEN`: token de segurança partilhado entre frontend e PHP
- Servidor de envio: `no-reply@navel.pt` via `mail()` do cPanel

### Dados e persistência

- Todos os dados são guardados em `localStorage` do browser via `DataContext`.
- Não há base de dados externa — adequado para uso local/intranet.
- Para migração futura para BD: toda a lógica de dados está centralizada em `DataContext.jsx`.

---

*Documento mantido por: Cursor AI Agent | Actualizado: 2026-02-19 (v2)*
