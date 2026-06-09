import { useEffect } from 'react';

export interface ModalButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface Props {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  buttons?: ModalButton[];
  onClose?: () => void;
  closeOnBackdrop?: boolean;
}

export default function Modal({ open, title, children, buttons, onClose, closeOnBackdrop = true }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={() => closeOnBackdrop && onClose?.()}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        animation: 'modalFadeIn 0.18s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          minWidth: 360, maxWidth: 560, maxHeight: '80vh',
          background: 'linear-gradient(180deg, #1a2820 0%, #0e1a14 100%)',
          border: '1px solid #d4a548',
          borderRadius: 18,
          boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(212,165,72,0.25), inset 0 1px 0 rgba(255,255,255,0.05)',
          color: '#f5e7d9',
          fontFamily: 'sans-serif',
          overflow: 'hidden',
          animation: 'modalScaleIn 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)',
          display: 'flex', flexDirection: 'column',
        }}
      >
        {title && (
          <div style={{
            padding: '20px 24px 14px',
            borderBottom: '1px solid rgba(212,165,72,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#ffd966', letterSpacing: 1 }}>
              {title}
            </div>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  background: 'transparent', border: 'none', color: '#999',
                  fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4,
                }}
              >×</button>
            )}
          </div>
        )}
        <div style={{ padding: '20px 24px', overflow: 'auto', flex: 1, fontSize: '0.95rem', lineHeight: 1.6 }}>
          {children}
        </div>
        {buttons && buttons.length > 0 && (
          <div style={{
            padding: '14px 24px 20px',
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            borderTop: '1px solid rgba(212,165,72,0.2)',
          }}>
            {buttons.map((b, i) => (
              <button
                key={i}
                onClick={b.onClick}
                style={{
                  padding: '8px 20px', borderRadius: 22, border: 'none',
                  background: b.variant === 'danger' ? '#8b3a3a'
                    : b.variant === 'secondary' ? 'transparent' : '#d4a548',
                  color: b.variant === 'secondary' ? '#d4a548' : '#fff',
                  borderColor: b.variant === 'secondary' ? '#d4a548' : 'transparent',
                  borderStyle: b.variant === 'secondary' ? 'solid' : 'none',
                  borderWidth: b.variant === 'secondary' ? '1px' : 0,
                  fontWeight: 'bold', cursor: 'pointer', fontSize: '0.9rem',
                  transition: 'all 0.15s',
                }}
              >{b.label}</button>
            ))}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalScaleIn {
          from { transform: scale(0.85); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
