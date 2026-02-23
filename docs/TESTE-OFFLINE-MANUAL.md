# Guia de Teste Manual — Funcionalidade Offline/Sincronização
## AT_Manut — Fevereiro 2026

---

## Pré-requisitos

1. **Servidor dev a correr:**
   ```powershell
   npm run dev
   ```
   Confirmar que está acessível em `http://localhost:5174/manut/` (ou porta indicada no terminal)

2. **Browser:** Chrome, Edge ou Firefox (com DevTools)

3. **Credenciais:**
   - Username: `admin` / Password: `admin123`
   - OU Username: `tecnico` / Password: `tecnico123`

---

## CENÁRIO 1 — Online normal

### Objetivo
Verificar que o cache local é criado e populado quando a aplicação carrega online.

### Passos

1. **Navegar para login:**
   - Abrir `http://localhost:5174/manut/login`

2. **Fazer login:**
   - Username: `admin`
   - Password: `admin123`
   - Clicar em "Entrar"

3. **Aguardar Dashboard carregar:**
   - Esperar que a página do Dashboard apareça (pode demorar 1-2 segundos)

4. **Abrir DevTools:**
   - Pressionar `F12` (ou `Ctrl+Shift+I` / `Cmd+Option+I`)
   - Ir à tab **Application** (Chrome/Edge) ou **Storage** (Firefox)
   - No painel esquerdo: **Local Storage** → `http://localhost:5174`

5. **Procurar chave `atm_cache_v1`:**
   - Clicar na chave `atm_cache_v1`
   - Verificar o valor no painel direito

6. **Verificar estrutura:**
   - Deve ter formato: `{ "ts": <timestamp>, "data": { "clientes": [...], "maquinas": [...], ... } }`
   - Confirmar que `ts` existe (timestamp do cache)
   - Confirmar que `data` tem arrays: `clientes`, `maquinas`, `manutencoes`, etc.

7. **Screenshot:**
   - Tirar screenshot da tab Application com a chave `atm_cache_v1` visível

8. **Verificar banner offline:**
   - Olhar para o topo da aplicação
   - **NÃO deve aparecer** nenhum banner colorido (amarelo/laranja/azul) porque está online

### Resultado Esperado

- ✅ Chave `atm_cache_v1` **presente** no localStorage
- ✅ Chave tem **dados válidos** (objeto com `ts` e `data`)
- ✅ Banner offline **NÃO visível**

### Reportar

- [ ] Chave `atm_cache_v1` presente? **SIM / NÃO**
- [ ] Tem dados (clientes, maquinas, etc.)? **SIM / NÃO**
- [ ] Banner offline visível? **SIM / NÃO** (esperado: NÃO)

---

## CENÁRIO 2 — Offline, abrir app com cache

### Objetivo
Verificar que a aplicação carrega dados do cache local quando está offline e mostra o banner de aviso.

### Passos

1. **Ainda com o Dashboard aberto** (do CENÁRIO 1)

2. **Abrir DevTools → tab Network:**
   - Ir à tab **Network** (Rede)
   - No dropdown de throttling (canto superior direito da tab Network):
     - Chrome/Edge: Selecionar **"Offline"**
     - Firefox: Clicar no ícone de rede e selecionar **"Offline"**

3. **Recarregar a página:**
   - Pressionar `F5` ou `Ctrl+R` / `Cmd+R`
   - Aguardar 2-3 segundos (pode demorar porque vai tentar fetch e depois cair para cache)

4. **Verificar banner offline:**
   - Olhar para o topo da aplicação
   - Deve aparecer uma **barra colorida** (amarela ou laranja) com mensagem sobre estar offline

5. **Ler texto do banner:**
   - Anotar o texto exato do banner
   - Exemplo esperado: "Sem ligação — dados guardados (22/02/2026, 10:30)"

6. **Verificar se dados aparecem:**
   - Olhar para o Dashboard
   - Verificar se aparecem:
     - Estatísticas (número de clientes, máquinas, etc.)
     - Gráficos ou listas
   - **OU** está completamente vazio?

7. **Screenshot:**
   - Tirar screenshot da aplicação offline com o banner visível

### Resultado Esperado

- ✅ Banner offline **aparece** (barra amarela/laranja no topo)
- ✅ Texto do banner indica "sem ligação" ou "offline" + data/hora do cache
- ✅ Dados **aparecem** no Dashboard (vindos do cache)

### Reportar

- [ ] Banner offline apareceu? **SIM / NÃO**
- [ ] Que texto tem o banner? **"_______________________"**
- [ ] Os dados aparecem no Dashboard? **SIM / NÃO / PARCIAL**

