import { useEffect, useRef, useState, useMemo } from 'react';
import { useGameStore } from '../stores/gameStore.js';
import { useMessageStore } from '../stores/messageStore.js';
import { useAuthStore } from '../stores/authStore.js';
import { usePokerSocket } from '../hooks/usePokerSocket.js';
import { playRaise, playAllIn } from '../game/sounds.js';
import PokerCard from '../components/PokerCard.js';
import ChatPanel from '../components/ChatPanel.js';
import Modal from '../components/Modal.js';
import PlayerTag from '../components/PlayerTag.js';
import ActionBar from '../components/ActionBar.js';
import type { Card, HandResult, HandStart, ChatMessage } from '@poker/shared/index.js';

interface Props {
  mode: '1v1' | 'training';
  aiCount: number;
  onBack: () => void;
}

const STAGE_LABELS: Record<string, string> = {
  preflop: '翻牌前', flop: '翻牌', turn: '转牌', river: '河牌', showdown: '摊牌',
};

let chatSeq = 0;
function makeChatId() { return ++chatSeq; }

function getSeatPosition(index: number, total: number): { left: number; top: number } {
  if (total <= 1) return { left: 50, top: 50 };
  const aiIndex = index - 1;
  const aiCount = total - 1;
  const startAngle = Math.PI;
  const t = aiCount === 1 ? 0.5 : aiIndex / (aiCount - 1);
  const angle = startAngle + (0 - startAngle) * t;
  return { left: 50 + 42 * Math.cos(angle), top: 50 - 28 * Math.sin(angle) };
}

