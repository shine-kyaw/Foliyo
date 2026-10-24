import { useEffect, useRef } from 'react'
import { LAND_DOTS } from '../data/landDots'
import { EXCHANGES, sessionState } from '../utils/exchanges'

/* ── Market globe ──────────────────────────────────────────────
   The Earth in ~4,900 land dots, lit by where the sun actually is
   right now, with the world's exchanges glowing while they trade.
   Arcs follow the hand-off of the trading day from market to
   market. Drag to spin; hover a market for its local time.
   Plain canvas 2D — no WebGL, no libraries.                      */

const RAD = Math.PI / 180
const ROUTES = [
  ['NYSE','LSE'], ['NYSE','TSX'], ['NYSE','B3'], ['LSE','EPA'], ['EPA','XETRA'], ['LSE','JSE'],
  ['XETRA','NSE'], ['NSE','YSX'], ['YSX','SGX'], ['SGX','HKEX'], ['HKEX','SSE'], ['SSE','KRX'],
  ['KRX','TSE'], ['TSE','ASX'], ['SGX','ASX'],
]

const vec = (lat, lon) => {
  const c = Math.cos(lat * RAD)
  return [c * Math.sin(lon * RAD), Math.sin(lat * RAD), c * Math.cos(lon * RAD)]
}

// Land dots → unit vectors, once
const LAND = (() => {
  const out = new Float32Array(LAND_DOTS.length / 2 * 3)
  for (let i = 0, j = 0; i < LAND_DOTS.length; i += 2, j += 3) {
    const v = vec(LAND_DOTS[i] / 10, LAND_DOTS[i + 1] / 10)
    out[j] = v[0]; out[j + 1] = v[1]; out[j + 2] = v[2]
  }
  return out
})()

/* Where the sun is overhead right now (declination + equation of time) */
function subsolar(date = new Date()) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const n = (date - start) / 86_400_000
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (n + 10))
  const B = (2 * Math.PI * (n - 81)) / 364
  const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B)   // minutes
  const utcH = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600
  const lon = -15 * (utcH - 12 + eot / 60)
  return { lat: decl, lon: ((lon + 540) % 360) - 180 }
}

const slerp = (a, b, t) => {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const om = Math.acos(dot), so = Math.sin(om) || 1
  const k1 = Math.sin((1 - t) * om) / so, k2 = Math.sin(t * om) / so
  return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2]
}

