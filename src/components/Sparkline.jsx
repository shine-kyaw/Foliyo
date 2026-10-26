import { useMemo, useState } from 'react'

/* Small intraday line with a dotted previous-close baseline when known.
 * Colour: `up` from the caller (it matches the change shown beside it);
 * without one, the series' own first-to-last move decides.
 * Hover shows the price and time at that point. */
export default function Sparkline({ data, prevClose, up, width = 64, height = 26, decimals = 2 }) {
  const [hover, setHover] = useState(null)
  const pts = useMemo(() => (data || []).filter(d => Number.isFinite(d.price)), [data])

  const geom = useMemo(() => {
    if (pts.length < 2) return null
    const prices = pts.map(d => d.price)
    const lo = Math.min(...prices, prevClose ?? Infinity)
    const hi = Math.max(...prices, prevClose ?? -Infinity)
    const span = hi - lo || 1
    const y = v => 2 + (1 - (v - lo) / span) * (height - 4)
    const x = i => i / (prices.length - 1) * width
    const line = prices.map((p, i) => `${x(i).toFixed(1)},${y(p).toFixed(1)}`).join(' ')
    return { line, x, y, base: prevClose != null ? y(prevClose) : null }
  }, [pts, prevClose, width, height])

  if (!geom) return <span style={{ width, height, display:'inline-block' }} />
  const rising = up ?? pts.at(-1).price >= pts[0].price
  const color = rising ? 'rgb(var(--up))' : 'rgb(var(--down))'
  const h = hover != null ? pts[hover] : null
  const when = h ? (() => {
    const t = h.t ?? Date.parse(h.rawDate)
    return Number.isFinite(t) ? new Date(t).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' }) : h.date
  })() : null

  return (
    <span className="relative inline-block shrink-0" style={{ width, height }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect()
        setHover(Math.max(0, Math.min(pts.length - 1, Math.round((e.clientX - r.left) / width * (pts.length - 1)))))
      }}
      onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="overflow-visible block">
        {geom.base != null && (
          <line x1="0" x2={width} y1={geom.base} y2={geom.base} stroke="var(--border-light)" strokeDasharray="2 2" strokeWidth="1"/>
        )}
        <polyline points={geom.line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/>
        {h && <circle cx={geom.x(hover)} cy={geom.y(h.price)} r="2.6" fill={color} stroke="var(--bg-0)" strokeWidth="1"/>}
      </svg>
      {h && (
        <span className="absolute z-30 pointer-events-none whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold num"
          style={{ bottom: height + 4, left: '50%', transform:'translateX(-50%)', background:'var(--btn-bg)', color:'var(--btn-fg)' }}>
          {h.price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{when ? ` · ${when}` : ''}
        </span>
      )}
    </span>
  )
}
