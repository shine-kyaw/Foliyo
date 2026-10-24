import { API_BASE } from './api'

/* ── Account API client ────────────────────────────────────────
   The session token lives in localStorage and travels as a Bearer
   header — the API is on another site, so cookies wouldn't reach it. */
const TOKEN_KEY = 'foliyo_token'

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } }
export const setToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY) } catch {} }

export async function accountFetch(path, { method = 'GET', body } = {}) {
  const token = getToken()
  let res
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20_000),   // the API can take a while to wake
    })
  } catch {
    throw Object.assign(new Error('Couldn’t reach Foliyo’s server. Check your connection and try again.'), { status: 0 })
  }
  if (res.status === 204) return null
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw Object.assign(new Error(json.error || `Request failed (${res.status})`), { status: res.status, field: json.field, reason: json.reason })
  return json
}

export const account = {
  config:  ()                       => accountFetch('/auth/config'),
  me:      ()                       => accountFetch('/auth/me'),
  signIn:  (email, password)        => accountFetch('/auth/login',  { method: 'POST', body: { email, password } }),
  signUp:  (name, email, password)  => accountFetch('/auth/signup', { method: 'POST', body: { name, email, password } }),
  google:  credential               => accountFetch('/auth/google', { method: 'POST', body: { credential } }),
  remove:  ()                       => accountFetch('/auth/me',     { method: 'DELETE' }),
  getData: ()                       => accountFetch('/auth/data'),
  putData: (key, value)             => accountFetch(`/auth/data/${key}`, { method: 'PUT', body: { value } }),

  alerts:      ()          => accountFetch('/alerts'),
  addAlert:    alert       => accountFetch('/alerts', { method: 'POST', body: alert }),
  setStatus:   (id, status) => accountFetch(`/alerts/${id}`, { method: 'PATCH', body: { status } }),
  deleteAlert: id          => accountFetch(`/alerts/${id}`, { method: 'DELETE' }),
  importAlerts: alerts     => accountFetch('/alerts/import', { method: 'POST', body: { alerts } }),
}
