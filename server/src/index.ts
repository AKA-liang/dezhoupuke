/**
 * 沉浸式德州扑克 — Node.js 服务端入口
 */
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { config, validateConfig } from './config.js';
import { router as apiRouter } from './routes/auth.js';
import { setupOneVOne } from './ws/oneVOne.js';
import { setupTraining } from './ws/training.js';

const app = express();
const http = createServer(app);
const io = new Server(http, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/api', apiRouter);

io.of('/oneVOne').on('connection', (socket) => setupOneVOne(socket));
io.of('/training').on('connection', (socket) => setupTraining(socket));

validateConfig();

http.listen(config.PORT, () => {
  console.log(`[Server] http://localhost:${config.PORT}`);
});

export { app, io, http };
