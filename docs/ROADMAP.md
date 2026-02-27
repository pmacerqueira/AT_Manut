# AT_Manut — Roadmap de Evolução

> Documento de planeamento estratégico e histórico de implementação.
> Última revisão: 2026-02-26 — v1.9.7

---

## Estado actual (v1.9.7) — O que está implementado

| Área | Detalhe | Versão |
|------|---------|--------|
| Gestão de clientes | CRUD completo + email obrigatório + badge "Sem email" | v1.6.0 |
| Gestão de equipamentos | Hierarquia Categoria→Subcategoria→Máquina | v1.0 |
| QR Code por máquina — geração | Etiqueta 90×50mm com logo Navel, impressão | v1.5.0 |
| QR Code por máquina — leitura | Modal com câmara (`@zxing/browser`), abre ficha directamente | v1.7.0 |
| Histórico PDF por máquina | Todos os relatórios da máquina num único PDF | v1.5.0 |
| Manutenções | Registo, execução com checklist+assinatura+fotos, filtros | v1.0 |
| Reagendamento automático | Após execução periódica, recalcula próximas manutenções (2 anos) | v1.6.0 |
| Alertas de conformidade — badge | Card pulsante "Em atraso" quando >7 dias de atraso | v1.5.0 |
| Alertas de conformidade — modal | Modal proactivo ao Admin com manutenções próximas, por cliente | v1.6.0 |
| Alertas automáticos — cron job | PHP/cron no cPanel envia lembretes diariamente às 08:00 | v1.6.2 |
| Dias de aviso configurável | Definições → "Alertas de conformidade" → dias antes do vencimento | v1.6.0 |
| Lembretes por email | Email ao cliente X dias antes + resumo diário ao Admin | v1.6.0 |
| Pesquisa global | Ctrl+K — pesquisa instantânea em clientes, equipamentos, manutenções | v1.7.0 |
| Dashboard de métricas (KPIs) | Taxa de cumprimento, gráficos semanais/mensais, top clientes atraso | v1.7.0 |
| Modo campo | Alto contraste para uso exterior, toggle em Definições | v1.7.0 |
| Backup/restauro de dados | Exportação JSON + importação com validação em Definições | v1.6.0 |
| Indicador de armazenamento | Barra de uso do localStorage com alerta em Definições | v1.7.0 |
| Relatórios PDF | Geração PDF individual + envio por email | v1.0 |
| Calendário | Visualização mensal com feriados dos Açores | v1.0 |
| Agendamento | Formulário com validação de data/hora e feriados | v1.0 |
| Vista "O meu dia" | Dashboard filtrado por técnico autenticado + data | v1.5.0 |
| Autenticação JWT | Admin / ATecnica, sessão por janela, roles separados | v1.0 |
| Offline-first | Cache localStorage, fila de sync, OfflineBanner | v1.3.0 |
| PWA instalável | Ícone no ecrã inicial, manifest, ícones optimizados | v1.4.1 |
| Log de sistema | Acções, erros, eventos de autenticação | v1.0 |
| Breadcrumbs | Navegação hierárquica contextual | v1.2.0 |
| Responsividade | Mobile/tablet/landscape optimizado | v1.2.0 |
| Importação Kaeser PDF | Leitura de relatórios de compressores Kaeser e importação de dados | v1.8.x |
| **Módulo Reparações** | Registo, execução multi-dia, fotos (máx. 8), assinatura digital | **v1.9.x** |
| **Reparações — peças usadas** | Registo de materiais e consumíveis por reparação (ref., descrição, qty.) | **v1.9.x** |
| **Reparações — fluxo ISTOBAL** | Avisos ES-, relatório individual + resumo mensal faturável | **v1.9.x** |
| **Reparações — relatório mensal** | Modal mensal ISTOBAL com horas M.O., materiais expansíveis, impressão | **v1.9.x** |
| **Reparações — permissões** | Admin/ATecnica: criar/executar/ver; só Admin elimina e define data histórica | **v1.9.x** |
| **Importação SAF-T clientes** | Modal Admin, preview, modos Ignorar/Actualizar, persistência API | **v1.9.7** |
| **Suite de testes E2E** | 447 testes Playwright (18 specs) — importação SAF-T incluída | **v1.9.7** |

