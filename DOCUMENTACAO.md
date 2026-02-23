# AT_Manut — Documentação Técnica

**Versão:** 1.6.2 · **Última actualização:** 2026-02-23

---

## 1. Visão Geral

Aplicação web PWA para gestão de manutenções preventivas de equipamentos Navel (elevadores, compressores, geradores, equipamentos de trabalho em altura). Dois perfis de utilizador com permissões bem separadas.

### Dois fluxos de negócio

| Tipo | `tipo` | Descrição | Consequência |
|------|--------|-----------|--------------|
| **Montagem** | `montagem` | Instalação de equipamento nas instalações do cliente | Cria as primeiras manutenções periódicas para os próximos 2 anos |
| **Manutenção periódica** | `periodica` | Manutenção de conformidade às periodicidades legais | Recalcula as manutenções futuras a partir da data de conclusão |

---

## 2. Stack tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + React Router DOM (basename `/manut`) |
| Ícones | Lucide React |
| Datas | date-fns (`pt` locale) + `datasAzores.js` (feriados Açores) |
| QR Code | `qrcode` (geração) |
| PDF | jsPDF + html2canvas |
| Sanitização HTML | DOMPurify |
| Email / PDF (servidor) | PHP no cPanel — `servidor-cpanel/send-email.php` |
| Testes | Playwright E2E — 88 testes (specs 10–11) + 137 testes base (specs 01–09) |
| Imagens | sharp (`scripts/optimize-images.js`, executado em `prebuild`) |

---

## 3. Estrutura do projecto

```
c:\AT_Manut\
├── src/
│   ├── main.jsx                        # Ponto de entrada
│   ├── App.jsx                         # Rotas + Layout
│   │
│   ├── config/
│   │   ├── users.js                    # Utilizadores e roles (verificados no servidor)
│   │   ├── version.js                  # APP_VERSION, APP_FOOTER_TEXT
│   │   ├── alertasConfig.js            # getDiasAviso(), getManutencoesPendentesAlertas()
│   │   └── emailConfig.js              # configuração de email
│   │
│   ├── context/
│   │   ├── AuthContext.jsx             # Login/logout, JWT, user, isAdmin
│   │   ├── DataContext.jsx             # Estado global: CRUD de todas as entidades
│   │   └── GlobalLoadingContext.jsx    # Overlay de carregamento
│   │
│   ├── hooks/
│   │   ├── usePermissions.js           # canDelete, canEditManutencao, isAdmin
│   │   ├── useMediaQuery.js            # Detecção mobile
│   │   └── useDebounce.js             # Debounce para pesquisa
│   │
│   ├── components/
│   │   ├── Layout.jsx / .css           # Sidebar, menu, logout
│   │   ├── ProtectedRoute.jsx          # Redirect se não autenticado
│   │   ├── Toast.jsx / .css            # Notificações (useToast, showToast)
│   │   ├── Breadcrumbs.jsx / .css      # Navegação contextual
│   │   ├── OfflineBanner.jsx / .css    # Indicador de conectividade
│   │   ├── InstallPrompt.jsx / .css    # Prompt PWA
│   │   ├── SignaturePad.jsx / .css     # Canvas de assinatura
│   │   ├── RelatorioView.jsx / .css    # Visualização de relatório
│   │   ├── ExecutarManutencaoModal.jsx # Modal de execução (checklist+assinatura+email)
│   │   ├── MaquinaFormModal.jsx        # Formulário de máquina
│   │   ├── DocumentacaoModal.jsx       # Documentação de equipamento
│   │   ├── EnviarEmailModal.jsx        # Envio de email
│   │   ├── EnviarDocumentoModal.jsx    # Envio de documento PDF
│   │   ├── QrEtiquetaModal.jsx / .css  # QR Code + etiqueta 90×50mm
│   │   └── AlertaProactivoModal.jsx / .css  # Modal proactivo de alertas (Admin)
│   │
│   ├── pages/
│   │   ├── Login.jsx / .css
│   │   ├── Dashboard.jsx / .css        # KPIs, "O meu dia", alertas, calendar
│   │   ├── Clientes.jsx / .css         # CRUD + badge "Sem email"
│   │   ├── Equipamentos.jsx / .css     # Hierarquia Cat→Sub→Máq, QR, Histórico PDF
│   │   ├── Manutencoes.jsx / .css      # Lista, filtros, execução
│   │   ├── Agendamento.jsx / .css      # Nova manutenção
│   │   ├── Calendario.jsx / .css       # Vista mensal
│   │   ├── Categorias.jsx / .css       # CRUD categorias/subcategorias/checklist
│   │   ├── Definicoes.jsx / .css       # Backup, restauro, config alertas
│   │   └── Logs.jsx / .css             # Log de sistema
│   │
│   ├── services/
│   │   ├── apiService.js               # Chamadas ao backend PHP/MySQL
│   │   ├── emailService.js             # enviarRelatorio, enviarLembreteEmail
│   │   ├── localCache.js               # Cache de dados do servidor (TTL 30 dias)
│   │   └── syncQueue.js                # Fila de operações offline → sync
│   │
│   ├── utils/
│   │   ├── relatorioHtml.js            # HTML do relatório individual
│   │   ├── gerarPdfRelatorio.js        # PDF individual (jsPDF)
│   │   ├── gerarHtmlHistoricoMaquina.js # HTML do histórico completo por máquina
│   │   ├── datasAzores.js              # Feriados dos Açores, dias úteis
│   │   ├── diasUteis.js               # Cálculo de dias úteis
│   │   ├── logger.js                   # logEntry, logger.action/error/fatal
│   │   └── sanitize.js                 # DOMPurify wrapper
│   │
│   └── constants/
│       ├── assets.js                   # ASSETS.LOGO, ASSETS.LOGO_ICON
│       └── relatorio.js                # Constantes de relatório
│
├── servidor-cpanel/
│   ├── send-email.php                  # Backend: envio de email + PDF
│   ├── INSTRUCOES_CPANEL.md
│   └── MIGRACAO_MYSQL.md
│
├── tests/e2e/
│   ├── helpers.js                      # Utilitários partilhados + dados mock (MC)
│   ├── 01-auth.spec.js … 09-edge-cases.spec.js   # Suite base (137 testes)
│   ├── 10-etapas-evolucao.spec.js      # Vista meu dia, alertas, QR, PDF (48 testes)
│   └── 11-blocos-abc.spec.js           # Email, config, reagendamento, modal (40 testes)
│
├── scripts/
│   └── optimize-images.js              # Optimização automática de imagens (prebuild)
│
├── docs/                               # Documentação técnica
├── public/                             # Assets públicos (logo, favicon, manifest)
└── dist/                               # Build de produção (gerado por npm run build)
```

