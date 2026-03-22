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
   - `fpdf.php` (de `servidor-cpanel/api/fpdf.php` — necessário para gerar PDF com assinatura e fotos)
   - `send-report.php` (de `servidor-cpanel/api/send-report.php`)
   - `data.php`, `db.php`, `config.php`, `atm_log.php`, `tecnico_horario_restrito.php` (de `servidor-cpanel/api/`)
   - Opcional: `tecnico_horario_restrito.json` — copiar de `tecnico_horario_restrito.json.example`, editar e pôr `"enabled": true` para bloquear o perfil técnico (role `tecnico`) nos períodos definidos
   - Pasta `font/` completa (de `servidor-cpanel/api/font/` — fontes usadas pelo FPDF)
5. Verificar permissões: **clicar no ficheiro → Permissions → 644**

**PDFs técnicos (planos, manuais importados pela app):** a primeira importação em **Documentação técnica** cria a pasta `public_html/uploads/machine-docs/` (permissoes de escrita para o PHP). Os ficheiros são servidos em `https://(domínio)/uploads/machine-docs/…`. O `data.php` actual define o upload Admin (`machine_pdf`), substituição opcional do ficheiro anterior (`replacePath`) e gravação da lista em `maquinas.documentos` via o frontend.

Estrutura final no servidor:
```
public_html/
  api/
    data.php             ← endpoint central: CRUD MySQL (todas as entidades)
    db.php, config.php   ← ligação à base de dados
    atm_log.php          ← registo de logs do servidor
    send-email.php       ← envio de relatórios com PDF e lembretes de conformidade
    send-report.php      ← corpo HTML; anexo PDF opcional (base64), ex. relatório de frota
    fpdf.php             ← biblioteca FPDF (geração de PDF no servidor)
    font/                ← fontes FPDF (Helvetica, Courier, Times, etc.)
    log-receiver.php     ← receptor de logs do frontend
    istobal-webhook.php  ← webhook para recepção de avisos ISTOBAL por email
    parse-istobal-email.php ← parsing de emails ISTOBAL
  uploads/
    machine-docs/        ← PDFs técnicos por equipamento (criada pelo 1.º upload ou manualmente)
  cron-alertas.php       ← cron diário de lembretes de conformidade
  send-contact.php       ← já existia (formulário de contacto do site)
  index.html
  ...
```

### Passo 2 — Definir o token secreto

O token impede que terceiros utilizem o endpoint para enviar spam.

**a) Nos ficheiros PHP** — editar directamente no cPanel (ou usar variável de ambiente ATM_REPORT_AUTH_TOKEN):
   - `send-email.php`, `send-report.php`, `log-receiver.php` — usam o mesmo token
   - Em alternativa: cPanel → Advanced → Environment Variables → adicionar `ATM_REPORT_AUTH_TOKEN`

**b) Na app React** — editar `c:\Cursor_Projetos\NAVEL\AT_Manut\src\config\emailConfig.js`:
   ```js
   AUTH_TOKEN: 'Navel2026$Api!Key#xZ99',   // ← mesmo token que no PHP
   ```

**Nota:** O `send-report.php` também exige `auth_token` no body. A app envia-o automaticamente (EnviarEmailModal, EnviarDocumentoModal).

### Sandbox automático (localhost / Vite / Playwright)

Se o pedido POST tiver **Origin** ou **Referer** em `http://localhost:*`, `http://127.0.0.1:*` ou `[::1]:*`, o PHP **ignora** o destinatário pedido e envia só para **`comercial@navel.pt`** (evita testes E2E ou `npm run dev` a dispararem correio para clientes reais). Opcional: variável de ambiente **`ATM_DEV_SANDBOX_EMAIL`** para outra caixa interna.

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

## Relatório de frota / `send-report.php` — «Failed to fetch» no browser

O envio de **manutenção** usa `send-email.php`; o de **frota** (HTML + PDF em JSON) usa `send-report.php`. O pedido é **muito maior** (corpo HTML + `pdf_base64`).

Se na app aparecer **Failed to fetch** (sem mensagem do PHP):

1. **`public_html/api/.user.ini`** — Aumentar `post_max_size` e `upload_max_filesize` (ex.: **48M**). Ver `servidor-cpanel/api-user-ini.txt`.

2. **ModSecurity / WAF** — Em alojamento partilhado **não** uses `SecRuleEngine Off` no `.htaccess` da pasta `api/` (causa **erro 500 em `data.php`** e o login deixa de funcionar). O modelo `api-htaccess.txt` no repositório mantém esse bloco **comentado**. Para excepções ao WAF, usa o painel **ModSecurity™** do cPanel ou pede ao hosting uma regra para `/api/send-report.php`.

3. **App** — Envio HTML+PDF usa `/api/send-report.php`; mensagens de erro na app lembram limites de POST quando aplicável.

Depois de alterar `.user.ini`, esperar ~5 minutos (cache PHP) ou recarregar PHP no cPanel.

### Erro 500 em `/api/data.php` (login impossível)

Quase sempre: **`.htaccess` em `api/` com directivas proibidas** (ex. `SecRuleEngine`). **Apaga** o ficheiro ou deixa-o só com comentários — o login deve voltar logo.

---

## Horário restrito — utilizadores ATecnica (role `tecnico`)

A API valida **login** e **cada pedido** com JWT: fora do horário permitido, o técnico recebe HTTP 403 com `code: "TECNICO_HORARIO_RESTRITO"`.

1. No servidor, em `public_html/api/`, copiar `tecnico_horario_restrito.json.example` para `tecnico_horario_restrito.json`.
2. Editar o JSON:
   - `"enabled": true`
   - `"timezone"`: normalmente `"Atlantic/Azores"`
   - `"blocks"`: lista de períodos. Em cada bloco, `"days"` usa **0 = domingo … 6 = sábado**. Horas `"from"` / `"to"` no formato `HH:mm`. Se `from` > `to`, o intervalo **atravessa meia-noite** (ex.: `19:00` → `07:30`).
3. Fazer **deploy** de `config.php` actualizado (define o caminho do JSON) e `data.php`, `db.php`, `tecnico_horario_restrito.php`.
4. **Desligar de emergência** sem apagar o ficheiro: no cPanel → *Environment Variables* → `ATM_TECNICO_HORARIO_DISABLED` = `1`.
5. Caminho alternativo do JSON: variável `ATM_TECNICO_HORARIO_JSON` (caminho absoluto no servidor).

Na app React, editar também `src/config/tecnicoHorarioRestrito.js` com os **mesmos** `enabled`, `timezone` e `blocks`, para o cliente encerrar a sessão quando o relógio entra num período restrito (a segurança efectiva é sempre na API).

---

## Deployment da app AT_Manut (quando estiver pronto)

Quando quiseres publicar a app:
1. `cd c:\Cursor_Projetos\NAVEL\AT_Manut`
2. `npm run build:zip`  → cria a pasta `dist/` e o `dist_upload.zip`
3. Fazer upload do conteúdo de `dist/` para `public_html/manut/`
   (criar a pasta `manut/` primeiro)

A app ficará acessível em: **https://www.navel.pt/manut/**

---

## navel.pt/manut sem www

Se ao digitar **navel.pt/manut** na barra de endereço o login não abrir, o cPanel pode estar a redireccionar navel.pt para www.navel.pt sem preservar o caminho `/manut`.

**Solução:** Adicionar em `public_html/.htaccess` (raiz do domínio) as regras do ficheiro `servidor-cpanel/htaccess-redirect-navel-to-www.txt`. Assim, o pedido **navel.pt/manut** passa a redireccionar correctamente para **www.navel.pt/manut**.
