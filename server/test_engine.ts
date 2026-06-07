import { MultiPokerEngine } from './src/game/engine.js';

for (const n of [2, 4, 6]) {
  const e = new MultiPokerEngine(n, 10, 20, 500);
  e.reset();
  let a = 0;
  while (!e.isOver() && a++ < 50) {
    const l = e.calcLegalActions().map(x => x.id);
    e.step((l.includes(1) ? 1 : l[0]) as 0|1|2|3|4);
  }
  const pfs = e.getPayoffs();
  console.log(`${n}p: sum=${pfs.reduce((s,x) => s + x, 0)}`);
}
console.log('Engine OK');
