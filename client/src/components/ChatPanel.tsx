import { useEffect, useRef, useState } from 'react';

export interface ChatMessage {
  id: number;
  name: string;
  text: string;
  isPlayer: boolean;
  isSystem?: boolean;
  timestamp: number;
}

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  disabled?: boolean;
  disabledReason?: string;
  myName?: string;
  maxHeight?: number;
}

const COLORS = {
  player: '#7fd4ff',
  opponent: '#ffb86c',
  system: '#888',
};

export default function ChatPanel({ messages, onSend, disabled, disabledReason, myName = '你', maxHeight = 180 }: Props) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const submit = () => {
    const t = text.trim();
    if (!t || disabled) return;
    onSend(t);
    setText('');
  };

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.55) 100%)',
      border: '1px solid rgba(212,165,72,0.3)',
      borderRadius: 12,
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 14px',
        borderBottom: '1px solid rgba(212,165,72,0.2)',
        fontSize: '0.78rem', color: '#d4a548', fontWeight: 'bold',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span>💬</span><span>对局聊天</span>
        <span style={{ marginLeft: 'auto', color: '#777', fontSize: '0.7rem', fontWeight: 'normal' }}>
          {messages.length} 条
        </span>
      </div>
      <div
        ref={listRef}
        style={{
          height: maxHeight, overflowY: 'auto', padding: '8px 14px',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}
        className="chat-scroll"
      >
        {messages.length === 0 && (
          <div style={{ color: '#666', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>
            暂无消息，发条问候吧～
          </div>
        )}
        {messages.map((m) => {
          if (m.isSystem) {
            return (
              <div key={m.id} style={{
                color: COLORS.system, fontSize: '0.75rem',
                textAlign: 'center', padding: '2px 0',
                fontStyle: 'italic',
              }}>
                — {m.text} —
              </div>
            );
          }
          return (
            <div key={m.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8,
              justifyContent: m.isPlayer ? 'flex-end' : 'flex-start',
            }}>
              {!m.isPlayer && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: COLORS.opponent, color: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 'bold', flexShrink: 0,
                }}>{m.name.charAt(0)}</div>
              )}
              <div style={{
                background: m.isPlayer ? 'rgba(127,212,255,0.15)' : 'rgba(255,184,108,0.12)',
                padding: '4px 10px', borderRadius: 10,
                maxWidth: '75%',
                fontSize: '0.85rem', color: m.isPlayer ? COLORS.player : COLORS.opponent,
                wordBreak: 'break-word',
                border: `1px solid ${m.isPlayer ? 'rgba(127,212,255,0.3)' : 'rgba(255,184,108,0.25)'}`,
              }}>
                {!m.isPlayer && <span style={{ fontSize: '0.7rem', color: '#999', marginRight: 4 }}>{m.name}:</span>}
                {m.text}
              </div>
              {m.isPlayer && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: COLORS.player, color: '#1a1a1a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 'bold', flexShrink: 0,
                }}>{myName.charAt(0)}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        padding: '8px 10px', borderTop: '1px solid rgba(212,165,72,0.2)',
        display: 'flex', gap: 6,
      }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={disabled ? (disabledReason || '聊天暂不可用') : '说点什么...'}
          disabled={disabled}
          maxLength={60}
          style={{
            flex: 1, padding: '6px 12px', borderRadius: 16,
            border: '1px solid #555', background: '#1a2a1a',
            color: '#f5e7d9', fontSize: '0.85rem', outline: 'none',
            opacity: disabled ? 0.5 : 1,
          }}
        />
        <button
          onClick={submit}
          disabled={disabled || !text.trim()}
          style={{
            padding: '6px 16px', borderRadius: 16, border: 'none',
            background: disabled || !text.trim() ? '#444' : '#d4a548',
            color: '#fff', fontWeight: 'bold', fontSize: '0.85rem',
            cursor: disabled || !text.trim() ? 'not-allowed' : 'pointer',
          }}
        >发送</button>
      </div>
      <style>{`
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(212,165,72,0.4); border-radius: 3px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background: rgba(212,165,72,0.6); }
      `}</style>
    </div>
  );
}
