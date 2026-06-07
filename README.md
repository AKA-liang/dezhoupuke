# 🃏 沉浸式德州扑克模拟器 V2

[![Node](https://img.shields.io/badge/Node-24-green)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://typescriptlang.org)
[![React](https://img.shields.io/badge/React-19-61dafb)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-17-336791)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED)](https://docker.com)

> Node.js + TypeScript · React + Canvas · PostgreSQL · 自适应 AI · MiniMax LLM

---

## 快速开始

```bash
# 1. 启动 PostgreSQL
docker compose up -d

# 2. 启动后端 (端口 3000)
cd server && npx tsx src/index.ts

# 3. 启动前端 (端口 5173)
cd client && npx vite --port 5173

# 4. 浏览器打开
http://localhost:5173
```

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **1v1 对局** | 完整德州扑克流程，3 种 AI 人格可选 |
| **陪练模式** | 1 vs 5 AI 同桌对战，门票制 |
| **自适应 AI** | 启发式决策公式 + 压力值 + 上头系统 |
| **MiniMax LLM** | AI 每次行动生成个性对话（"你敢接吗"） |
| **账号系统** | 注册/登录/JWT 24h，bcrypt 密码哈希 |
| **经济系统** | 游戏币结算（PostgreSQL 持久化） |
| **ELO 段位** | 6 级段位：微额新手 → 传奇鲨鱼 |
| **音效** | Web Audio API 纯代码生成（零文件依赖） |
| **发牌动画** | Canvas 飞入 + 全下红色脉冲 + 摊牌翻牌 |

---

## 项目结构

```
dezhoupuke_v2/
├── docker-compose.yml       # PostgreSQL 17 容器
├── server/                  # Node.js + TypeScript 后端
│   └── src/
│       ├── index.ts         # Express + Socket.io 入口
│       ├── game/            # 引擎 (engine.ts + handEval.ts)
│       ├── ai/              # AI (agent/persona/stress/ranges/llm)
│       └── db/              # PG (pool.ts + pgStore.ts)
├── client/                  # Vite + React 前端
│   └── src/
│       ├── App.tsx          # 路由入口
│       ├── pages/           # Home + Table
│       ├── hooks/           # useSocket + useTrainingSocket
│       ├── game/            # sounds.ts 音效
│       └── stores/          # gameStore.ts (Zustand)
├── shared/                  # 前后端共享类型
│   └── index.ts             # Card, GameState, ActionId 等
└── docs/                    # 模块文档
    ├── engine.md
    ├── ai.md
    ├── web.md
    ├── db.md
    ├── auth.md
    └── api.md
```

## 模块文档

| 文档 | 说明 |
|------|------|
| [docs/engine.md](docs/engine.md) | 多人引擎 + 牌型评估 |
| [docs/ai.md](docs/ai.md) | 决策/人格/压力/LLM |
| [docs/web.md](docs/web.md) | 前端架构 |
| [docs/db.md](docs/db.md) | PostgreSQL + Docker |
| [docs/auth.md](docs/auth.md) | JWT 认证 |
| [docs/api.md](docs/api.md) | REST + WebSocket |

---

## 路线图

| 阶段 | 状态 |
|------|------|
| 引擎 + AI + 1v1 | ✅ |
| React 前端 + Canvas 牌桌 | ✅ |
| MiniMax LLM 接入 | ✅ |
| PostgreSQL + Docker | ✅ |
| 经济系统 + ELO | ✅ |
| 陪练模式 (1 vs 5 AI) | ✅ |
| 音效 | ✅ |
| GTO 求解器 | 🔲 |
| 手牌回放 | 🔲 |
| .exe 打包 | 🔲 |
