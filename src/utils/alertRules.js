/* ── Alert rules ───────────────────────────────────────────────
   Shared by the browser (signed-out alerts, checked while the app
   is open) and the API's background checker (signed-in alerts).
   Pure: give it the alert and what's known now, get a verdict.

   ctx: { price, changePct, verdict, latestNewsId, latestNewsTitle }
   returns { triggered, message, baseline } — baseline is what to
   remember for "change"-style alerts (sentiment, news).          */

const money = v => `$${Number(v).toFixed(2)}`

export function evaluateAlert(alert, ctx) {
  const { type, targetValue: target, targetSentiment } = alert
  const baseline = alert.baseline || {}
  const { price, changePct } = ctx

  switch (type) {
    case 'price_above':
      if (price == null) return { triggered: false, baseline }
      return price >= target
        ? { triggered: true, message: `price reached ${money(price)}, above your ${money(target)} target`, baseline }
        : { triggered: false, baseline }

    case 'price_below':
      if (price == null) return { triggered: false, baseline }
      return price <= target
        ? { triggered: true, message: `price fell to ${money(price)}, below your ${money(target)} target`, baseline }
        : { triggered: false, baseline }

    case 'daily_move':
      if (changePct == null) return { triggered: false, baseline }
      return Math.abs(changePct) >= target
        ? { triggered: true, message: `moved ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}% today (threshold ±${target}%)`, baseline }
        : { triggered: false, baseline }

    case 'sentiment_change': {
      const want = targetSentiment || 'Bullish'
      if (!ctx.verdict) return { triggered: false, baseline }
      // First check only records where the verdict stands
      if (!baseline.verdict) return { triggered: false, baseline: { ...baseline, verdict: ctx.verdict } }
      const flipped = ctx.verdict === want && baseline.verdict !== want
      return {
        triggered: flipped,
        message: flipped ? `outlook turned ${want} (was ${baseline.verdict})` : undefined,
        baseline: { ...baseline, verdict: ctx.verdict },
      }
    }

    case 'news_event': {
      if (ctx.latestNewsId == null) return { triggered: false, baseline }
      const id = String(ctx.latestNewsId)
      if (!baseline.newsId) return { triggered: false, baseline: { ...baseline, newsId: id } }
      const fresh = id !== baseline.newsId
      return {
        triggered: fresh,
        message: fresh ? `new headline: ${ctx.latestNewsTitle || 'see the stock page'}` : undefined,
        baseline: { ...baseline, newsId: id },
      }
    }

    default:
      return { triggered: false, baseline }
  }
}

/* Which inputs a type needs — lets callers skip fetching what isn't used */
export const needsVerdict = type => type === 'sentiment_change'
export const needsNews    = type => type === 'news_event'
