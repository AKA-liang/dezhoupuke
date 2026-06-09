interface Props {
  legalIds: number[];
  isPlayerTurn: boolean;
  isHandOver: boolean;
  callLabel: string;
  onAction: (aid: number) => void;
  onRestart: () => void;
  onBack: () => void;
}

export default function ActionBar({ legalIds, isPlayerTurn, isHandOver, callLabel, onAction, onRestart, onBack }: Props) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
      <ABtn label="弃牌" color="#8b3a3a" disabled={!legalIds.includes(0) || !isPlayerTurn} onClick={() => onAction(0)} />
      <ABtn label={callLabel} color="#2e6b3e" disabled={!legalIds.includes(1) || !isPlayerTurn} onClick={() => onAction(1)} />
      <ABtn label="加注½" color="#d4812b" disabled={!legalIds.includes(2) || !isPlayerTurn} onClick={() => onAction(2)} />
      <ABtn label="加注全池" color="#e67e22" disabled={!legalIds.includes(3) || !isPlayerTurn} onClick={() => onAction(3)} />
      <ABtn label="全下" color="#c0392b" disabled={!legalIds.includes(4) || !isPlayerTurn} onClick={() => onAction(4)} />
      <ABtn label="下一局" color="#444" disabled={!isHandOver} onClick={onRestart} />
      <ABtn label="← 返回" color="#444" onClick={onBack} />
    </div>
  );
}

function ABtn({ label, color, disabled, onClick }: { label: string; color: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: color, border: 'none', color: '#fff', padding: '8px 18px', borderRadius: 22,
      fontWeight: 'bold', fontSize: '0.88rem', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.35 : 1, transition: 'all 0.15s',
      boxShadow: disabled ? 'none' : '0 2px 6px rgba(0,0,0,0.3)',
    }}>{label}</button>
  );
}
