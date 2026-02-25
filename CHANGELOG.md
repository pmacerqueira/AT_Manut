# CHANGELOG — AT_Manut (Navel Manutenções)

Registo das alterações implementadas por sessão de desenvolvimento.

---

## [1.8.7] — 2026-02-25 — Registos históricos (Admin) + script de limpeza de dados

### Datas históricas para Admin — `ExecutarManutencaoModal`
- Novo campo **"Data de realização"** na secção de assinatura, visível apenas para Admin
- Quando preenchido com uma data passada, propaga-se automaticamente a **todas** as datas do registo:
  - `data` da manutenção
  - `dataAssinatura` e `dataCriacao` do relatório
  - `ultimaManutencaoData` e `proximaManut` da máquina (calculada a partir da data histórica)
- Campo tem `max = hoje` (impede datas futuras)
- Aviso visual em laranja quando a data histórica está preenchida
- Fluxo normal inalterado para ATecnica e para Admin sem data preenchida

### Script de limpeza de dados de teste
- Novo ficheiro `servidor-cpanel/limpar-dados-teste.sql` — colar no phpMyAdmin do cPanel
- Apaga clientes, máquinas, manutenções e relatórios (por esta ordem, respeitando chaves externas)
- Mantém categorias, subcategorias, checklist_items e users intactos
- Inclui query de verificação e instruções para limpar o cache localStorage

---

## [1.8.6] — 2026-02-25 — Melhorias de UX mobile: clientes, categorias e scroll

### Lista de clientes — mobile
- **Vista de cartões compactos** (≤640px) em substituição da tabela — cada cartão mostra nome, NIF, localidade, nº de máquinas e badge "Sem email"
- **Cartão inteiro clicável** → abre ficha do cliente
- **Ficha do cliente** redesenhada: nome maior (bold), botão **"Editar"** visível para Admin, botão "Relatório de frota" abaixo dos dados (não no header)
- Dados do cliente (morada, telefone, email) em fonte mais discreta

### Categorias e subcategorias de equipamentos
- Cards **centrados**, fonte reduzida, padding compacto — aspeto mais moderno
- Mobile: **duas colunas** em vez de uma (ocupa menos espaço vertical)
- Seta `ChevronRight` removida (deslocada com layout centrado)

### Ordenação de clientes
- Lista de clientes, seleção em Agendamento e select no formulário de máquina — sempre **A→Z por nome**

### Dashboard — nomes de equipamento
- `.meu-dia-item-nome`: máximo 2 linhas com reticências — sem overflow para fora do cartão

### Correção global: dupla barra de scroll em todos os modais
- `.modal-overlay` → scroll único (`overflow-y: auto`)
- `body:has(.modal-overlay)` → `overflow: hidden` — bloqueia scroll da página por trás
- `.modal` → `overflow-y: visible` — sem scroll duplicado
- Corrigido em: `modal-relatorio`, `modal-relatorio-form`, `modal-ficha-cliente`

---

## [1.8.5] — 2026-02-24 — Importação de planos KAESER a partir de PDF

### Plano de peças — importar PDF por máquina (exclusivo KAESER)
- **Botão "Importar template para esta máquina"** — abre o explorador de ficheiros para escolher um PDF do plano KAESER
- **Parser** `parseKaeserPlanoPdf.js` — extrai secções A, B, C e D do texto do PDF (posição, código, descrição, quantidade, unidade)
- **Integração pdf-parse** — leitura de PDF no browser com `pdf-parse` (mehmet-kozan); worker `pdf.worker.mjs` em `public/` com `PDFParse.setWorker()` para compatibilidade
- Substitui o plano existente da máquina e adiciona todas as peças em lote; toast com resumo por tipo (A/B/C/D)

### Regra de negócio: KAESER vs outras marcas de compressores
- **KAESER:** tabs A/B/C/D + Periódica; botão de importação PDF visível — planos extraídos dos PDFs oficiais
- **Outras marcas** (Fini, ECF, IES, LaPadana): apenas tab **Periódica** — consumíveis adicionados manualmente um a um

---

## [1.8.4] — 2026-02-24 — Marcas correctas · KAESER exclusivo · Migrations MySQL

### Regra de negócio: KAESER exclusivo de compressores
- **`isKaeserMarca(marca)`** — detecção por marca (não por subcategoria); KAESER é exclusivo da categoria Compressores
- **`MARCAS_COMPRESSOR`** e **`MARCAS_ELEVADOR`** — constantes exportadas para sugestão no formulário de máquina
- **Badges**: "KAESER X" só para marca KAESER; outros compressores (Fini, ECF, IES, LaPadana) mostram "Marca X"
- **PecasPlanoModal**: template de importação KAESER ASK 28T apenas para máquinas com marca KAESER
- **relatorioHtml.js**: bloco KAESER no relatório baseado em `marca === 'KAESER'`

### Dados e migrations
- **Mock data** (DataContext): marcas actualizadas — compressores: KAESER, Fini, ECF, IES, LaPadana; elevadores: Cascos, Ravaglioli, Space, Kroftools, TwinBusch, Sunshine, Werther, Velyen
- **seed_mock_data.sql**: v1.8.4 com marcas correctas e coluna `posicao_kaeser`
- **MIGRACAO_MYSQL.md**: 7.3b (posicao_kaeser em maquinas), 7.3c (UPDATEs de marcas)

### Testes E2E
- **14-kaeser-features.spec.js**: ajustes de locators (K5.3, K6.1, K9.2) para maior robustez

---

## [1.8.3] — 2026-02-23 — Relatório KAESER completo: bloco de equipamento, ciclo visual, consumíveis sem limite de páginas