export default function Table({ mode, aiCount, onBack }: Props) {
  const { state, connected } = useGameStore();
  const { messages } = useMessageStore();
  const auth = useAuthStore();
  const { send } = usePokerSocket(mode === 'training' ? 'training' : '1v1');

  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [lastResult, setLastResult] = useState<HandResult | null>(null);
  const [handStart, setHandStart] = useState<HandStart | null>(null);
  const [showResult, setShowResult] = useState(false);

  // 进入对局时清空
  useEffect(() => {
    useMessageStore.getState().resetAll();
    setChat([]);
    setLastResult(null);
    setHandStart(null);
    setShowResult(false);
  }, [mode, aiCount]);

  // 训练模式：发送 init 事件（CRITICAL FIX）
  useEffect(() => {
    if (mode === 'training') {
      send('init', { aiCount });
    }
  }, [mode, aiCount, send]);

  // 离开对局时清理
  useEffect(() => {
    return () => {
      useMessageStore.getState().resetAll();
      useGameStore.getState().setState(null);
    };
  }, []);

  // CustomEvent listeners for chat, hand_result, hand_start
  useEffect(() => {
    const chatH = (e: Event) => {
      const d = (e as CustomEvent).detail as { name: string; text: string; from: string };
      setChat(prev => [...prev, { id: makeChatId(), name: d.name, text: d.text, isPlayer: d.from === 'player', timestamp: Date.now() }]);
    };
    const resultH = (e: Event) => { setLastResult((e as CustomEvent).detail as HandResult); setShowResult(true); };
    const startH = (e: Event) => { setHandStart((e as CustomEvent).detail as HandStart); };
    window.addEventListener('poker:chat', chatH);
    window.addEventListener('poker:hand_result', resultH);
    window.addEventListener('poker:hand_start', startH);
    return () => {
      window.removeEventListener('poker:chat', chatH);
      window.removeEventListener('poker:hand_result', resultH);
      window.removeEventListener('poker:hand_start', startH);
    };
  }, []);

  const isPlayerTurn = state?.currentPlayer === 0;
  const isHandOver = !state || state.stage === 'showdown';
  const legalIds = state?.legalActions ?? [];
  const me = state?.players[0];
  const aiPlayers = state?.players.slice(1) ?? [];
  const isShowdown = state?.stage === 'showdown';

  const myHoleCards: (Card | null)[] = useMemo(() => {
    if (!me?.holeCards) return [null, null];
    return [me.holeCards[0] ?? null, me.holeCards[1] ?? null];
  }, [me?.holeCards]);

  const callLabel = useMemo(() => {
    if (!state || !isPlayerTurn) return '过牌/跟注';
    if (state.players.length < 2) return '过牌/跟注';
    const p0 = state.players[0]!;
    const p1 = state.players[1]!;
    return p0.inChips < p1.inChips ? '跟注' : p0.inChips === p1.inChips ? '过牌' : '跟注';
  }, [state, isPlayerTurn]);

  const handleAction = (aid: number) => {
    if (!isPlayerTurn) return;
    if (aid === 2 || aid === 3) playRaise();
    else if (aid === 4) playAllIn();
    send('action', aid);
  };

  const handleRestart = () => {
    if (!isHandOver) return;
    send('restart', {});
  };

  const handleSendChat = (text: string) => {
    send('chat', { text });
    setChat(prev => [...prev, { id: makeChatId(), name: auth.username || '你', text, isPlayer: true, timestamp: Date.now() }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%', maxWidth: 860, padding: '8px 16px', background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.6) 100%)', border: '1px solid rgba(212,165,72,0.3)', borderRadius: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f5e7d9', fontSize: '0.95rem' }}>
          <span style={{ color: '#d4a548', fontWeight: 'bold' }}>♠ 德州扑克 ♥</span>
          <span style={{ color: '#666' }}>|</span>
          <span>{mode === '1v1' ? '1v1 对局' : `陪练 ${aiCount + 1} 人局`}</span>
          {handStart && <span style={{ color: '#888', fontSize: '0.8rem' }}>第 {handStart.hand + 1} 局</span>}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.85rem' }}>
          <span style={{ color: '#aaa' }}>{auth.username || '游客'}{auth.token && <span style={{ color: '#d4a548', marginLeft: 6 }}>· {auth.gameTokens} 币</span>}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: connected ? '#7fd4ff' : '#e34234' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: connected ? '#7fd4ff' : '#e34234', boxShadow: connected ? '0 0 6px #7fd4ff' : 'none' }} />
            {connected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      {/* Table area */}
      <div style={{ position: 'relative', width: 800, height: 460, background: 'radial-gradient(ellipse at center, #2d6b3a 0%, #1a4a24 40%, #0e2e14 100%)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 0 0 3px rgba(212,165,72,0.3)' }}>
        <div style={{ position: 'absolute', top: '15%', left: '8%', right: '8%', bottom: '20%', border: '1px solid rgba(212,165,72,0.3)', borderRadius: '50%', pointerEvents: 'none' }} />

        {/* AI players */}
        {state && aiPlayers.map((p, i) => {
          const si = i + 1;
          const pos = getSeatPosition(si, state.players.length);
          const showHole = isShowdown && p.holeCards;
          return (
            <div key={p.seat} style={{ position: 'absolute', left: `${pos.left}%`, top: `${pos.top}%`, transform: 'translate(-50%, -50%)', textAlign: 'center', minWidth: 80, opacity: p.folded ? 0.5 : 1 }}>
              <PlayerTag name={p.name} stack={p.stack} inChips={p.inChips} folded={p.folded} allIn={p.allIn} active={state.currentPlayer === si} size="sm" />
              {showHole && <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 4, transform: 'scale(0.7)', transformOrigin: 'top center' }}>
                <PokerCard card={p.holeCards?.[0] ?? null} faceUp size="sm" />
                <PokerCard card={p.holeCards?.[1] ?? null} faceUp size="sm" />
              </div>}
            </div>
          );
        })}

        {/* Community */}
        <div style={{ position: 'absolute', top: '52%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', justifyContent: 'center', gap: 6 }}>
          {[0, 1, 2, 3, 4].map(i => <PokerCard key={i} card={state?.communityCards?.[i] ?? null} faceUp={!!state?.communityCards?.[i]} size="sm" />)}
        </div>

        {/* Pot */}
        <div style={{ position: 'absolute', top: '70%', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', color: '#ffd966' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', textShadow: '0 2px 4px #000' }}>底池: {state?.totalPot ?? 0}</div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{state ? STAGE_LABELS[state.stage] ?? state.stage : ''}</div>
        </div>

        {/* Player */}
        <div style={{ position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)' }}>
          <PlayerTag name={me?.name ?? '你'} stack={me?.stack ?? 0} inChips={me?.inChips ?? 0} folded={me?.folded ?? false} allIn={me?.allIn ?? false} active={isPlayerTurn} size="md" />
        </div>
      </div>

      {/* Hole cards */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: -8 }}>
        {myHoleCards.map((c, i) => <PokerCard key={i} card={c} faceUp={!!c} size="md" highlight={isPlayerTurn} />)}
        {(!me?.holeCards) && <div style={{ color: '#888', fontSize: '0.85rem', alignSelf: 'center' }}>等待发牌</div>}
      </div>

      <ActionBar legalIds={legalIds} isPlayerTurn={isPlayerTurn} isHandOver={isHandOver} callLabel={callLabel} onAction={handleAction} onRestart={handleRestart} onBack={onBack} />

      {/* Messages */}
      <div style={{ width: '100%', maxWidth: 800, display: 'flex', gap: 8, padding: '4px 12px', minHeight: 24, fontSize: '0.82rem', color: '#ccc' }}>
        {messages.slice(-3).map((m, i) => <span key={i} style={{ color: '#bbb' }}>{m}</span>)}
      </div>

      {/* Chat */}
      <div style={{ width: '100%', maxWidth: 800 }}>
        <ChatPanel messages={chat} onSend={handleSendChat} myName={auth.username || '你'} maxHeight={180} />
      </div>

      {/* Result modal */}
      <Modal open={showResult && !!lastResult} title={lastResult?.winner === 'player' ? '🎉 胜利' : '💔 失败'} onClose={() => setShowResult(false)}
        buttons={[
          { label: '继续', onClick: () => setShowResult(false), variant: 'primary' },
          { label: '下一局', onClick: () => { setShowResult(false); send('restart', {}); }, variant: 'secondary' },
          { label: '返回', onClick: onBack, variant: 'danger' },
        ]}>
        {lastResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: '1.1rem', textAlign: 'center', color: lastResult.winner === 'player' ? '#7fd4ff' : '#e34234' }}>
              {lastResult.winner === 'player' ? '你赢得了这手牌！' : '本手牌失败，下次加油！'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8 }}>
              <Stat label="底池" value={lastResult.pot} />
              {lastResult.gameTokens !== undefined && <Stat label="游戏币余额" value={lastResult.gameTokens} highlight />}
              {lastResult.payoffs?.[0] !== undefined && <Stat label="本手盈亏" value={lastResult.payoffs[0]} highlight={lastResult.payoffs[0] >= 0} negative={lastResult.payoffs[0] < 0} />}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Stat({ label, value, highlight, negative }: { label: string; value: number; highlight?: boolean; negative?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: negative ? '#e34234' : (highlight ? '#7fd4ff' : '#ffd966') }}>{value}</div>
    </div>
  );
}
