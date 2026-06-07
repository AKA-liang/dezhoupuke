export type Suit = 'S' | 'H' | 'D' | 'C';
export type Rank = '2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'T'|'J'|'Q'|'K'|'A';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type ActionId = 0 | 1 | 2 | 3 | 4;
export type Stage = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';

export interface PlayerState {
  seat: number;
  name: string;
  stack: number;
  inChips: number;
  folded: boolean;
  allIn: boolean;
  holeCards: Card[] | null;
  stress: number | null;
}

export interface GameState {
  players: PlayerState[];
  communityCards: Card[];
  pots: { amount: number; eligible: number[] }[] | null;
  totalPot: number;
  stage: Stage;
  currentPlayer: number;
  legalActions: ActionId[];
  dealer: number;
  playerChips?: number;
  aiChips?: number;
}

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}