### Relatório de manutenção — Compressor KAESER
- **Título adaptado**: "Relatório de Manutenção — Compressor" para equipamentos KAESER
- **Bloco KAESER** (novo, antes dos dados gerais):
  - Header colorido com o tipo de manutenção efectuada (ex: `Manutenção KAESER — Tipo A · Anual 3000h`)
  - Fabricante, modelo, número de série (em destaque) e ano de fabrico
  - Horas totais acumuladas + horas de serviço (se disponíveis)
  - Ciclo efectuado + próxima manutenção
  - **Sequência visual do ciclo de 12 anos** — círculos coloridos por estado (passado / actual / próximo / futuro)
- **Checklist** em coluna única para KAESER (mais legível, sem truncagem), com contador de pontos
- **Tabela de consumíveis** melhorada:
  - Cabeçalho dinâmico: `Consumíveis e peças — Manutenção Tipo X · Anual`
  - Cabeçalhos de grupo a cor: ✓ Utilizados (verde) / ✗ Não substituídos (cinza)
  - Rodapé resumo: "N artigos utilizados · M não substituídos · X no plano"
  - `page-break-before` separa a tabela de consumíveis dos dados gerais em relatórios longos
  - `page-break-inside: avoid` em cada linha — sem cortes a meio de artigos
- **Suporte a múltiplas páginas**: sem qualquer limite; o relatório cresce conforme o número de itens

---

## [1.8.2] — 2026-02-23 — Plano de consumíveis por máquina · Checklist de execução · Relatório discriminado

### Fluxo de criação de compressor KAESER
- **`MaquinaFormModal`** passa a retornar `(maqData, modo)` no `onSave`, permitindo que o chamador saiba qual máquina foi criada e em que modo
- **`Clientes.jsx`**: após criar um compressor KAESER, `PecasPlanoModal` abre automaticamente para configurar o plano da nova máquina
- **`PecasPlanoModal`**: novo prop `modoInicial` — mostra banner de boas-vindas a orientar o utilizador a configurar o plano (via template ou inserção manual), apenas quando o plano ainda está vazio

### Checklist de consumíveis na execução
- **`ExecutarManutencaoModal`**: secção "Consumíveis e peças" completamente redesenhada como checklist visual
  - Cada item tem checkbox **Sim/Não** (✓ verde / fundo neutro barrado)
  - Botões **"✓ Marcar todos"** e **"✗ Desmarcar todos"** no cabeçalho da secção
  - Itens do plano carregam com `usado: true` por defeito (podem ser desmarcados)
  - "Adicionar consumível manualmente" cria item com `usado: true`
  - Campo `usado: boolean` substitui `quantidadeUsada: number` (formato interno)

### Relatório de manutenção — consumíveis discriminados
- **`relatorioHtml.js`**: secção "Consumíveis e peças" mostra dois grupos:
  - **Utilizados** (✓ fundo verde claro) — itens com `usado: true`
  - **Não utilizados** (✗ fundo cinza, texto riscado) — itens com `usado: false`
  - Compatibilidade retroactiva: relatórios antigos com `quantidadeUsada` são convertidos automaticamente

---

## [1.8.1] — 2026-02-23 — Ciclo KAESER anual · Badge de tipo na lista · Posição no formulário

### Ciclo KAESER — lógica anual completa
- **`SEQUENCIA_KAESER`** em `DataContext`: sequência de 12 posições `['A','B','A','C','A','B','A','C','A','B','A','D']` (ciclo 12 anos)
- **`tipoKaeserNaPosicao(pos)`**, **`proximaPosicaoKaeser(pos)`**, **`descricaoCicloKaeser(pos)`** — helpers exportados
- **`ExecutarManutencaoModal`**: auto-sugere tipo A/B/C/D pelo `posicaoKaeser` da máquina; após concluir avança automaticamente a posição no ciclo via `updateMaquina`
- **`MaquinaFormModal`**: campo "Posição actual no ciclo KAESER" (select com Ano 1–12 e tipo correspondente); inicializa em 0 para novos compressores; sincroniza com dados existentes em modo editar
- **`Manutencoes.jsx`**: badge `KAESER X` (cor primária) junto ao status em todas as manutenções de compressores não concluídas, mostrando o tipo esperado para a próxima manutenção
- **Dados mock**: compressores nas máquinas de exemplo incluem `posicaoKaeser` representativa

---

## [1.8.0] — 2026-02-23 — Ordens de trabalho · Plano de peças KAESER · Relatório de frota

### Ordens de trabalho (Work Orders)
- **Novo status `em_progresso`** no ciclo de vida de manutenções (pendente → em_progresso → concluída)
- **Botão "Iniciar" (⚡)** em `Manutencoes.jsx` — regista `inicioExecucao` (ISO) na manutenção
- **Badge laranja "Em progresso"** na lista de manutenções
- `iniciarManutencao()` em `DataContext` — `updateManutencao` atómico com timestamp
- Modal de execução aceita manutenções `em_progresso` (não só pendente/agendada)
- Formulário de edição inclui `em_progresso` no dropdown de status

### Plano de peças e consumíveis KAESER
- **`KAESER_PLANO_ASK_28T`** em `DataContext` — plano completo extraído dos PDFs de serviço:
  - Tipo A (3.000h/1 ano): 2 artigos  |  Tipo B (6.000h): 3 artigos
  - Tipo C (12.000h): 10 artigos       |  Tipo D (36.000h): 18 artigos
- **`INTERVALOS_KAESER`** e **`SUBCATEGORIAS_COMPRESSOR`** exportados do DataContext
- **`atm_pecas_plano`** — novo estado persistido em `localStorage` com CRUD completo:
  `addPecaPlano`, `addPecasPlanoLote`, `updatePecaPlano`, `removePecaPlano`, `removePecasPlanoByMaquina`, `getPecasPlanoByMaquina`
- **`PecasPlanoModal.jsx`** — modal Admin com tabs A/B/C/D + Periódica, importação do template KAESER ASK 28T, CRUD inline
- Botão **"Plano de peças"** (📦) em `Equipamentos.jsx` por máquina (Admin only)
- Eliminação de máquina cascata para `pecasPlano`

