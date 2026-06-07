import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { GameState, WsMessage, ActionId } from '@poker/shared';

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = 3000;

// ---- Routes ----
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ---- WebSocket ----
io.on('connection', (socket) => {
  console.log(`[WS] client connected: ${socket.id}`);

  socket.on('join', (data: { token?: string }) => {
    console.log(`[WS] ${socket.id} joined`, data.token ? '(auth)' : '(guest)');
    socket.emit('joined', { sessionId: socket.id });
  });

  socket.on('action', (msg: WsMessage) => {
    console.log(`[WS] ${socket.id} action:`, msg.action);
    // TODO: GameSession handler
  });

  socket.on('disconnect', () => {
    console.log(`[WS] client disconnected: ${socket.id}`);
  });
});

// ---- Start ----
http.listen(PORT, () => {
  console.log(`[Server] listening on http://localhost:${PORT}`);
});

export { app, io, http };
