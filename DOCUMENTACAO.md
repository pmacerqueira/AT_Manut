# Navel Manutenções – Documentação do Projeto

**Data da documentação:** 20 de fevereiro de 2026  
**Versão:** 1.3  
**Última atualização:** 20 de fevereiro de 2026

---

## 1. Visão Geral

Aplicação React para planeamento e gestão de manutenções preventivas de equipamentos Navel (elevadores, compressores, geradores, equipamentos de trabalho em pneus). Inclui autenticação com dois níveis de utilizadores (Admin e Técnico Navel) e controlo de permissões.

### 1.1 Dois Fluxos de Negócio

| Fluxo | Descrição | Check-list | Relatório |
|-------|-----------|------------|-----------|
| **A) Montagem** | Instalação de equipamento nas instalações do cliente | Igual em ambos | Informação própria (a definir) |
| **B) Manutenção periódica** | Manutenção aos equipamentos do cliente | Igual em ambos | Mais dados; outro conteúdo (a definir) |

O campo `tipo` em cada manutenção distingue os fluxos: `montagem` ou `preventiva`. A checklist de verificação é a mesma; os relatórios e dados adicionais divergem (implementação futura).

---

## 2. Stack Tecnológica

- **React 19** + **Vite 7**
- **React Router DOM 7**
- **date-fns** (formatação de datas)
- **lucide-react** (ícones)
- **bcryptjs** (hash de passwords)
- **jsPDF** (geração de PDF – dependência disponível)

---

## 3. Estrutura do Projeto

```
c:\AT_Manut\
├── DOCUMENTACAO.md          # Este ficheiro – documentação principal
├── DESENVOLVIMENTO.md       # Guia para desenvolvimento futuro
├── package.json
├── vite.config.js
├── index.html
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.css
    ├── index.css            # Estilos globais, page-header, btn-back, modais, etc.
    │
    ├── config/
    │   └── users.js         # Utilizadores, roles, password hashes (bcrypt)
    │
    ├── context/
    │   ├── AuthContext.jsx  # Autenticação, login, logout
    │   └── DataContext.jsx  # Dados (clientes, maquinas, manutencoes, relatorios)
    │
    ├── hooks/
    │   ├── usePermissions.js # canDelete, canEditManutencao, isAdmin
    │   └── useMediaQuery.js  # Deteção mobile (media queries)
    │
    ├── components/
    │   ├── Layout.jsx           # Sidebar fixa, menu, links, user + logout
    │   ├── Layout.css
    │   ├── ProtectedRoute.jsx   # Redireciona para /login se não autenticado
    │   ├── SignaturePad.jsx     # Canvas para assinatura manuscrita
    │   ├── SignaturePad.css
    │   ├── RelatorioView.jsx    # Visualização do relatório com assinatura
    │   ├── RelatorioView.css
    │   ├── ExecutarManutencaoModal.jsx  # Modal de execução (checklist, relatório)
    │   ├── MaquinaFormModal.jsx         # Formulário máquina
    │   ├── DocumentacaoModal.jsx        # Documentação de equipamento
    │   ├── EnviarEmailModal.jsx
    │   └── EnviarDocumentoModal.jsx
    │
    ├── pages/
    │   ├── Login.jsx, Login.css
    │   ├── Dashboard.jsx, Dashboard.css   # Cartões, calendário, action sheet
    │   ├── Agendamento.jsx, Agendamento.css  # Cliente→Equipamento→Tipo→Data/Hora
    │   ├── Manutencoes.jsx, Manutencoes.css  # Lista, executar, relatório
    │   ├── Clientes.jsx, Clientes.css
    │   ├── Equipamentos.jsx, Equipamentos.css
    │   ├── Categorias.jsx, Categorias.css
    │   └── Calendario.jsx, Calendario.css
    │
    ├── utils/
    │   ├── relatorioHtml.js      # Geração HTML do relatório
    │   ├── gerarPdfRelatorio.js  # Export PDF (jsPDF)
    │   └── sanitize.js           # Sanitização de HTML
    │
    └── constants/
        └── relatorio.js          # Declaração obrigatória (relatórios)
```

---

## 4. Autenticação e Utilizadores

### 4.1 Roles

| Role    | Descrição         | Eliminar registos | Editar manutenções assinadas |
|---------|-------------------|-------------------|------------------------------|
| `admin` | Administrador     | Sim               | Sim                          |
| `tecnico` | Técnico Navel   | Não               | Não                          |

### 4.2 Credenciais de Demo

| Utilizador    | Password   | Role   |
|---------------|------------|--------|
| `admin`       | `admin123` | admin  |
| `joao.santos` | `navel2024`| tecnico|
| `maria.oliveira` | `navel2024` | tecnico |

