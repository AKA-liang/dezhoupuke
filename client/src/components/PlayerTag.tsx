interface Props {
  name: string;
  stack: number;
  inChips: number;
  folded: boolean;
  allIn: boolean;
  active: boolean;
  size?: 'sm' | 'md';
}

export default function PlayerTag({ name, stack, inChips, folded, allIn, active, size = 'md' }: Props) {
  const padding = size === 'sm' ? '4px 10px' : '6px 14px';
  const fontSize = size === 'sm' ? '0.78rem' : '0.9rem';
  return (
    <div style={{
      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      padding,
      background: active ? 'rgba(212,165,72,0.2)' : 'rgba(0,0,0,0.5)',
      border: active ? '1px solid #d4a548' : '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20, transition: 'all 0.2s', opacity: folded ? 0.5 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize, color: active ? '#ffd966' : '#f5e7d9', fontWeight: 'bold' }}>
        <span>{name}</span>
        {allIn && <span style={{ fontSize: '0.65rem', color: '#e34234', background: 'rgba(227,66,52,0.2)', padding: '1px 6px', borderRadius: 8 }}>ALL IN</span>}
        {folded && <span style={{ fontSize: '0.65rem', color: '#888' }}>(弃)</span>}
      </div>
      <div style={{ fontSize: '0.7rem', color: '#aaa' }}>
        筹码 <span style={{ color: '#ffd966', fontWeight: 'bold' }}>{stack}</span>
        {inChips > 0 && <span style={{ marginLeft: 4 }}>· 本轮 {inChips}</span>}
      </div>
    </div>
  );
}
