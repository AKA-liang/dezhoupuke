import { create } from 'zustand';
import type { GameState } from '@poker/shared/index.js';

interface AuthState {
  token: string | null;
  username: string | null;
  gameTokens: number;
  points: number;
  elo: number;
  setAuth: (token: string, username: string, gameTokens: number, points: number, elo: number) => void;
  clearAuth: () => void;
}

interface GameStore {
  // Game
  state: GameState | null;
  connected: boolean;
  messages: string[];
  setState: (s: GameState) => void;
  setConnected: (v: boolean) => void;
  addMessage: (msg: string) => void;
  // Auth
  auth: AuthState;
}

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  connected: false,
  messages: [],
  setState: (s) => set({ state: s }),
  setConnected: (v) => set({ connected: v }),
  addMessage: (msg) => set((prev) => ({
    messages: [...prev.messages.slice(-4), msg],
  })),
  auth: {
    token: localStorage.getItem('token'),
    username: null,
    gameTokens: 0,
    points: 0,
    elo: 1200,
    setAuth: (token, username, gameTokens, points, elo) => {
      localStorage.setItem('token', token);
      set((prev) => ({
        auth: { ...prev.auth, token, username, gameTokens, points, elo },
      }));
    },
    setSessionTokens: (gameTokens) => {
      set((prev) => ({ auth: { ...prev.auth, gameTokens } }));
    },
    clearAuth: () => {
      localStorage.removeItem('token');
      set((prev) => ({
        auth: { token: null, username: null, gameTokens: 0, points: 0 },
      }));
    },
  },
}));
