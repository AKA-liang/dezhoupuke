/**
 * 自建多人无限注德州扑克引擎 — TypeScript 移植
 *
 * 支持 2-6 人。包含盲注轮转、下注轮次、边池计算、摊牌比较。
 * 已应用 Python 版本 B1-B7 修复。
 */

import { evaluateHand } from './handEval.js';
import type { Card, ActionId, Stage, PlayerState, GameState, Suit, Rank } from '@poker/shared/index.js';

const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Deck {
  cards: Card[] = [];
  constructor() { this.reset(); }
  reset() { this.cards = shuffle(SUITS.flatMap(s => RANKS.map(r => ({ suit: s, rank: r })))); }
  deal(n: number): Card[] { return this.cards.splice(0, n); }
}

interface Player {
  seat: number;
  stack: number;
  holeCards: Card[];
  inChips: number;
  totalBet: number;
  folded: boolean;
  allIn: boolean;
  actedThisRound: boolean;
}

export class MultiPokerEngine {
  numPlayers: number;
  sb: number;
  bb: number;
  startStack: number;
  players: Player[];
  dealer: number;
  deck: Deck;
  communityCards: Card[] = [];
  pots: { amount: number; eligible: number[] }[] = [];
  stage: Stage = 'preflop';
  currentPlayer: number = 0;
  lastRaiser: number = -1;
  handOver: boolean = false;
  private roundBets: number[] = [];
  private minRaise: number;

  constructor(numPlayers: number, sb = 25, bb = 50, startStack = 2500) {
    if (numPlayers < 2 || numPlayers > 10) throw new Error('numPlayers must be 2-10');
    this.numPlayers = numPlayers;
    this.sb = sb;
    this.bb = bb;
    this.startStack = startStack;
    this.dealer = 0;
    this.deck = new Deck();
    this.minRaise = bb;
    this.players = Array.from({ length: numPlayers }, (_, i) => this.makePlayer(i));
  }

  private makePlayer(seat: number): Player {
    return { seat, stack: this.startStack, holeCards: [], inChips: 0, totalBet: 0, folded: false, allIn: false, actedThisRound: false };
  }

  reset(): GameState {
    for (const p of this.players) {
      p.stack = Math.max(0, p.stack);
      p.holeCards = [];
      p.inChips = 0;
      p.totalBet = 0;
      p.folded = false;
      p.allIn = false;
      p.actedThisRound = false;
    }
    this.deck.reset();
    this.communityCards = [];
    this.pots = [];
    this.stage = 'preflop';
    this.handOver = false;
    this.lastRaiser = -1;
    this.roundBets = Array(this.numPlayers).fill(0);
    this.minRaise = this.bb;
    this.dealHoleCards();
    this.postBlinds();
    return this.getState();
  }

  private dealHoleCards() {
    for (const p of this.players) p.holeCards = this.deck.deal(2);
  }

  private postBlinds() {
    let sbSeat = (this.dealer + 1) % this.numPlayers;
    let bbSeat = (this.dealer + 2) % this.numPlayers;
    if (this.numPlayers === 2) {
      sbSeat = this.dealer;
      bbSeat = (this.dealer + 1) % 2;
    }
    const sbActual = this.bet(this.players[sbSeat], this.sb);
    const bbActual = this.bet(this.players[bbSeat], this.bb);
    this.roundBets[sbSeat] = sbActual;
    this.roundBets[bbSeat] = bbActual;
    this.currentPlayer = (bbSeat + 1) % this.numPlayers;
  }

  private bet(p: Player, amount: number): number {
    const actual = Math.min(amount, p.stack);
    p.stack -= actual;
    p.inChips += actual;
    p.totalBet += actual;
    if (p.stack === 0) p.allIn = true;
    return actual;
  }

