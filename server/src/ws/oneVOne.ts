/**
 * 1v1 对局 WebSocket 处理
 */
import type { Socket } from 'socket.io';
import { verifyToken } from '../services/authService.js';
import { getSession, adaptState, deleteSession } from '../services/sessionManager.js';
import { runOneVOneAiLoop } from '../game/aiLoop.js';
import { getChatReply } from '../ai/llm.js';
import { updateStress, DEFAULT_STRESS_CFG } from '../ai/stress.js';
import * as DB from '../db/pgStore.js';
import type { ActionId } from '@poker/shared/index.js';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export function setupOneVOne(socket: Socket) {
  const gs = getSession(socket.id);
  console.log(`[1v1] ${socket.id} connected`);
  socket.emit('state', adaptState(gs));

  socket.on('error', (err) => console.error('[1v1] socket error:', err.message));

  socket.on('auth', async (data: { token: string }) => {
    const payload = verifyToken(data.token);
    if (!payload) return;
    gs.userId = payload.userId;
    gs.authenticated = true;
    try {
      const user = await DB.findUserById(gs.userId);
      if (user) {
        const stats = await DB.getStats(gs.userId);
        gs.username = user.username;
        socket.emit('me', { username: user.username, gameTokens: user.gameTokens, points: user.points, elo: stats.elo });
      }
    } catch { /* ignore */ }
  });

  socket.on('chat', async (data: { text: string }) => {
    const text = (data?.text || '').toString().trim().slice(0, 60);
    if (!text) return;
    const name = gs.username || '游客';
    socket.emit('chat', { name, text, from: 'player' });

    if (Date.now() - gs.aiChatLast < 1200) return;
    gs.aiChatLast = Date.now();
    const ctx = { stage: gs.engine.stage, pot: gs.engine.totalPot(), playerName: name };
    const delay = 500 + Math.random() * 1500;
    (async () => {
      await sleep(delay);
      const reply = await getChatReply(gs.ai.name, text, ctx);
      socket.emit('chat', { name: gs.ai.name, text: reply, from: 'opponent' });
    })().catch((err) => { console.error('[1v1] chat reply error:', (err as Error).message); });
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
      await runOneVOneAiLoop(gs, (evt, data) => socket.emit(evt, data));
    } catch (err) {
      console.error('[1v1] action error:', err);
    }
  });

  socket.on('restart', async () => {
    if (!gs.engine.isOver()) {
      socket.emit('server_msg', { text: '当前手牌未结束，请先打完这一局' });
      return;
    }
    gs.handCount++;
    gs.engine.advanceDealer();
    gs.engine.reset();
    socket.emit('hand_start', { hand: gs.handCount, dealer: gs.engine.dealer });
    socket.emit('state', adaptState(gs));
    if (gs.engine.currentPlayer !== 0 && !gs.engine.isOver()) {
      await runOneVOneAiLoop(gs, (evt, data) => socket.emit(evt, data));
    }
  });

  socket.on('disconnect', () => {
    deleteSession(socket.id);
    console.log(`[1v1] ${socket.id} disconnected`);
  });
}
