import { create } from 'zustand';
import type { GameState } from '@poker/shared/index.js';

interface GameStore {
  state: GameState | null;
  connected: boolean;
  setState: (s: GameState | null) => void;
  setConnected: (v: boolean) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  state: null,
  connected: false,
  setState: (s) => set({ state: s }),
  setConnected: (v) => set({ connected: v }),
}));
