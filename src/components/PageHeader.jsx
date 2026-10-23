/* ── Page header — shared by every inner page ──────────────────
   Title in the wide cut of Archivo with the leaning marigold tick
   from the mark; optional subtitle; right-hand slot for status pills
   and page actions. Spacing below is left to the page.            */
export default function PageHeader({ title, subtitle, children, className = '' }) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-end justify-between gap-4 ${className}`}>
      <div className="min-w-0">
        <h1 className="flex items-center gap-3 text-[1.75rem] sm:text-[2.1rem] font-black leading-none"
          style={{ color:'var(--text-1)' }}>
          <span aria-hidden className="block w-[6px] h-[0.8em] rounded-[2px] shrink-0"
            style={{ background:'var(--accent)', transform:'skewX(var(--lean))' }} />
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-2.5 max-w-2xl" style={{ color:'var(--text-2)' }}>{subtitle}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap shrink-0">{children}</div>}
    </header>
  )
}

/* ── Status pill — small state label for a page or panel ───────
   tone: 'live' (green dot, pulses) · 'accent' · 'muted' (default) */
export function StatusPill({ tone = 'muted', pulse = false, children }) {
  const styles = {
    live:   { color:'rgb(var(--up))', background:'rgb(var(--up) / .08)', borderColor:'rgb(var(--up) / .2)' },
    accent: { color:'var(--accent)', background:'rgba(var(--accent-rgb),.08)', borderColor:'rgba(var(--accent-rgb),.22)' },
    muted:  { color:'var(--text-2)', background:'var(--bg-2)', borderColor:'var(--border)' },
  }[tone]
  const dot = tone === 'live' ? 'rgb(var(--up))' : tone === 'accent' ? 'var(--accent)' : 'var(--text-3)'
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-md border whitespace-nowrap"
      style={styles}>
      <span className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`} style={{ background: dot }} />
      {children}
    </span>
  )
}
