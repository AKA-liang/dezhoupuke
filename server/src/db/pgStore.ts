/**
 * PostgreSQL 数据层（替换 JSON store）
 *
 * 依赖: docker compose up -d (启动 PG)
 * 表: users, player_stats, transactions
 */

import { getPool, initSchema } from './pool.js';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  gameTokens: number;
  points: number;
}

export interface Stats {
  userId: string;
  totalHands: number;
  wins: number;
  totalProfit: number;
  maxPot: number;
  elo: number;
}

let initPromise: Promise<void> | null = null;
async function ensureInit() {
  if (!initPromise) initPromise = initSchema();
  await initPromise;
}

// ---- Users ----
export async function findUser(username: string): Promise<User | null> {
  await ensureInit();
  const r = await getPool().query('SELECT * FROM users WHERE username = $1', [username]);
  if (r.rows.length === 0) return null;
  const u = r.rows[0];
  return { id: u.id, username: u.username, passwordHash: u.password_hash, isAdmin: u.is_admin, gameTokens: u.game_tokens, points: u.points };
}

export async function findUserById(id: string): Promise<User | null> {
  await ensureInit();
  const r = await getPool().query('SELECT * FROM users WHERE id = $1', [id]);
  if (r.rows.length === 0) return null;
  const u = r.rows[0];
  return { id: u.id, username: u.username, passwordHash: u.password_hash, isAdmin: u.is_admin, gameTokens: u.game_tokens, points: u.points };
}

export async function createUser(username: string, hash: string): Promise<User> {
  await ensureInit();
  const id = Date.now().toString(36);
  await getPool().query(
    'INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)',
    [id, username, hash],
  );
  return { id, username, passwordHash: hash, isAdmin: false, gameTokens: 10000, points: 0 };
}

export async function updateTokens(userId: string, delta: number): Promise<void> {
  await ensureInit();
  await getPool().query('UPDATE users SET game_tokens = GREATEST(0, game_tokens + $1) WHERE id = $2', [delta, userId]);
}

export async function handResult(userId: string, tokensDelta: number, result: string, payoff: number, pot: number) {
  await ensureInit();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('UPDATE users SET game_tokens = GREATEST(0, game_tokens + $1) WHERE id = $2', [tokensDelta, userId]);
    await client.query("INSERT INTO transactions (user_id, type, tokens_delta) VALUES ($1, $2, $3)", [userId, result, tokensDelta]);
    await client.query("INSERT INTO player_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING", [userId]);
    await client.query("UPDATE player_stats SET total_hands = total_hands + 1, wins = wins + $2, total_profit = total_profit + $3, max_pot = GREATEST(max_pot, $4), elo = elo + $5 WHERE user_id = $1", [userId, result === 'game_win' ? 1 : 0, payoff, pot, result === 'game_win' ? 10 : -10]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { client.release(); }
}

// ---- Stats ----
export async function getStats(userId: string): Promise<Stats> {
  await ensureInit();
  const r = await getPool().query('SELECT * FROM player_stats WHERE user_id = $1', [userId]);
  if (r.rows.length === 0) return { userId, totalHands: 0, wins: 0, totalProfit: 0, maxPot: 0, elo: 1200 };
  const s = r.rows[0];
  return { userId: s.user_id, totalHands: s.total_hands, wins: s.wins, totalProfit: s.total_profit, maxPot: s.max_pot, elo: s.elo };
}

export async function updateStats(userId: string, result: 'win' | 'lose', payoff: number, pot: number): Promise<Stats> {
  await ensureInit();
  await getPool().query(
    `INSERT INTO player_stats (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  await getPool().query(
    `UPDATE player_stats SET
      total_hands = total_hands + 1,
      wins = wins + $2,
      total_profit = total_profit + $3,
      max_pot = GREATEST(max_pot, $4),
      elo = elo + $5
    WHERE user_id = $1`,
    [userId, result === 'win' ? 1 : 0, payoff, pot, result === 'win' ? 10 : -10],
  );
  return getStats(userId);
}

// ---- Transactions ----
export async function recordTransaction(userId: string, type: string, tokensDelta: number, pointsDelta = 0): Promise<void> {
  await ensureInit();
  await getPool().query(
    'INSERT INTO transactions (user_id, type, tokens_delta, points_delta) VALUES ($1, $2, $3, $4)',
    [userId, type, tokensDelta, pointsDelta],
  );
}
