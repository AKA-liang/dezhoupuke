import { useState } from 'react';
import Home from './pages/Home.js';
import Table from './pages/Table.js';

export default function App() {
  const [mode, setMode] = useState<'home' | '1v1' | 'training'>('home');

  return (
    <div style={{
      background: '#0a1a0f', minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif',
    }}>
      {mode === 'home' ? (
        <Home onStart={(m) => setMode(m)} />
      ) : (
        <Table mode={mode} onBack={() => setMode('home')} />
      )}
    </div>
  );
}
