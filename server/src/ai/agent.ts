/**
 * AI 启发式决策引擎 — 保守化重写
 *
 * 决策分层：
 * - 烂牌 (< 0.25): fold 优先
 * - 弱牌 (0.25-0.4): call/check
 * - 中牌 (0.4-0.6): 50% call, 40% raise_half, 10% raise_pot
 * - 强牌 (0.6-0.8): raise_pot 优先
 * - 超强牌 (> 0.8): all_in
 *
 * 配合 persona.style (tight/balanced/loose) 调整阈值。
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
  return Math.min(1, callAmt / potAfter);
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
      if (diff > 0) amt = Math.max(amt, diff);
    }
  }
  return amt;
}

type Style = 'tight' | 'balanced' | 'loose';

function getStyle(ai: AIPersona): Style {
  if (ai.bluffFrequency < 0.12) return 'tight';
  if (ai.bluffFrequency > 0.20) return 'loose';
  return 'balanced';
}

const STYLE_THRESHOLDS: Record<Style, { fold: number; raise: number; allin: number }> = {
  tight:    { fold: 0.32, raise: 0.55, allin: 0.82 },
  balanced: { fold: 0.22, raise: 0.45, allin: 0.75 },
  loose:    { fold: 0.14, raise: 0.35, allin: 0.65 },
};

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

  const style = getStyle(ai);
  const th = STYLE_THRESHOLDS[style];

  // Tilt: 当 AI 处于压力/上头状态，倾向激进
  const tiltBoost = isTilted(ai, stressCfg) ? 0.08 : 0;

  const effectiveFold = Math.max(0, th.fold - tiltBoost);
  const effectiveRaise = Math.max(0, th.raise - tiltBoost);
  const effectiveAllIn = Math.max(0, th.allin - tiltBoost);

  // 位置加成（坐庄位更激进）
  const posBoost = (posBonus - 0.10) * 0.3;
  // 锅赔率加成（对手加注大 → fold 倾向增加）
  const foldOddsPressure = potOdds > 0.5 ? (potOdds - 0.5) * 0.5 : 0;
  // 噪音
  const noise = ai.effectiveNoise() * 0.4;

  const scores: Record<number, number> = {};
  for (const aid of legalIds) {
    let s = 0;
    if (aid === 0) {
      // fold: 烂牌 + 锅赔率大 + 多人
      s = (1 - hStrength) * 1.2
        + foldOddsPressure
        + activeOpp * 0.05
        + posBoost
        + noise;
    } else if (aid === 1) {
      // call/check: 中等牌 + 锅赔率合理
      const callScore = hStrength * 0.8 - potOdds * 0.4 + posBoost;
      // 烂牌不轻易跟注
      s = callScore * (hStrength < effectiveFold ? 0.3 : 1) + noise;
    } else if (aid === 2) {
      // raise half pot: 中牌可半诈唬
      s = hStrength * 1.0 + posBoost * 0.5 - 0.1 + noise;
    } else if (aid === 3) {
      // raise pot: 强牌
      s = hStrength * 1.4 + posBoost * 0.7 + 0.1 + noise;
    } else if (aid === 4) {
      // all in: 超强牌
      s = hStrength * 1.6 + posBoost + 0.2 + noise;
    }
    // 阈值门控：raise/all_in 需要牌力
    if ((aid === 2 || aid === 3) && hStrength < effectiveRaise * 0.5) s -= 0.5;
    if (aid === 4 && hStrength < effectiveAllIn * 0.6) s -= 1.0;
    // 烂牌不能 raise
    if (hStrength < effectiveFold && (aid === 2 || aid === 3 || aid === 4)) s -= 1.0;
    scores[aid] = s;
  }

  // 选最高分
  let bestAction: ActionId = 1;
  let bestScore = -Infinity;
  for (const aid of legalIds) {
    if (scores[aid]! > bestScore) {
      bestScore = scores[aid]!;
      bestAction = aid;
    }
  }

  // Safety: 烂牌必须能 fold
  if (hStrength < 0.15 && legalIds.includes(0)) bestAction = 0;

  return { actionId: bestAction, thinkTime };
}
