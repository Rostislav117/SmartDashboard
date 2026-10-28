import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'data');
fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.join(dir, 'lime.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY, slug TEXT UNIQUE, name TEXT, icon TEXT, sort INTEGER
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY, category_id INTEGER REFERENCES categories(id),
  name TEXT, price INTEGER, color TEXT, color_hex TEXT,
  image TEXT, layer TEXT, layer_z INTEGER, description TEXT
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(id),
  size TEXT, stock INTEGER
);
CREATE TABLE IF NOT EXISTS looks (
  id INTEGER PRIMARY KEY, room_id INTEGER, name TEXT,
  product_ids TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS requests (
  id INTEGER PRIMARY KEY, room_id INTEGER, status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS request_items (
  id INTEGER PRIMARY KEY, request_id INTEGER REFERENCES requests(id),
  product_id INTEGER REFERENCES products(id), size TEXT
);
CREATE TABLE IF NOT EXISTS assist_calls (
  id INTEGER PRIMARY KEY, room_id INTEGER, status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`);

// Время в SQLite хранится как UTC без «Z» — приводим к ISO для клиента
const iso = (s) => (s ? s.replace(' ', 'T') + 'Z' : s);

export function getRequest(id) {
  const r = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);
  if (!r) return null;
  r.items = db
    .prepare(
      `SELECT ri.id, ri.product_id, ri.size, p.name, p.color, p.image, p.price
       FROM request_items ri JOIN products p ON p.id = ri.product_id
       WHERE ri.request_id = ?`
    )
    .all(id);
  r.created_at = iso(r.created_at);
  r.updated_at = iso(r.updated_at);
  return r;
}

export function getAssist(id) {
  const a = db.prepare('SELECT * FROM assist_calls WHERE id = ?').get(id);
  if (a) {
    a.created_at = iso(a.created_at);
    a.updated_at = iso(a.updated_at);
  }
  return a;
}

export function getProduct(id) {
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!p) return null;
  p.variants = db.prepare('SELECT size, stock FROM variants WHERE product_id = ? ORDER BY id').all(id);
  return p;
}

export default db;
