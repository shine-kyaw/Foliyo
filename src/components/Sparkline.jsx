import { useMemo } from 'react'

/* Small intraday line, coloured by direction, with a dotted baseline at the
 * previous close when it's known — the market-strip look. */
export default function Sparkline({ data, prevClose, up, width = 64, height = 26 }) {
  const geom = useMemo(() => {
    const prices = (data || []).map(d => d.price).filter(Number.isFinite)
    if (prices.length < 2) return null
    const lo = Math.min(...prices, prevClose ?? Infinity)
    const hi = Math.max(...prices, prevClose ?? -Infinity)
    const span = hi - lo || 1
    const y = v => 2 + (1 - (v - lo) / span) * (height - 4)
    const line = prices.map((p, i) => `${(i / (prices.length - 1) * width).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
    return { line, base: prevClose != null ? y(prevClose) : null }
  }, [data, prevClose, width, height])

  if (!geom) return <span style={{ width, height, display:'inline-block' }} />
  const color = up ? 'rgb(var(--up))' : 'rgb(var(--down))'
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0 overflow-visible">
      {geom.base != null && (
        <line x1="0" x2={width} y1={geom.base} y2={geom.base} stroke="var(--border-light)" strokeDasharray="2 2" strokeWidth="1"/>
      )}
      <polyline points={geom.line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
    </svg>
  )
}
