# 数据库 (PostgreSQL + Docker)

## 启动

```bash
docker compose up -d    # 启动 PG 容器
docker compose down      # 停止
```

**端口**：5432 | **用户**：poker | **密码**：poker123 | **库**：dezhoupuke  
**持久化**：`data/postgres/` (已加入 .gitignore)

## 表结构

### `users`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | TEXT PK | 用户 ID |
| username | TEXT UNIQUE | 用户名 |
| password_hash | TEXT | bcrypt 哈希 |
| is_admin | BOOLEAN | 管理员标记 |
| game_tokens | INT | 游戏币余额 (默认 10000) |
| points | INT | 积分 (默认 0) |

### `player_stats`

| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | TEXT PK FK | 关联 users |
| total_hands | INT | 总手数 |
| wins | INT | 胜场 |
| total_profit | INT | 总盈亏 |
| max_pot | INT | 最大底池 |
| elo | INT | ELO 评分 (默认 1200) |

### `transactions`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PK | |
| user_id | TEXT FK | 用户 |
| type | TEXT | game_win/game_lose/exchange |
| tokens_delta | INT | 游戏币变动 |
| points_delta | INT | 积分变动 |

## 数据层 (`db/`)

| 文件 | 说明 |
|------|------|
| `pool.ts` | pg.Pool 连接池 + initSchema() 建表 |
| `pgStore.ts` | CRUD 方法：findUser/createUser/updateTokens/getStats/updateStats/recordTransaction |

## 数据流

```
WebSocket → hand_result → pgStore.updateTokens() + recordTransaction()
REST /api/auth/* → pgStore.findUser() + createUser()
```
