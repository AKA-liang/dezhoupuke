/**
 * Web Audio API 音效系统
 * 纯代码生成音效，零外部文件依赖
 */

let ctx: AudioContext | null = null;
let enabled = true;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function toggleSound(on: boolean) { enabled = on; }

function play(create: (c: AudioContext, dest: AudioNode) => void, vol = 0.3) {
  if (!enabled) return;
  try {
    const c = getCtx();
    const gain = c.createGain();
    gain.gain.value = vol;
    gain.connect(c.destination);
    create(c, gain);
  } catch { /* audio not supported */ }
}

/** 发牌声：轻柔的嗖 */
export function playDeal() {
  play((c, dest) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, c.currentTime + 0.15);
    osc.connect(dest);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.15);
  }, 0.15);
}

/** 加注声：清脆的叮 */
export function playRaise() {
  play((c, dest) => {
    for (let i = 0; i < 3; i++) {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = 1200 + i * 200;
      osc.connect(dest);
      osc.start(c.currentTime + i * 0.06);
      osc.stop(c.currentTime + i * 0.06 + 0.08);
    }
  }, 0.2);
}

/** 全下声：低沉的咚 */
export function playAllIn() {
  play((c, dest) => {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, c.currentTime + 0.6);
    const g = c.createGain();
    g.gain.setValueAtTime(1, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 1.0);
    osc.connect(g);
    g.connect(dest);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 1.0);
  }, 0.4);
}

/** 摊牌声：渐强的嗡 */
export function playShowdown() {
  play((c, dest) => {
    const osc = c.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(60, c.currentTime);
    osc.frequency.linearRampToValueAtTime(120, c.currentTime + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.01, c.currentTime);
    g.gain.linearRampToValueAtTime(0.3, c.currentTime + 0.3);
    g.gain.linearRampToValueAtTime(0, c.currentTime + 0.8);
    osc.connect(g);
    g.connect(dest);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.8);
  }, 0.25);
}

/** 赢：欢快的叮叮叮 */
export function playWin() {
  play((c, dest) => {
    [523, 659, 784, 1047].forEach((f, i) => {
      const osc = c.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.connect(dest);
      osc.start(c.currentTime + i * 0.1);
      osc.stop(c.currentTime + i * 0.1 + 0.15);
    });
  }, 0.3);
}
