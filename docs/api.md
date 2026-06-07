# API 参考

## REST 端点 (Express, 端口 3000)

### 认证 `/api/auth/*`

| 方法 | 路径 | 请求体 | 返回 |
|------|------|--------|------|
| POST | `/api/auth/register` | `{username, password}` | `{token, userId, username, gameTokens}` |
| POST | `/api/auth/login` | `{username, password}` | `{token, userId, username, gameTokens}` |
| GET | `/api/auth/me?token=` | — | `{id, username, game_tokens, points, elo}` |

### 数据 `/api/*`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/stats?userId=` | 生涯统计 |

---

## WebSocket (Socket.io, 端口 3000)

### 默认命名空间 `/` — 1v1 模式

**客户端 → 服务器**：

| 事件 | 负载 | 说明 |
|------|------|------|
| `auth` | `{ token }` | 认证 (可选) |
| `action` | `ActionId` (0-4) | 玩家动作 |
| `restart` | — | 下一局 |

**服务器 → 客户端**：

| 事件 | 负载 | 说明 |
|------|------|------|
| `state` | `GameState` | 完整牌桌状态 |
| `ai_thinking` | `{ name, stress }` | AI 思考中 |
| `ai_action` | `{ action, text }` | AI 行动完成 |
| `table_talk` | `{ text, name }` | AI 个性对话 |
| `hand_result` | `{ winner, pot, payoffs, gameTokens }` | 摊牌结果 |

### 训练命名空间 `/training` — 陪练模式 (6 人桌)

消息协议与 1v1 相同，连接方式：
```typescript
const s = io('http://localhost:3000/training');
```
