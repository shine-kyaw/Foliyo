/**
 * Finnhub API service — https://finnhub.io/docs/api
 *
 * To use live data, create .env.local with:
 *   VITE_FINNHUB_API_KEY=your_key_here
 *
 * Free tier: 60 req/min. Cache TTL = 60 s to stay within limits.
 * All functions resolve to real data when key is present, or throw
 * so callers can fall back to mock data gracefully.
 */

const BASE    = 'https://finnhub.io/api/v1'
const API_KEY = import.meta.env.VITE_FINNHUB_API_KEY || ''

/* ── In-memory cache ─────────────────────────────────────────── */
const _cache    = new Map()
const CACHE_TTL = 60_000          // 1 minute for quotes
const NEWS_TTL  = 300_000         // 5 minutes for news

function getCached(key) {
  const entry = _cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > entry.ttl) { _cache.delete(key); return null }
  return entry.data
}
function setCached(key, data, ttl = CACHE_TTL) {
  _cache.set(key, { data, ts: Date.now(), ttl })
}

/* ── Core fetch ──────────────────────────────────────────────── */
async function apiFetch(endpoint, params = {}, ttl = CACHE_TTL) {
  if (!API_KEY) throw new Error('FINNHUB_KEY_MISSING')

  const qs  = new URLSearchParams({ ...params, token: API_KEY }).toString()
  const url = `${BASE}${endpoint}?${qs}`

  const cached = getCached(url)
  if (cached !== null) return cached

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`)
  const data = await res.json()
  setCached(url, data, ttl)
  return data
}

/* ── Public API ──────────────────────────────────────────────── */

/**
 * Real-time stock quote.
 * Returns { c, d, dp, h, l, o, pc, t }
 *   c  = current price
 *   d  = day change ($)
 *   dp = day change (%)
 *   h  = day high
 *   l  = day low
 *   o  = day open
 *   pc = previous close
 *   t  = unix timestamp
 */
export async function getQuote(symbol) {
  const data = await apiFetch('/quote', { symbol })
  if (!data.c || data.c === 0) throw new Error('EMPTY_QUOTE')
  return data
}

/**
 * Basic company profile.
 * Returns { name, ticker, finnhubIndustry, marketCapitalization, logo, ... }
 */
export async function getCompanyProfile(symbol) {
  return apiFetch('/stock/profile2', { symbol }, 3_600_000) // 1-hour cache
}

/**
 * General market news.
 * category: 'general' | 'forex' | 'crypto' | 'merger'
 */
export async function getMarketNews(category = 'general') {
  return apiFetch('/news', { category, minId: 0 }, NEWS_TTL)
}

/**
 * Company-specific news in a date range.
 * Dates in YYYY-MM-DD format.
 */
export async function getCompanyNews(symbol, from, to) {
  return apiFetch('/company-news', { symbol, from, to }, NEWS_TTL)
}

/**
 * OHLCV candle data.
 * resolution: '1'|'5'|'15'|'30'|'60'|'D'|'W'|'M'
 * from/to: unix timestamps
 */
export async function getCandles(symbol, resolution, from, to) {
  return apiFetch('/stock/candle', { symbol, resolution, from, to })
}

/** Crypto quote from Binance exchange. */
export async function getCryptoCandles(symbol, resolution, from, to) {
  return apiFetch('/crypto/candle', { symbol, resolution, from, to })
}

/** Forex candles. */
export async function getForexCandles(symbol, resolution, from, to) {
  return apiFetch('/forex/candle', { symbol, resolution, from, to })
}

/** Check if key is configured. */
export const hasApiKey = () => Boolean(API_KEY)

/* ── Market status helper ────────────────────────────────────── */
export function isMarketOpen() {
  const now = new Date()
  const day = now.getUTCDay()
  if (day === 0 || day === 6) return false                     // weekend
  const hours = now.getUTCHours()
  const mins  = now.getUTCMinutes()
  const utcMins = hours * 60 + mins
  // NYSE: 9:30 – 16:00 ET = 14:30 – 21:00 UTC (EST, no DST adjust for simplicity)
  return utcMins >= 870 && utcMins < 1260
}

export function marketStatusLabel() {
  return isMarketOpen() ? 'Live' : 'Market Closed'
}
