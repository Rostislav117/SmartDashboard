import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import db from './db.js';
import productsRouter from './routes/products.js';
import looksRouter from './routes/looks.js';
import { requestsRouter, assistRouter, staffRouter } from './routes/requests.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
app.set('io', io);

app.use(cors());
app.use(express.json());

app.use('/api/categories', (req, res) => {
  res.json(db.prepare('SELECT * FROM categories ORDER BY sort').all());
});
app.use('/api/products', productsRouter);
app.use('/api/looks', looksRouter);
app.use('/api/requests', requestsRouter);
app.use('/api/assist', assistRouter);
app.use('/api/staff', staffRouter);

// Клиент входит в комнату: киоск — room:<n>, консультант — staff
io.on('connection', (socket) => {
  socket.on('join', ({ role, room } = {}) => {
    if (role === 'staff') socket.join('staff');
    else socket.join(`room:${Number(room) || 1}`);
  });
});

// После `npm run build` раздаём собранный клиент
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^\/(?!api|socket\.io).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`LIME server: http://localhost:${PORT}`));
