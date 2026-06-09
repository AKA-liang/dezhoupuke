/**
 * 会话管理 — GameSession 生命周期
 */
import { MultiPokerEngine } from '../game/engine.js';
import { AIPersona } from '../ai/persona.js';
import { createPersona } from '../ai/personaRegistry.js';
import type { GameState } from '@poker/shared/index.js';

export interface GameSession {
  engine: MultiPokerEngine;
  ai: AIPersona;
  playerChips: number;
  aiChips: number;
  userId: string | null;
  username: string | null;
  authenticated: boolean;
  handCount: number;
  aiChatLast: number;
}

const sessions = new Map<string, GameSession>();

export function createSession(): GameSession {
  const engine = new MultiPokerEngine(2, 25, 50, 2500);
  engine.reset();
  const ai = createPersona('小李', 1);
  return {
    engine, ai,
    playerChips: 2500, aiChips: 2500,
    userId: null, username: null, authenticated: false,
    handCount: 0, aiChatLast: 0,
  };
}

export function adaptState(gs: GameSession): GameState {
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

export function getSession(socketId: string): GameSession {
  let gs = sessions.get(socketId);
  if (!gs) {
    gs = createSession();
    sessions.set(socketId, gs);
  }
  return gs;
}

export function deleteSession(socketId: string) {
  sessions.delete(socketId);
}

export const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
