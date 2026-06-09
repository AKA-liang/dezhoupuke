/**
 * 训练模式 WebSocket 处理
 */
import type { Socket } from 'socket.io';
import { MultiPokerEngine } from '../game/engine.js';
import { AIPersona } from '../ai/persona.js';
import { buildAis } from '../ai/personaRegistry.js';
import { decideAction } from '../ai/agent.js';
import { verifyToken } from '../services/authService.js';
import { runTrainingAiLoop } from '../game/aiLoop.js';
import { getChatReply, getTableTalk } from '../ai/llm.js';
import * as DB from '../db/pgStore.js';
import type { ActionId, GameState } from '@poker/shared/index.js';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function setupTraining(socket: Socket) {
  console.log(`[Training] ${socket.id} connected`);

  let trainingUserId: string | null = null;
  let trainingUsername: string | null = null;
  let trainingHandCount = 0;
  let lastChatTimes = new Map<string, number>();

  let aiCount = 2;
  let engine = new MultiPokerEngine(aiCount + 1, 25, 50, 3000);
  engine.reset();
  let ais = buildAis(aiCount);

  function trainingState(): GameState {
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

  let aiLoopRunning = false;
  const emit = (evt: string, data: unknown) => socket.emit(evt, data);

  const onHandOver = async () => {
    const payoffs = engine.getPayoffs();
    const result = payoffs[0] > 0 ? 'win' : 'lose';
    try {
      if (trainingUserId) {
        await DB.handResult(trainingUserId, payoffs[0], result === 'win' ? 'game_win' : 'game_lose', payoffs[0], engine.totalPot());
      } else {
        await DB.updateStats(socket.id, result, payoffs[0], engine.totalPot());
      }
    } catch (err) {
      console.error('[Training] DB persist error:', err);
    }
    socket.emit('hand_result', {
      winner: payoffs[0] > 0 ? 'player' : 'ai',
      pot: engine.totalPot(),
      payoffs,
    });
  };

  async function startAiLoop() {
    if (aiLoopRunning) return;
    if (engine.isOver() || engine.currentPlayer === 0) return;
    aiLoopRunning = true;
    await runTrainingAiLoop(engine, ais, trainingState, emit, lastChatTimes, onHandOver);
    aiLoopRunning = false;
    // 新轮次后如果需要，继续
    if (!engine.isOver() && engine.currentPlayer !== 0) {
      startAiLoop();
    }
  }

  function rebuildEngine(n: number) {
    aiCount = n;
    engine = new MultiPokerEngine(aiCount + 1, 25, 50, 3000);
    engine.reset();
    ais = buildAis(aiCount);
    trainingHandCount = 0;
    lastChatTimes.clear();
  }

  socket.on('auth', async (data: { token: string }) => {
    const payload = verifyToken(data.token);
    if (!payload) return;
    try {
      const user = await DB.findUserById(payload.userId);
      if (user) {
        trainingUserId = payload.userId;
        trainingUsername = user.username;
        const stats = await DB.getStats(payload.userId);
        socket.emit('me', { username: user.username, gameTokens: user.gameTokens, points: user.points, elo: stats.elo });
      }
    } catch { /* ignore */ }
  });

  let initReceived = false;

  socket.on('init', (data: { aiCount?: number }) => {
    const n = Math.max(1, Math.min(9, data?.aiCount ?? 1));
    const wasChanged = n !== aiCount;
    if (wasChanged) {
      rebuildEngine(n);
    }
    if (!initReceived || wasChanged) {
      if (!initReceived) {
        socket.emit('hand_start', { hand: 0, dealer: engine.dealer });
      }
      initReceived = true;
      socket.emit('state', trainingState());
      startAiLoop();
    }
  });

  socket.on('chat', async (data: { text: string }) => {
    const text = (data?.text || '').toString().trim().slice(0, 60);
    if (!text) return;
    const name = trainingUsername || '你';
    socket.emit('chat', { name, text, from: 'player' });

    const responders = [...ais].sort(() => Math.random() - 0.5).slice(0, 2);
    for (const ai of responders) {
      const last = lastChatTimes.get(ai.name) ?? 0;
      if (Date.now() - last < 1200) continue;
      lastChatTimes.set(ai.name, Date.now());
      const ctx = { stage: engine.stage, pot: engine.totalPot(), playerName: name };
      const delay = 600 + Math.random() * 1500;
      (async () => {
        await sleep(delay);
        const reply = await getChatReply(ai.name, text, ctx);
        socket.emit('chat', { name: ai.name, text: reply, from: 'opponent' });
      })().catch((err) => { console.error('[Training] chat reply error:', (err as Error).message); });
    }
  });

  socket.on('action', async (actionId: ActionId) => {
    if (engine.isOver() || engine.currentPlayer !== 0) return;
    engine.step(actionId);
    socket.emit('state', trainingState());
    startAiLoop();
  });

  socket.on('restart', () => {
    if (!engine.isOver()) {
      socket.emit('server_msg', { text: '当前手牌未结束，请先打完这一局' });
      return;
    }
    trainingHandCount++;
    engine.advanceDealer();
    engine.reset();
    for (const ai of ais) ai.resetStress();
    socket.emit('hand_start', { hand: trainingHandCount, dealer: engine.dealer });
    socket.emit('state', trainingState());
    startAiLoop();
  });

  socket.on('disconnect', () => console.log(`[Training] ${socket.id} left`));
}
