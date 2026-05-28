const store = new Map()

export function get(key) {
  const e = store.get(key)
  if (!e) return null
  if (Date.now() > e.exp) { store.delete(key); return null }
  return e.data
}

export function set(key, data, ttlMs) {
  store.set(key, { data, exp: Date.now() + ttlMs })
}

export function clear(key) {
  store.delete(key)
}
