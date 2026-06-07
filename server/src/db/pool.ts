import pg from 'pg';

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  user: 'poker',
  password: 'poker123',
  database: 'dezhoupuke',
  max: 10,
});

let schemaRun = false;

export async function initSchema() {
  if (schemaRun) return;
  schemaRun = true;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT false,
      game_tokens INT DEFAULT 10000,
      points INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS player_stats (
      user_id TEXT PRIMARY KEY REFERENCES users(id),
      total_hands INT DEFAULT 0,
      wins INT DEFAULT 0,
      total_profit INT DEFAULT 0,
      max_pot INT DEFAULT 0,
      elo INT DEFAULT 1200
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      type TEXT NOT NULL,
      tokens_delta INT DEFAULT 0,
      points_delta INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
}

export function getPool() { return pool; }