### 4.3 Fluxo de Autenticação

1. Sem sessão → redirecionamento para `/login`
2. Login com username + password → validação com bcrypt
3. Sessão guardada em `localStorage` (chave: `navel_auth_session`)
4. Refresh da página mantém a sessão

---

## 5. Modelo de Dados

### 5.1 Entidades Principais

- **Clientes** – NIF, nome, morada, CP, localidade, telefone, email  
- **Categorias** – Nome, intervalo de manutenção (trimestral/semestral/anual)  
- **Subcategorias** – Tipo de máquina por categoria (ex.: elevador 2 colunas)  
- **ChecklistItems** – Itens de verificação por subcategoria (conformidade legal)  
- **Máquinas** – Por cliente: marca, modelo, Nº série, ano, subcategoria, periodicidade  
- **Manutenções** – Data, técnico, status (pendente/agendada/concluída)  
- **Relatórios** – Ligados a manutenções; campo `assinadoPeloCliente`

### 5.2 Relatório e Assinatura do Cliente

Cada manutenção concluída pode ter um relatório com:

- **dataCriacao** – data/hora de criação do relatório (ISO)
- **dataAssinatura** – data/hora em que o cliente assinou (ISO)
- **nomeAssinante** – nome de quem assinou (preenchido pelo técnico, para garantir legibilidade)
- **assinaturaDigital** – imagem base64 da assinatura manuscrita (capturada em canvas)

O técnico abre «Registar assinatura», preenche o nome de quem assinou e o cliente desenha a assinatura no quadro. As datas são registadas automaticamente.

### 5.3 Regra de Assinatura

Quando um **relatório** está assinado pelo cliente (`assinadoPeloCliente: true`), a **manutenção** associada **só pode ser editada pelo Admin**. Técnicos veem ícone de cadeado e não têm botão de edição.

---

## 6. Rotas

| Path           | Página      | Proteção   |
|----------------|-------------|------------|
| `/login`       | Login       | Pública    |
| `/`            | Dashboard   | Protegida  |
| `/clientes`    | Clientes    | Protegida  |
| `/categorias`  | Categorias  | Protegida (Admin) |
| `/equipamentos`| Equipamentos| Protegida  |
| `/manutencoes` | Manutenções | Protegida  |
| `/agendamento` | Agendamento | Protegida  |
| `/calendario`  | Calendário  | Protegida  |

Todas as páginas (exceto Login) incluem o botão **«Voltar atrás»** no cabeçalho, que executa `navigate(-1)`.

---

## 7. Ficheiros Críticos – Descrição

### 7.1 `src/config/users.js`

```javascript
// Exporta ROLES (ADMIN, TECNICO) e USERS
// Cada user: id, username, nome, role, passwordHash (bcrypt)
```

### 7.2 `src/context/AuthContext.jsx`

- `AuthProvider` – envolve a app
- `useAuth()` – retorna: `user`, `isAdmin`, `isAuthenticated`, `hydrated`, `login`, `logout`
- Sessão persistida em localStorage

### 7.3 `src/context/DataContext.jsx`

- Estado: clientes, categorias, subcategorias, checklistItems, maquinas, manutencoes, relatorios
- Funções CRUD para todas as entidades
- `getRelatorioByManutencao(manutencaoId)` – para verificar se está assinado

### 7.4 `src/hooks/usePermissions.js`

- `canDelete` – `true` apenas para Admin
- `canEditManutencao(manutencaoId)` – `false` para Técnicos se relatório assinado
- `isManutencaoAssinada(manutencaoId)` – auxiliar

### 7.5 `src/components/ProtectedRoute.jsx`

- Verifica se o utilizador está autenticado
- Redireciona para `/login` se não estiver
- Estado `hydrated` evita flash antes de carregar sessão

---

## 8. Comandos

```bash
# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview
```

---

## 9. Dados Iniciais (Seed)

- 3 clientes (Indústria Silva, Metalúrgica Costa, Automotiva Norte)
- 4 categorias (Elevadores, Compressores, Geradores, Equipamentos de pneus)
- Subcategorias e checklists predefinidos (EN 1493, Kaeser, etc.)
- Manutenção m1 com relatório assinado (para testar restrição de edição para Técnicos)

---

## 10. Página de Agendamento (`/agendamento`)

Fluxo do formulário:
1. **Cliente** – seleção com pesquisa por nome, NIF, morada ou localidade (campo com ícone lupa)
2. **Equipamento** – combobox só aparece após escolher cliente; lista as máquinas desse cliente
3. **Tipo** – Montagem ou Manutenção periódica (`tipo`: `montagem` | `preventiva`)
4. **Data (DD-MM-AAAA)** e **Hora (HH:MM)**

