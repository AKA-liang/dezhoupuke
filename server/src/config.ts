/**
 * 配置模块 — 集中管理所有环境变量
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envFile = resolve(__dirname, '../../.env');
  if (!existsSync(envFile)) return;
  const lines = readFileSync(envFile, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnv();

export const config = {
  PORT: Number(process.env.PORT) || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  PG_HOST: process.env.PG_HOST || 'localhost',
  PG_PORT: Number(process.env.PG_PORT) || 5432,
  PG_USER: process.env.PG_USER || 'poker',
  PG_PASSWORD: process.env.PG_PASSWORD || 'poker123',
  PG_DB: process.env.PG_DB || 'dezhoupuke',
  MINIMAX_API_KEY: process.env.MINIMAX_API_KEY || '',
  MINIMAX_MODEL: process.env.MINIMAX_MODEL || 'MiniMax-M3',
  isDev: !process.env.NODE_ENV || process.env.NODE_ENV === 'development',
} as const;

export function validateConfig() {
  const errors: string[] = [];
  if (!config.isDev && config.JWT_SECRET === 'dev-secret-change-me') {
    errors.push('FATAL: JWT_SECRET must be set in production');
  }
  if (!config.MINIMAX_API_KEY) {
    console.warn('[Config] MINIMAX_API_KEY not set — LLM features will use fallback');
  }
  for (const e of errors) {
    console.error(`[Config] ${e}`);
  }
  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }
  return true;
}
