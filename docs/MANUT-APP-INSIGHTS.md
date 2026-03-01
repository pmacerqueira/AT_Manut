# AT_Manut — Continuidade entre Agentes e Memória Operacional

> Documento canónico para manter continuidade quando muda o agente/modelo no Cursor.
> Última revisão: 2026-03-01.

---

## 1) Verdades operacionais (sem ambiguidades)

- **Não existe memória global automática** entre todos os chats/sessões.
- **Não existe aprendizagem permanente automática** de um modelo para outro só por conversação.
- A continuidade é garantida por artefactos do projeto: **código, regras, changelog e notas de sessão**.

---

## 2) Como garantir continuidade forte entre agentes

### A. Regras bem escritas
- `/.cursor/rules/at-manut-workflow.mdc` é obrigatória e sempre aplicada.
- Todas as decisões de arquitetura devem ser refletidas nesta regra quando passarem a padrão estável.

### B. Changelog orientado a decisão
- `CHANGELOG.md` deve explicar **porque** a mudança foi feita (não só o que mudou).
- Sempre que houver correção crítica, registar impacto funcional e risco mitigado.

### C. Notas de sessão
- Usar `docs/SESSAO-FILOSOFT-2026-02-22.md` como histórico e manter novas notas no mesmo formato.
- Cada nota deve incluir: contexto, problema, causa raiz, ficheiros alterados e próximos passos.

---

## 3) Protocolo obrigatório no início de cada conversa

O agente deve começar com um resumo curto em 5 pontos:
1. Objetivo atual (1 frase).
2. Estado confirmado do projeto (build/teste/deploy).
3. Risco principal ativo.
4. Ficheiros/fonte de verdade a consultar primeiro.
5. Próxima ação concreta.

---

## 4) Fontes canónicas por tema

- Arquitetura e fluxos: `DOCUMENTACAO.md`
- Execução de desenvolvimento: `DESENVOLVIMENTO.md`
- Regras de trabalho do agente: `.cursor/rules/at-manut-workflow.mdc`
- Histórico de versões: `CHANGELOG.md`
- Testes e regressões: `docs/TESTES-E2E.md`

Evitar duplicar as mesmas instruções em vários ficheiros. Se existir conflito, vence a fonte canónica.

---

## 5) Política de limpeza documental

- Conteúdo redundante deve ser removido ou substituído por referência ao documento canónico.
- Conteúdo obsoleto deve ser reescrito com estado atual ou marcado explicitamente como histórico.
- Antes de criar novo `.md`, validar se o tema já existe num documento canónico.