---

## Histórico de versões principais

### v1.9.x — Módulo Reparações
**Implementado:** Fevereiro 2026

**Funcionalidades:**
- Página `Reparacoes.jsx` com lista, filtros (Todas/Pendentes/Em progresso/Concluídas), badges ISTOBAL
- Criação de reparação: máquina, data, técnico, aviso ES- (ISTOBAL), descrição da avaria
- Modal de execução `ExecutarReparacaoModal.jsx`: trabalho realizado, fotos (máx. 8), checklist corretivo, peças usadas, assinatura digital, data histórica (Admin)
- Fluxo multi-dia: "Guardar progresso" (sem assinatura, grava rascunho), "Concluir" (com assinatura, gera relatório definitivo)
- `RelatorioReparacaoView`: visualização do relatório concluído com dados da máquina/cliente, número sequencial `AAAA.RP.NNNNN`, assinante, materiais, rodapé Navel
- Email automático pós-conclusão: Admin sempre, ISTOBAL se aviso ES-, cliente se tem email na ficha
- **Relatório mensal ISTOBAL:** agrupa reparações concluídas do mês com aviso ES- → mostra horas M.O. e materiais → impressão com expansão automática
- `RelatorioReparacaoView` inclui secção de equipamento (marca, modelo, nº série, localização, cliente)

**Contexto de negócio ISTOBAL:**
- ISTOBAL Portugal é cliente de prestação de serviços (não a fábrica espanhola)
- Avisos chegam por email (`isat@istobal.com`) → Navel executa → relatório individual → resumo mensal faturado à ISTOBAL Portugal, Lda.
- Contacto de relatórios ISTOBAL: Sra. Luísa Monteiro (`lmonteiro.pt@istobal.com`)

**Testes E2E adicionados:**
- `16-reparacoes.spec.js` (42 testes): R1→R10 — listagem, filtros, dashboard, criação, fluxo multi-dia, retoma, conclusão, relatório, mensal ISTOBAL, eliminar, badges ISTOBAL
- `17-reparacoes-avancado.spec.js` (69 testes): RA-1→RA-15 — permissões, multi-dia, fotos, email, relatório, mobile, tablet, offline, estados vazios, data histórica, peças, checklist, ISTOBAL, volumoso, logging

**Bug corrigido:** `route.fallback()` (não `route.continue()`) necessário em Playwright para passar ao handler anterior (`setupApiMock`) nos testes offline.

---

### v1.9.7 — Importação SAF-T de clientes + correcções E2E
**Implementado:** Fevereiro 2026

**Funcionalidades:**
- Importação em massa de clientes a partir de ficheiro JSON (formato SAF-T/Gestor.32)
- Modal com preview (novos vs existentes), modos "Ignorar" e "Actualizar"
- Persistência na API para cada cliente criado/actualizado

**Correcções críticas (descobertas via E2E):**
- `importClientes` faltava no objeto `value` do DataContext → importação falhava com "is not a function"
- `importClientes` não chamava `apiClientes.create`/`update` → clientes só em memória, perdidos ao recarregar
- Mock E2E: `clientesMutable` para acumular clientes criados e retornar em `list`

**Spec 18:** 6 testes E2E para o fluxo completo de importação SAF-T.

---

### v1.8.x — Importação Kaeser PDF
**Implementado:** Fevereiro 2026

- Leitura de relatórios de manutenção de compressores Kaeser em formato PDF
- Importação de dados para o sistema (manutenções, equipamentos)
- Specs 14-15: 49 testes Playwright

---

### v1.7.x — Campo + Produtividade + KPIs
**Implementado:** Fevereiro 2026

- **Etapa 5:** Leitor QR Code via câmara (`QrReaderModal.jsx`, `@zxing/browser`)
- **Etapa 6:** Dashboard KPIs (`Metricas.jsx`, `recharts`) — taxa de cumprimento, gráficos, top clientes
- **Etapa 7:** Pesquisa global (`PesquisaGlobal.jsx`, `Ctrl+K`)
- **Etapa 8:** Modo campo (alto contraste, toggle em Definições)
- **Etapa 9:** Indicador de armazenamento (localStorage %)

