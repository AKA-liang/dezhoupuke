import { useState, useEffect } from 'react';
import { useGameStore } from '../stores/gameStore.js';

interface Props {
  onStart: (mode: '1v1' | 'training') => void;
}

export default function Home({ onStart }: Props) {
  const { auth } = useGameStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(!auth.token);

  // Auto-clear error after 4s
  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);

  const apiPost = async (path: string, body: Record<string, unknown>) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(`${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl.signal });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || '请求失败');
      return d;
    } finally { clearTimeout(timer); }
  };

  const handleLogin = async () => {
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    setLoading(true); setError('');
    try {
      const d = await apiPost('/api/auth/login', { username, password });
      auth.setAuth(d.token, d.username, d.gameTokens || 0, d.points || 0, d.elo || 1200);
      setShowLogin(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '登录失败');
    } finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!username) { setError('请输入用户名'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    setLoading(true); setError('');
    try {
      const d = await apiPost('/api/auth/register', { username, password });
      auth.setAuth(d.token, d.username, d.gameTokens || 0, d.points || 0, d.elo || 1200);
      setShowLogin(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '注册失败');
    } finally { setLoading(false); }
  };

  const handleGuest = () => {
    auth.clearAuth();
    setShowLogin(false);
  };

  const showCareer = async () => {
    try {
      const r = await fetch('/api/stats');
      const d = await r.json();
      alert(`生涯档案\n总手数: ${d.total_hands || 0}\n胜场: ${d.wins || 0}\n总盈亏: ${d.total_profit || 0}`);
    } catch { alert('暂无数据'); }
  };

  if (showLogin) {
    return (
      <div style={{ textAlign: 'center', color: '#f5e7d9', paddingTop: 80 }}>
        <h1 style={{ fontSize: '2.4rem', textShadow: '0 2px 8px #000' }}>♠ 沉浸式德州扑克 ♥</h1>
        <div style={{ margin: '30px auto', maxWidth: 320 }}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="用户名" style={inputStyle} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码 (6位以上)" style={inputStyle} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          {error && <div style={{ color: '#e34234', marginBottom: 8, fontSize: '0.85rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={handleLogin} disabled={loading} style={btnStyle('#e67e22')}>{loading ? '...' : '登录'}</button>
            <button onClick={handleRegister} disabled={loading} style={btnStyle('#555')}>{loading ? '...' : '注册'}</button>
          </div>
          <div onClick={handleGuest} style={{ marginTop: 16, color: '#99ccff', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>游客模式（不计资产）</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', color: '#f5e7d9', paddingTop: 60 }}>
      <h1 style={{ fontSize: '2.4rem', textShadow: '0 2px 8px #000', marginBottom: 40 }}>♠ 沉浸式德州扑克 ♥</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 560, margin: '0 auto' }}>
        <Card icon="♠♥" label="1v1 对局" desc="单挑 AI 对手" onClick={() => onStart('1v1')} />
        <Card icon="♣♦" label="陪练模式" desc="1 人 vs 5 AI" onClick={() => onStart('training')} />
        <Card icon="📊" label="生涯档案" desc="查看战绩" onClick={showCareer} />
        <Card icon="💰" label="个人中心" desc={`游戏币: ${auth.gameTokens}`} onClick={() => alert(`个人中心\n用户名: ${auth.username || '游客'}\n游戏币: ${auth.gameTokens}\nELO: ${auth.elo} (${eloRank(auth.elo)})`)} />
      </div>
      {auth.token && (
        <div style={{ marginTop: 24, color: '#999' }}>
          {auth.username} · {eloRank(auth.elo)} ({auth.elo}) · 游戏币: {auth.gameTokens} | <button onClick={auth.clearAuth} style={{ background: 'none', border: 'none', color: '#e34234', cursor: 'pointer' }}>登出</button>
        </div>
      )}
    </div>
  );
}

function Card({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: '24px 16px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#ffd966'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = 'transparent'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
      <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{desc}</div>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', marginBottom: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid #555', background: '#1a2a1a', color: '#f5e7d9', fontSize: '1rem', outline: 'none' };

function btnStyle(bg: string): React.CSSProperties {
  return { padding: '10px 28px', borderRadius: 24, border: 'none', background: bg, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' };
}

function eloRank(elo: number): string {
  if (elo < 1200) return '微额新手'; if (elo < 1400) return '低额学徒'; if (elo < 1600) return '中额行家';
  if (elo < 1800) return '高额专家'; if (elo < 2000) return '无限注大师'; return '传奇鲨鱼';
}
