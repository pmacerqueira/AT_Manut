# AT_Manut — Navel Manutenções Preventivas e Reparações

Aplicação web PWA para gestão de manutenções preventivas e reparações de equipamentos comercializados pela **José Gonçalves Cerqueira (NAVEL-AÇORES), Lda.**

**Versão actual:** ver `src/config/version.js` (`APP_VERSION`) · **Repositório:** [github.com/pmacerqueira/AT_Manut](https://github.com/pmacerqueira/AT_Manut)

**Produção (www.navel.pt):** a PWA publica-se em `public_html/manut/`; a API PHP em `public_html/api/` — **mesma conta cPanel** que o site institucional (`navel-site`). Ver [`docs/DEPLOY_CHECKLIST.md`](docs/DEPLOY_CHECKLIST.md) § *Mesmo cPanel que o site institucional*.

---

## Funcionalidades

| Módulo | Descrição | Estado |
|--------|-----------|--------|
| **Login** | Autenticação JWT com dois perfis (Admin / ATecnica) | ✅ |
| **Dashboard** | KPIs, "O meu dia", alertas proactivos, card Próximas (6 meses), card Reparações | ✅ |
| **Clientes** | CRUD com validação de email obrigatório e badge "Sem email" | ✅ |
| **Equipamentos** | Gestão hierárquica (Categoria → Subcategoria → Máquina), QR Code | ✅ |
| **Manutenções** | Wizard fixo (7 passos), checklist, assinatura, reagendamento automático | ✅ |
| **Reparações** | Registo, execução multi-dia, fotos, assinatura, relatórios, mensal ISTOBAL | ✅ |
| **Agendamento** | Pipeline cascata (Cliente → Categoria → Equipamento → Data + Técnico) | ✅ |
| **Calendário** | Visualização mensal de manutenções | ✅ |
| **Relatório de frota** | HTML / PDF / email com filtro por período e painel de destinatários | ✅ |
| **Relatórios** | PDF individual por manutenção — download directo sem diálogo de impressão | ✅ |
| **Email** | Painel de destinatários (cliente / admin / outro) em todos os pontos de envio | ✅ |
| **Alertas automáticos** | Cron job diário no cPanel — envia lembretes X dias antes do vencimento | ✅ |
| **Pesquisa global** | `Ctrl+K` — pesquisa instantânea em clientes, máquinas e manutenções | ✅ |
| **Leitor QR** | Câmara abre ficha da máquina directamente ao ler o QR Code | ✅ |
| **Métricas / KPIs** | Taxa de cumprimento, gráficos mensais, top clientes em atraso (Admin) | ✅ |
| **Importação Kaeser** | Leitura de PDF de relatórios Kaeser (compressores) e importação de dados | ✅ |
| **Modo campo** | Alto contraste para uso exterior, persistido nas Definições | ✅ |
| **Manutenções históricas** | Inserção de registos passados, assinatura em 2 passos, badges | ✅ |
| **Agendamento recorrente** | Agendamento automático para 1–3 anos conforme periodicidade | ✅ |
| **Inserção em lote** | Criação de múltiplos registos históricos (equipamentos × datas) | ✅ |
| **Gestão de técnicos** | Ficha completa (nome, telefone, assinatura digital) na BD | ✅ |
| **Declaração de aceitação** | Texto dinâmico (montagem/manutenção/reparação) com legislação em vigor | ✅ |
| **CSS responsivo centralizado** | 15 variáveis de layout em :root — ajuste único para todos os ecrãs | ✅ |
| **Definições** | Backup/restauro, config alertas, modo campo, indicador de armazenamento | ✅ |
| **Logs** | Registo de sistema (acções, erros, eventos de autenticação) | ✅ |
| **Biblioteca NAVEL** | Documentos da área reservada (navel.pt) por equipamento; proxy `documentosBiblioteca` na API | ✅ |
| **PWA** | Instalável no ecrã inicial, offline-first com cache + sync queue | ✅ |

---

## Credenciais

| Utilizador | Password      | Role    |
|------------|---------------|---------|
| `Admin`    | `admin123%`   | Admin   |
| `ATecnica` | `tecnica123%` | Técnico |

> As credenciais são verificadas pelo backend PHP/MySQL no cPanel.
> A sessão usa JWT em `sessionStorage` — termina ao fechar o browser.

---

## Desenvolvimento local

```powershell
# Instalar dependências
npm install

# Servidor de desenvolvimento (http://localhost:5173)
npm run dev

# Build de produção (inclui optimize-images automaticamente)
npm run build

# Preview do build
npm run preview

# Correr testes E2E (requer npm run dev a correr)
npx playwright test tests/e2e/

# Specs do módulo Reparações
npx playwright test tests/e2e/16-reparacoes.spec.js tests/e2e/17-reparacoes-avancado.spec.js --reporter=list
```

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 19 + Vite + React Router (basename `/manut`) |
| Ícones | Lucide React |
| Datas | date-fns (localização `pt`) |
| QR Code | qrcode (geração) |
| PDF | jsPDF + html2canvas |
| Email/PDF servidor | PHP no cPanel (`servidor-cpanel/send-email.php`) |
| Leitor QR | @zxing/browser (câmara, `QrReaderModal.jsx`) |
| Gráficos KPIs | recharts (`Metricas.jsx`) |
| Testes | Playwright E2E — 442 testes (17 specs) |
| Imagens | sharp (optimize-images via script prebuild) |

---

## Arquitectura de dados

- **Fonte de verdade:** MySQL no cPanel via `api/data.php`
- **Cache offline:** `localStorage` (chaves `atm_*`) com TTL 30 dias
- **Autenticação:** JWT em `sessionStorage` (sessão expira ao fechar janela)
- **Fila de sync:** `atm_sync_queue` — operações offline enviadas ao reconectar
- **Configuração:** `atm_config_alertas` (dias de aviso), `atm_alertas_dismiss` (dispensar modal)

---

## Deployment

**Produção (www.navel.pt, mesmo cPanel que `navel-site`):** credenciais SFTP em `navel-site/.env.cpanel`.

```powershell
cd c:\Cursor_Projetos\NAVEL\AT_Manut
npm run build
cd ..\navel-site
npm run deploy:at-manut -- --yes
```

Ficheiros PHP da API: `navel-site` → `node scripts/cpanel-deploy.mjs --file="…/AT_Manut/servidor-cpanel/api/data.php" --remote="<CPANEL_REMOTE_ROOT>/api" --yes` — ver [`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md).

**Alternativa:** `npm run build:zip` e extrair `dist_upload.zip` no File Manager — [`docs/BUILD-E-ZIP.md`](./docs/BUILD-E-ZIP.md).

---

## Documentação

### Fonte canónica (ordem de prioridade)
1. [`docs/INDEX.md`](docs/INDEX.md) — índice de toda a documentação
2. `DOCUMENTACAO.md`
3. `DESENVOLVIMENTO.md`
4. `CHANGELOG.md`
5. `docs/MANUT-APP-INSIGHTS.md`

### Núcleo canónico
- [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) — arquitetura, modelo de dados e fluxos técnicos.
- [`DESENVOLVIMENTO.md`](./DESENVOLVIMENTO.md) — práticas de implementação e entrega.
- [`CHANGELOG.md`](./CHANGELOG.md) — histórico de versões.
- [`docs/MANUT-APP-INSIGHTS.md`](./docs/MANUT-APP-INSIGHTS.md) — continuidade entre agentes/modelos, decisões e handoff.

### Operação, qualidade e deploy
- [`docs/TESTES-E2E.md`](./docs/TESTES-E2E.md)
- [`docs/MANUAL-UX-UI.md`](./docs/MANUAL-UX-UI.md)
- [`docs/BUILD-E-ZIP.md`](./docs/BUILD-E-ZIP.md)
- [`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md)
- [`servidor-cpanel/INSTRUCOES_CPANEL.md`](./servidor-cpanel/INSTRUCOES_CPANEL.md)

> Regra de manutenção: evitar duplicar conteúdo em múltiplos ficheiros. Atualizar a fonte canónica e referenciar nos restantes documentos.
>
> Nota: `docs/ROADMAP-EVOLUCAO-2026.md` é um registo histórico de planeamento (não canónico para estado atual).
