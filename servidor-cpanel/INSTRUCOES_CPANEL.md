# Instalação do endpoint de email no cPanel — navel.pt

## Nota importante
O script usa **exactamente a mesma função `mail()` do PHP** que o `send-contact.php`
que já está em funcionamento no servidor. Não precisa de PHPMailer, não precisa de
credenciais SMTP, não precisa de instalar nada extra.

---

## Instalação (2 passos)

### Passo 1 — Criar pasta e fazer upload do PHP

1. **cPanel → Administrador de ficheiros → public_html/**
2. Clicar **+ Folder** → criar pasta com o nome `api`
3. Abrir a pasta `api/`
4. Clicar **Carregar** → fazer upload dos ficheiros:
   - `send-email.php` (de `servidor-cpanel/send-email.php`)
   - `fpdf.php` (de `servidor-cpanel/fpdf184/fpdf.php` — necessário para gerar PDF com assinatura e fotos)
   - `send-report.php` (de `servidor-cpanel/api/send-report.php`)
   - `data.php`, `db.php`, `config.php` (de `servidor-cpanel/api/`)
5. Verificar permissões: **clicar no ficheiro → Permissions → 644**

Estrutura final no servidor:
```
public_html/
  api/
    send-email.php    ← relatórios com PDF
    send-report.php   ← envio de HTML (EnviarEmailModal, EnviarDocumentoModal)
    data.php, db.php, config.php
  send-contact.php    ← já existia
  index.html
  ...
```

### Passo 2 — Definir o token secreto

O token impede que terceiros utilizem o endpoint para enviar spam.

**a) Nos ficheiros PHP** — editar directamente no cPanel (ou usar variável de ambiente ATM_REPORT_AUTH_TOKEN):
   - `send-email.php`, `send-report.php`, `log-receiver.php` — usam o mesmo token
   - Em alternativa: cPanel → Advanced → Environment Variables → adicionar `ATM_REPORT_AUTH_TOKEN`

**b) Na app React** — editar `C:\AT_Manut\src\config\emailConfig.js`:
   ```js
   AUTH_TOKEN: 'Navel2026$Api!Key#xZ99',   // ← mesmo token que no PHP
   ```

**Nota:** O `send-report.php` também exige `auth_token` no body. A app envia-o automaticamente (EnviarEmailModal, EnviarDocumentoModal).

---

## Testar

Abrir no browser:
```
https://www.navel.pt/api/send-email.php
```

Resposta esperada (é o comportamento correcto — só aceita POST):
```json
{"ok":false,"message":"Método não permitido."}
```

Depois, na app AT_Manut, executar uma manutenção e clicar
**"Gravar e enviar email"** — deve chegar um email a `no-reply@navel.pt`.

---

## Se o email não chegar

Verificar em **cPanel → Email → Track Delivery** — mostra todos os
envios com estado detalhado e possíveis erros.

---

## Deployment da app AT_Manut (quando estiver pronto)

Quando quiseres publicar a app:
1. `cd C:\AT_Manut`
2. `npm run build`  → cria a pasta `dist/`
3. Fazer upload do conteúdo de `dist/` para `public_html/manut/`
   (criar a pasta `manut/` primeiro)

A app ficará acessível em: **https://www.navel.pt/manut/**

---

## navel.pt/manut sem www

Se ao digitar **navel.pt/manut** na barra de endereço o login não abrir, o cPanel pode estar a redireccionar navel.pt para www.navel.pt sem preservar o caminho `/manut`.

**Solução:** Adicionar em `public_html/.htaccess` (raiz do domínio) as regras do ficheiro `servidor-cpanel/htaccess-redirect-navel-to-www.txt`. Assim, o pedido **navel.pt/manut** passa a redireccionar correctamente para **www.navel.pt/manut**.
