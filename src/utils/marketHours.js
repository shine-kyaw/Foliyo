/* ── US market session ─────────────────────────────────────────
   Regular NYSE/Nasdaq hours, 09:30–16:00 New York time, Mon–Fri.
   Exchange holidays aren't modelled, so on those days this reports
   "open" during normal hours — label it as the regular session.    */
export function usSession(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = t => parts.find(p => p.type === t)?.value
  const day = get('weekday')
  const mins = Number(get('hour')) * 60 + Number(get('minute'))
  const weekday = !['Sat', 'Sun'].includes(day)
  const open = weekday && mins >= 9 * 60 + 30 && mins < 16 * 60
  return { open, label: open ? 'US market open' : 'US market closed' }
}
