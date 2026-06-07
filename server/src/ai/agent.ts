/**
 * AI 启发式决策引擎 — TypeScript 移植
 *
 * 决策公式: score = 0.4*strength + 0.3*odds + 0.2*position + 0.1*bluff - stress_penalty + noise
 */

import type { AIPersona } from './persona.js';
import { isTilted, type StressConfig, DEFAULT_STRESS_CFG } from './stress.js';
import { preflopStrength, RANGES } from './ranges.js';
import { handStrength, rankName } from '../game/handEval.js';
import type { GameState, ActionId, PlayerState } from '@poker/shared/index.js';

const ACTION_NAMES: Record<ActionId, string> = { 0: 'fold', 1: 'call', 2: 'r_half', 3: 'r_pot', 4: 'all_in' };

function gaussianNoise(sigma: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v) * sigma;
}

function calcPotOdds(callAmt: number, potAfter: number): number {
  if (potAfter <= 0) return 0;
  return callAmt / potAfter;
}

function calcPositionBonus(seat: number, dealer: number, numPlayers: number): number {
  if (numPlayers <= 2) return seat === dealer ? 0.30 : 0.05;
  const posMap: Record<number, number> = { 0: 0.30, 1: 0.25, 2: 0.20, 3: 0.15, 4: 0.10, 5: 0.05 };
  const relative = ((seat - dealer + numPlayers) % numPlayers);
  if (relative === numPlayers - 1) return 0.00;
  return posMap[relative] ?? 0.05;
}

function calcComplexity(activeOpponents: number, stage: string): number {
  const weights: Record<string, number> = { preflop: 0.2, flop: 0.4, turn: 0.6, river: 1.0 };
  const weight = weights[stage] ?? 0.5;
  return Math.min(1.0, (activeOpponents + weight) / 5);
}

function calcCallAmount(state: GameState, seat: number): number {
  let amt = 0;
  const myP = state.players[seat];
  for (const p of state.players) {
    if (p.seat !== seat) {
      const diff = p.inChips - myP.inChips;
      if (diff > 0) amt = diff;
    }
  }
  return amt;
}

function actionScore(
  hStrength: number, potOdds: number, posBonus: number,
  activeOpp: number, bluffTend: number, stress: number, noise: number,
): number {
  const adjusted = hStrength / (1 + 0.2 * Math.max(0, activeOpp - 1));
  const oddsFactor = potOdds < 1 ? (1 - potOdds) : 0;
  const bluffBonus = bluffTend * (1 - adjusted) * 0.5;
  const stressPenalty = (stress / 100) * 0.3;
  return 0.4 * adjusted + 0.3 * oddsFactor + 0.2 * posBonus + 0.1 * bluffBonus - stressPenalty + gaussianNoise(noise);
}

export function decideAction(
  state: GameState, ai: AIPersona, aiSeat: number,
  stressCfg: StressConfig = DEFAULT_STRESS_CFG,
): { actionId: ActionId; thinkTime: number } {
  const hole = state.players.find(p => p.seat === aiSeat)?.holeCards ?? [];
  const community = state.communityCards;
  const stage = state.stage;
  const activeOpp = state.players.filter(p => p.seat !== aiSeat && !p.folded && !p.allIn).length;
  const legalIds = state.legalActions as ActionId[];

  // Hand strength
  let hStrength: number;
  if (stage === 'preflop' && community.length === 0 && hole.length === 2) {
    const suited = hole[0]!.suit === hole[1]!.suit;
    const range = RANGES.balanced;
    hStrength = preflopStrength(hole[0]!.rank, hole[1]!.rank, suited, range);
  } else {
    hStrength = handStrength(hole, community);
  }

  const posBonus = calcPositionBonus(aiSeat, state.dealer, state.players.length);
  const callAmt = calcCallAmount(state, aiSeat);
  const potAfter = state.totalPot + callAmt;
  const potOdds = calcPotOdds(callAmt, potAfter);

  const complexity = calcComplexity(activeOpp, stage);
  const thinkTime = ai.effectiveThinkTime(complexity);

  // Tilt check
  if (isTilted(ai, stressCfg)) {
    const tiltActions = legalIds.filter(id => [0, 1, 3, 4].includes(id));
    if (tiltActions.length > 0) {
      return { actionId: tiltActions[Math.floor(Math.random() * tiltActions.length)]! as ActionId, thinkTime };
    }
  }

  const effectiveBluff = ai.bluffFrequency;
  const noise = ai.effectiveNoise();

  let bestAction: ActionId = 1;
  let bestScore = -Infinity;

  for (const aid of legalIds) {
    let score: number;
    switch (aid) {
      case 0: score = actionScore(hStrength, potOdds, posBonus + 0.1, activeOpp, effectiveBluff, ai.stress, noise) - 0.2; break;
      case 1: score = actionScore(hStrength, potOdds, posBonus, activeOpp, effectiveBluff, ai.stress, noise); break;
      case 2: score = actionScore(hStrength, potOdds, posBonus + 0.15, activeOpp, effectiveBluff, ai.stress, noise) - (hStrength < 0.3 ? 0.15 : 0); break;
      case 3: score = actionScore(hStrength, potOdds, posBonus + 0.2, activeOpp, effectiveBluff, ai.stress, noise) - (hStrength < 0.3 ? 0.1 : 0); break;
      case 4: score = actionScore(hStrength, potOdds, posBonus + 0.3, activeOpp, effectiveBluff, ai.stress, noise) - (hStrength < 0.6 ? 0.3 : 0); break;
      default: score = 0;
    }
    if (score > bestScore) { bestScore = score; bestAction = aid; }
  }

  return { actionId: bestAction, thinkTime };
}