---

## CENÁRIO 3 — Offline, fazer uma mutação

### Objetivo
Verificar que operações (criar/editar/eliminar) feitas offline são enfileiradas para sincronização posterior.

### Passos

1. **Ainda em modo offline** (Network → Offline)

2. **Navegar para a secção "Clientes":**
   - Clicar no menu lateral (ícone ou texto "Clientes")
   - Aguardar a página carregar

3. **Tentar criar um novo cliente:**
   - Clicar em botão "Adicionar Cliente" ou "Novo Cliente"
   - Preencher formulário:
     - Nome: `Cliente Teste Offline`
     - NIF: `999999999`
     - (outros campos opcionais)
   - Clicar em "Guardar" ou "Criar"

4. **Observar feedback:**
   - Deve aparecer uma notificação (Toast) a indicar que a operação foi guardada/enfileirada
   - **OU** o banner pode mudar para indicar "X operações aguardam sincronização"

5. **Ir a DevTools → Application → Local Storage:**
   - Procurar chave `atm_sync_queue`
   - Clicar na chave e ver o valor

6. **Verificar estrutura da fila:**
   - Deve ser um **array** com pelo menos 1 item
   - Cada item tem: `{ queueId, ts, resource, action, id, data }`
   - Exemplo:
     ```json
     [
       {
         "queueId": "sq_1708617234567_a3f2",
         "ts": 1708617234567,
         "resource": "clientes",
         "action": "create",
         "id": null,
         "data": { "nif": "999999999", "nome": "Cliente Teste Offline", ... }
       }
     ]
     ```

7. **Screenshot:**
   - Tirar screenshot da chave `atm_sync_queue` no localStorage

### Resultado Esperado

- ✅ Chave `atm_sync_queue` **existe** no localStorage
- ✅ Fila **tem itens** (array com length > 0)
- ✅ Item na fila tem `resource: "clientes"` e `action: "create"` (ou update/delete conforme operação)

### Reportar

- [ ] `atm_sync_queue` existe? **SIM / NÃO**
- [ ] Tem itens na fila? **SIM / NÃO** (quantos? **___**)
- [ ] Que operação está na fila? **resource: _____, action: _____**

---

## CENÁRIO 4 — Voltar online e sincronizar

### Objetivo
Verificar que ao voltar online, a fila de sincronização é processada automaticamente e os dados são enviados ao servidor.

### Passos

1. **Ir a DevTools → Network:**
   - Mudar de **"Offline"** para **"No throttling"** (ou "Online")
   - Isto simula voltar a ter ligação à internet

2. **Aguardar alguns segundos (3-5s):**
   - O listener `'online'` deve disparar automaticamente
   - A aplicação vai tentar processar a fila de sincronização

3. **Observar o banner:**
   - Deve **mudar de estado**:
     - Pode aparecer "A sincronizar operações pendentes…" (azul com spinner)
     - Depois deve **desaparecer** (ou mudar para verde "Sincronizado")
   - Anotar as mudanças de estado do banner

4. **Verificar a fila de sincronização:**
   - Ir a DevTools → Application → Local Storage → `atm_sync_queue`
   - Verificar se a fila está **vazia** (array vazio `[]` ou chave não existe)

5. **Verificar dados actualizados:**
   - Navegar de volta para "Clientes"
   - Verificar se o cliente criado offline (`Cliente Teste Offline`) aparece na lista
   - **OU** se foi rejeitado (pode acontecer se NIF duplicado, etc.)

6. **Screenshot:**
   - Tirar screenshot do estado pós-sync (banner desaparecido, fila vazia)

7. **Verificar console (DevTools → Console):**
   - Procurar mensagens de log relacionadas com sincronização
   - Exemplo: `DataContext › processSync: X operação(ões) sincronizadas com o servidor`
   - Anotar quaisquer erros visíveis

### Resultado Esperado

- ✅ Banner **mudou de estado** (mostrou "a sincronizar" e depois desapareceu)
- ✅ Fila `atm_sync_queue` ficou **vazia** (array vazio ou chave removida)
- ✅ Dados estão **consistentes** (cliente aparece na lista ou foi rejeitado com feedback)
- ✅ Sem erros no console (ou erros esperados/documentados)

### Reportar

- [ ] O banner mudou de estado? **SIM / NÃO** (descrever: _____________)
- [ ] A fila ficou vazia? **SIM / NÃO**
- [ ] Os dados estão consistentes? **SIM / NÃO / PARCIAL**
- [ ] Erros no console? **SIM / NÃO** (se sim, copiar mensagens)

