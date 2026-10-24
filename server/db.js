import pg from 'pg'

/* ── Postgres (Neon in production) ─────────────────────────────
   Accounts, synced user data and alerts live here. Without
   DATABASE_URL the API still serves market data; account routes
   answer 503 { reason:'unconfigured' } so the UI can say so.      */
const url = process.env.DATABASE_URL
const local = url && /localhost|127\.0\.0\.1/.test(url)

export const pool = url
  ? new pg.Pool({ connectionString: url, ssl: local ? false : { rejectUnauthorized: false }, max: 5 })
  : null

export const dbEnabled = !!pool

export const query = (text, params) => pool.query(text, params)

export async function migrate() {
  if (!pool) return
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email         text NOT NULL UNIQUE,
      name          text NOT NULL,
      password_hash text,
      google_sub    text UNIQUE,
      created_at    timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS user_data (
      user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      key        text NOT NULL,
      value      jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (user_id, key)
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      symbol           text NOT NULL,
      name             text NOT NULL DEFAULT '',
      type             text NOT NULL,
      target_value     double precision,
      target_sentiment text,
      notif_method     text NOT NULL DEFAULT 'dashboard',
      status           text NOT NULL DEFAULT 'active',
      baseline         jsonb NOT NULL DEFAULT '{}'::jsonb,
      last_price       double precision,
      trigger_note     text,
      trigger_price    double precision,
      triggered_at     timestamptz,
      emailed_at       timestamptz,
      created_at       timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS alerts_user_idx   ON alerts(user_id);
    CREATE INDEX IF NOT EXISTS alerts_active_idx ON alerts(status) WHERE status = 'active';
  `)
}
