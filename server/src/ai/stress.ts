/**
 * 压力值系统 — TypeScript 移植
 */

import type { AIPersona } from './persona.js';

export interface StressConfig {
  increasePerRaise: number;
  increasePerAllin: number;
  increasePerBluff: number;
  tiltThreshold: number;
  tiltProb: number;
}

export const DEFAULT_STRESS_CFG: StressConfig = {
  increasePerRaise: 5,
  increasePerAllin: 15,
  increasePerBluff: 25,
  tiltThreshold: 70,
  tiltProb: 0.05,
};

export function updateStress(ais: AIPersona[], actionType: string, cfg: StressConfig) {
  for (const ai of ais) {
    if (actionType === 'raise') ai.stress = Math.min(100, Math.max(0, ai.stress + cfg.increasePerRaise));
    else if (actionType === 'all_in') ai.stress = Math.min(100, Math.max(0, ai.stress + cfg.increasePerAllin));
    else if (actionType === 'bluff') ai.stress = Math.min(100, Math.max(0, ai.stress + cfg.increasePerBluff));
  }
}

export function endHandStressDecay(ais: AIPersona[]) {
  for (const ai of ais) ai.resetStress();
}

export function isTilted(ai: AIPersona, cfg: StressConfig): boolean {
  return ai.stress > cfg.tiltThreshold && Math.random() < cfg.tiltProb;
}