Regras:
- Se o dia escolhido já tiver manutenções agendadas, é apresentado modal com sugestão de próximo dia livre
- Validação de data e hora; `addManutencao` do contexto para criar a manutenção

---

## 11. Dashboard Mobile e Manutenções

- **Dashboard**: cartões Em atraso / Próximas / Executadas; calendário; action sheet ao clicar (Ver manutenção / Executar manutenção)
- **Manutenções**: título «Manutenções»; filtros Em atraso / Próximas / Executadas; botões «Ocultar executadas» e «+ Nova manutenção»; lista por defeito Em atraso e Próximas; «Ver todas» mostra Executadas
- **Botão Agendar NOVO**: verde fluorescente (#39ff14), link para `/agendamento`
- **Botão Executar**: verde fluorescente, ícone Play + «Executar»

---

## 12. Alterações Desta Sessão (17 Feb 2025)

### 12.1 Fluxos Montagem / Manutenção Periódica

- Campo `tipo` em manutenções: `montagem` | `preventiva`
- Formulário Agendamento com combo Tipo (Montagem / Manutenção periódica)
- Check-list igual em ambos; relatórios e dados adicionais divergem (a implementar)

### 12.2 Agendamento

- Pesquisa de cliente com ícone lupa e filtro em tempo real
- Combobox de equipamentos por cliente
- Sugestão de data alternativa quando o dia já tem agendamentos

### 12.3 Navegação

- Botão «Voltar atrás» em todos os painéis (Dashboard, Manutenções, Equipamentos, Clientes, Categorias, Calendário, Agendamento)
- Estilo `.btn-back` em `index.css`

### 12.4 Outras

- Otimizações de CSS; AuthContext; permissões por role; assinatura digital em relatórios

---

## 13. Segurança (Notas)

- Passwords guardadas com hash bcrypt (10 rounds)
- Validação de sessão ao carregar (localStorage)
- Em produção: usar backend com API autenticada; nunca confiar apenas no frontend para regras críticas

---

## 14. Relatório e Assinatura

- **SignaturePad** – componente canvas para assinatura manuscrita (mouse/touch)
- **RelatorioView** – mostra dados da manutenção, declaração, nome do assinante, data/hora, imagem da assinatura
- A partir de Manutenções (status concluída): botão «Registar assinatura» ou «Ver relatório»
- O técnico preenche o nome de quem assinou; o cliente assina no quadro; as datas são registadas automaticamente

## 15. API e Deploy

### 15.1 Endpoints no Servidor (public_html/api/)

| Ficheiro | URL | Uso |
|----------|-----|-----|
| `data.php` | https://www.navel.pt/api/data.php | CRUD de dados (clientes, máquinas, manutenções, etc.) |
| `send-email.php` | https://www.navel.pt/api/send-email.php | Relatórios com PDF (FPDF), auth_token obrigatório |
| `send-report.php` | https://www.navel.pt/api/send-report.php | Envio de relatórios/documentos HTML por email (EnviarEmailModal, EnviarDocumentoModal) |

### 15.2 Estrutura servidor-cpanel (para deploy)

```
servidor-cpanel/
├── api/
│   ├── config.php, db.php, data.php
│   ├── send-report.php    # Envio de HTML por email
│   └── fpdf184/           # FPDF para PDFs
├── send-email.php         # Relatórios com PDF (raiz ou api/)
└── log-receiver.php
```

### 15.3 Variáveis de Ambiente

- `VITE_API_BASE_URL` (opcional): URL base da API, ex. `https://www.navel.pt`. Se vazio, usa `window.location.origin`.
- Os modais EnviarEmailModal e EnviarDocumentoModal chamam `{API_BASE}/api/send-report.php`.

### 15.4 App em Produção

- **URL da app**: https://www.navel.pt/manut/
- **API**: https://www.navel.pt/api/data.php (PDO + MySQL)
- **Base de dados**: navel_atmanut (cPanel)
- **Deploy**: `npm run build` → extrair `dist/*` para `public_html/manut/`

### 15.5 Localizações no Disco

| Projeto      | Caminho local      |
|--------------|--------------------|
| AT_Manut     | `c:\AT_Manut\`     |
| Website Navel| `c:\navel-site\`   |

---

## 16. Próximos Passos Sugeridos

- **Relatórios por tipo**: conteúdo diferente para Montagem vs Manutenção periódica
- **Formulário Manutenção**: fluxo B exige mais campos na execução; fluxo A usa mesma checklist
- Persistência em backend (API REST)
- Geração de PDF do relatório com assinatura digital (jsPDF)
- Gestão de utilizadores pelo Admin (CRUD de técnicos)
