# Configuração do Git — AT_Manut

Referência para manter o repositório sincronizado com o GitHub após cada build.

**Repositório:** https://github.com/pmacerqueira/AT_Manut

---

## Verificar se o Git está instalado

```powershell
git --version
```

Se não estiver instalado: https://git-scm.com/download/win  
Após instalar, configurar (uma vez só):

```powershell
git config --global user.name "Pedro Cerqueira"
git config --global user.email "pmcerqueira@navel.pt"
```

---

## Push após cada build fechado

```powershell
cd c:\Cursor_Projetos\NAVEL\AT_Manut
git add -A
git commit -m "v{versão} - resumo breve"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}
```

**Autenticação:** Usar [Personal Access Token](https://github.com/settings/tokens) em vez de password.

Ver `.cursor/rules/at-manut-workflow.mdc` para o fluxo completo de build e deploy.

---

## Git vs GitHub

| | Git | GitHub |
|---|-----|--------|
| **O que é** | Ferramenta de controlo de versões (instalada no PC) | Serviço online que guarda repositórios Git |
| **Onde corre** | No computador local | Na nuvem (github.com) |