---

## 4. Autenticação e permissões

### Fluxo de autenticação
1. Utilizador não autenticado → redirecionado para `/manut/login`
2. Login com username + password → POST para `api/data.php` → JWT
3. JWT guardado em `sessionStorage` (chave: `atm_api_token`)
4. `ProtectedRoute.jsx` verifica token em cada rota protegida
5. Sessão termina ao fechar a janela do browser

### Roles

| Role | Credenciais (produção) | Capacidades |
|------|------------------------|-------------|
| `admin` | `Admin` / `admin123%` | Tudo — CRUD completo, Definições, Logs, config alertas |
| `tecnico` | `ATecnica` / `tecnica123%` | Ver e executar manutenções, ver relatórios, calendário |

### Permissões detalhadas

| Acção | Admin | ATecnica |
|-------|-------|----------|
| Criar/editar clientes | ✅ | ❌ |
| Criar/editar equipamentos | ✅ | ❌ |
| Criar/editar categorias | ✅ | ❌ |
| Agendar manutenções | ✅ | ❌ |
| Executar manutenções | ✅ | ✅ |
| Ver relatórios | ✅ | ✅ |
| Eliminar registos | ✅ | ❌ |
| Editar manutenção assinada | ✅ | ❌ |
| Aceder a Definições | ✅ | ❌ |
| Aceder a Logs | ✅ | ❌ |
| Ver modal de alertas proactivos | ✅ | ❌ |
| Ver secção "Alertas de conformidade" nas Definições | ✅ | ❌ |

---

## 5. Modelo de dados

### Chaves localStorage

| Chave | Conteúdo |
|-------|----------|
| `atm_clientes` | Array de clientes |
| `atm_maquinas` | Array de máquinas |
| `atm_manutencoes` | Array de manutenções |
| `atm_relatorios` | Array de relatórios |
| `atm_categorias` | Array de categorias |
| `atm_subcategorias` | Array de subcategorias |
| `atm_checklist` | Array de itens de checklist |
| `atm_log` | Array de entradas de log |
| `atm_app_version` | Versão instalada (detecção de upgrade) |
| `atm_config_alertas` | `{ diasAviso: 7 }` — configuração de alertas |
| `atm_alertas_dismiss` | Data ISO do último dismiss do modal proactivo |
| `atm_cache_v1` | Cache de dados do servidor (TTL 30 dias) |
| `atm_sync_queue` | Fila de operações offline pendentes |

### Entidades principais

**Clientes:**
```json
{ "id": "c01", "nif": "501234567", "nome": "Empresa Lda", "morada": "...",
  "codigoPostal": "...", "localidade": "...", "telefone": "...", "email": "..." }
```

