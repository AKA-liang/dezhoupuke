/**
 * MiniMax LLM 适配器 — AI 个性对话
 * API: OpenAI 兼容协议 → https://api.minimaxi.com/v1/chat/completions
 */
import { config } from '../config.js';
import { PERSONA_META, type PersonaName } from './personaRegistry.js';

const API_BASE = 'https://api.minimaxi.com/v1';
const API_KEY = config.MINIMAX_API_KEY;
const MODEL = config.MINIMAX_MODEL;
const talkCache = new Map<string, string>();
const replyCache = new Map<string, string>();

const FALLBACK_TALK: Record<string, string[]> = {
  fold: ['不玩了不玩了', '这把先撤', '算你狠', '溜了溜了'],
  call: ['我跟', '来看看', '陪你玩', '接了'],
  raise: ['加！', '来点压力', '你敢接吗', '看牌说话'],
  all_in: ['梭了！', '拼了！', '全下！', '来啊！'],
};

const FALLBACK_REPLY: Record<string, string[]> = {
  taunt: ['哼，就这？', '你试试看', '口说无凭', '牌桌上见真章'],
  greeting: ['来就来', '坐', '少废话开局', '看牌吧'],
  threat: ['怕你啊', '我等着', '有本事亮底牌', '别光说不练'],
  small_talk: ['嗯', '还行', '继续', '看着呢'],
  unknown: ['...', '哦', '嗯', '少废话'],
};

function classify(msg: string): 'taunt' | 'greeting' | 'threat' | 'small_talk' {
  const m = msg.toLowerCase();
  if (/^(你好|hi|hello|在吗|哈喽|早|晚安|嗨)/i.test(msg)) return 'greeting';
  if (/(垃圾|菜鸟|新手|输|不行|弱|臭|差|输定|认输)/.test(m)) return 'taunt';
  if (/(敢|来|上|梭|全下|来啊|敢不敢|不信)/.test(m)) return 'threat';
  return 'small_talk';
}

const TALK_PROMPTS: Record<string, string> = {
  fold: '你弃牌了。用一句中国扑克圈的俏皮话表达，10字以内，不要解释。',
  call: '你跟注了。用一句轻松的话表达，10字以内，不要解释。',
  raise: '你加注了。用一句强势的话表达，10字以内，不要解释。',
  all_in: '你全下了！用一句霸气的话表达，10字以内，不要解释。',
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]!; }

async function callLLM(system: string, userPrompt: string, maxTokens: number, temp: number): Promise<string | null> {
  if (!API_KEY) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(`${API_BASE}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: `${system}\n${userPrompt}` }], max_tokens: maxTokens, temperature: temp }),
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
        const raw = data?.choices?.[0]?.message?.content ?? '';
        const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
        if (cleaned) return cleaned;
      }
    } catch (e) {
      console.error('[LLM] attempt', attempt + 1, 'failed:', (e as Error).message);
      if (attempt === 0) await new Promise(r => setTimeout(r, 500));
    }
  }
  return null;
}

export async function getTableTalk(personaName: string, action: string, context = ''): Promise<string> {
  const prompt = TALK_PROMPTS[action] || '说句话，10字以内。';
  const cacheKey = `${personaName}:${action}:${context}`;
  const cached = talkCache.get(cacheKey);
  if (cached) return cached;

  const result = await callLLM(
    `你是德州扑克玩家"${personaName}"。`,
    `${prompt}\n局势: ${context}`,
    200, 0.9,
  );
  if (result) {
    if (talkCache.size > 200) talkCache.clear();
    talkCache.set(cacheKey, result);
    return result;
  }
  return pick(FALLBACK_TALK[action] ?? ['...']);
}

export interface ChatContext {
  stage: string;
  pot: number;
  aiLastAction?: string;
  playerName?: string;
}

export async function getChatReply(personaName: string, playerMsg: string, ctx: ChatContext): Promise<string> {
  const persona = PERSONA_META[personaName as PersonaName] ?? PERSONA_META['小李']!;
  const category = classify(playerMsg);
  const cacheKey = `${personaName}:${category}:${playerMsg.trim()}`;
  const cached = replyCache.get(cacheKey);
  if (cached) return cached;

  const ctxStr = `当前：${ctx.stage}阶段，底池${ctx.pot}${ctx.aiLastAction ? `，你刚${ctx.aiLastAction}` : ''}。`;
  const userPrompt = `玩家"${ctx.playerName ?? '对手'}"说："${playerMsg}"。请用${persona.style}的语气，**10字以内**回应。直接说一句话，不要引号不要解释。`;

  const result = await callLLM(
    `你是德州扑克玩家"${personaName}"，性格${persona.style}。`,
    ctxStr + '\n' + userPrompt,
    60, 0.95,
  );
  if (result) {
    if (replyCache.size > 200) replyCache.clear();
    replyCache.set(cacheKey, result.slice(0, 30));
    return result.slice(0, 30);
  }
  const fallbacks = [...(persona.catchphrases ?? []), ...(FALLBACK_REPLY[category] ?? [])];
  return pick(fallbacks);
}
