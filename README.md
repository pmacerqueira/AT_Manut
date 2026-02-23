# AT_Manut — Navel Manutenções Preventivas

Aplicação web PWA para gestão de manutenções preventivas de equipamentos comercializados pela **Navel-Açores, Lda**.

**Versão actual:** `v1.7.0` · **Repositório:** [github.com/pmacerqueira/AT_Manut](https://github.com/pmacerqueira/AT_Manut)

---

## Funcionalidades

| Módulo | Descrição | Estado |
|--------|-----------|--------|
| **Login** | Autenticação JWT com dois perfis (Admin / ATecnica) | ✅ |
| **Dashboard** | KPIs, "O meu dia", alertas proactivos de conformidade | ✅ |
| **Clientes** | CRUD com validação de email obrigatório e badge "Sem email" | ✅ |
| **Equipamentos** | Gestão hierárquica (Categoria → Subcategoria → Máquina), QR Code | ✅ |
| **Manutenções** | Planeamento, execução com checklist+assinatura, reagendamento automático | ✅ |
| **Agendamento** | Formulário de nova manutenção com validação de data (feriados Açores) | ✅ |
| **Calendário** | Visualização mensal de manutenções | ✅ |
| **Relatórios** | PDF individual + histórico completo por máquina em PDF | ✅ |
| **Email** | Envio automático de relatório + lembretes de conformidade | ✅ |
| **Alertas automáticos** | Cron job diário no cPanel — envia lembretes X dias antes do vencimento | ✅ |
| **Pesquisa global** | `Ctrl+K` — pesquisa instantânea em clientes, máquinas e manutenções | ✅ |
| **Leitor QR** | Câmara abre ficha da máquina directamente ao ler o QR Code | ✅ |
| **Métricas / KPIs** | Taxa de cumprimento, gráficos mensais, top clientes em atraso (Admin) | ✅ |
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
| Testes | Playwright E2E — 88 testes automatizados |
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
# 1. Build
npm run build

# 2. Zip para upload cPanel (public_html/manut/)
Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force

# 3. Push para GitHub
git add -A
git commit -m "v{versão} - resumo"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}

# 4. Upload manual dist_upload.zip para cPanel → public_html/manut/
# 5. Upload servidor-cpanel/send-email.php para cPanel → public_html/api/
```

Ver `docs/DEPLOY_CHECKLIST.md` para lista completa de verificação.

---

## Documentação

| Documento | Conteúdo |
|-----------|----------|
| [`CHANGELOG.md`](./CHANGELOG.md) | Histórico de versões e alterações |
| [`DOCUMENTACAO.md`](./DOCUMENTACAO.md) | Modelo de dados, rotas, fluxos detalhados |
| [`DESENVOLVIMENTO.md`](./DESENVOLVIMENTO.md) | Guia para desenvolvimento futuro |
| [`docs/ROADMAP.md`](./docs/ROADMAP.md) | Estado actual e próximas funcionalidades |
| [`docs/TESTES-E2E.md`](./docs/TESTES-E2E.md) | Suite de testes Playwright (88 testes) |
| [`docs/MANUAL-UX-UI.md`](./docs/MANUAL-UX-UI.md) | Directrizes de UX/UI obrigatórias |
| [`docs/IMAGENS-E-ICONES.md`](./docs/IMAGENS-E-ICONES.md) | Gestão de imagens e ícones |
| [`docs/DEPLOY_CHECKLIST.md`](./docs/DEPLOY_CHECKLIST.md) | Checklist de deployment |
| [`docs/GIT-SETUP.md`](./docs/GIT-SETUP.md) | Configuração Git/GitHub |
| [`servidor-cpanel/INSTRUCOES_CPANEL.md`](./servidor-cpanel/INSTRUCOES_CPANEL.md) | Configuração do backend PHP |
