import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore.js';
import { playRaise, playAllIn, playWin } from '../game/sounds.js';
import type { GameState } from '@poker/shared/index.js';

const SOCKET_URL = 'http://localhost:3000';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { setState, setConnected, addMessage } = useGameStore();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      const token = localStorage.getItem('token');
      if (token) {
        socket.emit('auth', { token });
      }
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('state', (gs: GameState) => setState(gs));

    socket.on('ai_thinking', (d: { name: string }) => {
      addMessage(`${d.name} 思考中...`);
    });

    socket.on('ai_action', (d: { text: string; action: string }) => {
      addMessage(d.text);
      if (d.action === 'raise' || d.action === 'r_pot' || d.action === 'r_half') playRaise();
      else if (d.action === 'all_in') playAllIn();
    });

    socket.on('table_talk', (d: { text: string; name: string }) => {
      addMessage(`💬 ${d.name}: ${d.text}`);
    });

    socket.on('hand_result', (d: { winner: string; pot: number; gameTokens?: number }) => {
      addMessage(`🏆 ${d.winner === 'player' ? '你' : 'AI'} 赢得 ${d.pot}`);
      if (d.winner === 'player') playWin();
      if (d.gameTokens !== undefined) {
        useGameStore.getState().auth.setSessionTokens(d.gameTokens);
      }
    });

    return () => { socket.disconnect(); };
  }, []);

  const send = (type: string, payload: Record<string, unknown> = {}) => {
    socketRef.current?.emit(type, payload);
  };

  return { socket: socketRef, send };
}
