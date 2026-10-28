import { Router } from 'express';
import db, { getRequest, getAssist, getProduct } from '../db.js';

export const requestsRouter = Router();
export const assistRouter = Router();
export const staffRouter = Router();

const REQ_STATUSES = ['new', 'accepted', 'delivered', 'cancelled'];
const ASSIST_STATUSES = ['new', 'accepted', 'done'];

// Рассылаем новые остатки всем киоскам
function emitStock(io, productIds) {
  for (const id of new Set(productIds)) io.emit('stock:updated', getProduct(id));
}

requestsRouter.get('/', (req, res) => {
  const room = Number(req.query.room) || 1;
  const ids = db.prepare('SELECT id FROM requests WHERE room_id = ? ORDER BY id DESC').all(room);
  res.json(ids.map((r) => getRequest(r.id)));
});

requestsRouter.post('/', (req, res) => {
  const { room_id, items } = req.body || {};
  if (!room_id || !Array.isArray(items) || !items.length)
    return res.status(400).json({ error: 'Нужны room_id и items' });

  const create = db.transaction(() => {
    const dec = db.prepare(
      'UPDATE variants SET stock = stock - 1 WHERE product_id = ? AND size = ? AND stock > 0'
    );
    // Один размер может прийти дважды — остаток проверяется на каждой позиции
    for (const it of items) {
      if (!it.product_id || !it.size) throw new Error('Не выбран размер');
      if (!dec.run(it.product_id, it.size).changes) throw new Error('Нет в наличии');
    }
    const { lastInsertRowid: id } = db.prepare('INSERT INTO requests (room_id) VALUES (?)').run(room_id);
    const ins = db.prepare('INSERT INTO request_items (request_id, product_id, size) VALUES (?, ?, ?)');
    for (const it of items) ins.run(id, it.product_id, it.size);
    return id;
  });

  let id;
  try {
    id = create();
  } catch (e) {
    return res.status(409).json({ error: e.message });
  }
  const io = req.app.get('io');
  const full = getRequest(id);
  io.to('staff').emit('request:new', full);
  io.to(`room:${room_id}`).emit('request:updated', full);
  emitStock(io, items.map((i) => i.product_id));
  res.status(201).json(full);
});

requestsRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!REQ_STATUSES.includes(status)) return res.status(400).json({ error: 'Неверный статус' });
  const cur = getRequest(id);
  if (!cur) return res.status(404).json({ error: 'Заявка не найдена' });
  if (cur.status === 'cancelled' || cur.status === 'delivered')
    return res.status(409).json({ error: 'Заявка уже закрыта' });

  db.transaction(() => {
    db.prepare("UPDATE requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(status, id);
    // При отмене возвращаем остатки
    if (status === 'cancelled') {
      const back = db.prepare('UPDATE variants SET stock = stock + 1 WHERE product_id = ? AND size = ?');
      for (const it of cur.items) back.run(it.product_id, it.size);
    }
  })();

  const io = req.app.get('io');
  const full = getRequest(id);
  io.to('staff').to(`room:${full.room_id}`).emit('request:updated', full);
  if (status === 'cancelled') emitStock(io, cur.items.map((i) => i.product_id));
  res.json(full);
});

assistRouter.post('/', (req, res) => {
  const { room_id } = req.body || {};
  if (!room_id) return res.status(400).json({ error: 'Нужен room_id' });
  const { lastInsertRowid } = db.prepare('INSERT INTO assist_calls (room_id) VALUES (?)').run(room_id);
  const full = getAssist(lastInsertRowid);
  const io = req.app.get('io');
  io.to('staff').emit('assist:new', full);
  io.to(`room:${room_id}`).emit('assist:updated', full);
  res.status(201).json(full);
});

assistRouter.get('/', (req, res) => {
  const room = Number(req.query.room) || 1;
  res.json(
    db.prepare('SELECT id FROM assist_calls WHERE room_id = ? ORDER BY id DESC').all(room).map((r) => getAssist(r.id))
  );
});

assistRouter.patch('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  if (!ASSIST_STATUSES.includes(status)) return res.status(400).json({ error: 'Неверный статус' });
  if (!getAssist(id)) return res.status(404).json({ error: 'Вызов не найден' });
  db.prepare('UPDATE assist_calls SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  const full = getAssist(id);
  req.app.get('io').to('staff').to(`room:${full.room_id}`).emit('assist:updated', full);
  res.json(full);
});

// Очередь консультанта: все заявки и вызовы (клиент сам фильтрует «активные/выполненные»)
staffRouter.get('/queue', (req, res) => {
  const requests = db.prepare('SELECT id FROM requests ORDER BY id').all().map((r) => getRequest(r.id));
  const assists = db.prepare('SELECT id FROM assist_calls ORDER BY id').all().map((r) => getAssist(r.id));
  res.json({ requests, assists });
});
