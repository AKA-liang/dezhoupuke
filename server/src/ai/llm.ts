/**
 * MiniMax LLM 适配器 — AI 个性对话
 *
 * 配置: 环境变量 MINIMAX_API_KEY，或硬编码
 * API: OpenAI 兼容协议 → https://api.minimaxi.com/v1/chat/completions
 */

const API_BASE = 'https://api.minimaxi.com/v1';
const API_KEY = 'sk-cp-jDvInpCYY0In3qv8QIJ9CZ0pwvkgm2YXzlNvXU9Q7RZfTCOS4LA5n3Iv4vSZaNyTfxszdGM6lA3RDVPgAsYXYFg1vRgH46cKneauF4Bu-0DfhVRsIH8mjZo';
const MODEL = 'MiniMax-M3';

const FALLBACK: Record<string, string[]> = {
  fold: ['不玩了不玩了', '这把先撤', '算你狠', '溜了溜了'],
  call: ['我跟', '来看看', '陪你玩', '接了'],
  raise: ['加！', '来点压力', '你敢接吗', '看牌说话'],
  all_in: ['梭了！', '拼了！', '全下！', '来啊！'],
  win: ['收米', '承让', '运气好', '继续继续'],
  lose: ['哎...', '没事', '下把来', '算你厉害'],
};

const TALK_PROMPTS: Record<string, string> = {
  fold: '你弃牌了。用一句中国扑克圈的俏皮话表达，10字以内，不要解释。',
  call: '你跟注了。用一句轻松的话表达，10字以内，不要解释。',
  raise: '你加注了。用一句强势的话表达，10字以内，不要解释。',
  all_in: '你全下了！用一句霸气的话表达，10字以内，不要解释。',
};

function pick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export async function getTableTalk(personaName: string, action: string, context = ''): Promise<string> {
  const prompt = TALK_PROMPTS[action] || '说句话，10字以内。';
  const full = `你是德州扑克玩家"${personaName}"。${prompt}\n局势: ${context}`;

  try {
    const resp = await fetch(`${API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: full }],
        max_tokens: 200,
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (resp.ok) {
      const data = await resp.json() as { choices?: { message?: { content?: string } }[] };
      const raw = data?.choices?.[0]?.message?.content ?? '';
      // Strip <think> block from M3 model
      const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      if (cleaned) return cleaned;
    }
  } catch {
    // fall through to fallback
  }

  return pick(FALLBACK[action] ?? ['...']);
}
