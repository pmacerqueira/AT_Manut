# Guia de Desenvolvimento – AT Manut / Navel

Documento de apoio para futuros desenvolvimentos. Consulte também [DOCUMENTACAO.md](./DOCUMENTACAO.md).

**Localizações:** AT_Manut = `c:\AT_Manut\` | Website Navel = `c:\navel-site\`

---

## 1. Otimizações Implementadas

- **Code splitting**: rotas lazy-loaded com `React.lazy` e `Suspense` (carregamento mais rápido)
- **Context**: valor do DataContext memoizado com `useMemo` (evita re-renders desnecessários)
- **Pesquisa**: `useDebounce` em Agendamento e Clientes (250 ms) para evitar filtros excessivos
- **Filtros persistentes**: Manutenções guarda preferência «mostrar todas» em `localStorage`
- **API layer**: `src/services/apiService.js` para chamadas à API; `send-report.php` para envio de emails HTML
- **Touch targets**: mínimo 44px (Apple HIG, WCAG)
- **Focus visible**: outline para navegação por teclado

---

## 2. Convenções de Código

- **Componentes**: React function components; hooks (`useState`, `useEffect`, `useNavigate`, etc.)
- **Estilos**: CSS modules implícito (cada página tem `.css` próprio); estilos globais em `index.css`
- **Datas**: `date-fns` com `pt` locale; formato interno `yyyy-MM-dd`; apresentação em PT (DD-MM-YYYY)
- **Ícones**: `lucide-react`
- **Routing**: React Router DOM v7; `navigate(-1)` para «Voltar atrás»

---

## 3. Pontos de Entrada Importantes

| Ficheiro | Responsabilidade |
|----------|------------------|
| `src/App.jsx` | Rotas, Layout, ProtectedRoute |
| `src/context/DataContext.jsx` | Estado global: clientes, maquinas, manutencoes, relatorios; CRUD |
| `src/context/AuthContext.jsx` | Login, sessão, `user`, `isAdmin` |
| `src/hooks/usePermissions.js` | `canDelete`, `canEditManutencao`, `isAdmin` |
| `src/config/users.js` | Roles, users, password hashes |

---

## 4. Modelo de Dados – Resumo

- **Clientes**: nif, nome, morada, codigoPostal, localidade, telefone, email
- **Maquinas**: id, clienteNif, subcategoriaId, marca, modelo, numeroSerie, ano, proximaManut, etc.
- **Manutencoes**: id, maquinaId, tipo (`montagem`|`preventiva`), data, tecnico, status (`pendente`|`agendada`|`concluida`)
- **Relatorios**: ligados a manutencao; `assinadoPeloCliente`, `dataAssinatura`, `nomeAssinante`, `assinaturaDigital` (base64)

---

## 5. Implementações Futuras (Prioridade)

### 5.1 Relatórios por Tipo

- **Montagem** (`tipo === 'montagem'`): conteúdo específico no relatório (ex.: instalação, comissionamento)
- **Manutenção periódica** (`tipo === 'preventiva'`): relatório com mais dados (horas totais/serviço, histórico, etc.)

Locais a alterar: `relatorioHtml.js`, `gerarPdfRelatorio.js`, `RelatorioView.jsx`, `ExecutarManutencaoModal.jsx`.

### 5.2 Formulário de Execução Diferenciado

- Fluxo **Montagem**: mesma checklist; dados mínimos
- Fluxo **Manutenção**: checklist + campos adicionais (horasTotais, horasServico, etc.)

Locais: `ExecutarManutencaoModal.jsx`, lógica de submissão e validação.

### 5.3 Backend

- Substituir dados em memória do `DataContext` por chamadas API (fetch/axios)
- Autenticação: JWT ou sessão servidor
- CRUD para clientes, maquinas, manutencoes, relatorios

---

## 6. Ficheiros por Funcionalidade

| Funcionalidade | Ficheiros |
|----------------|-----------|
| Agendamento novo | `Agendamento.jsx`, `Agendamento.css` |
| Lista de manutenções | `Manutencoes.jsx`, `Manutencoes.css` |
| Execução (checklist + assinatura) | `ExecutarManutencaoModal.jsx` |
| Relatório em HTML/PDF | `relatorioHtml.js`, `gerarPdfRelatorio.js`, `RelatorioView.jsx` |
| Calendário | `Calendario.jsx`, `Dashboard.jsx` |
| Clientes / Equipamentos | `Clientes.jsx`, `Equipamentos.jsx` |
| Categorias (Admin) | `Categorias.jsx` |

---

## 7. Variáveis de Estilo Relevantes

Definidas em `index.css` ou temas:

- `--color-accent`, `--color-accent-hover` – azul principal
- `--color-danger` – vermelho (ex.: Em atraso)
- `.btn-executar-manut` – verde fluorescente (#39ff14) para botões Executar / Agendar NOVO
- `.btn-back` – botão Voltar atrás (azul, sem fundo)

---

## 8. Permissões por Role

| Role | Categorias | Eliminar | Editar manut. assinada |
|------|------------|----------|------------------------|
| admin | Ver e editar | Sim | Sim |
| tecnico | Não acede | Não | Não |

Admin cria clientes, categorias e equipamentos. Técnicos: consulta, executar manutenções, agendar em clientes/equipamentos existentes.

---

## 9. Comandos

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```
