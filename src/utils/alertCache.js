const DB_NAME = 'dirham-cache'
const DB_VERSION = 1

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('alerts')) db.createObjectStore('alerts')
      if (!db.objectStoreNames.contains('notified')) db.createObjectStore('notified')
    }
    req.onsuccess = e => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

function get(storeName, key) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(storeName, 'readonly').objectStore(storeName).get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  }))
}

function put(storeName, key, value) {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    tx.objectStore(storeName).put(value, key)
    tx.oncomplete = resolve
    tx.onerror = () => reject(tx.error)
  }))
}

export const cacheAlerts = (alerts) => put('alerts', 'latest', alerts)
export const readCachedAlerts = () => get('alerts', 'latest').then(v => v || [])
export const getNotifiedIds = (dateKey) => get('notified', dateKey).then(v => v || [])
export const markNotifiedIds = (dateKey, ids) => put('notified', dateKey, ids)
