# Índice da documentação — AT_Manut

Ponto de entrada único. **Não duplicar** o mesmo procedimento em vários `.md`; actualizar a fonte listada e, nos outros, apenas um link.

## Núcleo
| Ficheiro | Conteúdo |
|----------|----------|
| [`README.md`](../README.md) | Visão geral, stack, comandos rápidos |
| [`DOCUMENTACAO.md`](../DOCUMENTACAO.md) | Arquitectura, modelo de dados, rotas, fluxos |
| [`DESENVOLVIMENTO.md`](../DESENVOLVIMENTO.md) | Convenções de código, mapa de ficheiros por funcionalidade |
| [`CHANGELOG.md`](../CHANGELOG.md) | Histórico de releases |
| [`docs/MANUT-APP-INSIGHTS.md`](MANUT-APP-INSIGHTS.md) | Continuidade entre agentes / decisões de handoff |

## Deploy e operação (produção www.navel.pt)
| Ficheiro | Conteúdo |
|----------|----------|
| **[`docs/DEPLOY_CHECKLIST.md`](DEPLOY_CHECKLIST.md)** | **Canónico:** BD, env vars, deploy PWA + API, integrações, pós-deploy |
| **[`docs/CPANEL-RUNBOOK-SEGREDOS.md`](CPANEL-RUNBOOK-SEGREDOS.md)** | **Canónico:** operação de segredos `ATM_*` em produção (LiteSpeed + LSPHP, `RewriteRule [E=…]`, scripts de migração/validação/rollback) |
| [`docs/BUILD-E-ZIP.md`](BUILD-E-ZIP.md) | Gerar `dist_upload.zip` (alternativa manual ao SFTP) |
| [`docs/CPIANEL-NAVEL-SHARED-HOSTING.md`](CPIANEL-NAVEL-SHARED-HOSTING.md) | Mapa dono/caminho no mesmo `public_html` (navel-site vs AT_Manut) |
| [`servidor-cpanel/INSTRUCOES_CPANEL.md`](../servidor-cpanel/INSTRUCOES_CPANEL.md) | Endpoints de email (`send-email.php`, `send-report.php`), limites POST, horário técnico |
| **[`docs/MEMORIA-SEGREDO-EMAIL-E-LOGS.md`](MEMORIA-SEGREDO-EMAIL-E-LOGS.md)** | **Memória:** segredo email/relatório/logs — `gen:report-auth`, ficheiro no servidor, sem programador |
| [`docs/SEGURANCA-REVISAO-NAVEL-PT.md`](SEGURANCA-REVISAO-NAVEL-PT.md) | Revisão de segurança do alojamento |

**Repo irmão `navel-site`:** deploy SFTP/FTPS (`scripts/cpanel-deploy.mjs`, `.env.cpanel`), `documentos-api.php`, site institucional — ver `navel-site/docs/DEPLOY-AUTOMATICO-CPANEL.md` e `docs/INTEGRACAO-BIBLIOTECA-AT-MANUT.md`.

## Qualidade e UX
| Ficheiro | Conteúdo |
|----------|----------|
| [`docs/TESTES-E2E.md`](TESTES-E2E.md) | Playwright |
| [`docs/MANUAL-UX-UI.md`](MANUAL-UX-UI.md) | Manual de interface |
| [`docs/IMAGENS-E-ICONES.md`](IMAGENS-E-ICONES.md) | Assets |

## Domínio específico (referência)
| Ficheiro | Conteúdo |
|----------|----------|
| [`docs/FOTOS-PDF-EMAIL-LIMITES.md`](FOTOS-PDF-EMAIL-LIMITES.md) | Limites de anexos e POST |
| [`docs/CRON-ALERTAS.md`](CRON-ALERTAS.md) | Lembretes automáticos |
| [`docs/KAESER-IMPORT-PDF-ESTRATEGIA.md`](KAESER-IMPORT-PDF-ESTRATEGIA.md) | PDF Kaeser |
| [`docs/TESTE-OFFLINE-MANUAL.md`](TESTE-OFFLINE-MANUAL.md) | Modo offline |
| Checklists manuais `CHECKLIST_MANUAL_SUB*.md` | Textos legais por subcategoria |

## Planeamento (histórico, não estado actual)
- [`docs/ROADMAP.md`](ROADMAP.md)
- [`docs/ROADMAP-EVOLUCAO-2026.md`](ROADMAP-EVOLUCAO-2026.md)
- [`docs/PLANO-QUESTIONARIO-SUGESTAO-MANUT.md`](PLANO-QUESTIONARIO-SUGESTAO-MANUT.md)
- [`docs/PLANO-FLUXOS-EXECUCAO.md`](PLANO-FLUXOS-EXECUCAO.md)

## Regras de manutenção
1. Um tema = uma fonte canónica; nos restantes, só link.
2. Versão da app: **`src/config/version.js`** (`APP_VERSION`) — não espalhar números desactualizados em exemplos de código na doc (preferir "ver `version.js`").
3. Antes de criar novo `.md`, confirmar aqui se o tema já existe.
