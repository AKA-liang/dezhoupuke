/**
 * 德州扑克牌型评估器 — TypeScript 移植
 *
 * 不依赖任何外部库，支持 5-7 张牌的最佳 5 张组合评估。
 * 返回 { rank: 0-8, tiebreaker: number[] }
 */

import type { Card, Suit, Rank } from '@poker/shared/index.js';

const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

const RANK_NAMES: Record<number, string> = {
  0: '高牌', 1: '一对', 2: '两对', 3: '三条',
  4: '顺子', 5: '同花', 6: '葫芦', 7: '四条', 8: '同花顺',
};

export function rankName(rank: number): string {
  return RANK_NAMES[rank] ?? '未知';
}

export function rankToStrength(rank: number): number {
  const map: Record<number, number> = {
    0: 0.20, 1: 0.40, 2: 0.50, 3: 0.60,
    4: 0.70, 5: 0.80, 6: 0.85, 7: 0.95, 8: 1.00,
  };
  return map[rank] ?? 0.30;
}

interface EvalResult {
  rank: number;
  tiebreaker: number[];
}

function evalFive(cards: [number, string][]): EvalResult {
  const ranks = cards.map(c => c[0]).sort((a, b) => b - a);
  const suits = cards.map(c => c[1]);
  const isFlush = new Set(suits).size === 1;

  const counts = new Map<number, number>();
  for (const r of ranks) counts.set(r, (counts.get(r) ?? 0) + 1);
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const uniqueRanks = [...new Set(ranks)].sort((a, b) => b - a);

  let isStraight = false;
  let straightHigh = 0;
  if (uniqueRanks.length === 5) {
    if (uniqueRanks[0] - uniqueRanks[4] === 4) {
      isStraight = true;
      straightHigh = uniqueRanks[0];
    } else if (uniqueRanks[0] === 14 && uniqueRanks[1] === 5) {
      // A-2-3-4-5 wheel
      isStraight = true;
      straightHigh = 5;
    }
  }

  if (isStraight && isFlush) return { rank: 8, tiebreaker: [straightHigh] };
  if (entries[0][1] === 4) return { rank: 7, tiebreaker: [entries[0][0], entries[1][0]] };
  if (entries[0][1] === 3 && entries[1][1] === 2) return { rank: 6, tiebreaker: [entries[0][0], entries[1][0]] };
  if (isFlush) return { rank: 5, tiebreaker: ranks };
  if (isStraight) return { rank: 4, tiebreaker: [straightHigh] };
  if (entries[0][1] === 3) return { rank: 3, tiebreaker: [entries[0][0], ...entries.slice(1).map(e => e[0])] };
  if (entries[0][1] === 2 && entries[1][1] === 2) {
    const high = Math.max(entries[0][0], entries[1][0]);
    const low = Math.min(entries[0][0], entries[1][0]);
    return { rank: 2, tiebreaker: [high, low, entries[2][0]] };
  }
  if (entries[0][1] === 2) return { rank: 1, tiebreaker: [entries[0][0], ...entries.slice(1).map(e => e[0])] };
  return { rank: 0, tiebreaker: ranks };
}

function parseCard(card: Card): [number, string] {
  return [RANK_ORDER[card.rank] ?? 0, card.suit];
}

function bestFive(cards: [number, string][]): EvalResult {
  if (cards.length <= 5) return evalFive(cards);
  let best: EvalResult = { rank: -1, tiebreaker: [] };
  const n = cards.length;
  for (let i = 0; i < n - 4; i++)
    for (let j = i + 1; j < n - 3; j++)
      for (let k = j + 1; k < n - 2; k++)
        for (let l = k + 1; l < n - 1; l++)
          for (let m = l + 1; m < n; m++) {
            const combo = [cards[i], cards[j], cards[k], cards[l], cards[m]] as [number, string][];
            const r = evalFive(combo);
            if (r.rank > best.rank || (r.rank === best.rank && compareTB(r.tiebreaker, best.tiebreaker) > 0)) {
              best = r;
            }
          }
  return best;
}

function compareTB(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function evaluateHand(holeCards: Card[], communityCards: Card[]): EvalResult {
  const all = [...holeCards, ...communityCards].map(parseCard);
  if (all.length === 0) return { rank: -1, tiebreaker: [] };
  return bestFive(all);
}

export function handStrength(holeCards: Card[], communityCards: Card[]): number {
  const { rank } = evaluateHand(holeCards, communityCards);
  return rankToStrength(rank);
}

export { RANK_ORDER, RANK_NAMES };
