# 认证系统 (auth)

## 注册

```
POST /api/auth/register { username, password }
→ bcrypt.hash(password, 10)
→ INSERT INTO users
→ JWT.sign({ userId, username }, secret, 24h)
→ { token, userId, username, gameTokens: 10000 }
```

## 登录

```
POST /api/auth/login { username, password }
→ SELECT password_hash FROM users
→ bcrypt.compare(password, hash)
→ JWT.sign(...)
→ { token, userId, username, gameTokens }
```

## 当前用户

```
GET /api/auth/me?token=xxx
→ jwt.verify(token, secret)
→ SELECT + player_stats JOIN
→ { id, username, game_tokens, points, elo }
```

## WebSocket 认证

客户端连接后发送 `auth` 事件：
```json
{ "token": "eyJ..." }
```

服务端解析 userId，绑定到 GameSession，用于手牌结束后的余额更新。

## 安全

| 环节 | 方案 |
|------|------|
| 密码存储 | bcrypt (salt + 10 轮迭代) |
| 传输认证 | JWT + HMAC-SHA256 |
| Token 有效期 | 24 小时 |
| 密钥 | `dev-secret-change-me` (生产环境务必更换) |
