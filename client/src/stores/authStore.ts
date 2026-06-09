import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  userId: string | null;
  username: string | null;
  gameTokens: number;
  points: number;
  elo: number;
  setAuth: (token: string, userId: string, username: string, gameTokens: number, points: number, elo: number) => void;
  clearAuth: () => void;
  setSessionTokens: (gameTokens: number) => void;
  setSessionInfo: (info: { username: string; gameTokens: number; points: number; elo: number }) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  token: localStorage.getItem('token'),
  userId: localStorage.getItem('userId'),
  username: localStorage.getItem('username'),
  gameTokens: Number(localStorage.getItem('gameTokens')) || 0,
  points: Number(localStorage.getItem('points')) || 0,
  elo: Number(localStorage.getItem('elo')) || 1200,
  setAuth: (token, userId, username, gameTokens, points, elo) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userId', userId);
    localStorage.setItem('username', username);
    localStorage.setItem('gameTokens', String(gameTokens));
    localStorage.setItem('points', String(points));
    localStorage.setItem('elo', String(elo));
    set({ token, userId, username, gameTokens, points, elo });
  },
  setSessionTokens: (gameTokens) => {
    localStorage.setItem('gameTokens', String(gameTokens));
    set({ gameTokens });
  },
  setSessionInfo: (info) => {
    localStorage.setItem('username', info.username);
    localStorage.setItem('gameTokens', String(info.gameTokens));
    localStorage.setItem('points', String(info.points));
    localStorage.setItem('elo', String(info.elo));
    set({ username: info.username, gameTokens: info.gameTokens, points: info.points, elo: info.elo });
  },
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('gameTokens');
    localStorage.removeItem('points');
    localStorage.removeItem('elo');
    set({ token: null, userId: null, username: null, gameTokens: 0, points: 0, elo: 1200 });
  },
}));
