import { useEffect, useState } from 'react'
import { api } from '../services/api'
import { foliyoPosts as saved } from '../data/foliyoPosts'

/* ── Foliyo's articles ─────────────────────────────────────────
   Starts with the copy saved in the repo (instant, works offline),
   then swaps in the live list from the API, which reads the
   Facebook page directly once it has a token.                     */
let live = null
let inflight = null

export function useFoliyoPosts() {
  const [state, setState] = useState(() => live || { articles: saved, source: 'saved', loading: true })
  useEffect(() => {
    if (live) return
    inflight ||= api.foliyoPosts()
      .then(r => (live = { articles: r.articles?.length ? r.articles : saved, source: r.source || 'saved', loading: false }))
      .catch(() => (live = { articles: saved, source: 'saved', loading: false }))
    let cancelled = false
    inflight.then(v => { if (!cancelled) setState(v) })
    return () => { cancelled = true }
  }, [])
  return state
}

export const postDate = iso => {
  if (!iso) return null
  try { return new Date(iso).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }) } catch { return null }
}
