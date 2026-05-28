/* ── AI Analysis Generator ─────────────────────────────────────
   Deterministic: same stock data → same verdict every render.
   Does NOT use Math.random(). All logic is data-driven.
   ────────────────────────────────────────────────────────────── */

const SECTOR_BULL = {
  Technology:      'AI and cloud infrastructure demand remains structurally robust',
  Healthcare:      'Defensive profile provides relative downside protection',
  Financials:      'Rate environment continues to support net interest income growth',
  Energy:          'Supply-demand dynamics keeping commodity prices supported',
  'Cons. Disc.':   'Consumer resilience supporting discretionary spending trends',
  Communication:   'Digital advertising recovery and streaming growth gaining pace',
  'Cons. Staples': 'Consistent demand with strong pricing power intact',
  Industrials:     'Infrastructure spending cycle benefiting industrial names',
}

const SECTOR_RISK = {
  Technology:      'Interest rate sensitivity can compress growth-stock multiples quickly',
  Healthcare:      'Drug pricing regulation and FDA decisions create binary risk events',
  Financials:      'Credit quality deteriorates rapidly in a softening economy',
  Energy:          'Demand destruction fears intensify as global growth slows',
  'Cons. Disc.':   'Consumer spending highly sensitive to employment and inflation data',
  Communication:   'Regulatory scrutiny and platform competition risks are rising',
  'Cons. Staples': 'Margin compression risk if input cost inflation re-accelerates',
  Industrials:     'Capex cycle slowdown can reduce order volumes meaningfully',
}

