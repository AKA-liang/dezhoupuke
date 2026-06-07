# 前端 (client/src/)

## 架构

```
client/src/
├── App.tsx                    # 路由入口
├── pages/
│   ├── Home.tsx               # 登录/注册/游客 + 四卡片
│   └── Table.tsx              # 牌桌 (Canvas + 按钮 + 消息)
├── hooks/
│   ├── useSocket.ts           # Socket.io 1v1 连接
│   └── useTrainingSocket.ts   # Socket.io 陪练连接
├── stores/
│   └── gameStore.ts           # Zustand 全局状态
├── game/
│   └── sounds.ts              # Web Audio 音效
└── index.css                  # 全局样式
```

## 组件树

```
App
├── Home (未进入牌桌时)
│   ├── 登录表单 (auth-form)
│   ├── 四卡片 (1v1/陪练/生涯/钱包)
│   └── 用户栏 (用户名·段位·余额)
└── Table (游戏中)
    ├── Canvas (PixiJS 预留，当前 2D)
    ├── ActionPanel (弃牌/跟注/加注/全下)
    └── MessageLog (AI 对话)
```

## 数据流

```
useSocket → Socket.io → server → state → gameStore → Table re-render
useTrainingSocket → /training namespace → same flow
```

## 动画

- 发牌飞入：Canvas requestAnimationFrame tween (0.35s easeOut)
- 全下脉冲：CSS boxShadow 红色闪烁 2.4s
- 摊牌翻牌：showdown 阶段揭示 AI 手牌

## 音效

`sounds.ts` — Web Audio API 纯代码生成，零文件依赖：
- `playDeal()` — 发牌嗖声
- `playRaise()` — 加注叮声
- `playAllIn()` — 全下低音脉冲
- `playWin()` — 胜利欢快音阶