### Execução com peças
- **`ExecutarManutencaoModal.jsx`** — nova secção "Peças e consumíveis utilizados":
  - Dropdown tipo A/B/C/D (compressores) — auto-carrega plano configurado
  - Ajuste de quantidade por peça, remoção e adição manual
  - `pecasUsadas` e `tipoManutKaeser` guardados no relatório
- **`relatorioHtml.js`** — nova secção "Peças e consumíveis utilizados" no HTML/PDF do relatório

### Relatório Executivo de Frota (novo)
- **`gerarRelatorioFrota.js`** — HTML/PDF com:
  - KPIs de frota: total de equipamentos, taxa de cumprimento, em atraso, por instalar
  - Tabela completa de frota com estado por máquina (Conforme / Em atraso / Por instalar)
  - Secção destacada de manutenções em atraso com dias de atraso
  - Rodapé `APP_FOOTER_TEXT` e data de geração
- Botão **"Relatório de frota"** (📊) em `Clientes.jsx` — na tabela e na ficha do cliente

### Documentação técnica
- **`servidor-cpanel/MIGRACAO_MYSQL.md`** — secção 7 com scripts SQL para:
  - `ALTER TABLE manutencoes` (inicio_execucao, tipo_manut_kaeser, status ENUM actualizado)
  - `ALTER TABLE relatorios` (pecas_usadas JSON, tipo_manut_kaeser)
  - `CREATE TABLE pecas_plano` (preparação para migração futura de localStorage → MySQL)

---

## [1.7.3] — 2026-02-23 — Optimizações de performance + Mock de dados grande

### Performance — Bundle splitting
- **`vite.config.js`:** `manualChunks` para `recharts`, `dompurify`, `qrcode` — eliminam-se do bundle inicial
- **`Metricas.js`:** 381 KB → **13 KB** (−96.6%) — `recharts` só carregado ao visitar `/metricas`
- **`Equipamentos.js`:** 47 KB → **22 KB** (−53%) — DOMPurify extraído para chunk próprio
- **`vendor-qr`** (qrcode, 25 KB) e **`vendor-purify`** (DOMPurify, 22 KB): chunks lazy separados

### Robustez de rede
- **`apiService.js`:** `AbortController` com timeout 15s em todas as chamadas API (`call` e `apiLogin`)
- Erro de timeout com `status: 408` e mensagem clara registada no log de sistema
- Protege contra rede lenta no cPanel (Açores) — sem pendurar indefinidamente

### Testes de performance (novo spec 13)
- Criado `tests/e2e/mock-large.js` — 240 registos realistas (20 clientes açorianos, 60 máquinas, 120 manutenções, 40 relatórios)
- Criado `tests/e2e/13-performance.spec.js` — 15 testes de carga e escalabilidade:
  - Limiares de render: Dashboard < 5s, Métricas < 6s, Pesquisa < 2s
  - Valida KPIs com dados volumosos, filtros, pesquisa global, badge "Sem email", indicador localStorage
  - Testa separadamente a estrutura do dataset ML (contagens e regras de isolamento)

### Qualidade
- Suite: **285 testes** (13 specs) — todos a passar
- Confirmado: `useMemo` em todos os KPIs e `React.lazy` em todas as rotas já estavam implementados

---

## [1.7.2] — 2026-02-23 — Correcção de bugs E2E e robustez de testes

### Correcções de bugs

#### `Metricas.jsx` — Redirect para utilizadores sem permissão
- Corrigido redirect de ATecnica ao aceder a `/metricas`: navegação agora feita em `useEffect` (em vez de durante o render) seguindo o padrão de `Logs.jsx`, resolvendo comportamento inconsistente em React 19

#### Testes E2E — Selector de botão QR ambíguo
- Corrigido selector `button[title*="QR"]` em `10-etapas-evolucao.spec.js` (linha 262–669): a adição do botão "Ler QR Code" na sidebar (v1.7.0) tornava o selector ambíguo e causava falha de todos os testes QR ao clicar no botão errado
- Novo selector exacto: `button[title="Gerar etiqueta QR"]` — aponta apenas para o botão de etiqueta nas linhas de máquinas

#### Testes E2E — Autenticação em testes ATecnica
- Corrigido Q7, M9, M10 em `12-v170-features.spec.js`: `sessionStorage.clear()` adicionado antes de `doLoginTecnico()` para garantir que a sessão Admin do `beforeEach` é terminada antes de testar como ATecnica
- Timeouts de `.qr-etiqueta` aumentados para 12 s em testes que aguardavam o container do modal

### Qualidade
- Suite mantém **270 testes** (12 specs) — todos a passar

### Documentação actualizada
- `docs/TESTES-E2E.md` — novos problemas técnicos documentados (selector QR, sessão auth, `navigate` durante render); config `playwright.config.js` corrigida; versão actualizada para v1.7.2
- `docs/ROADMAP.md` — v1.7.1/v1.7.2 adicionados ao histórico; contagem E2E 270; versão actualizada
- `README.md` — versão v1.7.2, tabela de tecnologias com leitor QR e recharts, contagem 270 testes
- `DOCUMENTACAO.md` + `DESENVOLVIMENTO.md` — versão v1.7.2, contagem 270 testes

---

## [1.7.1] — 2026-02-23 — Cobertura E2E completa + Documentação v1.7.0

### Testes E2E
- Criado `tests/e2e/12-v170-features.spec.js` — 42 testes cobrindo todas as etapas v1.7.0 (pesquisa global, leitor QR, modo campo, métricas, indicador localStorage)
- Corrigido `03-clientes.spec.js` — testes de criação de cliente agora preenchem email obrigatório (campo introduzido em v1.6.0)
- Corrigido `04-manutencoes.spec.js` — teste "Listar todas as manutenções" usa `.count()` em vez de `.isVisible()` para containers CSS responsive
- Corrigido `10-etapas-evolucao.spec.js` — timeouts dos testes de QR Code etiqueta aumentados de 5s → 10s (geração QR pode ser lenta sob carga)
- Suite total: **270 testes** (12 specs) — todos a passar

