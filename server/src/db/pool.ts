import pg from 'pg';

const pool = new pg.Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER || 'poker',
  password: process.env.PG_PASSWORD || 'poker123',
  database: process.env.PG_DB || 'dezhoupuke',
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

pool.on('error', (err) => {
  console.error('[PG] Pool error:', err.message);
});

export async function shutdown() {
  await pool.end();
}

let schemaRun = false;
let schemaPromise: Promise<void> | null = null;

export async function initSchema() {
  if (schemaRun) return;
  if (schemaPromise) return schemaPromise;
  schemaPromise = (async () => {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT false,
      game_tokens INT DEFAULT 10000 CHECK (game_tokens >= 0),
      points INT DEFAULT 0 CHECK (points >= 0),
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      total_hands INT DEFAULT 0,
      wins INT DEFAULT 0,
      total_profit INT DEFAULT 0,
      max_pot INT DEFAULT 0,
      elo INT DEFAULT 1200
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      tokens_delta INT DEFAULT 0,
      points_delta INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
    schemaRun = true;
  })().catch((err) => {
    console.error('[PG] Schema init failed:', err.message);
    schemaPromise = null;
    throw err;
  });
  await schemaPromise;
}

export function getPool() { return pool; }
