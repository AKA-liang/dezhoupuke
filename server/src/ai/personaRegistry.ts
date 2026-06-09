/**
 * Persona 注册表 — 所有 AI 人格的单一真实来源
 */
import { AIPersona, type PersonaConfig } from './persona.js';

export const PERSONA_NAMES = [
  '小李', '老张', '王姐', '老陈', '阿强', '阿珍', '阿龙', '小梅', '大师',
] as const;

export type PersonaName = typeof PERSONA_NAMES[number];

export interface PersonaMeta {
  style: string;
  catchphrases: string[];
  config: PersonaConfig;
}

export const PERSONA_META: Record<PersonaName, PersonaMeta> = {
  '小李': {
    style: '阴险好胜，喜欢挑衅',
    catchphrases: ['哼，就这？', '我早就看穿你了', '别挣扎了', '你敢接吗'],
    config: { baseThinkTime: 0.9, noiseSigma: 0.10, bluffFrequency: 0.12, color: '#E63946' },
  },
  '老张': {
    style: '老练沉稳，经验丰富',
    catchphrases: ['小伙子，稳着点', '老手不急', '先看看再说', '牌品看人品'],
    config: { baseThinkTime: 1.2, noiseSigma: 0.08, bluffFrequency: 0.08, color: '#457B9D' },
  },
  '王姐': {
    style: '犀利强势，直来直去',
    catchphrases: ['想跑？没门', '算你狠', '来啊，谁怕谁', '我倒要看看'],
    config: { baseThinkTime: 0.8, noiseSigma: 0.14, bluffFrequency: 0.18, color: '#E76F51' },
  },
  '老陈': {
    style: '谨慎低调，步步为营',
    catchphrases: ['嗯…我再看看', '别急别急', '先观察', '小注试水'],
    config: { baseThinkTime: 1.1, noiseSigma: 0.06, bluffFrequency: 0.06, color: '#2A9D8F' },
  },
  '阿强': {
    style: '冲动上头，敢拼敢冲',
    catchphrases: ['干了干了！', '梭了梭了！', '怕你啊', '来啊正面刚'],
    config: { baseThinkTime: 0.5, noiseSigma: 0.18, bluffFrequency: 0.25, color: '#F4A261' },
  },
  '阿珍': {
    style: '甜美话术，绵里藏针',
    catchphrases: ['哎哟，手气不错嘛', '别吓我呀', '你这牌…不错', '哥哥手轻点'],
    config: { baseThinkTime: 0.9, noiseSigma: 0.11, bluffFrequency: 0.15, color: '#9B5DE5' },
  },
  '阿龙': {
    style: '老江湖，嘴毒眼毒',
    catchphrases: ['小子还嫩点', '牌不会打就别打', '送你回家', '一文不值'],
    config: { baseThinkTime: 1.0, noiseSigma: 0.13, bluffFrequency: 0.20, color: '#F15BB5' },
  },
  '小梅': {
    style: '乖巧话多，扮猪吃老虎',
    catchphrases: ['哇，好紧张', '我不太会…', '对不起哦', '哎我手抖了'],
    config: { baseThinkTime: 0.7, noiseSigma: 0.16, bluffFrequency: 0.22, color: '#00BBF9' },
  },
  '大师': {
    style: '高深莫测，禅意十足',
    catchphrases: ['一切随缘', '牌由天定', '勿贪', '戒躁'],
    config: { baseThinkTime: 1.5, noiseSigma: 0.05, bluffFrequency: 0.04, color: '#8338EC' },
  },
};

export function createPersona(name: PersonaName, seat: number): AIPersona {
  const meta = PERSONA_META[name];
  return new AIPersona(name, meta.config, seat);
}

export function buildAis(count: number, startSeat = 1): AIPersona[] {
  return Array.from({ length: count }, (_, i) => {
    const name = PERSONA_NAMES[i % PERSONA_NAMES.length]!;
    return createPersona(name, startSeat + i);
  });
}