---

### v1.6.x — Conformidade e Alertas (Blocos A+B+C)
**Implementado:** Fevereiro 2026

- **Bloco A:** Email obrigatório nos clientes, badge "Sem email", configuração de dias de aviso
- **Bloco B:** Reagendamento automático após execução periódica (próximos 2 anos)
- **Bloco C:** Modal proactivo de alertas ao Admin; "Dispensar hoje"; cron job de email diário

---

### v1.5.x — Etapas 1–4
**Implementado:** Fevereiro 2026

- Vista "O meu dia" no Dashboard, alertas badge, QR Code (etiqueta 90×50mm), Histórico PDF por máquina

---

### v1.4.x → v1.0 — Base
- Suite Playwright: 9 specs, 137 testes → PWA → Offline-first → Responsividade → Núcleo CRUD

---

## O que ainda está por fazer (Backlog)

### Próximo sprint (v2.x)

| # | Funcionalidade | Impacto | Esforço | Notas |
|---|---|---|---|---|
| N1 | **Notificações push** (Web Push API) — manutenções a vencer em 3 dias | Alto | Alto | Service Worker necessário; independente do cron |
| N2 | **Entrada por voz** nos campos de texto (SpeechRecognition API, `pt-PT`) | Médio | Médio | Útil em ambiente de campo com luvas |
| N3 | **Relatório executivo PDF** — visão da frota para apresentar ao cliente, baseado nos KPIs | Médio | Médio | Gerado a partir do `kpis.js` existente |
| N4 | **Valores de custo/venda em reparações** — fase de faturação (invisível no relatório do cliente) | Alto | Médio | Já existe estrutura de peças usadas; falta a camada de preços |

### Fase 3 — Escalabilidade (horizonte 6-12 meses)

| # | Funcionalidade | Impacto | Esforço | Notas |
|---|---|---|---|---|
| F3.1 | **Multi-técnico em manutenção** — registar 2+ técnicos numa execução | Médio | Médio | Adequado para equipas maiores |
| F3.2 | **App nativa** — Capacitor (iOS + Android, notificações push nativas) | Alto | Muito alto | Reavaliar quando tiver >5 técnicos de campo |
| F3.3 | **Actualização automática multi-tab** — BroadcastChannel API | Baixo | Baixo | Sincronização instantânea entre abas abertas |

> **Nota sobre sincronização:** A sincronização multi-dispositivo já funciona via PHP/MySQL (cPanel) — qualquer dispositivo autenticado lê os mesmos dados em tempo real ao refrescar. O que não existe é push automático sem refrescar. Para a equipa actual (1-2 técnicos), não é problema prático.

---

## O que nos distingue dos CMMS pequenos

- **Offline-first funcional** — dados em cache, fila de sync, banner de estado
- **Assinatura digital do cliente** — capturada no momento da execução
- **Email + PDF automáticos** — gerados e enviados sem intervenção manual
- **QR Code completo** — geração de etiqueta 90×50mm + leitura via câmara
- **Reagendamento automático** — calcula próximos 2 anos após cada execução
- **Alertas proactivos + cron automático** — modal ao Admin + envio diário pelo servidor
- **Pesquisa global Ctrl+K** — encontra qualquer entidade em milissegundos
- **Dashboard KPIs executivo** — taxa de cumprimento, gráficos, top clientes em atraso
- **Modo campo** — alto contraste para técnicos ao sol
- **Módulo Reparações completo** — multi-dia, fotos, peças, relatório ISTOBAL mensal
- **441 testes E2E** — cobertura total de fluxos, perfis, mobile, offline e performance
- **Dois perfis bem separados** — Admin com poderes totais, ATecnica restrito ao essencial

---

*Última actualização: 2026-02-26 — v1.9.7*

> **Roadmap detalhado:** Ver `docs/ROADMAP-EVOLUCAO-2026.md` para análise de potencial e próximas etapas passo-a-passo.