---

## RESUMO FINAL

### Estrutura do Relatório

```
=== TESTE OFFLINE/SINCRONIZAÇÃO — AT_Manut ===
Data: __/__/____  Hora: __:__
Testador: _____________
Browser: _______________ (versão: ___)

┌─────────────┬────────┬──────────────────────────────────────┐
│ CENÁRIO     │ RESULT │ OBSERVAÇÕES                          │
├─────────────┼────────┼──────────────────────────────────────┤
│ 1. Online   │ PASS   │ Cache criado, banner não visível     │
│ 2. Offline  │ PASS   │ Banner apareceu, dados do cache OK   │
│ 3. Mutação  │ PASS   │ Fila criada, 1 item enfileirado      │
│ 4. Sync     │ FAIL   │ Fila não esvaziou, erro no console   │
└─────────────┴────────┴──────────────────────────────────────┘

### O que funcionou correctamente:
- Cache local criado e populado online
- Banner offline aparece quando sem ligação
- Dados carregam do cache offline
- Operações offline são enfileiradas

### O que falhou ou não funcionou como esperado:
- Sincronização não disparou automaticamente ao voltar online
- Fila permaneceu com itens após 5s online
- Erro no console: "TypeError: Cannot read property 'apiCall' of undefined"

### Erros visíveis no console:
[Copiar/colar mensagens de erro aqui]

### Screenshots anexados:
- cenario1-cache.png
- cenario2-offline.png
- cenario3-mutacao-offline.png
- cenario4-pos-sync.png
```

---

## Notas Técnicas

### Chaves localStorage relevantes:

- `atm_cache_v1` — Cache de todos os dados (clientes, máquinas, manutenções, etc.)
- `atm_sync_queue` — Fila de operações pendentes de sincronização
- `atm_clientes`, `atm_maquinas`, etc. — Dados persistidos (legacy, pode não existir)

### Comportamento esperado do banner:

| Estado                     | Cor      | Ícone       | Texto                                                  |
|----------------------------|----------|-------------|--------------------------------------------------------|
| Online limpo               | —        | —           | (oculto)                                               |
| Offline sem pendentes      | Amarelo  | CloudOff    | "Sem ligação — dados guardados (DD/MM/AAAA, HH:MM)"   |
| Offline com pendentes      | Laranja  | WifiOff     | "Sem ligação · X operação(ões) aguardam sincronização" |
| Online a sincronizar       | Azul     | RefreshCw ↻ | "A sincronizar operações pendentes…"                   |
| Online com pendentes       | Laranja  | RefreshCw   | "X operação(ões) aguardam envio" + botão Sincronizar   |

### Estrutura da fila de sincronização:

```typescript
interface SyncQueueItem {
  queueId: string        // 'sq_<timestamp>_<random>'
  ts: number             // timestamp de criação
  resource: string       // 'clientes' | 'maquinas' | 'manutencoes' | ...
  action: string         // 'create' | 'update' | 'delete' | 'bulk_create'
  id: string | null      // ID do registo (null para create)
  data: any | null       // payload de dados
}
```

---

## Troubleshooting

### Problema: Banner não aparece offline

- **Causa:** Listener `'offline'` não disparou ou componente `OfflineBanner` não está montado
- **Solução:** Verificar se `<OfflineBanner />` está no `Layout.jsx` e se `DataContext` está a actualizar `isOnline`

### Problema: Fila não é criada

- **Causa:** Operação não foi interceptada ou `enqueue()` falhou
- **Solução:** Verificar se `persist()` está a ser chamado nas funções de mutação (addCliente, updateCliente, etc.)

### Problema: Sincronização não dispara

- **Causa:** Evento `'online'` não disparou ou `processSync()` tem erro
- **Solução:** 
  1. Disparar manualmente no console: `window.dispatchEvent(new Event('online'))`
  2. Verificar console por erros em `DataContext › processSync`

### Problema: Dados não aparecem offline

- **Causa:** Cache não foi criado ou expirou (TTL 30 dias)
- **Solução:** Fazer login online primeiro para popular cache, depois testar offline

---

## Executar Teste Automatizado (Opcional)

Se tiver Playwright instalado:

```powershell
# Instalar Playwright (apenas primeira vez)
npm install -D @playwright/test
npx playwright install

# Executar teste
npx playwright test tests/offline-sync-test.spec.js --headed

# Ver relatório
npx playwright show-report
```

Os screenshots serão guardados em `tests/screenshots/`.

---

**Fim do guia de teste manual**
