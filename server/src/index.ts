/**
 * 沉浸式德州扑克 — Node.js 服务端入口
 *
 * Express + Socket.io 架构
 * 路由: /api/* REST, WS: socket.io rooms
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { MultiPokerEngine } from './game/engine.js';
import { AIPersona } from './ai/persona.js';
import { decideAction } from './ai/agent.js';
import { updateStress, endHandStressDecay, DEFAULT_STRESS_CFG } from './ai/stress.js';
import { getTableTalk } from './ai/llm.js';
import * as DB from './db/pgStore.js';
import type { GameState, ActionId } from '@poker/shared/index.js';

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = 3000;

// ---- Game Session ----
interface GameSession {
  engine: MultiPokerEngine;
  ai: AIPersona;
  playerChips: number;
  aiChips: number;
  userId: string | null;
  authenticated: boolean;
}

const sessions = new Map<string, GameSession>();

function createSession(): GameSession {
  const engine = new MultiPokerEngine(2, 25, 50, 2500);
  engine.reset();
  const ai = new AIPersona('小李', {
    baseThinkTime: 0.8, noiseSigma: 0.15, bluffFrequency: 0.2, color: '#E63946',
  }, 1);
  return { engine, ai, playerChips: 2500, aiChips: 2500, userId: null, authenticated: false };
}

function adaptState(gs: GameSession): GameState {
  const s = gs.engine.getState();
  // Set player hole cards for seat 0
  s.players[0].holeCards = gs.engine.players[0].holeCards;
  // Add total chip info
  return {
    ...s,
    playerChips: gs.playerChips,
    aiChips: gs.aiChips,
    players: s.players.map((p, i) => ({
      ...p,
      name: i === 0 ? '你' : gs.ai.name,
      stress: i === 1 ? gs.ai.stress : null,
    })),
  };
}

// ---- LLM Talk ----
const talkCache = new Map<string, string>();

// ---- Auth (JSON DB) ----
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(express.json());

// ---- API Routes ----
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.get('/api/stats', async (req, res) => {
  try {
    const uid = (req.query.userId as string) || 'anon';
    const stats = await DB.getStats(uid);
    return res.json(stats);
  } catch (err) {
    console.error('[API] /stats error:', err);
    return res.status(500).json({ detail: '服务暂不可用' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ detail: '用户名或密码无效' });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const user = await DB.createUser(username, hash);
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username, userId: user.id, gameTokens: user.gameTokens });
  } catch (e: unknown) {
    return res.status(400).json({ detail: (e as Error).message || '注册失败' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const user = await DB.findUser(username);
    if (!user) return res.status(401).json({ detail: '用户不存在' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ detail: '密码错误' });
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    return res.json({ token, username, userId: user.id, gameTokens: user.gameTokens });
  } catch (err) {
    console.error('[API] login error:', err);
    return res.status(500).json({ detail: '服务暂不可用' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const token = (req.query.token as string) || '';
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; username: string };
    const user = await DB.findUser(payload.username);
    if (!user) return res.status(404).json({ detail: '用户不存在' });
    const stats = await DB.getStats(user.id);
    return res.json({ id: user.id, username: user.username, game_tokens: user.gameTokens, points: user.points, elo: stats.elo });
  } catch {
    return res.status(401).json({ detail: 'Token无效' });
  }
});

// ---- Socket.io ----
io.on('connection', (socket) => {
  const gs = createSession();
  sessions.set(socket.id, gs);
  console.log(`[WS] ${socket.id} connected`);

  socket.emit('state', adaptState(gs));

  socket.on('error', (err) => console.error('[WS] socket error:', err.message));

  socket.on('auth', (data: { token: string }) => {
    try {
      const payload = jwt.verify(data.token, JWT_SECRET);
      if (typeof payload === 'object' && payload !== null && 'userId' in payload) {
        gs.userId = (payload as { userId: string }).userId;
        gs.authenticated = true;
      }
    } catch { /* guest */ }
  });

  socket.on('action', async (actionId: ActionId) => {
    try {
    if (gs.playerChips <= gs.engine.bb && !gs.engine.isOver()) {
      socket.emit('server_msg', { text: '筹码不足，请返回主页重新开始' });
      return;
    }
    if (gs.engine.isOver()) return;
    if (gs.engine.currentPlayer !== 0) return;

    gs.engine.step(actionId);
    if (actionId === 2 || actionId === 3) updateStress([gs.ai], 'raise', DEFAULT_STRESS_CFG);
    else if (actionId === 4) updateStress([gs.ai], 'all_in', DEFAULT_STRESS_CFG);

    socket.emit('state', adaptState(gs));

    // AI turns
    let safety = 0;
    while (!gs.engine.isOver() && gs.engine.currentPlayer !== 0 && safety++ < 20) {
      const cur = gs.engine.currentPlayer;
      const s = gs.engine.getState();
      s.players[cur].holeCards = gs.engine.players[cur].holeCards;

      socket.emit('ai_thinking', { name: gs.ai.name, stress: gs.ai.stress });

      const { actionId: aid } = decideAction(s, gs.ai, cur, DEFAULT_STRESS_CFG);
      gs.engine.step(aid);

      const aname = { 0: 'fold', 1: 'call', 2: 'raise', 3: 'raise', 4: 'all_in' }[aid] ?? 'call';
      socket.emit('ai_action', { action: aname, text: `${gs.ai.name} ${aname}` });

      // Fire-and-forget LLM talk
      const potCtx = `底池${gs.engine.totalPot()} 阶段${gs.engine.stage}`;
      (async () => {
        const key = `${aname}_${potCtx}`;
        let talk = talkCache.get(key);
        if (!talk) {
          talk = await getTableTalk(gs.ai.name, aname, potCtx);
          if (talkCache.size > 100) talkCache.clear();
          talkCache.set(key, talk);
        }
        socket.emit('table_talk', { text: talk, name: gs.ai.name });
      })().catch(() => {});

      socket.emit('state', adaptState(gs));
    }
    if (safety >= 20 && !gs.engine.isOver()) console.error('[WS] AI turn limit exceeded');

    // Hand over
    if (gs.engine.isOver()) {
      const payoffs = gs.engine.getPayoffs();
      gs.playerChips += payoffs[0];
      gs.aiChips += payoffs[1];
      endHandStressDecay([gs.ai]);

      const result = payoffs[0] > 0 ? 'win' : 'lose';
      const uid = gs.userId || socket.id;

      // Persist all DB changes atomically
      try {
        if (gs.userId) {
          await DB.handResult(gs.userId, payoffs[0], result === 'win' ? 'game_win' : 'game_lose', payoffs[0], gs.engine.totalPot());
          const user = await DB.findUserById(gs.userId);
          gameTokens = user?.gameTokens ?? 0;
        } else {
          await DB.updateStats(uid, result, payoffs[0], gs.engine.totalPot());
        }
      } catch (err) {
        console.error('[WS] DB persist error:', err);
      }

      socket.emit('hand_result', {
        winner: payoffs[0] > 0 ? 'player' : 'ai',
        playerChips: gs.playerChips,
        aiChips: gs.aiChips,
        pot: gs.engine.totalPot(),
        payoffs,
        gameTokens,
        bankrupt: gs.playerChips <= gs.engine.bb,
      });
    }
    } catch (err) {
      console.error('[WS] action error:', err);
    }
  });

  socket.on('restart', () => {
    gs.engine.advanceDealer();
    gs.engine.reset();
    socket.emit('state', adaptState(gs));
  });

  socket.on('disconnect', () => {
    sessions.delete(socket.id);
    console.log(`[WS] ${socket.id} disconnected`);
  });
});