  step(actionId: ActionId): GameState {
    if (this.handOver) return this.getState();

    const legal = this.calcLegalActions().map(a => a.id);
    if (!legal.includes(actionId)) {
      console.warn(`Illegal action ${actionId}, defaulting to fold`);
      actionId = 0;
    }

    const p = this.players[this.currentPlayer];
    if (p.folded || p.allIn) return this.getState();

    const curBet = this.currentBet();

    if (actionId === 0) {
      p.folded = true;
    } else if (actionId === 1) {
      const diff = curBet - this.roundBets[p.seat];
      if (diff > 0) {
        const actual = this.bet(p, diff);
        this.roundBets[p.seat] += actual;
      }
    } else if (actionId === 2) {
      const pot = this.totalPot();
      const amount = Math.max(this.minRaise, Math.floor(pot / 2));
      this.doRaise(p, curBet, amount);
    } else if (actionId === 3) {
      const pot = this.totalPot();
      const amount = Math.max(this.minRaise, pot);
      this.doRaise(p, curBet, amount);
    } else if (actionId === 4) {
      const amount = p.stack;
      if (amount > 0) this.doRaise(p, curBet, amount);
      p.allIn = p.stack === 0;
    }

    p.actedThisRound = true;

    if (this.activePlayers().length <= 1) {
      this.endHand();
      return this.getState();
    }

    if (this.roundComplete()) {
      this.advanceStage();
    } else {
      this.nextPlayer();
    }

    if (this.stage === 'showdown' || this.handOver) {
      this.endHand();
    }

    return this.getState();
  }

  private doRaise(p: Player, curBet: number, amount: number) {
    const diff = curBet - this.roundBets[p.seat];
    const total = diff + amount;
    const actual = this.bet(p, total);
    this.roundBets[p.seat] += actual;
    if (actual >= diff + this.minRaise) {
      this.minRaise = actual - diff > 0 ? actual - diff : this.minRaise;
      this.lastRaiser = p.seat;
      for (const pl of this.players) {
        if (pl.seat !== p.seat) pl.actedThisRound = false;
      }
    }
  }

  private currentBet(): number { return Math.max(...this.roundBets); }
  private totalPot(): number { return this.players.reduce((s, p) => s + p.totalBet, 0); }
  private activePlayers() { return this.players.filter(p => !p.folded); }
  private activeNotAllIn() { return this.players.filter(p => !p.folded && !p.allIn); }

  private roundComplete(): boolean {
    const active = this.activeNotAllIn();
    if (active.length <= 1) return true;
    const cur = this.currentBet();
    return active.every(p => p.actedThisRound && this.roundBets[p.seat] >= cur);
  }

  private nextPlayer() {
    for (let i = 0; i < this.numPlayers; i++) {
      this.currentPlayer = (this.currentPlayer + 1) % this.numPlayers;
      const p = this.players[this.currentPlayer];
      if (!p.folded && !p.allIn) return;
    }
    this.currentPlayer = -1;
  }

  private advanceStage() {
    const stages: Stage[] = ['preflop', 'flop', 'turn', 'river', 'showdown'];
    const idx = stages.indexOf(this.stage);
    this.stage = stages[Math.min(idx + 1, stages.length - 1)];

    this.roundBets = Array(this.numPlayers).fill(0);
    this.minRaise = this.bb;
    this.lastRaiser = -1;
    for (const p of this.players) p.actedThisRound = false;

    if (this.stage === 'flop') this.communityCards.push(...this.deck.deal(3));
    else if (this.stage === 'turn' || this.stage === 'river') this.communityCards.push(...this.deck.deal(1));
    else if (this.stage === 'showdown') { this.endHand(); return; }

    // Post-flop: player left of dealer acts first
    this.currentPlayer = (this.dealer + 1) % this.numPlayers;

    for (let i = 0; i < this.numPlayers; i++) {
      const p = this.players[this.currentPlayer];
      if (p.folded || p.allIn) this.currentPlayer = (this.currentPlayer + 1) % this.numPlayers;
      else break;
    }

    if (this.roundComplete()) this.advanceStage();
  }

