import { Router } from 'express';
import db from '../db.js';

const router = Router();
const MAX_LOOKS = 6;
const parse = (l) => ({ ...l, product_ids: JSON.parse(l.product_ids) });

router.get('/', (req, res) => {
  const room = Number(req.query.room) || 1;
  const rows = db.prepare('SELECT * FROM looks WHERE room_id = ? ORDER BY id').all(room);
  res.json(rows.map(parse));
});

router.post('/', (req, res) => {
  const { room_id, name, product_ids } = req.body || {};
  if (!room_id || !Array.isArray(product_ids) || !product_ids.length)
    return res.status(400).json({ error: 'Нужны room_id и product_ids' });
  const { n } = db.prepare('SELECT COUNT(*) n FROM looks WHERE room_id = ?').get(room_id);
  if (n >= MAX_LOOKS)
    return res.status(409).json({ error: `Можно сохранить не больше ${MAX_LOOKS} образов` });
  const info = db
    .prepare('INSERT INTO looks (room_id, name, product_ids) VALUES (?, ?, ?)')
    .run(room_id, name || `Образ ${n + 1}`, JSON.stringify(product_ids));
  res.status(201).json(parse(db.prepare('SELECT * FROM looks WHERE id = ?').get(info.lastInsertRowid)));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM looks WHERE id = ?').run(Number(req.params.id));
  if (!info.changes) return res.status(404).json({ error: 'Образ не найден' });
  res.json({ ok: true });
});

export default router;
