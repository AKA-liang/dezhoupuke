import { useRef, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore.js';
import { useSocket } from '../hooks/useSocket.js';

interface Props {
  onBack: () => void;
}

const SUIT = { S: '♠', H: '♥', D: '♦', C: '♣' } as Record<string, string>;
const SUIT_COLOR = { H: '#d42020', D: '#d42020', S: '#1a1a1a', C: '#1a1a1a' } as Record<string, string>;
const RANK = { T: '10' } as Record<string, string>;

function cardStr(c: { rank: string; suit: string }): string {
  return `${(RANK[c.rank] ?? c.rank)}${SUIT[c.suit] ?? c.suit}`;
}

function cardColor(c: { suit: string }): string {
  return SUIT_COLOR[c.suit] ?? '#1a1a1a';
}

export default function Table({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { state, connected, messages } = useGameStore();
  const { send } = useSocket();

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);

    // Felt
    const felt = ctx.createRadialGradient(W / 2, H * 0.3, 50, W / 2, H * 0.3, W);
    felt.addColorStop(0, '#2d6b3a');
    felt.addColorStop(0.4, '#1a4a24');
    felt.addColorStop(1, '#0e2e14');
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, W, H);

    // Dealer chip
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(W / 2, 28, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd966';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D', W / 2, 31);

    // Community cards
    const commCards = state.communityCards;
    const startX = W / 2 - (commCards.length || 5) * 30;
    for (let i = 0; i < Math.max(commCards.length, 0); i++) {
      drawCard(ctx, startX + i * 60 + 30, 130, commCards[i]!, true);
    }

    // Pot
    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`底池: ${state.totalPot}`, W / 2, 210);

    // Player (seat 0) - bottom
    const p0 = state.players[0];
    drawPlayer(ctx, W / 2, H - 100, p0?.stack ?? 0, p0?.name ?? '你', true);
    if (p0?.holeCards) {
      for (let i = 0; i < p0.holeCards.length; i++) {
        drawCard(ctx, W / 2 - 30 + i * 55, H - 160, p0.holeCards[i]!, true);
      }
    }

    // AI (seat 1) - top
    const p1 = state.players[1];
    drawPlayer(ctx, W / 2, 80, p1?.stack ?? 0, p1?.name ?? 'AI', false);
    for (let i = 0; i < 2; i++) {
      drawCard(ctx, W / 2 - 30 + i * 55, 50, null, false);
    }

    // Status
    ctx.fillStyle = connected ? '#0f0' : '#f66';
    ctx.font = '11px sans-serif';
    ctx.fillText(connected ? '已连接' : '断开', W - 50, H - 10);

    // Stage
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText(stageLabel(state.stage), W / 2, 230);

  }, [state, connected]);

  const legalIds = state?.legalActions ?? [];

  return (
    <div style={{ position: 'relative', width: 800, height: 550, margin: '0 auto' }}>
      <canvas ref={canvasRef} width={800} height={550} style={{ borderRadius: 16, display: 'block' }} />

      {/* Action buttons */}
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <ABtn label="弃牌" color="#8b3a3a" disabled={!legalIds.includes(0)} onClick={() => send('action', 0)} />
        <ABtn label={state?.currentPlayer === 0 && state ? (state.players[0].inChips < state.players[1].inChips ? '跟注' : '过牌') : '--'} color="#2e6b3e" disabled={!legalIds.includes(1)} onClick={() => send('action', 1)} />
        <ABtn label="加注½" color="#d4812b" disabled={!legalIds.includes(2)} onClick={() => send('action', 2)} />
        <ABtn label="加注全池" color="#e67e22" disabled={!legalIds.includes(3)} onClick={() => send('action', 3)} />
        <ABtn label="全下" color="#c0392b" disabled={!legalIds.includes(4)} onClick={() => send('action', 4)} />
        <ABtn label="下一局" color="#444" disabled={!state?.currentPlayer || state?.currentPlayer !== 0} onClick={() => send('restart', {})} />
        <ABtn label="← 返回" color="#444" disabled={false} onClick={onBack} />
      </div>

      {/* Messages */}
      <div style={{ position: 'absolute', bottom: 50, left: 10, right: 10, maxHeight: 60, overflow: 'hidden' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ color: '#ddd', fontSize: 12, textShadow: '0 1px 2px #000' }}>{m}</div>
        ))}
      </div>
    </div>
  );
}

function ABtn({ label, color, disabled, onClick }: { label: string; color: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: color, border: 'none', color: '#fff', padding: '6px 14px',
        borderRadius: 20, fontWeight: 'bold', fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'transform 0.1s',
      }}
    >{label}</button>
  );
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, card: { rank: string; suit: string } | null, faceUp: boolean) {
  const w = 44, h = 62, r = 5;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x - w / 2, y - h / 2, w, h, r);
  ctx.clip();
  if (!faceUp || !card) {
    ctx.fillStyle = '#2c3e66';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = '#1a2a4a';
    for (let i = 0; i < 6; i++) ctx.fillRect(x - w / 2, y - h / 2 + i * 12, w, 6);
  } else {
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - w / 2, y - h / 2, w, h);
    ctx.fillStyle = cardColor(card);
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cardStr(card), x, y + 4);
    ctx.font = '10px sans-serif';
    ctx.fillText(cardStr(card), x - 14, y - h / 2 + 14);
    ctx.fillText(cardStr(card), x + 14, y + h / 2 - 4);
  }
  ctx.restore();
}

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, stack: number, name: string, isActive: boolean) {
  ctx.fillStyle = isActive ? '#ffd966' : '#ccc';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${name}  ${stack}`, x, y);
}

function stageLabel(s: string): string {
  const m: Record<string, string> = { preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌' };
  return m[s] ?? s;
}
