import { useEffect, useMemo, useRef, useState } from 'react'

/* ── Price chart ───────────────────────────────────────────────
   One chart for every price series on Foliyo. Line + area or
   candlesticks; volume underneath; colour from the range itself
   (green if it ended above where it started — or above the
   previous close on a one-day view — red if below).

   Hover (or touch-scrub) for a crosshair, the exact bar and a
   details card; press and drag to measure the move between two
   points. The parent gets every hover via onHover so its headline
   price can follow the cursor, Apple Stocks–style.

   data: [{ t: epoch ms, close, open?, high?, low?, volume?, note? }]  oldest → newest */

const UP = 'rgb(var(--up))', DOWN = 'rgb(var(--down))'
const PAD = { top: 14, right: 64, bottom: 26, left: 0 }

function niceTicks(min, max, count = 5) {
  const span = max - min || Math.abs(max) || 1
  const raw = span / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw
  const out = []
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10))
  return out
}

const fmtNum = (v, d = 2) => v == null || !Number.isFinite(v) ? '—'
  : v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d })
export const fmtVol = v => !Number.isFinite(v) ? '—' : v >= 1e9 ? `${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `${(v / 1e6).toFixed(2)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(1)}K` : String(Math.round(v))

/* Labels in the market's own time zone */
export function formatWhen(t, { intraday, tz, bar }) {
  const d = new Date(t)
  const opt = { timeZone: tz || undefined }
  if (bar === 'month') return d.toLocaleDateString('en-US', { ...opt, month: 'long', year: 'numeric' })
  if (bar === 'week') return `Week of ${d.toLocaleDateString('en-US', { ...opt, month: 'short', day: 'numeric', year: 'numeric' })}`
  const date = d.toLocaleDateString('en-US', { ...opt, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
  if (!intraday) return date
  const time = d.toLocaleTimeString('en-US', { ...opt, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  return `${date} · ${time}`
}

function axisLabel(t, spanDays, tz) {
  const d = new Date(t), opt = { timeZone: tz || undefined }
  if (spanDays <= 1.5) return d.toLocaleTimeString('en-US', { ...opt, hour: 'numeric', minute: '2-digit' })
  if (spanDays <= 8)   return d.toLocaleDateString('en-US', { ...opt, weekday: 'short', day: 'numeric' })
  if (spanDays <= 120) return d.toLocaleDateString('en-US', { ...opt, month: 'short', day: 'numeric' })
  if (spanDays <= 800) return d.toLocaleDateString('en-US', { ...opt, month: 'short', year: '2-digit' })
  return d.toLocaleDateString('en-US', { ...opt, year: 'numeric' })
}

export default function PriceChart({
  data, mode = 'line', intraday = false, tz, prevClose = null, bar = null,
  height = 340, showVolume = true, prefix = '$', suffix = '', decimals = 2,
  baseLabel = 'Prev close', onHover, ariaLabel = 'Price chart',
}) {
  const wrapRef = useRef(null)
  const [width, setWidth] = useState(640)
  const [hover, setHover] = useState(null)      // index under the pointer
  const [drag, setDrag] = useState(null)        // { from, to } while measuring
  const dragging = useRef(false)

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(280, e.contentRect.width)))
    if (wrapRef.current) ro.observe(wrapRef.current)
    return () => ro.disconnect()
  }, [])

  const pts = useMemo(() => (data || []).filter(d => Number.isFinite(d.close)), [data])
  const n = pts.length
  const hasOHLC = pts.every(d => [d.open, d.high, d.low].every(Number.isFinite))
  const candles = mode === 'candle' && hasOHLC
  const hasVol = showVolume && pts.some(d => d.volume > 0)

  const geo = useMemo(() => {
    if (n < 2) return null
    const W = width, H = height
    const plotW = W - PAD.left - PAD.right
    const volH = hasVol ? Math.round((H - PAD.top - PAD.bottom) * 0.16) : 0
    const plotH = H - PAD.top - PAD.bottom - volH - (hasVol ? 6 : 0)
    const lows = pts.map(d => candles ? d.low : d.close), highs = pts.map(d => candles ? d.high : d.close)
    let lo = Math.min(...lows), hi = Math.max(...highs)
    if (Number.isFinite(prevClose)) { lo = Math.min(lo, prevClose); hi = Math.max(hi, prevClose) }
    const padY = (hi - lo) * 0.08 || Math.abs(hi) * 0.01 || 1
    lo -= padY; hi += padY
    const step = plotW / n
    const x = i => PAD.left + step * (i + 0.5)
    const y = v => PAD.top + (1 - (v - lo) / (hi - lo)) * plotH
    const maxVol = hasVol ? Math.max(...pts.map(d => d.volume || 0)) : 0
    const volTop = PAD.top + plotH + 6
    const vy = v => volTop + volH - (v / (maxVol || 1)) * volH
    const yTicks = niceTicks(lo, hi, Math.max(3, Math.round(plotH / 60)))
    const spanDays = (pts[n - 1].t - pts[0].t) / 86_400_000
    const xCount = Math.max(2, Math.floor(plotW / 110))
    const xTicks = Array.from({ length: xCount }, (_, k) => Math.round((k + 0.5) * n / xCount))
      .filter((v, i, a) => v < n && a.indexOf(v) === i)
    return { W, H, plotW, plotH, volH, volTop, step, x, y, vy, yTicks, xTicks, spanDays, lo, hi }
  }, [pts, n, width, height, candles, hasVol, prevClose])

  if (!geo) {
    return <div ref={wrapRef} style={{ height }} className="flex items-center justify-center text-sm" >
      <span style={{ color:'var(--text-3)' }}>Not enough price history to draw a chart.</span>
    </div>
  }

  const first = pts[0].close, last = pts[n - 1].close
  const base = intraday && Number.isFinite(prevClose) ? prevClose : first
  const up = last >= base
  const tone = up ? UP : DOWN
  const { x, y, vy } = geo
  const money = v => `${prefix}${fmtNum(v, decimals)}${suffix}`

  const linePath = pts.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.close).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L${x(n - 1).toFixed(1)},${PAD.top + geo.plotH} L${x(0).toFixed(1)},${PAD.top + geo.plotH} Z`
  const gid = `pc-${ariaLabel.replace(/\W/g, '')}-${up ? 'u' : 'd'}`

  /* ── Pointer → bar index ── */
  const indexAt = clientX => {
    const r = wrapRef.current.getBoundingClientRect()
    const px = clientX - r.left - PAD.left
    return Math.max(0, Math.min(n - 1, Math.floor(px / geo.step)))
  }
  const report = i => {
    setHover(i)
    if (!onHover) return
    if (i == null) return onHover(null)
    const d = pts[i]
    onHover({ ...d, change: d.close - base, changePct: (d.close - base) / base * 100, when: formatWhen(d.t, { intraday, tz, bar }) })
  }
  const onMove = e => {
    const i = indexAt(e.clientX)
    if (dragging.current) setDrag(dr => dr ? { ...dr, to: i } : dr)
    report(i)
  }
  const onDown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    dragging.current = true
    const i = indexAt(e.clientX)
    setDrag({ from: i, to: i })
    report(i)
  }
  const endDrag = () => { dragging.current = false; setDrag(null) }
  const onLeave = () => { endDrag(); report(null) }
  const onKey = e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const i = hover == null ? n - 1 : Math.max(0, Math.min(n - 1, hover + (e.key === 'ArrowRight' ? 1 : -1)))
      report(i)
    }
    if (e.key === 'Escape') report(null)
  }

  const h = hover != null ? pts[hover] : null
  const measuring = drag && drag.from !== drag.to
  const [a, b] = measuring ? [Math.min(drag.from, drag.to), Math.max(drag.from, drag.to)] : []
  const mDelta = measuring ? pts[b].close - pts[a].close : 0
  const mPct = measuring ? mDelta / pts[a].close * 100 : 0
  const mTone = mDelta >= 0 ? UP : DOWN

  // Details card sits on the side away from the cursor
  const cardLeft = h && x(hover) > geo.W / 2
  const bodyW = Math.max(1, Math.min(14, geo.step * 0.62))

  return (
    <div ref={wrapRef} className="relative select-none" style={{ height }}
      onPointerMove={onMove} onPointerDown={onDown} onPointerUp={endDrag} onPointerLeave={onLeave} onPointerCancel={onLeave}
      tabIndex={0} onKeyDown={onKey} onBlur={() => report(null)}
      role="img" aria-label={`${ariaLabel}: ${up ? 'up' : 'down'} ${fmtNum(Math.abs((last - base) / base * 100))}% over the range, last ${money(last)}`}>
      <svg width={geo.W} height={geo.H} className="block overflow-visible" style={{ touchAction:'pan-y', cursor:'crosshair' }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.18" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid + price axis (right, like a trading screen) */}
        {geo.yTicks.map(v => (
          <g key={v}>
            <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={y(v)} y2={y(v)} stroke="var(--border)" strokeWidth="1" />
            <text x={geo.W - PAD.right + 8} y={y(v)} dy="0.32em" fontSize="11" fill="var(--text-3)" className="num">{fmtNum(v, decimals)}</text>
          </g>
        ))}
        {geo.xTicks.map(i => (
          <text key={i} x={x(i)} y={geo.H - 8} fontSize="11" fill="var(--text-3)" textAnchor="middle">{axisLabel(pts[i].t, geo.spanDays, tz)}</text>
        ))}

        {/* Measured span */}
        {measuring && (
          <rect x={x(a)} y={PAD.top} width={x(b) - x(a)} height={geo.plotH}
            fill={mDelta >= 0 ? 'rgb(var(--up) / .08)' : 'rgb(var(--down) / .08)'} />
        )}

        {/* Previous close */}
        {Number.isFinite(prevClose) && intraday && (
          <g>
            <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={y(prevClose)} y2={y(prevClose)}
              stroke="var(--text-3)" strokeDasharray="3 4" strokeWidth="1" />
            <rect x={PAD.left + geo.plotW - 112} y={y(prevClose) - 9} width="108" height="17" rx="3" fill="var(--bg-0)" opacity="0.9" />
            <text x={PAD.left + geo.plotW - 6} y={y(prevClose)} dy="0.33em" textAnchor="end" fontSize="10.5" fill="var(--text-2)" className="num">{baseLabel} {fmtNum(prevClose, decimals)}</text>
          </g>
        )}

        {/* Volume */}
        {hasVol && pts.map((d, i) => d.volume > 0 && (
          <rect key={`v${i}`} x={x(i) - bodyW / 2} y={vy(d.volume)} width={bodyW} height={geo.volTop + geo.volH - vy(d.volume)}
            fill={(Number.isFinite(d.open) ? d.close >= d.open : i === 0 || d.close >= pts[i - 1].close) ? 'rgb(var(--up) / .28)' : 'rgb(var(--down) / .28)'} />
        ))}

        {/* Series */}
        {candles ? pts.map((d, i) => {
          const c = d.close >= d.open ? UP : DOWN
          const top = y(Math.max(d.open, d.close)), bot = y(Math.min(d.open, d.close))
          return (
            <g key={`c${i}`}>
              <line x1={x(i)} x2={x(i)} y1={y(d.high)} y2={y(d.low)} stroke={c} strokeWidth="1" />
              <rect x={x(i) - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bot - top)} fill={c} rx="1" />
            </g>
          )
        }) : (
          <>
            <path d={areaPath} fill={`url(#${gid})`} />
            <path d={linePath} fill="none" stroke={tone} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          </>
        )}

        {/* Last price tag */}
        {hover == null && (
          <g>
            <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={y(last)} y2={y(last)} stroke={tone} strokeOpacity="0.35" strokeDasharray="2 3" />
            <rect x={geo.W - PAD.right + 2} y={y(last) - 10} width={PAD.right - 4} height="20" rx="4" fill={tone} />
            <text x={geo.W - PAD.right + 8} y={y(last)} dy="0.34em" fontSize="11" fontWeight="700" fill="#fff" className="num">{fmtNum(last, decimals)}</text>
          </g>
        )}

        {/* Crosshair */}
        {h && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={geo.volTop + geo.volH} stroke="var(--text-2)" strokeWidth="1" strokeDasharray="3 3" />
            <line x1={PAD.left} x2={PAD.left + geo.plotW} y1={y(h.close)} y2={y(h.close)} stroke="var(--text-2)" strokeWidth="1" strokeDasharray="3 3" />
            {!candles && <circle cx={x(hover)} cy={y(h.close)} r="4.5" fill={tone} stroke="var(--bg-0)" strokeWidth="2" />}
            <rect x={geo.W - PAD.right + 2} y={y(h.close) - 10} width={PAD.right - 4} height="20" rx="4" fill="var(--btn-bg)" />
            <text x={geo.W - PAD.right + 8} y={y(h.close)} dy="0.34em" fontSize="11" fontWeight="700" fill="var(--btn-fg)" className="num">{fmtNum(h.close, decimals)}</text>
          </g>
        )}
      </svg>

      {/* Details card */}
      {h && !measuring && (
        <div className="absolute pointer-events-none rounded-lg border px-2.5 py-2 text-[11.5px] leading-[1.45]"
          style={{ top: 6, [cardLeft ? 'left' : 'right']: cardLeft ? 6 : PAD.right + 6, minWidth: 172, maxWidth: 220,
                   background:'var(--bg-0)', borderColor:'var(--border)', boxShadow:'0 8px 24px rgba(var(--shadow-color),.12)' }}>
          <div className="font-semibold mb-1" style={{ color:'var(--text-1)' }}>{formatWhen(h.t, { intraday, tz, bar })}</div>
          <div className="grid grid-cols-[auto_1fr] gap-x-3 num">
            {Number.isFinite(h.open) && <><span style={{ color:'var(--text-3)' }}>Open</span><span className="text-right">{fmtNum(h.open, decimals)}</span></>}
            {Number.isFinite(h.high) && <><span style={{ color:'var(--text-3)' }}>High</span><span className="text-right">{fmtNum(h.high, decimals)}</span></>}
            {Number.isFinite(h.low)  && <><span style={{ color:'var(--text-3)' }}>Low</span><span className="text-right">{fmtNum(h.low, decimals)}</span></>}
            <span style={{ color:'var(--text-3)' }}>{intraday ? 'Price' : 'Close'}</span><span className="text-right font-bold">{fmtNum(h.close, decimals)}</span>
            {h.volume > 0 && <><span style={{ color:'var(--text-3)' }}>Volume</span><span className="text-right">{fmtVol(h.volume)}</span></>}
            <span style={{ color:'var(--text-3)' }}>{intraday && Number.isFinite(prevClose) ? 'vs prev close' : 'vs range start'}</span>
            <span className="text-right font-semibold" style={{ color: h.close >= base ? UP : DOWN }}>
              {h.close >= base ? '+' : '−'}{fmtNum(Math.abs(h.close - base), decimals)} ({h.close >= base ? '+' : '−'}{fmtNum(Math.abs((h.close - base) / base * 100))}%)
            </span>
          </div>
          {h.note && <div className="mt-1.5" style={{ color:'rgb(var(--caution))' }}>{h.note}</div>}
        </div>
      )}

      {/* Measuring card */}
      {measuring && (
        <div className="absolute pointer-events-none rounded-lg border px-3 py-2 text-[12px]"
          style={{ top: 8, left: Math.min(Math.max(8, (x(a) + x(b)) / 2 - 110), geo.W - PAD.right - 228), width: 220,
                   background:'var(--bg-0)', borderColor:'var(--border)', boxShadow:'0 8px 24px rgba(var(--shadow-color),.12)' }}>
          <div className="font-bold num text-[14px]" style={{ color: mTone }}>
            {mDelta >= 0 ? '+' : '−'}{money(Math.abs(mDelta))} ({mDelta >= 0 ? '+' : '−'}{fmtNum(Math.abs(mPct))}%)
          </div>
          <div style={{ color:'var(--text-2)' }}>
            {formatWhen(pts[a].t, { intraday, tz, bar })} → {formatWhen(pts[b].t, { intraday, tz, bar })}
          </div>
        </div>
      )}
    </div>
  )
}

/* Change over a series — used by headers to colour and label the range */
export function rangeChange(data, { intraday, prevClose } = {}) {
  const pts = (data || []).filter(d => Number.isFinite(d.close))
  if (pts.length < 2) return null
  const base = intraday && Number.isFinite(prevClose) ? prevClose : pts[0].close
  const last = pts.at(-1).close
  return { change: last - base, changePct: (last - base) / base * 100, up: last >= base }
}
