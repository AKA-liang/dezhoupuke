import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh',
          color: '#f5e7d9', fontFamily: 'sans-serif', textAlign: 'center',
          gap: 16, padding: 40,
        }}>
          <div style={{ fontSize: '3rem' }}>🃏</div>
          <h2 style={{ color: '#d4a548', margin: 0 }}>游戏出错了</h2>
          <p style={{ color: '#999', maxWidth: 400, margin: 0, fontSize: '0.9rem', lineHeight: 1.6 }}>
            请返回主页重新开始。如果问题持续出现，请刷新页面或联系开发者。
          </p>
          {this.state.error && (
            <details style={{ color: '#888', fontSize: '0.8rem', maxWidth: 500 }}>
              <summary style={{ cursor: 'pointer' }}>{this.state.error.message}</summary>
              <pre style={{ textAlign: 'left', overflow: 'auto', maxHeight: 200, background: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 8 }}>
                {this.state.error.stack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={this.handleReset} style={{
              padding: '10px 28px', borderRadius: 24, border: 'none',
              background: '#d4a548', color: '#1a1a1a', fontWeight: 'bold',
              cursor: 'pointer', fontSize: '0.95rem',
            }}>返回主页</button>
            <button onClick={() => window.location.reload()} style={{
              padding: '10px 28px', borderRadius: 24, border: '1px solid #555',
              background: 'transparent', color: '#ccc', fontWeight: 'bold',
              cursor: 'pointer', fontSize: '0.95rem',
            }}>刷新页面</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
