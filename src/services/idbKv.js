/**
 * idbKv.js — armazenamento chave/valor em IndexedDB, por base de dados.
 *
 * Cada módulo abre a sua própria base (nome distinto) com uma única store,
 * para não colidir com `atm_offline_v1` (cache) nem forçar migrações de versão.
 * Todas as funções rejeitam quando o IndexedDB não está disponível — o chamador
 * decide o fallback.
 */

function openDb(dbName, storeName) {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    let req
    try {
      req = indexedDB.open(dbName, 1)
    } catch (err) {
      reject(err)
      return
    }
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('Falha ao abrir IndexedDB'))
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'))
  })
}

function run(dbName, storeName, mode, fn) {
  return openDb(dbName, storeName).then(db => new Promise((resolve, reject) => {
    let result
    const tx = db.transaction(storeName, mode)
    const store = tx.objectStore(storeName)
    try {
      const req = fn(store)
      if (req) {
        req.onsuccess = () => { result = req.result }
        req.onerror = () => reject(req.error ?? new Error('Falha IndexedDB'))
      }
    } catch (err) {
      db.close()
      reject(err)
      return
    }
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onerror = () => { db.close(); reject(tx.error ?? new Error('Falha transacção IndexedDB')) }
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('Transacção IndexedDB abortada')) }
  }))
}

/** Cria um acesso chave/valor a `dbName`/`storeName`. */
export function createKvStore(dbName, storeName = 'kv') {
  return {
    get: (key) => run(dbName, storeName, 'readonly', s => s.get(key)).then(v => v ?? null),
    set: (key, value) => run(dbName, storeName, 'readwrite', s => s.put(value, key)).then(() => true),
    del: (key) => run(dbName, storeName, 'readwrite', s => s.delete(key)).then(() => true),
    keys: () => run(dbName, storeName, 'readonly', s => s.getAllKeys()).then(v => v ?? []),
    clear: () => run(dbName, storeName, 'readwrite', s => s.clear()).then(() => true),
  }
}
