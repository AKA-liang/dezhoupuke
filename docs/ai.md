# AI 模块 (server/src/ai/)

## 架构

```
ai/
├── agent.ts       # 启发式决策引擎
├── persona.ts      # AI 人格类
├── stress.ts       # 压力值 + 上头系统
├── ranges.ts       # 起手牌范围表 (169 种)
└── llm.ts          # MiniMax LLM 适配器
```

## `agent.ts` — 决策引擎

决策公式：
```
score = 0.4 * handStrength / (1 + 0.2 * activeOpp)
      + 0.3 * oddsFactor
      + 0.2 * positionBonus
      + 0.1 * bluffBonus
      - stress / 100 * 0.3
      + N(0, noise)
```

入口：`decideAction(state, ai, seat, stressCfg) → { actionId, thinkTime }`

## `persona.ts` — AI 人格

| 属性 | 说明 |
|------|------|
| `baseThinkTime` | 基础思考延迟 |
| `noiseSigma` | 决策噪声 |
| `bluffFrequency` | 诈唬倾向 |
| `stress` | 压力值 0-100 |
| `effectiveThinkTime()` | 含复杂度 + 熟手折扣 + 压力加成 |

## `stress.ts` — 压力系统

| 触发 | 变化 |
|------|------|
| 被加注 | +5 |
| 被全下 | +15 |
| 被诈唬 | +25 |
| 每局结束 | ×0.8 |

`stress > 70` 时 5% 概率随机选动作（上头）。

## `ranges.ts` — 范围表

169 种手牌强度矩阵（硬编码，3 种风格：tight/balanced/loose）。

## `llm.ts` — LLM

OpenAI 兼容协议 → MiniMax M3。`<think>` 块自动过滤，缓存 + 降级。
