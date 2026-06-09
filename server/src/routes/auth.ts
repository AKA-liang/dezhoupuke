/**
 * REST API 路由 — 认证 + 统计
 * TODO: add express-rate-limit for login/register endpoints
 */
import { Router } from 'express';
import * as DB from '../db/pgStore.js';
import * as auth from '../services/authService.js';

export const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok' }));

router.get('/stats', async (req, res) => {
  try {
    const uid = (req.query.userId as string) || 'anon';
    const stats = await DB.getStats(uid);
    res.json(stats);
  } catch (err) {
    console.error('[API] /stats error:', err);
    res.status(500).json({ detail: '服务暂不可用' });
  }
});

router.post('/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ detail: '用户名或密码无效' });
  }
  try {
    const hash = await auth.hashPassword(password);
    const user = await DB.createUser(username, hash);
    const stats = await DB.getStats(user.id);
    const token = auth.signToken({ userId: user.id, username });
    res.json({ token, username, userId: user.id, gameTokens: user.gameTokens, points: user.points, elo: stats.elo });
  } catch (e: unknown) {
    res.status(400).json({ detail: (e as Error).message || '注册失败' });
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await DB.findUser(username);
    if (!user) return res.status(401).json({ detail: '用户不存在' });
    const ok = await auth.comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ detail: '密码错误' });
    const stats = await DB.getStats(user.id);
    const token = auth.signToken({ userId: user.id, username });
    res.json({ token, username, userId: user.id, gameTokens: user.gameTokens, points: user.points, elo: stats.elo });
  } catch (err) {
    console.error('[API] login error:', err);
    res.status(500).json({ detail: '服务暂不可用' });
  }
});

router.get('/auth/me', async (req, res) => {
  const token = (req.query.token as string) || '';
  const payload = auth.verifyToken(token);
  if (!payload) return res.status(401).json({ detail: 'Token无效' });
  const user = await DB.findUser(payload.username);
  if (!user) return res.status(404).json({ detail: '用户不存在' });
  const stats = await DB.getStats(user.id);
  res.json({ id: user.id, username: user.username, gameTokens: user.gameTokens, points: user.points, elo: stats.elo });
});