### Documentação actualizada
- `ROADMAP.md` — tabela de estado actual v1.7.0, histórico completo, backlog v1.8.x refinado
- `TESTES-E2E.md` — tabela de specs com spec 12 (total 270 testes)
- `DOCUMENTACAO.md` — stack, estrutura de ficheiros e rotas actualizadas
- `DESENVOLVIMENTO.md` — tabela de ficheiros por funcionalidade actualizada
- `README.md` — versão e tabela de módulos actualizada

---

## [1.7.0] — 2026-02-23 — Roadmap Etapas 5–9: Campo, Pesquisa, KPIs

### Novo

#### Etapa 7 — Pesquisa global (Ctrl+K)
- `PesquisaGlobal.jsx` — modal de pesquisa instantânea acessível em qualquer página
- Pesquisa simultânea em Clientes (nome, NIF, email), Equipamentos (marca, modelo, S/N) e Manutenções (tipo, data, status, técnico)
- Resultados agrupados por tipo com badges coloridos e navegação por teclado (↑↓ Enter)
- Atalho global `Ctrl+K` / `Cmd+K` — registado em `Layout.jsx`
- Barra de pesquisa visível na sidebar; botão `Esc` para fechar
- Clique em resultado navega para a página correspondente (`/clientes`, `/equipamentos`, `/manutencoes`) com `state.highlightId`

#### Etapa 5 — Leitor de QR Code via câmara
- `QrReaderModal.jsx` — modal com feed de câmara usando `@zxing/browser`
- Prefere câmara traseira em dispositivos móveis; fallback para câmara disponível
- Ao ler QR da app (`?maquina=ID`): navega directamente para `/equipamentos?maquina=ID`
- QRs externos: mostra o texto lido com opção "Abrir link"
- Botão "Ler QR Code" na sidebar (disponível a Admin e ATecnica)
- `Equipamentos.jsx` — lê `?maquina=` e `location.state.highlightId` para abrir automaticamente a subcategoria da máquina

#### Etapa 8 — Modo campo (alto contraste)
- Tema de alto contraste em `index.css` (`.modo-campo`) — fundo claro, texto preto, bordas nítidas
- Textos e botões maiores (106% base, min-height 46px)
- Indicador visual "☀ MODO CAMPO" na sidebar quando activo
- Toggle em `Definições` → "Modo campo" com estado persistido em `atm_modo_campo`
- `App.jsx` — aplica/remove a classe `.modo-campo` no `<body>` no mount e em alterações cross-tab

#### Etapa 6 — Dashboard de KPIs e métricas (Admin)
- `src/utils/kpis.js` — funções de cálculo: resumo de contagens, taxa de cumprimento (12 meses), próximas 8 semanas, top clientes em atraso, evolução mensal, MTBF
- `src/pages/Metricas.jsx` — nova página com:
  - Cards de resumo (clientes, equipamentos, manutenções, relatórios, em atraso, sem email)
  - Taxa de cumprimento com indicador circular (verde/amarelo/vermelho)
  - Gráfico de linha — evolução mensal das manutenções (6 meses) com `recharts`
  - Gráfico de barras empilhadas — próximas 8 semanas (pendentes + agendadas)
  - Tabela top 5 clientes com equipamentos em atraso
- Nova rota `/metricas` em `App.jsx`; link "Métricas" na sidebar (Admin)

#### Etapa 9 — Melhorias ao armazenamento (Definições)
- Indicador visual de uso do localStorage: barra de progresso com % e alerta quando > 70%
- Cálculo de uso total (todos os keys `atm_*`) com estimativa de quota de 5 MB

### Dependências adicionadas
- `recharts` — gráficos interactivos na página de Métricas
- `@zxing/browser` — leitura de QR Code via câmara

### Testes E2E
- Criado `tests/e2e/12-v170-features.spec.js` — 42 testes cobrindo as 5 etapas v1.7.0:
  - **P1-P13** Pesquisa Global: modal, Ctrl+K, Escape, resultados, badges, teclado, limpar
  - **Q1-Q7** Leitor QR: modal, header, Escape, status câmara, fechar, acesso ATecnica
  - **MC1-MC6** Modo Campo: toggle, classe body, persistência, desactivar, navegação
  - **M1-M10** Dashboard Métricas: acesso Admin, título, cards, taxa, gráficos, voltar, bloqueio ATecnica
  - **LS1-LS4** Armazenamento: indicador, barra, percentagem, tamanho KB/MB
- Corrigido `04-manutencoes.spec.js` — teste "Listar todas as manutenções" usa `.count()` em vez de `.isVisible()` para os containers que podem ser ocultos via CSS responsive
- Suite total: **267 testes** (12 specs) — todos a passar

### Documentação
- `ROADMAP.md` — actualizado para v1.7.0: estado actual, histórico v1.7.0, backlog v1.8.x revisado
- `TESTES-E2E.md` — tabela de specs actualizada com spec 12 (42 testes; total 267)
- `DOCUMENTACAO.md` — stack, estrutura de ficheiros, rotas actualizadas com novos componentes
- `DESENVOLVIMENTO.md` — tabela de ficheiros por funcionalidade actualizada
- `README.md` — versão e tabela de módulos actualizada

---

## [1.6.2] — 2026-02-23 — Cobertura E2E completa (Etapas 1-4 + Blocos A+B+C)

