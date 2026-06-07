import { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore } from '../stores/gameStore.js';
import { useSocket } from '../hooks/useSocket.js';

interface Props {
  onBack: () => void;
}

interface AnimState {
  cardDealProgress: number;
  communityLen: number;
  allIn: boolean;
  showdown: boolean;
}

const SUIT: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLOR: Record<string, string> = { H: '#d42020', D: '#d42020', S: '#1a1a1a', C: '#1a1a1a' };
const RANK: Record<string, string> = { T: '10' };

function cardStr(c: { rank: string; suit: string }): string {
  return `${(RANK[c.rank] ?? c.rank)}${SUIT[c.suit] ?? c.suit}`;
}
function cardColor(c: { suit: string }): string {
  return SUIT_COLOR[c.suit] ?? '#1a1a1a';
}

export default function Table({ onBack }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { state, connected, messages } = useGameStore();
  const { send } = useSocket();
  const prevLen = useRef(0);
  const prevAllIn = useRef(false);
  const [animDeal, setAnimDeal] = useState(0);
  const [pulse, setPulse] = useState(false);

  // Detect changes for animations
  useEffect(() => {
    if (!state) return;
    const cLen = state.communityCards.length;
    if (cLen > prevLen.current) {
      setAnimDeal(prev => prev + 1);
      prevLen.current = cLen;
    }
    const anyAllIn = state.players.some(p => p.allIn);
    if (anyAllIn && !prevAllIn.current) {
      setPulse(true);
      setTimeout(() => setPulse(false), 2400);
    }
    prevAllIn.current = anyAllIn;
    if (state.stage === 'showdown') {
      prevLen.current = 0;
    }
  }, [state]);

  // Draw canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d')!;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Felt background
    const felt = ctx.createRadialGradient(W / 2, H * 0.3, 50, W / 2, H * 0.3, W);
    felt.addColorStop(0, '#2d6b3a');
    felt.addColorStop(0.4, '#1a4a24');
    felt.addColorStop(1, '#0e2e14');
    ctx.fillStyle = felt;
    ctx.fillRect(0, 0, W, H);

    // Dealer chip
    ctx.fillStyle = '#ffd966';
    ctx.beginPath();
    ctx.arc(W / 2, 28, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('D', W / 2, 31);

    // Community cards with animation
    const cards = state.communityCards;
    for (let i = 0; i < cards.length; i++) {
      const targetX = W / 2 - (cards.length - 1) * 30 + i * 60;
      const targetY = 130;
      // Animate from center if this is the newest card
      let x = targetX, y = targetY;
      if (i === cards.length - 1 && animDeal > 0) {
        const elapsed = Date.now() % 400;
        const t = Math.min(1, elapsed / 350);
        const ease = 1 - Math.pow(1 - t, 3);
        x = W / 2 + (targetX - W / 2) * ease;
        y = targetY - 200 * (1 - ease);
      }
      drawCard(ctx, x, y, cards[i]!, true);
    }

    // Pot
    ctx.fillStyle = '#ffd966';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`底池: ${state.totalPot}`, W / 2, 210);

    // AI (seat 1)
    const p1 = state.players[1];
    drawPlayer(ctx, W / 2, 80, p1?.stack ?? 0, p1?.name ?? 'AI', false);
    const isShowdown = state.stage === 'showdown';
    for (let i = 0; i < 2; i++) {
      const card = isShowdown ? (p1?.holeCards?.[i] ?? null) : null;
      drawCard(ctx, W / 2 - 30 + i * 55, 50, card, isShowdown);
    }

    // Player (seat 0)
    const p0 = state.players[0];
    drawPlayer(ctx, W / 2, H - 100, p0?.stack ?? 0, p0?.name ?? '你', true);
    if (p0?.holeCards) {
      for (let i = 0; i < p0.holeCards.length; i++) {
        drawCard(ctx, W / 2 - 30 + i * 55, H - 160, p0.holeCards[i]!, true);
      }
    }

    ctx.fillStyle = connected ? '#0f0' : '#f66';
    ctx.font = '11px sans-serif';
    ctx.fillText(connected ? '已连接' : '断开', W - 50, H - 10);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '12px sans-serif';
    ctx.fillText(stageLabel(state.stage), W / 2, 230);

  }, [state, connected, animDeal]);

  // Animation loop
  useEffect(() => {
    let frame = 0;
    const loop = () => {
      draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [draw]);

  const legalIds = state?.legalActions ?? [];

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 800, height: 550, margin: '0 auto' }}>
      <canvas ref={canvasRef} width={800} height={550} style={{
        borderRadius: 16, display: 'block',
        transition: 'box-shadow 0.3s',
        boxShadow: pulse ? '0 0 40px rgba(255,0,0,0.8)' : 'none',
      }} />

      {/* Action buttons */}
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <ABtn label="弃牌" color="#8b3a3a" disabled={!legalIds.includes(0)} onClick={() => send('action', 0)} />
        <ABtn label={state?.currentPlayer === 0 && state ? (state.players[0].inChips < state.players[1].inChips ? '跟注' : '过牌') : '--'} color="#2e6b3e" disabled={!legalIds.includes(1)} onClick={() => send('action', 1)} />
        <ABtn label="加注½" color="#d4812b" disabled={!legalIds.includes(2)} onClick={() => send('action', 2)} />
        <ABtn label="加注全池" color="#e67e22" disabled={!legalIds.includes(3)} onClick={() => send('action', 3)} />
        <ABtn label="全下" color="#c0392b" disabled={!legalIds.includes(4)} onClick={() => send('action', 4)} />
        <ABtn label="下一局" color="#444" disabled={false} onClick={() => { prevLen.current = 0; send('restart', {}); }} />
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
    <button onClick={onClick} disabled={disabled} style={{
      background: color, border: 'none', color: '#fff', padding: '6px 14px', borderRadius: 20,
      fontWeight: 'bold', fontSize: 13, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.4 : 1,
    }}>{label}</button>
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

function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number, stack: number, name: string, active: boolean) {
  ctx.fillStyle = active ? '#ffd966' : '#ccc';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${name}  ${stack}`, x, y);
}

function stageLabel(s: string): string {
  const m: Record<string, string> = { preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌' };
  return m[s] ?? s;
}