export function generateAIAnalysis(stock) {
  if (!stock) return null
  const { name = '', symbol = '', price = 0, changePct = 0, pe, mktCap, sector = '' } = stock

  /* ── Score ─────────────────────────────────────────────────── */
  let score = 0
  if      (changePct >  2)   score += 2
  else if (changePct >  0.5) score += 1
  else if (changePct < -2)   score -= 2
  else if (changePct < -0.5) score -= 1
  if (pe) {
    if (pe < 20) score += 1
    else if (pe > 60) score -= 1
  }

  const verdict = score >= 1 ? 'Bullish' : score <= -1 ? 'Bearish' : 'Neutral'

  /* ── Strings ────────────────────────────────────────────────── */
  const pct     = `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
  const absChg  = Math.abs(changePct)
  const mom     = absChg > 2 ? 'strong' : absChg > 0.5 ? 'steady' : 'mixed'
  const first   = name.split(' ')[0]

  const summary = {
    Bullish: `${name} is showing ${mom} upside momentum (${pct} today). The ${sector} sector is seeing constructive price action and ${first} appears well-positioned with supportive fundamentals near current levels.`,
    Neutral: `${name} is trading with mixed signals (${pct} today). ${sector} sector momentum is balanced — no clear near-term directional catalyst. Waiting for confirmation before taking a position is prudent.`,
    Bearish: `${name} is experiencing ${mom} selling pressure (${pct} today). The current ${sector} environment warrants caution. Monitor key support levels closely for signs of stabilization.`,
  }[verdict]

  /* ── Reasons ────────────────────────────────────────────────── */
  const reasonPool = []
  if (changePct > 0)             reasonPool.push(`Positive price action today (${pct})`)
  if (changePct > 1.5)           reasonPool.push('Strong intraday buying above key technical levels')
  if (changePct < 0 && changePct > -2) reasonPool.push('Mild pullback may offer a potential entry opportunity')
  if (pe && pe < 20)             reasonPool.push(`Attractive valuation at ${pe}x P/E — below historical sector average`)
  else if (pe && pe < 40)        reasonPool.push(`Balanced P/E of ${pe}x — fairly valued for a ${sector.toLowerCase()} company`)
  else if (pe && pe >= 40)       reasonPool.push(`Premium multiple (${pe}x) reflects high market growth expectations`)
  if (SECTOR_BULL[sector])       reasonPool.push(SECTOR_BULL[sector])
  if (mktCap && (mktCap.includes('T') || parseInt(mktCap) > 200)) {
    reasonPool.push('Substantial institutional ownership provides structural price stability')
  }
  const reasons = reasonPool.slice(0, 3)

  /* ── Risks ──────────────────────────────────────────────────── */
  const riskPool = []
  if (pe && pe > 50)   riskPool.push(`Elevated P/E (${pe}x) leaves limited margin for earnings disappointments`)
  if (changePct < -1)  riskPool.push('Near-term selling pressure could extend if key support levels break')
  riskPool.push('Broader market corrections typically amplify individual stock moves')
  if (SECTOR_RISK[sector]) riskPool.push(SECTOR_RISK[sector])
  const risks = riskPool.slice(0, 3)

  /* ── Technical ──────────────────────────────────────────────── */
  const techSummary = changePct > 1.2
    ? `Short-term trend is bullish — price is breaking above recent consolidation with volume confirmation. Watch for potential resistance near $${(price * 1.03).toFixed(2)}.`
    : changePct < -1.2
    ? `Short-term trend has weakened — price is testing key support. A close below $${(price * 0.97).toFixed(2)} would signal further downside risk.`
    : `Price is in a neutral consolidation range. Momentum indicators are flat. Key level to watch: $${price.toFixed(2)}.`

  /* ── Fundamental ────────────────────────────────────────────── */
  let fundSummary = ''
  if (pe) {
    fundSummary = `Trades at ${pe}x earnings (TTM). `
    if      (pe < 20) fundSummary += 'Value-oriented with room for multiple expansion. '
    else if (pe > 50) fundSummary += 'Growth-priced — high future earnings already reflected. '
    else              fundSummary += 'Fairly valued relative to sector peers. '
  }
  if (mktCap) fundSummary += `Market cap: ${mktCap}. `
  fundSummary += `Classified under ${sector}.`

  /* ── News Impact ────────────────────────────────────────────── */
  const newsImpact = changePct > 0.5
    ? 'Recent news flow appears constructive. No major negative catalysts currently flagged.'
    : changePct < -0.5
    ? 'Negative sentiment may be amplified by recent headlines. Monitor upcoming earnings closely.'
    : 'News flow is neutral. Pricing likely reflects broad market conditions.'

  return { verdict, summary, reasons, risks, techSummary, fundSummary, newsImpact, score }
}

export function generateComparisonSummary(stockList) {
  if (!stockList || stockList.length < 2) return ''
  const analyses = stockList.map(s => ({ ...s, ...generateAIAnalysis(s) }))
  const bullish  = analyses.filter(a => a.verdict === 'Bullish')
  const best     = analyses.reduce((a, b) => a.changePct > b.changePct ? a : b)
  const worstPE  = analyses.filter(a => a.pe).sort((a, b) => b.pe - a.pe)[0]

  let text = ''
  if (bullish.length === analyses.length) {
    text = `All ${stockList.length} selected stocks show bullish signals today. `
  } else if (bullish.length > 0) {
    text = `${bullish.map(a => a.symbol).join(' and ')} ${bullish.length === 1 ? 'shows' : 'show'} bullish momentum, while the others are neutral or bearish. `
  } else {
    text = 'All selected stocks are showing bearish or neutral signals. Caution is warranted across this group. '
  }

  text += `${best.symbol} is the best performer today (+${best.changePct.toFixed(2)}%). `

  if (worstPE) {
    text += `${worstPE.symbol} carries the highest P/E at ${worstPE.pe}x — the most richly valued of the group. `
  }

  const lowestPE = analyses.filter(a => a.pe).sort((a, b) => a.pe - b.pe)[0]
  if (lowestPE && lowestPE.symbol !== worstPE?.symbol) {
    text += `${lowestPE.symbol} offers the most attractive valuation at ${lowestPE.pe}x P/E. `
  }

  text += 'This comparison is for informational purposes only — not financial advice.'
  return text
}
