# Cron Job — Alertas Automáticos de Conformidade (AT_Manut)

> Automatiza o envio de lembretes de manutenção por email aos clientes,
> sem necessidade de o Admin estar na app.
> Ficheiro PHP: `servidor-cpanel/cron-alertas.php`
> Última revisão: 2026-02-23 — v1.6.2

---

## O que faz

O cron job executa diariamente e, para cada manutenção pendente/agendada nos
próximos **N dias** (default: 7):

1. Lê a base de dados — manutenções + máquinas + clientes
2. Verifica se o cliente tem email registado
3. Verifica se já foi enviado lembrete recentemente (evita spam)
4. Envia email HTML ao cliente com data, equipamento e urgência
5. Envia resumo diário ao email de Admin (`comercial@navel.pt`)
6. Regista tudo na tabela `alertas_log` (criada automaticamente)

---

## Passo 1 — Upload do ficheiro para o servidor

No **cPanel → Gestor de ficheiros**:

1. Navegar para `public_html/api/`
2. Fazer upload do ficheiro `servidor-cpanel/cron-alertas.php`
3. Verificar permissões: **644** (leitura pelo servidor PHP)

Estrutura após upload:
```
public_html/
  api/
    cron-alertas.php    ← NOVO
    data.php
    config.php
    db.php
    send-email.php
    ...
```

---

## Passo 2 — Criar o cron job no cPanel

### Localização no cPanel
**cPanel → Advanced → Cron Jobs**
(ou em português: **Avançado → Tarefas Agendadas**)

### Configuração do horário

Recomendado: **todos os dias às 08:00** (antes do início do dia de trabalho)

| Campo | Valor | Significado |
|-------|-------|-------------|
| Minuto | `0` | no minuto 0 |
| Hora | `8` | às 8h da manhã |
| Dia do mês | `*` | todos os dias |
| Mês | `*` | todos os meses |
| Dia da semana | `*` | todos os dias da semana |

### Comando a inserir

```bash
php /home/UTILIZADOR/public_html/api/cron-alertas.php >> /home/UTILIZADOR/logs/cron-alertas.log 2>&1
```

> **Substituir `UTILIZADOR`** pelo nome de utilizador da conta cPanel
> (ex: `navel`, `navel123`, visível no canto superior direito do cPanel)

#### Como descobrir o nome de utilizador e o caminho correcto

No cPanel → **Terminal** (ou SSH), executar:
```bash
echo $HOME
```
Resposta típica: `/home/navel123` → o utilizador é `navel123`

O caminho completo seria então:
```bash
php /home/navel123/public_html/api/cron-alertas.php >> /home/navel123/logs/cron-alertas.log 2>&1
```

#### Criar a pasta de logs (se não existir)

No **cPanel → Terminal**:
```bash
mkdir -p ~/logs
```

### Alternativa: sem guardar log em ficheiro

Se não quiseres guardar log em ficheiro (mais simples):
```bash
php /home/UTILIZADOR/public_html/api/cron-alertas.php > /dev/null 2>&1
```

---

## Passo 3 — Verificar que funciona

### Teste imediato via Terminal

No **cPanel → Terminal**:
```bash
php /home/UTILIZADOR/public_html/api/cron-alertas.php
```

Deverás ver output como:
```
[INFO] 08:00:01 — cron-alertas iniciado | {"dias_aviso":7,"data":"2026-02-23 08:00:01"}
[INFO] 08:00:01 — Ligação BD estabelecida
[INFO] 08:00:01 — Tabela alertas_log verificada/criada
[INFO] 08:00:01 — Manutenções encontradas no período | {"total":3}
[OK]   08:00:01 — Email enviado | {"cliente":"Mecânica Bettencourt","email":"...","data":"01/03/2026","dias":6}
[INFO] 08:00:02 — Email de resumo enviado ao admin | {"dest":"comercial@navel.pt"}
[INFO] 08:00:02 — cron-alertas terminado | {"enviados":1,"ignorados":0,"erros":0,"duracao":"1s"}
```

### Teste via URL (com token)

```
https://www.navel.pt/api/cron-alertas.php?token=Navel2026$Api!Key#xZ99
```

> O token deve ser igual ao definido em `config.php` como `ATM_REPORT_AUTH_TOKEN`

---

## Passo 4 — Verificar os logs

### Log em ficheiro (se configurado)
```bash
tail -50 ~/logs/cron-alertas.log
```

### Tabela alertas_log na BD

