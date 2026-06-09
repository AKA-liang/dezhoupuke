/**
 * 认证服务 — JWT + bcrypt 封装
 */
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { config } from '../config.js';
import type { AuthPayload } from '@poker/shared/index.js';

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, config.JWT_SECRET, { expiresIn: '24h' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET);
    if (typeof decoded === 'object' && decoded !== null && 'userId' in decoded && 'username' in decoded) {
      return decoded as AuthPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
