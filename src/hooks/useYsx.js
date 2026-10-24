import { useEffect, useState, useCallback } from 'react'
import { api } from '../services/api'
import { DATA_DATE, fmtMktCap } from '../data/myanmarStocks'

/**
 * Yangon Stock Exchange data (end-of-day, from ysx-mm.com via the Foliyo API).
 * Quotes are shared across components in one module-level store and re-polled
 * every 10 minutes; history is cached per code+days. Failures never fall back
 * to invented numbers: callers get `error` and decide what to show.
 */

const QUOTES_POLL_MS = 10 * 60_000
const HISTORY_TTL_MS = 10 * 60_000

/* ── Quotes ──────────────────────────────────────────────────── */
const qStore = { data: null, error: null, loading: false, ts: 0 }
const qListeners = new Set()
let qInflight = null

const qEmit = () => qListeners.forEach(fn => fn())

function loadQuotes() {
  if (qInflight) return qInflight
  qStore.loading = true
  qEmit()
  qInflight = api.ysxQuotes()
    .then(res => {
      qStore.data = res
      qStore.error = null
      qStore.ts = Date.now()
    })
    .catch(e => { qStore.error = e })
    .finally(() => {
      qStore.loading = false
      qInflight = null
      qEmit()
    })
  return qInflight
}

/**
 * @returns { quotes: { [code]: quote }, asOf, sourceUrl, loading, error, refetch }
 * `error` is only set when there is no data to show; a failed refresh keeps the last good quotes.
 */
export function useYsxQuotes() {
  const [, tick] = useState(0)

  useEffect(() => {
    const onChange = () => tick(n => n + 1)
    qListeners.add(onChange)
    if (!qStore.data || Date.now() - qStore.ts > QUOTES_POLL_MS) loadQuotes()
    const id = setInterval(loadQuotes, QUOTES_POLL_MS)
    return () => { qListeners.delete(onChange); clearInterval(id) }
  }, [])

  const data = qStore.data
  const quotes = data ? Object.fromEntries(data.data.map(q => [q.code, q])) : {}
  return {
    quotes,
    asOf: data?.asOf ?? null,
    sourceUrl: data?.sourceUrl ?? 'https://ysx-mm.com',
    loading: qStore.loading && !data,
    error: data ? null : qStore.error,
    refetch: loadQuotes,
  }
}

/* ── History ─────────────────────────────────────────────────── */
const hCache = new Map()     // key → { res, ts }
const hInflight = new Map()  // key → Promise

function loadHistory(code, days, force = false) {
  const key = `${code}:${days}`
  const hit = hCache.get(key)
  if (!force && hit && Date.now() - hit.ts < HISTORY_TTL_MS) return Promise.resolve(hit.res)
  if (hInflight.has(key)) return hInflight.get(key)
  const p = api.ysxHistory(code, days)
    .then(res => { hCache.set(key, { res, ts: Date.now() }); return res })
    .finally(() => hInflight.delete(key))
  hInflight.set(key, p)
  return p
}

/**
 * @returns { history, data, loading, error, refetch }
 * `history` is the full API response (asOf, sourceUrl, board, stale…); `data` is its rows, oldest→newest.
 */
export function useYsxHistory(code, days = 30) {
  const key = `${code}:${days}`
  const [state, setState] = useState(() => {
    const hit = hCache.get(key)
    return { key, history: hit?.res ?? null, loading: !hit, error: null }
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    const hit = hCache.get(key)
    setState({ key, history: hit?.res ?? null, loading: !hit, error: null })
    loadHistory(code, days, attempt > 0)
      .then(res => { if (!cancelled) setState({ key, history: res, loading: false, error: null }) })
      .catch(e => { if (!cancelled) setState(s => ({ key, history: s.key === key ? s.history : null, loading: false, error: e })) })
    return () => { cancelled = true }
  }, [code, days, key, attempt])

  const refetch = useCallback(() => setAttempt(n => n + 1), [])
  const current = state.key === key
  return {
    history: current ? state.history : null,
    data: current && state.history ? state.history.data : [],
    loading: current ? state.loading : true,
    error: current && !state.history ? state.error : null,
    refetch,
  }
}

/* ── Merge a live quote over the static snapshot ─────────────── */

/** Live close/change/volume when we have a quote for this stock, else the static snapshot (flagged live:false). */
export function withQuote(stock, quote) {
  if (!quote) {
    return { ...stock, date: DATA_DATE, live: false }
  }
  return {
    ...stock,
    price: quote.close,
    change: quote.change,
    changePct: quote.changePct,
    volume: quote.volume,
    traded: quote.traded,
    mktCap: stock.shares ? fmtMktCap(stock.shares, quote.close) : stock.mktCap,
    date: quote.date,
    live: true,
  }
}
