import nodemailer from 'nodemailer'

/* ── Alert email — plain SMTP (e.g. a dedicated mailbox) ───────
   Needs SMTP_HOST, SMTP_USER, SMTP_PASS; SMTP_PORT defaults to 465.
   ALERT_FROM is optional and should normally match SMTP_USER.    */
const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env
const PORT = Number(process.env.SMTP_PORT || 465)

export const mailEnabled = !!(SMTP_HOST && SMTP_USER && SMTP_PASS)

const transport = mailEnabled
  ? nodemailer.createTransport({ host: SMTP_HOST, port: PORT, secure: PORT === 465, auth: { user: SMTP_USER, pass: SMTP_PASS } })
  : null

const APP_URL = process.env.FRONTEND_URL || 'https://foliyo-delta.vercel.app'

export async function sendAlertEmail({ to, name, symbol, message }) {
  if (!transport) return false
  const link = `${APP_URL}/stock/${encodeURIComponent(symbol)}`
  await transport.sendMail({
    from: `Foliyo <${process.env.ALERT_FROM || SMTP_USER}>`,
    to,
    subject: `Foliyo alert: ${symbol} — ${message}`,
    text: `Hi ${name},\n\nYour alert on ${symbol} was triggered: ${message}.\n\nOpen ${symbol}: ${link}\nManage alerts: ${APP_URL}/ai-alerts\n\nFoliyo is for information only and is not financial advice.`,
    html: `<p>Hi ${escapeHtml(name)},</p><p>Your alert on <b>${escapeHtml(symbol)}</b> was triggered: ${escapeHtml(message)}.</p>
<p><a href="${link}">Open ${escapeHtml(symbol)}</a> · <a href="${APP_URL}/ai-alerts">Manage alerts</a></p>
<p style="color:#857f73;font-size:12px">Foliyo is for information only and is not financial advice.</p>`,
  })
  return true
}

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]))
