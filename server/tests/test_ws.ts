import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');
let hands = 0;

socket.on('state', (s) => {
  console.log(`state: stage=${s.stage} cur=${s.currentPlayer} pot=${s.totalPot}`);
  if (s.currentPlayer === 0 && s.legalActions) {
    const actions: number[] = s.legalActions;
    const act = actions.includes(1) ? 1 : actions[0];
    socket.emit('action', act);
  }
});

socket.on('ai_thinking', (d) => {
  console.log(`  AI thinking: ${d.name} stress=${d.stress}`);
});

socket.on('ai_action', (d) => {
  console.log(`  AI: ${d.text}`);
});

socket.on('table_talk', (d) => {
  console.log(`  💬 ${d.name}: ${d.text}`);
});

socket.on('hand_result', (d) => {
  hands++;
  console.log(`Hand ${hands}: ${d.winner} pot=${d.pot} pChips=${d.playerChips}`);
  if (hands < 3) {
    setTimeout(() => socket.emit('restart'), 500);
  } else {
    console.log('Test OK — closing');
    socket.close();
    process.exit(0);
  }
});

socket.on('connect', () => {
  console.log('Connected');
});
