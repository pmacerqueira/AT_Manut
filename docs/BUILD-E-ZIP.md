# Build e ZIP — AT_Manut (alternativa manual)

O fluxo **recomendado** em produção é **SFTP incremental**: `npm run build` em AT_Manut e `npm run deploy:at-manut -- --yes` em `navel-site` — ver **[`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md)**.

Este ficheiro cobre apenas a geração de **`dist_upload.zip`** quando preferires **File Manager** (upload + extrair) em vez do script de deploy.

---

## Comandos

```powershell
cd c:\Cursor_Projetos\NAVEL\AT_Manut
npm run build:zip
```

Equivale a `npm run build` (inclui `prebuild` / optimize-images) + `npm run zip`.

Ou em dois passos: `npm run build` → `npm run zip`.

---

## Por que terminal externo?

Builds grandes podem consumir muita RAM; em alguns ambientes o editor fica instável. Preferir **PowerShell** ou **Windows Terminal** para `build:zip`.

---

## Extrair no cPanel

1. File Manager → `public_html/manut/`
2. Upload `dist_upload.zip`
3. Extrair (substituir ficheiros). O zip tem `index.html` e `assets/` na **raiz** do arquivo — não deve ficar uma pasta extra `dist/`.

---

## Após alterações no servidor PHP

Se mudou **email ou PDF** no backend, fazer upload separado dos PHP indicados em [`DEPLOY_CHECKLIST.md`](./DEPLOY_CHECKLIST.md) e [`../servidor-cpanel/INSTRUCOES_CPANEL.md`](../servidor-cpanel/INSTRUCOES_CPANEL.md).
