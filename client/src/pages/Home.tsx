import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore.js';
import Modal from '../components/Modal.js';

interface Props {
  onStart: (mode: '1v1' | 'training', aiCount: number) => void;
}

export default function Home({ onStart }: Props) {
  const auth = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(!auth.token);
  const [showStats, setShowStats] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showTraining, setShowTraining] = useState(false);
  const [aiCount, setAiCount] = useState(4);
  const [stats, setStats] = useState<{ totalHands: number; wins: number; totalProfit: number; maxPot: number; elo: number } | null>(null);

  useEffect(() => {
    if (error) { const t = setTimeout(() => setError(''), 4000); return () => clearTimeout(t); }
  }, [error]);

  const apiPost = async (path: string, body: Record<string, unknown>) => {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok) throw new Error(d.detail || '请求失败');
    return d;
  };

  const handleLogin = async () => {
    if (!username || !password) { setError('请输入用户名和密码'); return; }
    setLoading(true); setError('');
    try {
      const d = await apiPost('/api/auth/login', { username, password });
      auth.setAuth(d.token, d.userId, d.username, d.gameTokens || 0, d.points || 0, d.elo || 1200);
      setShowLogin(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '登录失败'); }
    finally { setLoading(false); }
  };

  const handleRegister = async () => {
    if (!username) { setError('请输入用户名'); return; }
    if (password.length < 6) { setError('密码至少6位'); return; }
    setLoading(true); setError('');
    try {
      const d = await apiPost('/api/auth/register', { username, password });
      auth.setAuth(d.token, d.userId, d.username, d.gameTokens || 0, d.points || 0, d.elo || 1200);
      setShowLogin(false);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : '注册失败'); }
    finally { setLoading(false); }
  };

  const openStats = async () => {
    if (!auth.userId) { alert('请先登录查看生涯档案'); return; }
    setShowStats(true);
    try {
      const r = await fetch(`/api/stats?userId=${auth.userId}`);
      if (r.ok) {
        const d = await r.json();
        setStats({ totalHands: d.totalHands || 0, wins: d.wins || 0, totalProfit: d.totalProfit || 0, maxPot: d.maxPot || 0, elo: d.elo || 1200 });
      }
    } catch { setStats({ totalHands: 0, wins: 0, totalProfit: 0, maxPot: 0, elo: 1200 }); }
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
          <div onClick={() => { auth.clearAuth(); setShowLogin(false); }} style={{ marginTop: 16, color: '#99ccff', cursor: 'pointer', textDecoration: 'underline', fontSize: '0.85rem' }}>游客模式（不计资产）</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center', color: '#f5e7d9', paddingTop: 40 }}>
      <h1 style={{ fontSize: '2.2rem', textShadow: '0 2px 8px #000' }}>♠ 沉浸式德州扑克 ♥</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 480, margin: '40px auto 0' }}>
        <Card icon="♠♥" label="1v1 对局" desc="单挑 AI 对手" onClick={() => onStart('1v1', 1)} />
        <Card icon="♣♦" label="陪练模式" desc="1 人 vs N AI（可自选）" onClick={() => setShowTraining(true)} />
        <Card icon="📊" label="生涯档案" desc="查看战绩" onClick={openStats} />
        <Card icon="💰" label="个人中心" desc="账号信息" onClick={() => setShowProfile(true)} />
      </div>
      <div style={{ marginTop: 24, color: '#999', fontSize: '0.9rem' }}>
        {auth.token ? (
          <>{auth.username} · {auth.gameTokens} 币 · {auth.elo} ELO <span onClick={() => { auth.clearAuth(); setShowLogin(true); }} style={{ marginLeft: 12, color: '#e34234', cursor: 'pointer', textDecoration: 'underline' }}>登出</span></>
        ) : (
          <>游客模式 · <span onClick={() => setShowLogin(true)} style={{ color: '#99ccff', cursor: 'pointer', textDecoration: 'underline' }}>登录/注册</span></>
        )}
      </div>

      {showTraining && (
        <Modal open title="♣♦ 陪练模式 · 选择对手人数" onClose={() => setShowTraining(false)} buttons={[
          { label: '取消', onClick: () => setShowTraining(false), variant: 'secondary' },
          { label: `开始 ${aiCount + 1} 人局`, onClick: () => { setShowTraining(false); onStart('training', aiCount); }, variant: 'primary' },
        ]}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[2, 4, 6, 8].map(n => (
              <button key={n} onClick={() => setAiCount(n)} style={{
                padding: '14px 0', borderRadius: 10,
                background: aiCount === n ? 'linear-gradient(180deg, #d4a548 0%, #b48a2c 100%)' : 'rgba(0,0,0,0.3)',
                border: aiCount === n ? '1px solid #ffd966' : '1px solid #444',
                color: aiCount === n ? '#1a1a1a' : '#f5e7d9', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer',
              }}>{n}<div style={{ fontSize: '0.7rem', opacity: 0.8 }}>AI · {n + 1} 人局</div></button>
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, background: 'rgba(0,0,0,0.3)', borderRadius: 8, fontSize: '0.85rem', color: '#aaa' }}>
            玩家 1 + AI {aiCount} = 共 {aiCount + 1} 人 · 盲注 25/50
          </div>
        </Modal>
      )}

      {showStats && (
        <Modal open title="📊 生涯档案" onClose={() => setShowStats(false)} buttons={[{ label: '关闭', onClick: () => setShowStats(false), variant: 'secondary' }]}>
          {stats ? <StatsContent stats={stats} /> : <div style={{ color: '#888', textAlign: 'center', padding: 20 }}>加载中...</div>}
        </Modal>
      )}

      {showProfile && (
        <Modal open title="💰 个人中心" onClose={() => setShowProfile(false)} buttons={[{ label: '关闭', onClick: () => setShowProfile(false), variant: 'secondary' }]}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <StatRow label="用户名" value={auth.username || '游客'} />
            <StatRow label="游戏币" value={auth.gameTokens} accent="#ffd966" />
            <StatRow label="积分" value={auth.points} />
            <StatRow label="ELO 段位" value={`${eloRank(auth.elo)} (${auth.elo})`} accent="#d4a548" />
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatsContent({ stats }: { stats: { totalHands: number; wins: number; totalProfit: number; maxPot: number; elo: number } }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <StatRow label="总手数" value={stats.totalHands} />
      <StatRow label="胜场" value={stats.wins} accent="#7fd4ff" />
      <StatRow label="胜率" value={`${stats.totalHands > 0 ? ((stats.wins / stats.totalHands) * 100).toFixed(1) : 0}%`} />
      <StatRow label="总盈亏" value={stats.totalProfit} accent={stats.totalProfit >= 0 ? '#7fd4ff' : '#e34234'} />
      <StatRow label="最大底池" value={stats.maxPot} accent="#ffd966" />
      <StatRow label="ELO 段位" value={`${eloRank(stats.elo)} (${stats.elo})`} accent="#d4a548" />
    </div>
  );
}

function Card({ icon, label, desc, onClick }: { icon: string; label: string; desc: string; onClick: () => void }) {
  return (
    <div onClick={onClick} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 16, padding: '24px 16px', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.15s' }}
      onMouseEnter={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#d4a548'; el.style.transform = 'translateY(-3px)'; }}
      onMouseLeave={(e) => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'transparent'; el.style.transform = 'none'; }}>
      <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#ffd966' }}>{label}</div>
      <div style={{ fontSize: '0.85rem', color: '#aaa' }}>{desc}</div>
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: 6 }}>
      <span style={{ color: '#999', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ color: accent || '#f5e7d9', fontSize: '1.05rem', fontWeight: 'bold' }}>{value}</span>
    </div>
  );
}

const inputStyle: React.CSSProperties = { display: 'block', width: '100%', marginBottom: 12, padding: '10px 14px', borderRadius: 8, border: '1px solid #555', background: '#1a2a1a', color: '#f5e7d9', fontSize: '1rem', outline: 'none' };
const btnStyle = (bg: string): React.CSSProperties => ({ padding: '10px 28px', borderRadius: 24, border: 'none', background: bg, color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' });

function eloRank(elo: number): string {
  if (elo < 1200) return '微额新手'; if (elo < 1400) return '低额学徒'; if (elo < 1600) return '中额行家';
  if (elo < 1800) return '高额专家'; if (elo < 2000) return '无限注大师'; return '传奇鲨鱼';
}
