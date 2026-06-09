import { useState } from 'react';
import Home from './pages/Home.js';
import Table from './pages/Table.js';
import ErrorBoundary from './components/ErrorBoundary.js';

export default function App() {
  const [config, setConfig] = useState<{ mode: '1v1' | 'training'; aiCount: number } | null>(null);

  return (
    <div style={{ background: '#0a1a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <ErrorBoundary onReset={() => setConfig(null)}>
        {config ? (
          <Table mode={config.mode} aiCount={config.aiCount} onBack={() => setConfig(null)} />
        ) : (
          <Home onStart={(mode, count) => setConfig({ mode, aiCount: count })} />
        )}
      </ErrorBoundary>
    </div>
  );
}
