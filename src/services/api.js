/**
 * Internal API client — calls our backend server at /api/*.
 * In production (Vercel) VITE_API_URL points to the Render API server.
 * In dev the Vite proxy forwards /api/* to localhost:3001.
 */

// e.g. "https://foliyo-api.onrender.com" — no trailing slash
const API_BASE = import.meta.env.VITE_API_URL || ''

async function apiFetch(path, params = {}) {
  const url = new URL(`${API_BASE}/api${path}`, API_BASE || window.location.origin)
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v)
  })
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(12000) })
  const json = await res.json()
  if (!res.ok) throw Object.assign(new Error(json.error || `API ${res.status}`), { status: res.status })
  return json
}

export const api = {
  /** Live stock quote from Finnhub */
  quote: (symbol) => apiFetch('/quote', { symbol }),

  /** Batch quote (up to 50 symbols). Splits into two parallel requests if > 20 symbols
   *  so the first half resolves ~2x faster and the server can cache hits for both halves. */
  quotes: async (symbols) => {
    const list = Array.isArray(symbols) ? symbols : symbols.split(',').map(s => s.trim()).filter(Boolean)
    if (list.length <= 20) {
      return apiFetch('/quotes', { symbols: list.join(',') })
    }
    // Split into two parallel halves
    const mid  = Math.ceil(list.length / 2)
    const [a, b] = await Promise.all([
      apiFetch('/quotes', { symbols: list.slice(0, mid).join(',') }),
      apiFetch('/quotes', { symbols: list.slice(mid).join(',') }),
    ])
    return {
      quotes: { ...(a.quotes || {}), ...(b.quotes || {}) },
      count: (a.count || 0) + (b.count || 0),
      lastUpdated: b.lastUpdated ?? a.lastUpdated,
    }
  },

  /** Historical chart data (Twelve Data → Finnhub fallback) */
  chart: (symbol, range = '1M') => apiFetch('/chart', { symbol, range }),

  /** Company-specific news (symbol required) or market-wide news (no symbol) */
  news: (symbol) => apiFetch('/news', { symbol }),

  /** General market news */
  marketNews: () => apiFetch('/market-news'),

  /** Stock fundamentals: PE, PB, beta, description, etc. */
  fundamentals: (symbol) => apiFetch('/fundamentals', { symbol }),

  /** Symbol + company name search */
  search: (q) => apiFetch('/search', { q }),

  /** Live commodity prices via Twelve Data */
  commodities: () => apiFetch('/commodities'),

  /** Live crypto prices via Twelve Data */
  crypto: () => apiFetch('/crypto'),

  /** Live forex rates via Twelve Data */
  forex: () => apiFetch('/forex'),

  /** Trending stocks (top 10) with live quotes */
  trending: () => apiFetch('/stocks/trending'),

  /** Live market indices: S&P 500, NASDAQ, Dow Jones */
  indices: () => apiFetch('/stocks/indices'),

  /** Health check — shows which API keys are configured */
  health: () => apiFetch('/health'),
}
