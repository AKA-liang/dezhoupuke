# 游戏引擎 (server/src/game/)

## 架构

```
game/
├── engine.ts      # 自建 2-6 人无限注德州引擎
└── handEval.ts    # 独立牌型评估器 (0-8 级)
```

## `engine.ts` — MultiPokerEngine

| 方法 | 说明 |
|------|------|
| `new MultiPokerEngine(n, sb, bb, stack)` | 构造 2-6 人引擎 |
| `reset() → GameState` | 洗牌 + 发牌 + 盲注 |
| `step(actionId) → GameState` | 执行动作 (0=fold, 1=call, 2=r_half, 3=r_pot, 4=all_in) |
| `isOver() → boolean` | 手牌是否结束 |
| `getPayoffs() → number[]` | 每人净盈亏 |
| `advanceDealer()` | 庄位轮转 |

**已修复的规则违规**：
- B1: 翻前 UTG 正确位置（非 SB）
- B2: 翻后 postflop 先行动者正确 (dealer+1)
- B3: 弃牌玩家筹码纳入边池
- 零和验证：所有人数均 sum(payoffs) === 0

## `handEval.ts` — 牌型评估

| 函数 | 说明 |
|------|------|
| `evaluateHand(hole, community) → {rank, tiebreaker}` | 最佳 5 张评估 |
| `handStrength(hole, community) → number` | 0.0~1.0 强度 |
| `rankName(rank) → string` | 高牌/一对/…/同花顺 |

**等级映射**：0=高牌 0.20 → 8=同花顺 1.00

## 共享类型 (shared/index.ts)

```typescript
type Card = { suit: Suit; rank: Rank };
type ActionId = 0 | 1 | 2 | 3 | 4;
interface GameState { players, communityCards, pots, totalPot, stage, currentPlayer, legalActions, dealer }
```