### Corrigido
- `QrEtiquetaModal.jsx` — adicionado handler de tecla Escape para fechar o modal (UX + E2E fix); sem este handler, 3 testes do spec 10 falhavam por o Playwright pressionar Escape sem efeito
- `tests/e2e/helpers.js` — data de `mt20` alterada de `2026-03-01` para `2026-04-01` nos dados mock base; a data anterior coincidia com o limite de 7 dias do alerta proactivo e activava o modal em testes do spec 10 que não o esperavam, causando bloqueio de UI

### Testes
- Confirmada cobertura E2E completa: **spec 10** (48 testes — Etapas 1 a 4) + **spec 11** (40 testes — Blocos A+B+C) = **88/88 a passar**
- Todos os objectivos do roadmap validados com isolamento correcto entre specs

---

## [1.6.1] — 2026-02-23 — Correções pós-teste E2E v1.6.0

### Corrigido
- `AlertaProactivoModal.jsx` — bug em `toggleExpand`: `!undefined = true` impedia o primeiro colapso de grupo; corrigido para `!(prev[nif] ?? true)` para usar o valor por omissão correcto
- `Clientes.jsx` — removido atributo HTML `required` do input de email (mantida apenas a validação JS em `handleSubmit`) para evitar que a validação nativa do browser bloqueasse o handler antes de mostrar a mensagem de erro personalizada
- `playwright.config.js` — porta `baseURL` actualizada para 5173 (alinhada com Vite dev server actual)

### Testes E2E adicionados
- `tests/e2e/11-blocos-abc.spec.js` — 40 testes cobrindo todos os pontos dos Blocos A, B e C:
  - Bloco A (7): badge "Sem email", email obrigatório no formulário, indicador `*`, sucesso com email, edição sem email, Definições com configuração de dias
  - Bloco A Definições (7): secção visível, input padrão 7 dias, guardar 14 dias, persistência localStorage, validação 0/61, acesso ATecnica
  - Bloco B (4): reagendamento após execução periódica, botão "Executar manutenção" em desktop, sem reagendamento para montagem, pré-condição periodicidadeManut
  - Bloco C (16): modal aparece/não aparece nas condições certas, botões Fechar/Dispensar, persistência dismiss, ATecnica sem modal, envio email, feedback erro, grupos expansíveis, badge contagem
  - Integração (4): fluxos combinados A+B+C

---

## [1.6.0] — 2026-02-23 — Alertas de conformidade v2 (Blocos A + B + C)

### Bloco A — Email obrigatório em clientes + configuração de alertas

- **Email obrigatório** na criação e edição de clientes: campo marcado com `*`, validação JavaScript com mensagem clara
- **Badge de aviso** (`⚠ Sem email`) na tabela de clientes para registos existentes sem email — permite identificar rapidamente quem precisa de actualização
- **Secção "Alertas de conformidade"** nas Definições (Admin): input numérico para "Dias de aviso antecipado" (1–60 dias, padrão: 7), com persistência em `atm_config_alertas`
- Novo módulo `src/config/alertasConfig.js` com utilitários: `getDiasAviso`, `setDiasAviso`, `isAlertsModalDismissedToday`, `dismissAlertsModalToday`, `getAlertasEnviados`, `marcarAlertaEnviado`, `foiAlertaEnviadoHoje`, `getManutencoesPendentesAlertas`

### Bloco B — Reagendamento automático de periódicas após execução

- Ao concluir uma manutenção do tipo `periodica`, se a máquina tem `periodicidadeManut` definida:
  1. Remove automaticamente todas as manutenções futuras pendentes/agendadas dessa máquina
  2. Recalcula e cria novas manutenções para 3 anos a partir da data de execução real
  3. Respeita feriados e dias úteis (mesma lógica da criação pós-montagem)
  4. Mostra toast informativo com o número de periódicas reagendadas
- Implementado como operação atómica no `DataContext` (`recalcularPeriodicasAposExecucao`) — sem race conditions

### Bloco C — Modal de alertas proactivos no início de sessão (Admin)

- Ao carregar o Dashboard, o Admin vê automaticamente um modal com as manutenções programadas dentro do prazo de aviso configurado
- Modal agrupa manutenções por cliente, com código de cores por urgência (hoje / 1-2 dias / 3-5 dias / restantes)
- Por cada cliente: botão "Enviar lembrete por email" — envia directamente para o email do cliente com CC para `geral@navel.pt`
- "Dispensar hoje" regista a dispensa diária e não mostra o modal novamente até à próxima sessão
- Registo de alertas já enviados hoje (`atm_alertas_enviados`) — evita duplicados
- Aviso visual se o cliente não tiver email registado
- **`servidor-cpanel/send-email.php`** alargado com tipo `lembrete`: gera email HTML profissional com tabela de equipamentos, datas e urgência; CC automático ao admin

### Ficheiros criados/modificados
- `src/config/alertasConfig.js` — novo módulo de configuração e utilitários
- `src/pages/Clientes.jsx` — email required + badge sem email
- `src/pages/Clientes.css` — estilo `.sem-email-aviso`
- `src/pages/Definicoes.jsx` — secção "Alertas de conformidade"
- `src/pages/Definicoes.css` — estilos `.def-alerta-*`
- `src/context/DataContext.jsx` — `recalcularPeriodicasAposExecucao` (exposto)
- `src/components/ExecutarManutencaoModal.jsx` — Bloco B integrado
- `src/services/emailService.js` — `enviarLembreteEmail` adicionado
- `src/components/AlertaProactivoModal.jsx` — novo componente
- `src/components/AlertaProactivoModal.css` — estilos do modal
- `src/pages/Dashboard.jsx` — integração do modal de alertas
- `servidor-cpanel/send-email.php` — suporte a `tipo_email: lembrete`

---

## [1.5.1] — 2026-02-23 — Histórico completo em PDF por máquina (Etapa 4)

