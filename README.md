# AT_Manut — Navel Manutenções Preventivas e Reparações

Aplicação web PWA para gestão de manutenções preventivas e reparações de equipamentos comercializados pela **Navel-Açores, Lda**.

**Versão actual:** `v1.10.3` · **Repositório:** [github.com/pmacerqueira/AT_Manut](https://github.com/pmacerqueira/AT_Manut)

---

## Funcionalidades

| Módulo | Descrição | Estado |
|--------|-----------|--------|
| **Login** | Autenticação JWT com dois perfis (Admin / ATecnica) | ✅ |
| **Dashboard** | KPIs, "O meu dia", alertas proactivos de conformidade, card Reparações | ✅ |
| **Clientes** | CRUD com validação de email obrigatório e badge "Sem email" | ✅ |
| **Equipamentos** | Gestão hierárquica (Categoria → Subcategoria → Máquina), QR Code | ✅ |
| **Manutenções** | Planeamento, execução com checklist+assinatura, reagendamento automático | ✅ |
| **Reparações** | Registo, execução multi-dia, fotos, assinatura, relatórios, mensal ISTOBAL | ✅ |
| **Agendamento** | Formulário de nova manutenção com validação de data (feriados Açores) | ✅ |
| **Calendário** | Visualização mensal de manutenções | ✅ |
| **Relatórios** | PDF individual + histórico completo por máquina em PDF | ✅ |
| **Email** | Envio automático de relatório + lembretes de conformidade | ✅ |
| **Alertas automáticos** | Cron job diário no cPanel — envia lembretes X dias antes do vencimento | ✅ |
| **Pesquisa global** | `Ctrl+K` — pesquisa instantânea em clientes, máquinas e manutenções | ✅ |
| **Leitor QR** | Câmara abre ficha da máquina directamente ao ler o QR Code | ✅ |
| **Métricas / KPIs** | Taxa de cumprimento, gráficos mensais, top clientes em atraso (Admin) | ✅ |
| **Importação Kaeser** | Leitura de PDF de relatórios Kaeser (compressores) e importação de dados | ✅ |
| **Modo campo** | Alto contraste para uso exterior, persistido nas Definições | ✅ |
| **Definições** | Backup/restauro, config alertas, modo campo, indicador de armazenamento | ✅ |
| **Logs** | Registo de sistema (acções, erros, eventos de autenticação) | ✅ |
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
| Testes | Playwright E2E — 441 testes (17 specs) |
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

```powershell
# 1. Build e zip (executar no terminal Windows — evita crash do Cursor)
cd c:\AT_Manut
npm run build:zip

# Ou comandos separados:
# npm run build
# npm run zip

# 2. Push para GitHub
git add -A
git commit -m "v{versão} - resumo"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}

# 3. Upload manual dist_upload.zip para cPanel → public_html/manut/
# 4. Upload servidor-cpanel/send-email.php para cPanel → public_html/api/
```

Ver [`docs/BUILD-E-ZIP.md`](./docs/BUILD-E-ZIP.md) para instruções detalhadas de build e zip.  
Ver [`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md) para lista completa de verificação.

---

## Documentação

### Fonte canónica (ordem de prioridade)
1. `DOCUMENTACAO.md`
2. `DESENVOLVIMENTO.md`
3. `CHANGELOG.md`
4. `docs/MANUT-APP-INSIGHTS.md`

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
> Nota: `docs/ROADMAP-EVOLUCAO-2026.md` e `docs/SESSAO-FILOSOFT-2026-02-22.md` são registos históricos (não canónicos para estado atual).
