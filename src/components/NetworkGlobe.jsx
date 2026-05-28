import { useEffect, useRef } from 'react'

/* ── Canvas 3D network-sphere (Fibonacci distribution) ─────── */
export default function NetworkGlobe({
  size      = 480,
  colorRgb  = '6,182,212',   // matches --accent-rgb
  className = '',
  style     = {},
}) {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width  = size * dpr
    canvas.height = size * dpr
    canvas.style.width  = `${size}px`
    canvas.style.height = `${size}px`

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const R  = size * 0.36

    /* ── Fibonacci sphere ──────────────────────────────────── */
    const N   = 150
    const PHI = Math.PI * (1 + Math.sqrt(5))
    const pts = Array.from({ length: N }, (_, i) => {
      const t = Math.acos(1 - 2 * (i + 0.5) / N)
      const p = PHI * i
      return [Math.sin(t) * Math.cos(p), Math.sin(t) * Math.sin(p), Math.cos(t)]
    })

    /* ── Precompute edges ──────────────────────────────────── */
    const THRESH = 0.5
    const edges  = []
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pts[i][0] - pts[j][0]
        const dy = pts[i][1] - pts[j][1]
        const dz = pts[i][2] - pts[j][2]
        const d  = Math.sqrt(dx * dx + dy * dy + dz * dz)
        if (d < THRESH) edges.push([i, j, d / THRESH])
      }
    }

    let angle = 0
    let raf

    const draw = () => {
      ctx.clearRect(0, 0, size, size)
      angle += 0.0028

      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)
      const TILT = 0.28
      const cosT = Math.cos(TILT)
      const sinT = Math.sin(TILT)

      /* ── Project all points ────────────────────────────── */
      const proj = pts.map(([x, y, z]) => {
        const rx = x * cosA - z * sinA  // Y-rotation
        const rz = x * sinA + z * cosA
        const fy = y * cosT - rz * sinT // X-tilt
        const fz = y * sinT + rz * cosT
        return { sx: cx + rx * R, sy: cy + fy * R, depth: fz }
      })

      /* ── Subtle ambient glow ───────────────────────────── */
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.9)
      grd.addColorStop(0, `rgba(${colorRgb}, 0.03)`)
      grd.addColorStop(1, `rgba(${colorRgb}, 0)`)
      ctx.fillStyle = grd
      ctx.fillRect(0, 0, size, size)

      /* ── Edges ─────────────────────────────────────────── */
      edges.forEach(([i, j, relD]) => {
        const a = proj[i]
        const b = proj[j]
        const avgDepth = (a.depth + b.depth) * 0.5
        if (avgDepth < -0.12) return
        const df    = (avgDepth + 1) * 0.5
        const alpha = df * (1 - relD) * 0.38
        if (alpha < 0.008) return
        ctx.beginPath()
        ctx.moveTo(a.sx, a.sy)
        ctx.lineTo(b.sx, b.sy)
        ctx.strokeStyle = `rgba(${colorRgb},${alpha.toFixed(3)})`
        ctx.lineWidth   = 0.75
        ctx.stroke()
      })

      /* ── Nodes ─────────────────────────────────────────── */
      proj.forEach(({ sx, sy, depth }) => {
        if (depth < -0.22) return
        const df    = (depth + 1) * 0.5
        const alpha = df * 0.88
        const r     = 0.7 + df * 2.0
        ctx.beginPath()
        ctx.arc(sx, sy, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${colorRgb},${alpha.toFixed(3)})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [size, colorRgb])

  return <canvas ref={ref} className={className} style={style} />
}
