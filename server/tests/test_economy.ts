import { io } from 'socket.io-client';

async function test() {
  // 1. Register + Login to get fresh token
  const body = JSON.stringify({ username: 'econ_test2', password: 'test123456' });
  let userId = '';

  try {
    await fetch('http://localhost:3000/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  } catch { /* may already exist */ }

  const r = await fetch('http://localhost:3000/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
  const data = await r.json() as { token: string; userId: string; gameTokens: number };
  console.log(`Before game: tokens=${data.gameTokens}`);

  // 2. Get balance before
  const meR = await fetch(`http://localhost:3000/api/auth/me?token=${data.token}`);
  const me = await meR.json() as { game_tokens: number };

  // 3. Play 3 hands via WebSocket
  await new Promise<void>((resolve) => {
    const socket = io('http://localhost:3000', { transports: ['websocket'] });
    let hands = 0;

    socket.on('connect', () => socket.emit('auth', { token: data.token }));

    socket.on('state', (s) => {
      if (s.currentPlayer === 0 && s.legalActions) {
        const actions: number[] = s.legalActions;
        socket.emit('action', actions.includes(1) ? 1 : actions[0]);
      }
    });

    socket.on('hand_result', (d) => {
      hands++;
      console.log(`Hand ${hands}: ${d.winner} payoff=${d.payoffs[0]} tokens=${d.gameTokens}`);
      if (hands < 2) {
        socket.emit('restart');
      } else {
        socket.close();
        resolve();
      }
    });
  });

  // 4. Check balance after
  const meR2 = await fetch(`http://localhost:3000/api/auth/me?token=${data.token}`);
  const me2 = await meR2.json() as { game_tokens: number };
  console.log(`After game: tokens=${me2.game_tokens}`);
  console.log(`Delta: ${me2.game_tokens - me.game_tokens}`);
  console.log(me2.game_tokens === me.game_tokens ? 'FAIL: tokens unchanged' : 'PASS: tokens changed');
}

test().catch(console.error);