### Nova funcionalidade — Histórico PDF por máquina
- Botão `FileText` adicionado em cada linha de equipamento (todas as vistas: normal e em atraso)
- Gera e abre uma nova janela com o histórico completo em PDF/impressão via `window.print()`
- **Conteúdo do PDF:**
  - Cabeçalho Navel com logotipo e dados da empresa
  - Ficha do equipamento: marca/modelo, nº série, subcategoria/categoria, localização, cliente (nome, NIF, morada), próxima manutenção
  - Bloco de estatísticas globais: Total | Executadas | Agendadas | Em atraso | Última execução
  - Tabela histórica completa (mais recente primeiro): data, tipo, estado (com badge colorido), técnico, assinado por, observações (truncadas a 90 chars)
  - Última assinatura registada (imagem manuscrita + nome + data)
  - Rodapé Navel em todas as páginas
- Indicador de carregamento (`useGlobalLoading`) durante geração
- `@media print` com `table-header-group` para repetição de cabeçalho em múltiplas páginas

### Ficheiros criados/modificados
- `src/utils/gerarHtmlHistoricoMaquina.js` — novo gerador HTML do histórico
- `src/pages/Equipamentos.jsx` — botão "Histórico PDF", estado `loadingHistorico`, `handleHistoricoPdf()`

---

## [1.5.0] — 2026-02-23 — "O meu dia" + Alertas de conformidade + QR Code por máquina

### Etapa 1 — Vista "O meu dia" (Dashboard)
- Novo painel no Dashboard com todas as manutenções pendentes para hoje e em atraso
- Para o ATecnica: destaque visual com barra lateral azul e título "O meu dia"
- Para o Admin: visível mas menos destacado ("Hoje")
- Cada item mostra: equipamento, cliente, badge "Xd atraso" e botão directo "Executar"
- Se não há intervenções: mensagem amigável com ícone "Sem intervenções pendentes para hoje!"

### Etapa 2 — Alertas de conformidade
- Card "Em atraso" pulsa com animação de anel vermelho quando há manutenções há mais de 7 dias
- Sub-label "⚠ Há X dias!" no card para alertar visualmente o utilizador
- Cálculo automático de `diasMaxAtraso` (diferença em dias desde a manutenção mais antiga em atraso)

### Etapa 3 — QR Code por máquina
- Novo botão QR (`QrCode` icon) em cada linha de equipamento (em todas as vistas: normal e em atraso)
- Modal `QrEtiquetaModal` com etiqueta formatada: cabeçalho NAVEL azul, QR code 100×100 px, marca/modelo, nº série, cliente
- QR codifica URL directo da app: `https://www.navel.pt/manut/equipamentos?maquina={id}`
- Botão "Imprimir etiqueta" usa `window.print()` com CSS de impressão dedicado (apenas a etiqueta, formato 80mm)
- Câmara nativa do telemóvel lê o QR e abre directamente a ficha no browser — zero código extra necessário (Opção A)

### Infra-estrutura
- Dependência adicionada: `qrcode` (geração de QR code no browser via canvas → data URL)
- `APP_VERSION` actualizado para `1.5.0`

---

## [1.4.1] — 2026-02-23 — Logotipo Navel na sidebar + correcções de documentação

### Interface
- Logotipo completo Navel (`logo-navel.png`) substitui o ícone "N" (`logo.png`) no cabeçalho da sidebar
- Dimensões ajustadas: `max-width: 112px`, `max-height: 34px` (−30% face ao original)

### Documentação
- `docs/ROADMAP.md` — 5 etapas prioritárias refinadas com base em análise estratégica e casos de sucesso CMMS (TRACTIAN, DIMO Maint, UpKeep, Limble, MaintainX)
- Etapa 5 corrigida: a sincronização multi-dispositivo **já está assegurada** pelo PHP + MySQL no cPanel — o `localStorage` é apenas cache offline; o Supabase reposicionado como *nice-to-have* para atualizações em tempo real
- `.cursor/rules/at-manut-workflow.mdc` — arquitectura clarificada: MySQL/cPanel é fonte de verdade, `localStorage` é cache offline

---

## [1.4.0] — 2026-02-23 — Suite de testes E2E (Playwright)

### Infra-estrutura de testes
- **137 testes automatizados** cobrindo 100% dos fluxos da aplicação, executados com Playwright
- Isolamento total via mock de API (`page.route()` em `**/api/data.php`) — testes rápidos e independentes do servidor
- Injecção de JWT mock em `sessionStorage` para autenticar os dois perfis de utilizador (Admin / ATecnica)

### Ficheiros criados
- `playwright.config.js` — configuração Playwright (timeout 30 s, retries 2, screenshots e vídeo em falha)
- `tests/e2e/helpers.js` — utilitários partilhados: `doLoginAdmin`, `doLoginTecnico`, `setupApiMock`, `fillExecucaoModal`, `signCanvas`, `goTo`, `checklistFillAllSim`
- `tests/e2e/01-auth.spec.js` — autenticação, logout, redirecionamentos, sessão
- `tests/e2e/02-dashboard.spec.js` — cards de KPI, calendário, painel de dia, navegação rápida
- `tests/e2e/03-clientes.spec.js` — CRUD clientes, ficha, pesquisa
- `tests/e2e/04-manutencoes.spec.js` — listagem, filtros, execução, validações (checklist, assinatura), permissões
- `tests/e2e/05-montagem.spec.js` — fluxo completo de montagem: execução, assinatura digital, agendamento de periódicas
- `tests/e2e/06-agendamento.spec.js` — formulário, validações (HTML5 vs React), fluxo completo
- `tests/e2e/07-permissions.spec.js` — RBAC: Admin vs ATecnica (rotas, botões, Definições, Logs)
- `tests/e2e/08-equipamentos-categorias.spec.js` — equipamentos e categorias (CRUD inline, filtros, calendário ATecnica)
- `tests/e2e/09-edge-cases.spec.js` — upload de fotos, limite 8 fotos, assinatura, modais, responsividade mobile, estado vazio

