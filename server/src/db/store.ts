/**
 * JSON 文件持久化层（零依赖，后续可替换为 SQLite/PostgreSQL）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

interface User {
  id: string;
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  gameTokens: number;
  points: number;
  createdAt: string;
}

interface PlayerStats {
  userId: string;
  totalHands: number;
  wins: number;
  totalProfit: number;
  maxPot: number;
  elo: number;
}

interface Transaction {
  id: string;
  userId: string;
  type: string;
  tokensDelta: number;
  pointsDelta: number;
  createdAt: string;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readUsers(): User[] {
  ensureDir();
  try { return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8')); }
  catch { return []; }
}

function writeUsers(users: User[]) {
  ensureDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ---- User CRUD ----
export function findUser(username: string): User | undefined {
  return readUsers().find(u => u.username === username);
}

export function createUser(username: string, hash: string): User {
  const users = readUsers();
  if (users.find(u => u.username === username)) throw new Error('用户已存在');
  const user: User = {
    id: Date.now().toString(36),
    username,
    passwordHash: hash,
    isAdmin: false,
    gameTokens: 10000,
    points: 0,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);
  return user;
}

export function updateTokens(userId: string, delta: number): User | undefined {
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  if (user) {
    user.gameTokens = Math.max(0, user.gameTokens + delta);
    writeUsers(users);
  }
  return user;
}

// ---- Player Stats ----
function statsFile(userId: string): string {
  return path.join(DATA_DIR, `stats_${userId}.json`);
}

export function getStats(userId: string): PlayerStats {
  try {
    return JSON.parse(fs.readFileSync(statsFile(userId), 'utf-8'));
  } catch {
    return { userId, totalHands: 0, wins: 0, totalProfit: 0, maxPot: 0, elo: 1200 };
  }
}

export function updateStats(userId: string, result: 'win' | 'lose', payoff: number, pot: number): PlayerStats {
  ensureDir();
  const stats = getStats(userId);
  stats.totalHands++;
  if (result === 'win') stats.wins++;
  stats.totalProfit += payoff;
  if (pot > stats.maxPot) stats.maxPot = pot;
  // Simple ELO: +10 for win, -10 for lose
  stats.elo += result === 'win' ? 10 : -10;
  fs.writeFileSync(statsFile(userId), JSON.stringify(stats, null, 2));
  return stats;
}

// ---- Transactions ----
function txFile(userId: string): string {
  return path.join(DATA_DIR, `tx_${userId}.json`);
}

export function recordTransaction(userId: string, type: string, tokensDelta: number, pointsDelta = 0): void {
  ensureDir();
  const txs: Transaction[] = (() => { try { return JSON.parse(fs.readFileSync(txFile(userId), 'utf-8')); } catch { return []; } })();
  txs.push({
    id: Date.now().toString(36),
    userId, type, tokensDelta, pointsDelta,
    createdAt: new Date().toISOString(),
  });
  if (txs.length > 1000) txs.splice(0, txs.length - 1000);
  fs.writeFileSync(txFile(userId), JSON.stringify(txs, null, 2));
}