export default function MarketGlobe({ onHover, className = '', style }) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const hoverCb = useRef(onHover)
  hoverCb.current = onHover

  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const sun0 = subsolar()
    const view = { yaw: -(sun0.lon + 25) * RAD, tilt: 22 * RAD, vYaw: 0, vTilt: 0 }
    let size = 0, dpr = 1, raf = 0, last = performance.now(), visible = true
    let drag = null, hoverId = null
    let projected = []   // hubs on screen last frame, for hit-testing

    // Session states change by the minute — refresh twice a minute, not per frame
    let states = {}
    const refreshStates = () => {
      const now = new Date()
      states = Object.fromEntries(EXCHANGES.map(ex => [ex.id, sessionState(ex, now)]))
    }
    refreshStates()
    const stateTimer = setInterval(refreshStates, 30_000)

    const hubs = EXCHANGES.map(ex => ({ ex, v: vec(ex.lat, ex.lon) }))
    const byId = Object.fromEntries(hubs.map(h => [h.ex.id, h]))
    const routes = ROUTES.map(([a, b], i) => ({ a: byId[a], b: byId[b], seed: i * 0.137 }))

    const resize = () => {
      const r = wrap.getBoundingClientRect()
      size = Math.max(160, Math.min(r.width, r.height || r.width))
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = size * dpr; canvas.height = size * dpr
      canvas.style.width = `${size}px`; canvas.style.height = `${size}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    const rotate = (v, cy, sy, ct, st) => {
      const x1 = v[0] * cy + v[2] * sy
      const z1 = -v[0] * sy + v[2] * cy
      return [x1, v[1] * ct - z1 * st, v[1] * st + z1 * ct]
    }

    const draw = (time) => {
      const dt = Math.min(0.05, (time - last) / 1000)
      last = time
      if (!drag) {
        view.yaw += (reduce ? 0 : 0.07 * dt) + view.vYaw
        view.tilt = Math.max(-0.35, Math.min(0.85, view.tilt + view.vTilt))
        view.vYaw *= 0.93; view.vTilt *= 0.93
      }

      const W = size * dpr, cx = W / 2, cy = W / 2, R = W * 0.4
      ctx.clearRect(0, 0, W, W)
      const cYaw = Math.cos(view.yaw), sYaw = Math.sin(view.yaw)
      const cT = Math.cos(view.tilt), sT = Math.sin(view.tilt)
      const sunGeo = subsolar()
      const sunW = vec(sunGeo.lat, sunGeo.lon)
      const sunS = rotate(sunW, cYaw, sYaw, cT, sT)

      // Atmosphere halo
      const halo = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.2)
      halo.addColorStop(0, 'rgba(111,163,184,0.28)')
      halo.addColorStop(1, 'rgba(111,163,184,0)')
      ctx.fillStyle = halo
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, Math.PI * 2); ctx.fill()

      // Ocean, brighter on the sunlit side
      const lx = cx + sunS[0] * R * 0.55, ly = cy - sunS[1] * R * 0.55
      const ocean = ctx.createRadialGradient(lx, ly, R * 0.05, cx, cy, R)
      ocean.addColorStop(0, sunS[2] > -0.2 ? 'rgba(46,82,98,0.95)' : 'rgba(30,44,54,0.95)')
      ocean.addColorStop(0.65, 'rgba(24,32,40,0.97)')
      ocean.addColorStop(1, 'rgba(15,18,22,1)')
      ctx.fillStyle = ocean
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill()

      // Land — night pass (all visible dots, faint steel), then day pass (cream, by sunlight)
      const base = dpr * 0.82
      const lit = new Float32Array(LAND.length / 3)
      ctx.fillStyle = 'rgb(111,163,184)'
      for (let i = 0, k = 0; i < LAND.length; i += 3, k++) {
        const x = LAND[i], y = LAND[i + 1], z = LAND[i + 2]
        const x1 = x * cYaw + z * sYaw, z1 = -x * sYaw + z * cYaw
        const zs = y * sT + z1 * cT
        if (zs <= 0) { lit[k] = -1; continue }
        const ys = y * cT - z1 * sT
        const d = x * sunW[0] + y * sunW[1] + z * sunW[2]
        const day = Math.max(0, Math.min(1, (d + 0.1) / 0.28))
        lit[k] = day
        const s = base * (0.75 + 0.7 * zs)
        ctx.globalAlpha = (0.16 + 0.22 * zs) * (1 - day * 0.6)
        ctx.fillRect(cx + x1 * R - s / 2, cy - ys * R - s / 2, s, s)
      }
      ctx.fillStyle = 'rgb(245,240,230)'
      for (let i = 0, k = 0; i < LAND.length; i += 3, k++) {
        const day = lit[k]
        if (day <= 0.02) continue
        const x = LAND[i], y = LAND[i + 1], z = LAND[i + 2]
        const x1 = x * cYaw + z * sYaw, z1 = -x * sYaw + z * cYaw
        const zs = y * sT + z1 * cT, ys = y * cT - z1 * sT
        const s = base * (0.85 + 0.8 * zs)
        ctx.globalAlpha = day * (0.35 + 0.6 * zs)
        ctx.fillRect(cx + x1 * R - s / 2, cy - ys * R - s / 2, s, s)
      }
      ctx.globalAlpha = 1

      // Hand-off arcs: lifted great circles with a travelling spark
      const t = time / 1000
      for (const r of routes) {
        const openA = states[r.a.ex.id]?.open, openB = states[r.b.ex.id]?.open
        const hot = openA || openB
        ctx.lineWidth = dpr * (hot ? 1.3 : 0.9)
        ctx.strokeStyle = hot ? 'rgba(232,164,62,0.55)' : 'rgba(111,163,184,0.28)'
        ctx.beginPath()
        let pen = false
        const pts = []
        for (let s = 0; s <= 40; s++) {
          const u = s / 40
          const g = slerp(r.a.v, r.b.v, u)
          const lift = 1 + 0.16 * Math.sin(Math.PI * u)
          const p = rotate([g[0] * lift, g[1] * lift, g[2] * lift], cYaw, sYaw, cT, sT)
          const seen = p[2] > 0 || Math.hypot(p[0], p[1]) > 1
          const X = cx + p[0] * R, Y = cy - p[1] * R
          pts.push(seen ? [X, Y] : null)
          if (seen) { pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); pen = true } else pen = false
        }
        ctx.stroke()
        if (!reduce) {
          const u = (t * 0.22 + r.seed) % 1
          const p = pts[Math.round(u * 40)]
          if (p) {
            const glow = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], 6 * dpr)
            glow.addColorStop(0, hot ? 'rgba(255,214,140,0.95)' : 'rgba(170,205,220,0.7)')
            glow.addColorStop(1, 'rgba(255,214,140,0)')
            ctx.fillStyle = glow
            ctx.beginPath(); ctx.arc(p[0], p[1], 6 * dpr, 0, Math.PI * 2); ctx.fill()
          }
        }
      }

      // Exchanges — open markets first so their labels win any overlap
      projected = []
      const labelBoxes = []
      ctx.font = `600 ${10.5 * dpr}px Archivo, system-ui, sans-serif`
      ctx.textBaseline = 'middle'
      const order = [...hubs].sort((a, b) => Number(!!states[b.ex.id]?.open) - Number(!!states[a.ex.id]?.open))
      for (const h of order) {
        const p = rotate(h.v, cYaw, sYaw, cT, sT)
        if (p[2] <= 0.02) continue
        const X = cx + p[0] * R, Y = cy - p[1] * R
        const st = states[h.ex.id]
        const isHover = hoverId === h.ex.id
        projected.push({ id: h.ex.id, x: X / dpr, y: Y / dpr })
        if (st?.open) {
          const pulse = reduce ? 0.5 : (t * 0.7 + h.v[0]) % 1
          ctx.strokeStyle = `rgba(232,164,62,${0.7 * (1 - pulse)})`
          ctx.lineWidth = 1.2 * dpr
          ctx.beginPath(); ctx.arc(X, Y, (4 + 13 * pulse) * dpr, 0, Math.PI * 2); ctx.stroke()
          const g = ctx.createRadialGradient(X, Y, 0, X, Y, 12 * dpr)
          g.addColorStop(0, 'rgba(232,164,62,0.55)'); g.addColorStop(1, 'rgba(232,164,62,0)')
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, 12 * dpr, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#f6b24a'
          ctx.beginPath(); ctx.arc(X, Y, (isHover ? 4.4 : 3.3) * dpr, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.fillStyle = 'rgba(242,238,230,0.7)'
          ctx.beginPath(); ctx.arc(X, Y, (isHover ? 3.6 : 2.3) * dpr, 0, Math.PI * 2); ctx.fill()
          ctx.strokeStyle = 'rgba(242,238,230,0.25)'
          ctx.lineWidth = dpr
          ctx.beginPath(); ctx.arc(X, Y, 5 * dpr, 0, Math.PI * 2); ctx.stroke()
        }
        const lw = ctx.measureText(h.ex.id).width, lh = 11 * dpr
        const box = [X + 8 * dpr, Y - 7 * dpr - lh / 2, lw, lh]
        const clash = labelBoxes.some(b => box[0] < b[0] + b[2] + 4 * dpr && b[0] < box[0] + box[2] + 4 * dpr && box[1] < b[1] + b[3] && b[1] < box[1] + box[3])
        if ((p[2] > 0.25 && !clash) || isHover) {
          labelBoxes.push(box)
          ctx.globalAlpha = Math.min(1, (p[2] - 0.1) * 2) * (st?.open ? 1 : 0.6)
          ctx.fillStyle = st?.open ? '#ffd9a0' : '#e8e4dc'
          ctx.fillText(h.ex.id, X + 8 * dpr, Y - 7 * dpr)
          ctx.globalAlpha = 1
        }
      }

      if (visible) raf = requestAnimationFrame(draw)
    }

    const start = () => { cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(draw) }
    start()

    // Only animate while on screen and the tab is visible
    const io = new IntersectionObserver(([e]) => {
      const was = visible
      visible = e.isIntersecting && !document.hidden
      if (visible && !was) start()
    })
    io.observe(wrap)
    const onVis = () => { const was = visible; visible = !document.hidden; if (visible && !was) start() }
    document.addEventListener('visibilitychange', onVis)

    // Drag to spin, hover for details
    const local = e => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
    const hitTest = (x, y) => {
      let best = null, bd = 16
      for (const p of projected) { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = p } }
      return best
    }
    const onDown = e => {
      drag = { x: e.clientX, y: e.clientY, t: performance.now() }
      canvas.setPointerCapture(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }
    const onMove = e => {
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y
        view.yaw += dx * 0.006; view.tilt = Math.max(-0.35, Math.min(0.85, view.tilt + dy * 0.004))
        view.vYaw = dx * 0.0012; view.vTilt = dy * 0.0006
        drag.x = e.clientX; drag.y = e.clientY
        return
      }
      const [x, y] = local(e)
      const hit = hitTest(x, y)
      if ((hit?.id || null) !== hoverId) {
        hoverId = hit?.id || null
        canvas.style.cursor = hit ? 'pointer' : 'grab'
        hoverCb.current?.(hit ? { exchange: EXCHANGES.find(x => x.id === hit.id), state: states[hit.id], x: hit.x, y: hit.y } : null)
      }
    }
    const onUp = e => {
      drag = null
      canvas.style.cursor = 'grab'
      try { canvas.releasePointerCapture(e.pointerId) } catch {}
    }
    const onLeave = () => { if (!drag && hoverId) { hoverId = null; hoverCb.current?.(null) } }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('pointerleave', onLeave)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(stateTimer)
      ro.disconnect(); io.disconnect()
      document.removeEventListener('visibilitychange', onVis)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('pointerleave', onLeave)
    }
  }, [])

  return (
    <div ref={wrapRef} className={`flex items-center justify-center ${className || 'relative'}`} style={style}>
      <canvas ref={canvasRef} role="img" style={{ cursor:'grab', touchAction:'pan-y' }}
        aria-label="Globe showing which of the world's stock exchanges are open now, with day and night shading" />
    </div>
  )
}
