/**
 * 通用 Socket.io hook — 替换 useSocket + useTrainingSocket（消除 ~90% 重复）
 */
import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../stores/gameStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { useMessageStore } from '../stores/messageStore.js';
import { playRaise, playAllIn, playWin } from '../game/sounds.js';
import type { GameState, HandResult, HandStart, ChatMessage } from '@poker/shared/index.js';

const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:3000';

export function usePokerSocket(namespace: '1v1' | 'training') {
  const sock = useRef<Socket | null>(null);
  const url = `${BASE_URL}/${namespace === 'training' ? 'training' : 'oneVOne'}`;

  useEffect(() => {
    const s = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });
    sock.current = s;

    s.on('connect', () => {
      useGameStore.getState().setConnected(true);
      const token = useAuthStore.getState().token;
      if (token) s.emit('auth', { token });
    });
    s.on('disconnect', () => useGameStore.getState().setConnected(false));

    s.on('state', (gs: GameState) => useGameStore.getState().setState(gs));

    s.on('ai_thinking', (d: { name: string }) => {
      useMessageStore.getState().addMessage(`${d.name} 思考中...`);
    });

    s.on('ai_action', (d: { text: string; action: string }) => {
      useMessageStore.getState().addMessage(d.text);
      if (d.action === 'raise' || d.action === 'r_pot' || d.action === 'r_half') playRaise();
      else if (d.action === 'all_in') playAllIn();
    });

    s.on('table_talk', (d: { text: string; name: string }) => {
      useMessageStore.getState().addMessage(`💬 ${d.name}: ${d.text}`);
    });

    s.on('chat', (d: { name: string; text: string; from: 'player' | 'opponent' }) => {
      window.dispatchEvent(new CustomEvent('poker:chat', { detail: d }));
    });

    s.on('hand_result', (d: HandResult) => {
      useMessageStore.getState().addMessage(`🏆 ${d.winner === 'player' ? '你' : 'AI'} 赢得 ${d.pot}`);
      window.dispatchEvent(new CustomEvent('poker:hand_result', { detail: d }));
      if (d.winner === 'player') playWin();
      if (d.gameTokens !== undefined) {
        useAuthStore.getState().setSessionTokens(d.gameTokens);
      }
    });

    s.on('hand_start', (d: HandStart) => {
      useMessageStore.getState().addMessage(`第 ${d.hand + 1} 局开始`);
      window.dispatchEvent(new CustomEvent('poker:hand_start', { detail: d }));
    });

    s.on('me', (d: { username: string; gameTokens: number; points: number; elo: number }) => {
      useAuthStore.getState().setSessionInfo(d);
    });

    s.on('server_msg', (d: { text: string }) => {
      useMessageStore.getState().addMessage(d.text);
    });

    s.on('error', (err: Error) => console.error(`[WS ${namespace}] error:`, err));

    return () => { s.disconnect(); };
  }, [url]);

  // M7 fix: re-send auth when token changes (guest → login)
  useEffect(() => {
    const token = useAuthStore.getState().token;
    if (token && sock.current?.connected) {
      sock.current.emit('auth', { token });
    }
    const unsub = useAuthStore.subscribe(
      (state) => state.token,
      (newToken) => {
        if (newToken && sock.current?.connected) {
          sock.current.emit('auth', { token: newToken });
        }
      },
    );
    return unsub;
  }, []);

  const send = (evt: string, data?: unknown) => sock.current?.emit(evt, data);
  return { send };
}