**Máquinas:**
```json
{ "id": "m01", "clienteId": "c01", "subcategoriaId": "sc01",
  "marca": "Otis", "modelo": "GeN2", "numeroSerie": "SN001",
  "ano": "2020", "localizacao": "...", "periodicidadeManut": "anual" }
```

**Manutenções:**
```json
{ "id": "mt01", "maquinaId": "m01", "tipo": "periodica",
  "data": "2026-03-15", "hora": "09:00", "tecnico": "Admin",
  "status": "pendente", "observacoes": "" }
```

**Relatórios:**
```json
{ "id": "r01", "manutencaoId": "mt01", "dataCriacao": "2026-03-15T10:00:00Z",
  "nomeAssinante": "João Silva", "assinaturaDigital": "data:image/png;base64,...",
  "assinadoPeloCliente": true, "dataAssinatura": "2026-03-15T10:05:00Z",
  "checklistItems": [...], "fotos": [...], "horasServico": 2 }
```

---

## 6. Rotas

| Path (com basename /manut) | Página | Acesso |
|---------------------------|--------|--------|
| `/manut/login` | Login | Pública |
| `/manut/` | Dashboard | Todos |
| `/manut/clientes` | Clientes | Admin |
| `/manut/equipamentos` | Equipamentos | Todos |
| `/manut/manutencoes` | Manutenções | Todos |
| `/manut/agendamento` | Agendamento | Admin |
| `/manut/calendario` | Calendário | Todos |
| `/manut/categorias` | Categorias | Admin |
| `/manut/definicoes` | Definições | Admin |
| `/manut/logs` | Logs | Admin |

---

## 7. Fluxos de negócio

### Fluxo de execução de manutenção
1. Manutenção pendente → botão "Executar" (`.btn-executar-manut`)
2. `ExecutarManutencaoModal` abre com:
   - Checklist de conformidade (itens da subcategoria)
   - Campo técnico (select)
   - Nome do assinante
   - Canvas de assinatura digital
   - Campo de fotos (opcional)
   - Horas de serviço (opcional)
3. Submit → valida checklist + assinatura → guarda relatório + atualiza manutenção
4. **Se periódica:** `recalcularPeriodicasAposExecucao` recalcula próximas 2 anos
5. **Se email disponível:** envia relatório PDF por email automaticamente

### Reagendamento automático (Bloco B — v1.6.0)
Após execução de qualquer manutenção (montagem ou periódica):
1. Obtém a `periodicidadeManut` da máquina (anual, semestral, trimestral)
2. Remove todas as manutenções futuras pendentes da máquina
3. Recria manutenções para os próximos 2 anos, espaçadas pela periodicidade
4. Data base = data de conclusão do relatório recém-criado

### Modal de alertas proactivos (Bloco C — v1.6.0)
1. Dashboard monta → `useEffect` verifica:
   - É Admin?
   - `atm_alertas_dismiss` ≠ hoje?
   - `getManutencoesPendentesAlertas(manutencoes, maquinas, clientes, diasAviso)` retorna resultados?
2. Se sim → `AlertaProactivoModal` abre
3. Agrupa manutenções por cliente
4. "Dispensar hoje" → `localStorage.setItem('atm_alertas_dismiss', hoje)`
5. "Fechar" → fecha sem marcar → volta a aparecer na próxima visita ao Dashboard

---

## 8. Backend PHP (cPanel)

**Localização:** `public_html/api/send-email.php`

**Tipos de email suportados:**
- `relatorio` — envio do relatório PDF após execução
- `lembrete` — lembrete de conformidade X dias antes do vencimento

**Formato do pedido:**
```json
{
  "tipo": "lembrete",
  "destinatario": "cliente@email.pt",
  "nomeCliente": "Empresa Lda",
  "maquina": "Otis GeN2 (SN001)",
  "diasRestantes": 5,
  "dataVencimento": "2026-03-01"
}
```

---

## 9. Logger

```js
import { logger } from '../utils/logger'

// Acção concluída com sucesso
logger.action('Componente', 'nomeOperacao', 'Descrição', { dados: 'opcionais' })

// Erro recuperável
logger.error('Componente', 'nomeOperacao', 'Mensagem', { stack: err.stack?.slice(0,400) })

// Erro irrecuperável (crash)
logger.fatal('Componente', 'crash', erro.message, { stack: erro.stack?.slice(0,600) })
```

**Nunca logar:** passwords, tokens JWT, dados pessoais completos, conteúdo de fotos (base64).

---

## 10. Versão e rodapé

```js
// src/config/version.js
export const APP_VERSION = '1.6.2'
export const APP_FOOTER_TEXT = `Navel-Açores, Lda — Todos os direitos reservados · v${APP_VERSION}`
```

**Regra:** Incrementar `APP_VERSION` em cada deployment. Usar `APP_FOOTER_TEXT` em todos os relatórios, PDF e emails.
