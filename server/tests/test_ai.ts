import { MultiPokerEngine } from './src/game/engine.js';
import { AIPersona } from './src/ai/persona.js';
import { decideAction } from './src/ai/agent.js';
import { DEFAULT_STRESS_CFG } from './src/ai/stress.js';

const engine = new MultiPokerEngine(2, 25, 50, 2500);
const ai = new AIPersona('老张', { baseThinkTime: 0.5, noiseSigma: 0.1, bluffFrequency: 0.1, aggression: 1.0, color: '#888' }, 1);

for (let h = 0; h < 3; h++) {
  engine.reset();
  let steps = 0;
  while (!engine.isOver() && steps++ < 40) {
    const s = engine.getState();
    const cur = s.currentPlayer;
    s.players[cur].holeCards = engine.players[cur].holeCards;
    const act = cur === 0 ? 1 : decideAction(s, ai, cur, DEFAULT_STRESS_CFG).actionId;
    engine.step(act as 0|1|2|3|4);
  }
  const pfs = engine.getPayoffs();
  console.log(`Hand ${h+1}: sum=${pfs.reduce((a,b)=>a+b,0)}`);
}
console.log('AI OK');
