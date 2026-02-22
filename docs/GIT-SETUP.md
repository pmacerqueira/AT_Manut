# Configuração do Git — AT_Manut

Instruções para configurar o Git no projeto e manter o repositório sincronizado com o GitHub.

**Repositório:** https://github.com/pmacerqueira/AT_Manut

---

## Git vs GitHub

| | Git | GitHub |
|---|-----|--------|
| **O que é** | Ferramenta de controlo de versões (instalada no teu PC) | Serviço online que guarda repositórios Git |
| **Onde corre** | No teu computador | Na nuvem (github.com) |
| **Obrigatório?** | Sim, para usar tags e histórico de versões | Não — podes usar Git só localmente |

**Resumo:** Git é o programa; GitHub é um sítio onde podes guardar o teu repositório (e partilhar com outros).

---

## 1. Instalar o Git (Windows)

1. Ir a https://git-scm.com/download/win
2. Descarregar e instalar o Git para Windows
3. Durante a instalação, podes deixar as opções por defeito
4. **Reiniciar o Cursor** (ou o terminal) após a instalação

---

## 2. Configurar nome e email (uma vez só)

Abrir o PowerShell ou o terminal do Cursor e executar:

```powershell
git config --global user.name "Pedro Cerqueira"
git config --global user.email "pmcerqueira@navel.pt"
```

---

## 3. Inicializar o repositório no projeto

Se a pasta `c:\AT_Manut` ainda não for um repositório Git:

```powershell
cd c:\AT_Manut
git init
```

---

## 4. Criar a tag v1.0.0 (primeira versão estável)

Depois de teres o Git a funcionar:

```powershell
cd c:\AT_Manut
git add .
git commit -m "v1.0.0 — Primeira versão estável"
git tag -a v1.0.0 -m "Primeira versão estável"
```

---

## 5. GitHub (configurado)

O repositório está em **https://github.com/pmacerqueira/AT_Manut**.

### Push após cada build fechado

```powershell
cd c:\AT_Manut
git add -A
git commit -m "v{versão} - resumo breve"
git tag -a v{versão} -m "Release v{versão}"
git push origin master
git push origin v{versão}
```

**Autenticação:** Usar [Personal Access Token](https://github.com/settings/tokens) em vez de password.

Ver `.cursor/rules/at-manut-workflow.mdc` para o fluxo completo de build e deploy.

---

## Verificar se o Git está instalado

```powershell
git --version
```

Se aparecer algo como `git version 2.x.x`, está instalado correctamente.
