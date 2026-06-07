import { io } from 'socket.io-client';

const s = io('http://localhost:3000/training', { transports: ['websocket'] });
let count = 0;
s.on('state', (gs) => {
  if (gs.currentPlayer === 0 && gs.legalActions) {
    const acts: number[] = gs.legalActions;
    s.emit('action', acts.includes(1) ? 1 : acts[0]);
  }
});
s.on('hand_result', (d) => {
  console.log(`Training hand result: ${d.winner} pot=${d.pot}`);
  if (++count < 2) s.emit('restart');
  else { console.log('Training OK'); s.close(); process.exit(0); }
});