No **cPanel → phpMyAdmin → navel_atmanut**:
```sql
SELECT
  al.enviado_em,
  al.destinatario,
  al.dias_restantes,
  al.data_manut,
  al.sucesso,
  c.nome AS cliente
FROM alertas_log al
JOIN clientes c ON c.id = al.cliente_id
ORDER BY al.enviado_em DESC
LIMIT 20;
```

---

## Configuração avançada

### Alterar o número de dias de aviso

**Opção A — Variável de ambiente no cPanel** (recomendado):
```
cPanel → Advanced → Environment Variables → Adicionar:
  Nome:  ATM_DIAS_AVISO
  Valor: 14
```

**Opção B — Editar directamente no ficheiro:**
```php
// linha ~23 de cron-alertas.php
define('DIAS_AVISO', 14);   // ← alterar aqui
```

### Alterar a frequência do cron

| Frequência | Minuto | Hora | Dia | Mês | Semana |
|------------|--------|------|-----|-----|--------|
| Diário às 08:00 | `0` | `8` | `*` | `*` | `*` |
| Diário às 07:30 | `30` | `7` | `*` | `*` | `*` |
| Dias úteis às 08:00 | `0` | `8` | `*` | `*` | `1-5` |
| Duas vezes/dia (08h + 16h) | `0` | `8,16` | `*` | `*` | `*` |

### Alterar o intervalo mínimo entre lembretes

Para não enviar email todos os dias enquanto a manutenção está pendente:
```php
// linha ~28 de cron-alertas.php
define('DIAS_ENTRE_LEMBRETES', 6);  // ← máximo 1 lembrete a cada 6 dias por manutenção
```

### Alterar o email de Admin

```php
// linha ~36 de cron-alertas.php
define('EMAIL_ADMIN', 'outro@navel.pt');
```

---

## Relação com os alertas manuais na app

| | Alertas manuais (app) | Cron automático |
|--|--|--|
| **Quem aciona** | Admin clica "Enviar lembrete" no modal | Servidor, automaticamente |
| **Quando** | Quando o Admin abre o Dashboard | Todos os dias às 08:00 |
| **Endpoint usado** | `send-email.php` (tipo `lembrete`) | `cron-alertas.php` (autónomo) |
| **Destinatário** | Email do cliente seleccionado | Todos os clientes com email e manutenção próxima |
| **Log** | `atm_log` (logs da app) | `alertas_log` (tabela BD) + ficheiro |

Os dois mecanismos são independentes e complementares. O cron não interfere com os envios manuais.

---

## Tabela `alertas_log` — estrutura

Criada automaticamente pelo script na primeira execução:

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | INT AUTO_INCREMENT | Chave primária |
| `manutencao_id` | VARCHAR(32) | ID da manutenção |
| `cliente_id` | VARCHAR(32) | ID do cliente |
| `destinatario` | VARCHAR(255) | Email enviado |
| `dias_restantes` | INT | Dias até à data na altura do envio |
| `data_manut` | DATE | Data da manutenção |
| `enviado_em` | DATETIME | Timestamp do envio |
| `sucesso` | TINYINT(1) | 1=enviado, 0=falhou |
| `erro` | TEXT | Mensagem de erro (se falhou) |

---

## Troubleshooting

### "config.php não encontrado"
O script procura `config.php` no mesmo directório (`__DIR__`). Verificar que `config.php` está em `public_html/api/`.

### Emails não chegam
1. **cPanel → Email → Track Delivery** — ver estado dos envios com detalhe
2. Verificar que `FROM_EMAIL = 'no-reply@navel.pt'` é um endereço válido no domínio
3. Verificar SPF/DKIM do domínio

### "Nenhuma manutenção próxima"
- Verificar que existem manutenções com `status` = `pendente` ou `agendada` na BD
- Verificar que as datas estão correctas (formato `YYYY-MM-DD`)
- Verificar que os clientes têm campo `email` preenchido

### Emails duplicados
O campo `DIAS_ENTRE_LEMBRETES` (default: 6) garante que cada manutenção só recebe
um lembrete a cada 6 dias. Se estás a receber duplicados, verificar a tabela `alertas_log`.

### Cron não executa
- Verificar que o caminho `/home/UTILIZADOR/public_html/api/cron-alertas.php` está correcto
- Testar no Terminal do cPanel: `php /home/UTILIZADOR/public_html/api/cron-alertas.php`
- O cPanel pode ter restrições no cron — verificar em **Logs → Cron Daemon**

---

*Criado: 2026-02-23 — v1.6.2*
