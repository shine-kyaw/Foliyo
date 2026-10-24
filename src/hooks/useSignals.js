import { useMemo } from 'react'
import { usStocks } from '../data/mockData'
import { useBatchQuotes } from './useBatchQuotes'
import { generateAIAnalysis } from '../utils/aiAnalysis'

/* ── Live signals ──────────────────────────────────────────────
   Runs the rule-based analysis over today's live quotes for the
   US large caps. Score = momentum (±2) + valuation (±1), so it
   ranges −3…+3; Buy ≥ +1, Sell ≤ −1, otherwise Hold. Nothing here
   is a price target — the rules don't produce one.               */
const UNIVERSE = usStocks.map(s => s.symbol)
const TYPE = { Bullish: 'BUY', Bearish: 'SELL', Neutral: 'HOLD' }

export function useSignals(pollMs = 60_000) {
  const { quotes, loading, lastUpdated } = useBatchQuotes(UNIVERSE, pollMs)

  const signals = useMemo(() => usStocks
    .filter(s => quotes[s.symbol]?.price != null)
    .map(s => {
      const q = quotes[s.symbol]
      const a = generateAIAnalysis({ ...s, price: q.price, changePct: q.changePct })
      return {
        id: s.symbol, symbol: s.symbol, name: s.name, sector: s.sector, pe: s.pe,
        price: q.price, changePct: q.changePct,
        type: TYPE[a.verdict], verdict: a.verdict, score: a.score,
        summary: a.summary, reasons: a.reasons, risks: a.risks,
      }
    })
    .sort((x, y) => Math.abs(y.score) - Math.abs(x.score) || Math.abs(y.changePct) - Math.abs(x.changePct)),
  [quotes])

  return { signals, loading: loading && !signals.length, lastUpdated }
}
