/* ── Page header — shared by every inner page ──────────────────
   Condensed bold title and a plain subtitle, with an optional
   right-hand slot for status and page actions. Spacing below is
   left to the page.                                              */
export default function PageHeader({ title, subtitle, children, className = '' }) {
  return (
    <header className={`flex flex-col sm:flex-row sm:items-end justify-between gap-3 ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[1.9rem] sm:text-[2.2rem] font-bold leading-[1.05]" style={{ color:'var(--text-1)' }}>
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-1.5 max-w-2xl" style={{ color:'var(--text-2)' }}>{subtitle}</p>
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
    muted:  { color:'var(--text-2)', background:'var(--bg-1)', borderColor:'var(--border)' },
  }[tone]
  const dot = tone === 'live' ? 'rgb(var(--up))' : tone === 'accent' ? 'var(--accent)' : 'var(--text-3)'
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap"
      style={styles}>
      <span className={`w-1.5 h-1.5 rounded-full ${pulse ? 'animate-pulse' : ''}`} style={{ background: dot }} />
      {children}
    </span>
  )
}
