# Configuração do Git — AT_Manut

Instruções para configurar o Git no projeto e criar a tag da primeira versão estável.

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
git config --global user.email "teu-email@exemplo.com"
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

## 5. GitHub (opcional)

Só precisas do GitHub se quiseres:
- Guardar o código na nuvem
- Partilhar o projeto com outros
- Ter backup online

Se quiseres usar o GitHub:

1. Criar conta em https://github.com
2. Criar um repositório novo (ex.: `AT_Manut`)
3. Ligar o projeto local ao repositório e fazer push:

```powershell
git remote add origin https://github.com/TEU_USERNAME/AT_Manut.git
git branch -M main
git push -u origin main
git push origin v1.0.0
```

---

## Verificar se o Git está instalado

```powershell
git --version
```

Se aparecer algo como `git version 2.x.x`, está instalado correctamente.
