interface Card {
  suit: 'S' | 'H' | 'D' | 'C';
  rank: string;
}

interface Props {
  card?: Card | null;
  faceUp?: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  dealAnimation?: { startX: number; startY: number; delay: number };
}

const SUIT: Record<string, string> = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLOR: Record<string, string> = {
  H: '#d42020', D: '#d42020',
  S: '#1a1a1a', C: '#1a1a1a',
};
const RANK: Record<string, string> = { T: '10' };

const SIZES = {
  sm: { w: 48, h: 68, fsCorner: 11, fsCenter: 30 },
  md: { w: 64, h: 90, fsCorner: 14, fsCenter: 38 },
  lg: { w: 80, h: 112, fsCorner: 17, fsCenter: 48 },
};

function displayRank(rank: string) {
  return RANK[rank] ?? rank;
}

export default function PokerCard({ card, faceUp = true, size = 'md', highlight, dealAnimation }: Props) {
  const { w, h, fsCorner, fsCenter } = SIZES[size];

  if (!faceUp || !card) {
    return (
      <div style={{
        width: w, height: h, borderRadius: 8,
        background: 'linear-gradient(135deg, #2c3e66 0%, #1a2547 100%)',
        border: '1px solid #d4a548',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 0 0 2px rgba(212,165,72,0.15)',
        position: 'relative', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: '70%', height: '70%',
          background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(212,165,72,0.18) 4px, rgba(212,165,72,0.18) 5px)',
          borderRadius: 4,
        }} />
      </div>
    );
  }

  const color = SUIT_COLOR[card.suit] ?? '#1a1a1a';
  const sym = SUIT[card.suit] ?? card.suit;
  const r = displayRank(card.rank);

  return (
    <div
      style={{
        width: w, height: h, borderRadius: 8,
        background: 'linear-gradient(180deg, #fffefb 0%, #f5efde 100%)',
        boxShadow: highlight
          ? `0 0 20px ${color === '#d42020' ? 'rgba(255,80,80,0.7)' : 'rgba(255,215,80,0.7)'}, 0 4px 12px rgba(0,0,0,0.4)`
          : '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.6)',
        position: 'relative', flexShrink: 0,
        fontFamily: 'Georgia, "Times New Roman", serif',
        animation: dealAnimation
          ? `cardDeal 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) ${dealAnimation.delay}ms backwards`
          : undefined,
      }}
    >
      <div style={{
        position: 'absolute', top: 4, left: 5, lineHeight: 1,
        fontSize: fsCorner, fontWeight: 'bold', color,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <span>{r}</span>
        <span style={{ fontSize: fsCorner, lineHeight: 1, marginTop: -1 }}>{sym}</span>
      </div>
      <div style={{
        position: 'absolute', bottom: 4, right: 5, lineHeight: 1,
        fontSize: fsCorner, fontWeight: 'bold', color,
        transform: 'rotate(180deg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <span>{r}</span>
        <span style={{ fontSize: fsCorner, lineHeight: 1, marginTop: -1 }}>{sym}</span>
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color, fontSize: fsCenter, opacity: 0.18,
        pointerEvents: 'none',
      }}>
        {sym}
      </div>
      <style>{`
        @keyframes cardDeal {
          from { transform: scale(0.4) translateY(-120px); opacity: 0; }
          to { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