  private endHand() {
    if (this.handOver) return;
    this.handOver = true;
    this.pots = this.splitPots();
    this.distributePots();
  }

  private splitPots(): { amount: number; eligible: number[] }[] {
    const active = this.activePlayers();
    if (active.length === 0) return [];
    if (active.length === 1) {
      return [{ amount: this.totalPot(), eligible: [active[0].seat] }];
    }

    // Include ALL players for chip calculation, filter folded for eligibility
    const sorted = [...this.players].sort((a, b) => a.totalBet - b.totalBet);
    const pots: { amount: number; eligible: number[] }[] = [];
    let prev = 0;

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (p.totalBet > prev) {
        const remaining = sorted.slice(i);
        const eligibleSeats = remaining.filter(pl => !pl.folded).map(pl => pl.seat);
        const side = (p.totalBet - prev) * remaining.length;
        if (side > 0 && eligibleSeats.length > 0) {
          pots.push({ amount: side, eligible: eligibleSeats });
        }
        prev = p.totalBet;
      }
    }
    return pots;
  }

  private distributePots() {
    for (const pot of this.pots) {
      const eligible = pot.eligible.map(s => this.players[s]);
      let bestRank = -1;
      let bestTiebreaker: number[] = [];
      let winners: Player[] = [];

      for (const p of eligible) {
        const { rank, tiebreaker } = evaluateHand(p.holeCards, this.communityCards);
        if (rank > bestRank || (rank === bestRank && this.compareTB(tiebreaker, bestTiebreaker) > 0)) {
          bestRank = rank;
          bestTiebreaker = tiebreaker;
          winners = [p];
        } else if (rank === bestRank && this.compareTB(tiebreaker, bestTiebreaker) === 0) {
          winners.push(p);
        }
      }

      const share = Math.floor(pot.amount / winners.length);
      const remainder = pot.amount % winners.length;
      for (let j = 0; j < winners.length; j++) {
        winners[j].stack += share + (j < remainder ? 1 : 0);
      }
    }
  }

  private compareTB(a: number[], b: number[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
  }

  isOver(): boolean { return this.handOver; }

  getPayoffs(): number[] {
    return this.players.map(p => p.stack - this.startStack);
  }

  getState(): GameState {
    return {
      players: this.players.map(p => ({
        seat: p.seat,
        name: p.seat === 0 ? '你' : `AI-${p.seat}`,
        stack: p.stack,
        inChips: p.inChips,
        folded: p.folded,
        allIn: p.allIn,
        holeCards: null, // set by caller
        stress: null,
      })),
      communityCards: [...this.communityCards],
      pots: this.pots.length > 0 ? this.pots : null,
      totalPot: this.totalPot(),
      stage: this.stage,
      currentPlayer: this.currentPlayer,
      legalActions: this.calcLegalActions().map(a => a.id),
      dealer: this.dealer,
    };
  }

  calcLegalActions(): { id: ActionId; name: string }[] {
    if (this.handOver) return [];
    const p = this.players[this.currentPlayer];
    const cur = this.currentBet();
    const my = this.roundBets[p.seat];
    const actions: { id: ActionId; name: string }[] = [{ id: 0, name: 'fold' }];

    if (my >= cur) {
      actions.push({ id: 1, name: 'check_call' });
    } else {
      const diff = cur - my;
      if (diff >= p.stack) {
        actions.push({ id: 4, name: 'all_in' });
      } else {
        actions.push({ id: 1, name: 'check_call' });
      }
    }

    if (p.stack > 0 && !p.allIn) {
      actions.push({ id: 2, name: 'raise_half_pot' });
      actions.push({ id: 3, name: 'raise_pot' });
      if (!actions.some(a => a.id === 4)) actions.push({ id: 4, name: 'all_in' });
    }

    return actions;
  }

  advanceDealer() { this.dealer = (this.dealer + 1) % this.numPlayers; }
}
