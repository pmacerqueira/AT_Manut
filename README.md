# Navel - Planeamento de Manutenções Preventivas

Aplicação React para apoio ao planeamento de manutenções preventivas de equipamentos comercializados pela Navel.

## Funcionalidades

- **Login** – autenticação com Admin ou Técnico Navel (roles distintos)
- **Dashboard** – visão geral com contadores e alertas
- **Clientes** – empresas e proprietários de equipamentos
- **Categorias** – tipos de máquinas, subcategorias e checklists de conformidade
- **Equipamentos** – registo e gestão dos equipamentos Navel
- **Manutenções** – planeamento, agendamento e histórico
- **Calendário** – visualização mensal das manutenções

## Credenciais (produção MySQL)

| Utilizador | Password     | Role   |
|------------|--------------|--------|
| `Admin`    | `admin123%`  | Admin  |
| `ATecnica` | `tecnica123%`| Técnico|

## Como executar

```bash
# Instalar dependências
npm install

# Modo desenvolvimento (browser)
npm run dev

# Build para produção
npm run build

# Preview do build
npm run preview
```

Após `npm run dev`, abra o browser em `http://localhost:5173`.

## Tecnologias

- React 19 + Vite
- React Router DOM
- date-fns (datas em português)
- Lucide React (ícones)

## Git / GitHub

Repositório: `https://github.com/pmacerqueira/AT_Manut`

Após cada build fechado: commit, tag de versão e push. Ver `.cursor/rules/at-manut-workflow.mdc` para o fluxo completo.

## Documentação

- **[DOCUMENTACAO.md](./DOCUMENTACAO.md)** – Estrutura do projeto, modelo de dados, autenticação, rotas, fluxos Montagem/Manutenção, histórico de alterações
- **[DESENVOLVIMENTO.md](./DESENVOLVIMENTO.md)** – Guia para desenvolvimento futuro, convenções, ficheiros por funcionalidade, implementações pendentes
