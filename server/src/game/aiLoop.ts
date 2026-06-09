/**
 * AI 循环 — 通用 AI 执行逻辑（1v1 和训练共用）
 */
import { decideAction } from '../ai/agent.js';
import { updateStress, endHandStressDecay, DEFAULT_STRESS_CFG } from '../ai/stress.js';
import { getTableTalk } from '../ai/llm.js';
import { sleep } from '../services/sessionManager.js';
import type { GameSession } from '../services/sessionManager.js';
import type { AIPersona } from '../ai/persona.js';
import type { MultiPokerEngine } from '../game/engine.js';
import type { ActionId, GameState } from '@poker/shared/index.js';
import * as DB from '../db/pgStore.js';

interface Emit {
  (evt: string, data: unknown): void;
}

const talkCache = new Map<string, string>();

export async function runOneVOneAiLoop(gs: GameSession, socket: Emit) {
  let safety = 0;
  while (!gs.engine.isOver() && gs.engine.currentPlayer !== 0 && safety++ < 20) {
    const cur = gs.engine.currentPlayer;
    const s = gs.engine.getState();
    s.players[cur].holeCards = gs.engine.players[cur].holeCards;

    socket('ai_thinking', { name: gs.ai.name, stress: gs.ai.stress });

    const decision = decideAction(s, gs.ai, cur, DEFAULT_STRESS_CFG);
    const tTime = Math.max(600, decision.thinkTime * 1000);
    await sleep(tTime);

    if (gs.engine.isOver() || gs.engine.currentPlayer !== cur) break;
    const aid = decision.actionId;
    gs.engine.step(aid);

    const aname = { 0: 'fold', 1: 'call', 2: 'raise', 3: 'raise', 4: 'all_in' }[aid] ?? 'call';
    socket('ai_action', { action: aname, text: `${gs.ai.name} ${aname}` });

    if (Math.random() < 0.15) {
      fireTalk(gs.ai, aname, gs.engine, socket);
    }

    socket('state', adaptState1v1(gs));
  }
  if (safety >= 20 && !gs.engine.isOver()) console.error('[AI] turn limit exceeded');

  if (gs.engine.isOver()) {
    await finish1v1Hand(gs, socket);
  }
}

async function finish1v1Hand(gs: GameSession, socket: Emit) {
  const payoffs = gs.engine.getPayoffs();
  gs.playerChips += payoffs[0];
  gs.aiChips += payoffs[1];
  endHandStressDecay([gs.ai]);

  const result = payoffs[0] > 0 ? 'win' : 'lose';
  let gameTokens: number | undefined;

  try {
    if (gs.userId) {
      await DB.handResult(gs.userId, payoffs[0], result === 'win' ? 'game_win' : 'game_lose', payoffs[0], gs.engine.totalPot());
      const user = await DB.findUserById(gs.userId);
      gameTokens = user?.gameTokens ?? 0;
    } else {
      // unknown socket id for anonymous users
      await DB.updateStats('anon', result, payoffs[0], gs.engine.totalPot());
    }
  } catch (err) {
    console.error('[AI] DB persist error:', err);
  }

  socket('hand_result', {
    winner: payoffs[0] > 0 ? 'player' : 'ai',
    playerChips: gs.playerChips,
    aiChips: gs.aiChips,
    pot: gs.engine.totalPot(),
    payoffs,
    gameTokens,
    bankrupt: gs.playerChips <= gs.engine.bb,
  });
}

function adaptState1v1(gs: GameSession): GameState {
  const s = gs.engine.getState();
  s.players[0].holeCards = gs.engine.players[0].holeCards;
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

async function fireTalk(ai: AIPersona, action: string, engine: MultiPokerEngine, socket: Emit) {
  const potCtx = `底池${engine.totalPot()} 阶段${engine.stage}`;
  const key = `${action}_${potCtx}`;
  let talk = talkCache.get(key);
  if (!talk) {
    talk = await getTableTalk(ai.name, action, potCtx);
    if (talkCache.size > 100) talkCache.clear();
    talkCache.set(key, talk);
  }
  socket('table_talk', { text: talk, name: ai.name });
}

// ---- Training loop ----

export async function runTrainingAiLoop(
  engine: MultiPokerEngine,
  ais: AIPersona[],
  trainingState: () => GameState,
  socket: Emit,
  lastChatTimes: Map<string, number>,
  onHandOver: () => Promise<void>,
) {
  let safety = 0;
  while (!engine.isOver() && engine.currentPlayer !== 0 && safety++ < 30) {
    const cur = engine.currentPlayer;
    const ai = ais[cur - 1];
    if (!ai) break;
    const s = engine.getState();
    s.players[cur].holeCards = engine.players[cur].holeCards;
    socket('ai_thinking', { name: ai.name, stress: ai.stress, seat: cur });

    const decision = decideAction(s, ai, cur, DEFAULT_STRESS_CFG);
    const tTime = Math.max(700, decision.thinkTime * 1000);
    await sleep(tTime);

    if (engine.isOver() || engine.currentPlayer !== cur) break;
    const aid = decision.actionId;
    engine.step(aid);
    const aname = { 0: 'fold', 1: 'call', 2: 'raise', 3: 'raise', 4: 'all_in' }[aid] ?? 'call';
    socket('ai_action', { action: aname, text: `${ai.name} ${aname}`, seat: cur });
    socket('state', trainingState());

    if (Math.random() < 0.2) {
      const last = lastChatTimes.get(ai.name) ?? 0;
      if (Date.now() - last > 1500) {
        lastChatTimes.set(ai.name, Date.now());
        fireTalk(ai, aname, engine, socket);
      }
    }
  }
  if (engine.isOver()) {
    await onHandOver();
    socket('state', trainingState());
  }
}
