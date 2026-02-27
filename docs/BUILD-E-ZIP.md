# Build e Zip para Deploy cPanel — AT_Manut

> Instruções para gerar `dist_upload.zip` para upload em `public_html/manut/`.

---

## Utilização futura

**Quando for necessário novo build e zip**, executar sempre no **terminal do Windows** (nunca dentro do Cursor) para evitar crash do editor. O assistente AI deve usar estes comandos automaticamente quando o utilizador pedir "build", "zip" ou "preparar deploy".

---

## Por que executar no terminal (fora do Cursor)?

O build do Vite (3800+ módulos) consome bastante memória. Executar no **terminal do Windows** em vez de dentro do Cursor reduz o risco de crash do editor durante o processo.

---

## Opção 1: Um único comando (recomendado)

```powershell
cd c:\AT_Manut
npm run build:zip
```

Executa `npm run build` (inclui optimize-images) e depois cria `dist_upload.zip`.

---

## Opção 2: Script PowerShell

```powershell
cd c:\AT_Manut
.\scripts\build-and-zip.ps1
```

O script mostra mensagens de progresso e confirma quando o zip está pronto.

---

## Opção 3: Comandos separados

```powershell
cd c:\AT_Manut
npm run build
npm run zip
```

Útil quando já tens o build feito e só precisas de gerar o zip novamente.

---

## Comandos PowerShell directos

```powershell
cd c:\AT_Manut
npm run build
Compress-Archive -Path "dist\*" -DestinationPath dist_upload.zip -Force
```

---

## Após gerar o zip

1. Abrir cPanel → File Manager
2. Navegar para `public_html/manut/`
3. Fazer upload de `dist_upload.zip`
4. Extrair o conteúdo (substituir ficheiros existentes)

---

## Scripts disponíveis (package.json)

| Script | Descrição |
|--------|-----------|
| `npm run build` | Build de produção (prebuild executa optimize-images) |
| `npm run zip` | Cria `dist_upload.zip` a partir de `dist/` |
| `npm run build:zip` | Build + zip numa única execução |

---

## Antes de cada deploy

1. **Incrementar versão** em `src/config/version.js` (ex.: `1.10.0` → `1.10.1`)
2. **Actualizar** `CHANGELOG.md` com as alterações
3. Executar `npm run build:zip`
4. Fazer upload do zip para o cPanel
