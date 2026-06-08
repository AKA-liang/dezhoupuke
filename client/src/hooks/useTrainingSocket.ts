import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore.js';
import { playRaise, playAllIn, playWin } from '../game/sounds.js';
import type { GameState } from '@poker/shared/index.js';

export function useTrainingSocket() {
  const sock = useRef<Socket | null>(null);

  useEffect(() => {
    const s = io('http://localhost:3000/training', { transports: ['websocket'] });
    sock.current = s;

    s.on('state', (gs: GameState) => useGameStore.getState().setState(gs));
    s.on('ai_thinking', (d) => useGameStore.getState().addMessage(`${d.name} 思考中...`));
    s.on('hand_result', (d: { winner: string; pot: number; gameTokens?: number }) => {
      useGameStore.getState().addMessage(`🏆 ${d.winner === 'player' ? '你' : 'AI'} 赢得 ${d.pot}`);
      if (d.gameTokens !== undefined) useGameStore.getState().auth.setSessionTokens(d.gameTokens);
      if (d.winner === 'player') playWin();
    });
    s.on('connect', () => useGameStore.getState().setConnected(true));
    s.on('disconnect', () => useGameStore.getState().setConnected(false));

    return () => { s.disconnect(); };
  }, []);

  const send = (evt: string, data?: unknown) => sock.current?.emit(evt, data);
  return { send };
}
