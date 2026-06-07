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
}

const sessions = new Map<string, GameSession>();

function createSession(): GameSession {
  const engine = new MultiPokerEngine(2, 25, 50, 2500);
  engine.reset();
  const ai = new AIPersona('小李', {
    baseThinkTime: 0.8, noiseSigma: 0.15, bluffFrequency: 0.2, aggression: 1.2, color: '#E63946',
  }, 1);
  return { engine, ai, playerChips: 2500, aiChips: 2500 };
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

// ---- In-memory user store (MVP) ----
const JWT_SECRET = 'dev-secret-change-me';
const users = new Map<string, { username: string; hash: string }>();

app.use(express.json());

// ---- API Routes ----
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password || password.length < 6) {
    return res.status(400).json({ detail: '用户名或密码无效' });
  }
  if (users.has(username)) {
    return res.status(400).json({ detail: '用户名已存在' });
  }
  const hash = await bcrypt.hash(password, 10);
  users.set(username, { username, hash });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  return res.json({ token, username, userId: username });
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = users.get(username);
  if (!user) return res.status(401).json({ detail: '用户不存在' });
  const ok = await bcrypt.compare(password, user.hash);
  if (!ok) return res.status(401).json({ detail: '密码错误' });
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
  return res.json({ token, username });
});

app.get('/api/auth/me', (req, res) => {
  const token = (req.query.token as string) || '';
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { username: string };
    const user = users.get(payload.username);
    if (!user) return res.status(404).json({ detail: '用户不存在' });
    return res.json({ id: user.username, username: user.username, game_tokens: 0, points: 0 });
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

  socket.on('action', (actionId: ActionId) => {
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

    // Hand over
    if (gs.engine.isOver()) {
      const payoffs = gs.engine.getPayoffs();
      gs.playerChips += payoffs[0];
      gs.aiChips += payoffs[1];
      endHandStressDecay([gs.ai]);

      socket.emit('hand_result', {
        winner: payoffs[0] > 0 ? 'player' : 'ai',
        playerChips: gs.playerChips,
        aiChips: gs.aiChips,
        pot: gs.engine.totalPot(),
        payoffs,
        bankrupt: gs.playerChips <= gs.engine.bb,
      });
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

// ---- Start ----
http.listen(PORT, () => {
  console.log(`[Server] http://localhost:${PORT}`);
});

export { app, io, http };