// ---- Training Namespace ----
const trainingNsp = io.of('/training');
trainingNsp.on('connection', (socket) => {
  console.log(`[Training] ${socket.id} connected`);
  const engine = new MultiPokerEngine(6, 25, 50, 3000);
  engine.reset();
  const ais = [1, 2, 3, 4, 5].map(i => new AIPersona(
    ['老张', '小李', '王姐', '老张', '小李'][i - 1]!,
    { baseThinkTime: 0.8 + i * 0.1, noiseSigma: 0.1, bluffFrequency: 0.08 + i * 0.03, color: '#888' },
    i,
  ));

  function trainingState() {
    const s = engine.getState();
    s.players[0].holeCards = engine.players[0].holeCards;
    return {
      ...s,
      players: s.players.map((p, i) => ({
        ...p, name: i === 0 ? '你' : (ais[i - 1]?.name ?? 'AI'),
        stress: i > 0 ? (ais[i - 1]?.stress ?? 0) : null,
      })),
    };
  }

  socket.emit('state', trainingState());

  socket.on('action', (actionId: ActionId) => {
    if (engine.isOver() || engine.currentPlayer !== 0) return;
    engine.step(actionId);
    socket.emit('state', trainingState());

    let safety = 0;
    while (!engine.isOver() && engine.currentPlayer !== 0 && safety++ < 30) {
      const cur = engine.currentPlayer;
      const ai = ais[cur - 1]!;
      const s = engine.getState();
      s.players[cur].holeCards = engine.players[cur].holeCards;
      socket.emit('ai_thinking', { name: ai.name, stress: ai.stress, seat: cur });
      const { actionId: aid } = decideAction(s, ai, cur, DEFAULT_STRESS_CFG);
      engine.step(aid);
      const aname = { 0: 'fold', 1: 'call', 2: 'raise', 3: 'raise', 4: 'all_in' }[aid] ?? 'call';
      socket.emit('ai_action', { action: aname, text: `${ai.name} ${aname}`, seat: cur });
      socket.emit('state', trainingState());
    }

    if (engine.isOver()) {
      const payoffs = engine.getPayoffs();
      socket.emit('hand_result', { winner: payoffs[0] > 0 ? 'player' : 'ai', pot: engine.totalPot(), payoffs });
    }
  });

  socket.on('restart', () => {
    engine.advanceDealer();
    engine.reset();
    for (const ai of ais) ai.resetStress();
    socket.emit('state', trainingState());
  });

  socket.on('disconnect', () => console.log(`[Training] ${socket.id} left`));
});

// ---- Start ----
http.listen(PORT, () => {
  console.log(`[Server] http://localhost:${PORT}`);
});

export { app, io, http };
