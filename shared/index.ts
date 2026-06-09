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

export interface HandResult {
  winner: 'player' | 'ai';
  pot: number;
  playerChips?: number;
  aiChips?: number;
  payoffs?: number[];
  gameTokens?: number;
  bankrupt?: boolean;
}

export interface HandStart {
  hand: number;
  dealer: number;
}

export interface ChatMessage {
  id: number;
  name: string;
  text: string;
  isPlayer: boolean;
  isSystem?: boolean;
  timestamp: number;
}

export interface AuthPayload {
  userId: string;
  username: string;
}

export interface AuthResponse {
  token: string;
  username: string;
  userId: string;
  gameTokens: number;
  points: number;
  elo: number;
}

export interface MeResponse {
  id: string;
  username: string;
  gameTokens: number;
  points: number;
  elo: number;
}

export interface WsMessage {
  type: string;
  [key: string]: unknown;
}
