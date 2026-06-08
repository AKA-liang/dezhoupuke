/**
 * AI 人格类 — TypeScript 移植
 */

export interface PersonaConfig {
  baseThinkTime: number;
  noiseSigma: number;
  bluffFrequency: number;
  color: string;
}

export class AIPersona {
  name: string;
  baseThinkTime: number;
  noiseSigma: number;
  bluffFrequency: number;
  color: string;
  seat: number;
  stress = 0;
  gamesPlayed = 0;

  constructor(name: string, config: PersonaConfig, seat = 1) {
    this.name = name;
    this.seat = seat;
    this.baseThinkTime = Math.min(10, Math.max(0.3, config.baseThinkTime));
    this.noiseSigma = Math.min(0.5, Math.max(0.01, config.noiseSigma));
    this.bluffFrequency = Math.min(0.8, Math.max(0.01, config.bluffFrequency));
    this.color = config.color;
  }

  effectiveThinkTime(complexity: number): number {
    const jitter = 0.8 + Math.random() * 0.4;
    const discount = Math.min(0.3, this.gamesPlayed * 0.01);
    const base = this.baseThinkTime * (1 - discount);
    return Math.min(30, Math.max(0.3, base * (1 + complexity * 2) * jitter + this.stress / 50));
  }

  effectiveNoise(): number {
    return Math.min(0.5, Math.max(0.01, this.noiseSigma + this.stress / 200));
  }

  resetStress() {
    this.stress = Math.max(0, Math.floor(this.stress * 0.8));
  }
}