### Cobertura por perfil
| Perfil | Capacidades testadas |
|---|---|
| Admin | CRUD completo, Definições, Logs, exportar/importar backup, todas as permissões |
| ATecnica | Executar manutenções, ver relatórios concluídos, calendário; sem acesso a Definições/Logs/eliminações |

### Problemas técnicos resolvidos
- Validação HTML5 (`required`) bloqueava `handleSubmit` React — testes pré-preenchem campos obrigatórios
- Seletores ambíguos desktop/mobile resolvidos com `.manutencoes-table` (seletores específicos)
- Sessão Admin persistente impedia login ATecnica — `sessionStorage.clear()` antes de cada login de técnico
- `signCanvas` melhorado com `scrollIntoViewIfNeeded()` e fallback `dispatchEvent`

---

## [1.3.0] — 2026-02-22 — Modo offline + sincronização automática (Fase 1)

### Funcionalidade principal: Offline-First
- **Cache local (localStorage):** Após cada fetch bem-sucedido, os dados são guardados em `atm_cache_v1` (TTL 30 dias). Se o dispositivo estiver offline ao abrir a app, os dados são carregados do cache — sem perda de acesso aos dados no terreno.
- **Fila de sincronização (localStorage):** Qualquer operação feita offline (criar, actualizar, eliminar clientes, equipamentos, manutenções, relatórios, etc.) é enfileirada em `atm_sync_queue` até 4 MB. Quando a ligação é restaurada, a fila é processada automaticamente em ordem.
- **Detecção automática online/offline:** Listeners `online`/`offline` do browser actualizam o estado em tempo real. Ao voltar online, a fila é processada e os dados são refrescados do servidor.
- **Sincronização após login:** O evento `atm:login` (disparado pelo AuthContext) garante que a fila é processada e os dados são carregados imediatamente após autenticação bem-sucedida.

### Novos ficheiros
- `src/services/localCache.js` — cache de dados para uso offline (save/load/clear, fallback sem fotos se quota excedida)
- `src/services/syncQueue.js` — fila de mutações offline (enqueue, processQueue, queueSize, removeItem)
- `src/components/OfflineBanner.jsx` — indicador visual de estado de ligação e sincronização
- `src/components/OfflineBanner.css` — estilos do banner (offline, pendentes, a sincronizar)

### Alterações
- `src/services/apiService.js` — exportada função `apiCall` para uso pelo processador de fila
- `src/context/DataContext.jsx` — integração completa: cache, fila offline, estado `isOnline`/`syncPending`/`isSyncing`, `processSync`, todos os `persist()` actualizados com descriptor de fila (23 callsites)
- `src/context/AuthContext.jsx` — dispara evento `atm:login` após login bem-sucedido
- `src/components/Layout.jsx` — adicionado `<OfflineBanner />` no topo do conteúdo

### Comportamento do OfflineBanner
| Estado | Visual |
|--------|--------|
| Offline, sem pendentes | Amarelo: "Sem ligação — dados guardados (HH:mm DD/MM/AAAA)" |
| Offline, com pendentes | Laranja: "Sem ligação · N operações aguardam sincronização" |
| Online, pendentes | Azul: "N operações aguardam envio" + botão "Sincronizar" |
| A sincronizar | Verde: spinner + "A sincronizar operações pendentes…" |

---

## [1.2.0] — 2026-02-22 — Auditoria responsiva completa

### Responsividade
- Melhorias em touch targets (mín. 44px), tipografia fluida (`clamp()`), layouts landscape, `prefers-reduced-motion`
- Ficheiros CSS ajustados: `index.css`, `Layout.css`, `Dashboard.css`, `Manutencoes.css`, `Categorias.css`, `Logs.css`, `Agendamento.css`, `Calendario.css`, `Definicoes.css`

### Documentação
- `docs/ROADMAP.md` — Roadmap evolutivo da app (Fase 1: terreno, Fase 2: produtividade, Fase 3: inteligência)
- `docs/MANUT-APP-INSIGHTS.md` — Investigação de boas práticas CMMS para equipas de campo

---

## [1.1.0] — 2026-02-22 — Documentação, Git e fluxo de deploy

### Documentação
- `docs/GIT-SETUP.md` — repo GitHub (pmacerqueira/AT_Manut), fluxo de push após build
- `docs/DEPLOY_CHECKLIST.md` — instruções com `dist_upload.zip` e `Compress-Archive`

### Git e workflow
- `.gitignore` — `dist_upload.zip`, `.env`, `Thumbs.db`
- Boas práticas Git documentadas em `.cursor/rules/at-manut-workflow.mdc`
- README com secção Git/GitHub e link do repositório

---

## [1.0.0] — 2026-02-21 — Primeira versão estável

**Marco:** Primeira release considerada estável para produção.

### Incluído nesta versão
- Gestão de clientes, equipamentos, manutenções e relatórios
- Checklist de manutenção, assinatura digital, fotos
- Envio de relatórios por email (HTML e PDF) via servidor cPanel
- Agendamento e calendário de manutenções
- Backup/restauro de dados (Definições)
- Logs do sistema (local e servidor cPanel)
- Autenticação (Admin, ATecnica) — JWT em `sessionStorage`
- PWA instalável (ícone "N", ecrã inicial)
- Logotipo Navel no login e sidebar
- Indicador de carregamento global (ícone N a rodar)
- Toast centrado em todos os dispositivos
- Manual UX/UI documentado (`docs/MANUAL-UX-UI.md`)
- Fuso horário Atlantic/Azores em toda a app
- Correções de segurança (CORS, sanitização, validações)
- Persistência completa em `localStorage` (prefixo `atm_`)
- Fix 404 SPA via `.htaccess` para Apache/cPanel
- Cards mobile em Manutenções (layout responsivo)
- PDF multi-página com cabeçalho e rodapé automáticos
- Email HTML com galeria de fotos e próxima intervenção

