import { Router } from 'express';
import db, { getProduct } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { category } = req.query;
  const rows = category
    ? db
        .prepare(
          `SELECT p.id FROM products p JOIN categories c ON c.id = p.category_id
           WHERE c.slug = ? ORDER BY p.id`
        )
        .all(category)
    : db.prepare('SELECT id FROM products ORDER BY id').all();
  res.json(rows.map((r) => getProduct(r.id)));
});

router.get('/:id', (req, res) => {
  const p = getProduct(Number(req.params.id));
  if (!p) return res.status(404).json({ error: 'Товар не найден' });
  res.json(p);
});

export default router;