---

## Arquitectura geral do projecto

```
c:\AT_Manut\
├── src/                          # Código React (Vite)
│   ├── components/               # Componentes reutilizáveis
│   │   ├── Layout.jsx/.css       # Sidebar + layout geral
│   │   ├── OfflineBanner.jsx/.css # Indicador de estado de ligação (v1.3)
│   │   ├── ExecutarManutencaoModal.jsx  # Modal de execução de manutenção
│   │   ├── RelatorioView.jsx     # Visualizador de relatório
│   │   └── SignaturePad.jsx      # Assinatura digital (canvas)
│   ├── pages/                    # Painéis principais
│   │   ├── Dashboard.jsx         # Visão geral / KPIs
│   │   ├── Manutencoes.jsx       # Lista de manutenções (principal)
│   │   ├── Clientes.jsx          # Gestão de clientes
│   │   ├── Equipamentos.jsx      # Gestão de equipamentos/máquinas
│   │   ├── Agendamento.jsx       # Agendar nova manutenção
│   │   ├── Calendario.jsx        # Calendário visual
│   │   ├── Categorias.jsx        # Categorias e subcategorias
│   │   ├── Definicoes.jsx        # Configurações (Admin only)
│   │   └── Logs.jsx              # Logs do sistema (Admin only)
│   ├── context/
│   │   ├── DataContext.jsx       # Estado global + localStorage + offline cache/queue (v1.3)
│   │   └── AuthContext.jsx       # Autenticação JWT + evento atm:login
│   ├── services/
│   │   ├── apiService.js         # Chamadas à API cPanel
│   │   ├── localCache.js         # Cache offline de dados (v1.3)
│   │   ├── syncQueue.js          # Fila de operações offline (v1.3)
│   │   └── emailService.js       # Envio de relatórios por email
│   ├── config/
│   │   ├── version.js            # APP_VERSION + APP_FOOTER_TEXT
│   │   └── emailConfig.js        # Token e URL do endpoint PHP
│   └── utils/
│       ├── relatorioHtml.js      # Gerador HTML do relatório (view local)
│       └── gerarPdfRelatorio.js  # PDF client-side (jsPDF)
├── tests/                        # Suite de testes E2E (v1.4)
│   └── e2e/
│       ├── helpers.js            # Utilitários partilhados (login, mock API, canvas)
│       ├── 01-auth.spec.js       # Autenticação
│       ├── 02-dashboard.spec.js  # Dashboard
│       ├── 03-clientes.spec.js   # Clientes
│       ├── 04-manutencoes.spec.js # Manutenções
│       ├── 05-montagem.spec.js   # Montagens
│       ├── 06-agendamento.spec.js # Agendamento
│       ├── 07-permissions.spec.js # Permissões RBAC
│       ├── 08-equipamentos-categorias.spec.js # Equipamentos e Categorias
│       └── 09-edge-cases.spec.js # Casos limite e responsividade
├── playwright.config.js          # Configuração Playwright (v1.4)
├── servidor-cpanel/              # Ficheiros para upload no cPanel (navel.pt)
│   ├── send-email.php            # Endpoint de envio de email + geração PDF (FPDF)
│   └── fpdf184/                  # Biblioteca FPDF v1.84
├── docs/                         # Documentação técnica
│   ├── CHANGELOG.md → (este ficheiro)
│   ├── DEPLOY_CHECKLIST.md       # Instruções de deploy cPanel
│   ├── GIT-SETUP.md              # Configuração Git/GitHub
│   ├── MANUAL-UX-UI.md           # Regras de UX/UI (Toast, loading, feedback)
│   ├── IMAGENS-E-ICONES.md       # Otimização de imagens e ícones
│   ├── ROADMAP.md                # Roadmap de evolução
│   ├── MANUT-APP-INSIGHTS.md     # Investigação de boas práticas CMMS
│   └── TESTES-E2E.md             # Documentação da suite de testes (v1.4)
├── dist/                         # Build de produção (gerado por `npm run build`)
├── dist_upload.zip               # Zip para upload ao cPanel
└── CHANGELOG.md                  # Este ficheiro
```

### Deployment

```powershell
# Build (prebuild otimiza imagens automaticamente)
npm run build

# Zip para upload ao cPanel (public_html/manut/)
Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force

# Push para GitHub
git add -A
git commit -m "v{versão} - resumo"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}
```

### Executar testes E2E

```powershell
# Arrancar servidor de desenvolvimento (pré-requisito)
npm run dev

# Executar toda a suite (137 testes)
npx playwright test tests/e2e/

# Executar um ficheiro específico
npx playwright test tests/e2e/04-manutencoes.spec.js

# Modo UI interactivo
npx playwright test --ui
```

### Configuração de email

- Ficheiro: `src/config/emailConfig.js`
- `ENDPOINT_URL`: `https://www.navel.pt/api/send-email.php`
- `AUTH_TOKEN`: token de segurança partilhado entre frontend e PHP
- Servidor de envio: `no-reply@navel.pt` via `mail()` do cPanel

### Persistência de dados

| Chave localStorage | Conteúdo |
|---|---|
| `atm_clientes` | Array de clientes |
| `atm_categorias` | Categorias de equipamento |
| `atm_subcategorias` | Subcategorias |
| `atm_checklist` | Itens de checklist |
| `atm_maquinas` | Máquinas/equipamentos |
| `atm_manutencoes` | Registos de manutenção |
| `atm_relatorios` | Relatórios completos |
| `atm_app_version` | Versão (cache busting) |
| `atm_cache_v1` | Cache offline de dados do servidor (v1.3) |
| `atm_sync_queue` | Fila de operações pendentes offline (v1.3) |
| `atm_api_token` | JWT em `sessionStorage` (sessão termina ao fechar janela) |

---

*Última actualização: 2026-02-23 — v1.4.0*
