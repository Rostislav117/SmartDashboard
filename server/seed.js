// Наполнение базы тестовыми данными и генерация SVG-картинок. Идемпотентно.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import db from './db.js';

const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../client/public/products');
fs.mkdirSync(outDir, { recursive: true });
for (const f of fs.readdirSync(outDir)) if (f.endsWith('.svg')) fs.unlinkSync(path.join(outDir, f));

// Детерминированный генератор случайных чисел (mulberry32)
let seedState = 20261028;
const rand = () => {
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const categories = [
  ['outerwear', 'Верхняя одежда', 'Layers'],
  ['tops', 'Топы', 'Shirt'],
  ['knitwear', 'Трикотаж', 'Waves'],
  ['trousers', 'Брюки', 'Ruler'],
  ['jeans', 'Джинсы', 'Rows3'],
  ['skirts', 'Юбки', 'Triangle'],
  ['dresses', 'Платья', 'Sparkles'],
  ['shoes', 'Обувь', 'Footprints'],
  ['accessories', 'Аксессуары', 'ShoppingBag'],
];
const ZONE = { shoes: 10, trousers: 20, jeans: 20, skirts: 20, dresses: 30, tops: 40, knitwear: 40, outerwear: 50, accessories: 60 };

// [категория, название, цена, цвет, hex, форма]
const catalog = [
  ['outerwear', 'Пальто прямое шерстяное', 12999, 'коричневый', '#4a3228', 'coat'],
  ['outerwear', 'Пуховик стёганый', 9999, 'серый', '#7b7f85', 'puffer'],
  ['outerwear', 'Тренч классический', 10999, 'бежевый', '#c9b79c', 'trench'],
  ['outerwear', 'Пальто длинное', 13999, 'чёрный', '#1c1c1e', 'coat'],
  ['tops', 'Футболка базовая', 1999, 'белый', '#f3f1ec', 'tee'],
  ['tops', 'Топ приталенный', 1799, 'чёрный', '#1c1c1e', 'fitted'],
  ['tops', 'Рубашка оверсайз', 3999, 'голубой', '#a9c4de', 'shirt'],
  ['knitwear', 'Джемпер тонкой вязки', 5999, 'горчичный', '#c8932b', 'jumper'],
  ['knitwear', 'Кардиган объёмный', 6499, 'серый', '#9a9a9a', 'cardigan'],
  ['knitwear', 'Водолазка', 4499, 'чёрный', '#1c1c1e', 'turtle'],
  ['trousers', 'Брюки широкие', 7999, 'молочный', '#eee8da', 'wide'],
  ['trousers', 'Брюки классические', 6999, 'чёрный', '#1c1c1e', 'pants'],
  ['trousers', 'Брюки прямые', 6499, 'серый', '#6e6e6e', 'pants'],
  ['jeans', 'Джинсы прямые', 5999, 'синий', '#3d5a80', 'pants'],
  ['jeans', 'Джинсы свободные', 5999, 'чёрный', '#222226', 'wide'],
  ['skirts', 'Юбка миди плиссе', 4999, 'чёрный', '#1c1c1e', 'pleat'],
  ['skirts', 'Юбка прямая', 4499, 'серый', '#8a8a8a', 'skirt'],
  ['dresses', 'Платье-футляр', 8999, 'чёрный', '#1c1c1e', 'sheath'],
  ['dresses', 'Платье миди', 9499, 'бордовый', '#7a1f2b', 'midi'],
  ['shoes', 'Лоферы', 6999, 'чёрный', '#1c1c1e', 'loafer'],
  ['shoes', 'Кроссовки', 7499, 'белый', '#f3f1ec', 'sneaker'],
  ['shoes', 'Ботинки', 8999, 'коричневый', '#5a3a28', 'boot'],
  ['accessories', 'Сумка-шоппер', 9999, 'чёрный', '#1c1c1e', 'bag'],
  ['accessories', 'Шапка-бини', 2999, 'чёрный', '#1c1c1e', 'beanie'],
  ['accessories', 'Перчатки', 3499, 'чёрный', '#1c1c1e', 'gloves'],
  ['accessories', 'Шарф', 2799, 'серый', '#9a9a9a', 'scarf'],
];

// ---------- Формы вещей в координатах сцены 540×960 ----------
// Центр тела x=270. Плечи y≈195, талия y≈410, бёдра y≈500, ступни y≈845–885.
const sym = (pts) => {
  // pts — точки левой половины сверху вниз (x<270); правая получается зеркально
  const right = [...pts].reverse().map(([x, y]) => [540 - x, y]);
  return 'M' + [...pts, ...right].map((p) => p.join(',')).join(' L') + ' Z';
};
const shade = (hex, k) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v * k)));
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('');
};

// Каждая форма: bbox для карточки и функция рисования (c — цвет)
const shapes = {
  tee: { bbox: [160, 185, 220, 225], draw: (c) => `<path d="${sym([[245,188],[205,195],[165,270],[200,292],[215,268],[215,400],[270,400]])}" fill="${c}"/><path d="M245,188 Q270,212 295,188" fill="none" stroke="${shade(c,0.8)}" stroke-width="3"/>` },
  fitted: { bbox: [190, 185, 160, 190], draw: (c) => `<path d="${sym([[250,188],[215,195],[205,250],[225,300],[222,370],[270,370]])}" fill="${c}"/>` },
  shirt: { bbox: [160, 185, 220, 300], draw: (c) => `<path d="${sym([[245,188],[205,195],[172,470],[200,474],[216,300],[212,430],[270,430]])}" fill="${c}"/><path d="M270,205 V430" stroke="${shade(c,0.8)}" stroke-width="2"/><path d="M245,188 L270,222 L295,188" fill="#fff" fill-opacity=".5" stroke="${shade(c,0.8)}" stroke-width="2"/>${[250,290,330,370].map((y)=>`<circle cx="270" cy="${y}" r="3" fill="${shade(c,0.7)}"/>`).join('')}` },
  jumper: { bbox: [165, 185, 210, 295], draw: (c) => `<path d="${sym([[245,188],[205,195],[172,470],[200,474],[216,300],[214,420],[270,420]])}" fill="${c}"/><path d="M205,420 H335" stroke="${shade(c,0.8)}" stroke-width="6"/>` },
  cardigan: { bbox: [160, 185, 220, 305], draw: (c) => `<path d="${sym([[245,188],[205,195],[170,470],[200,476],[214,300],[210,450],[270,450]])}" fill="${c}"/><path d="M270,210 V450" stroke="${shade(c,0.75)}" stroke-width="4"/>${[260,320,380].map((y)=>`<circle cx="270" cy="${y}" r="4" fill="${shade(c,0.6)}"/>`).join('')}` },
  turtle: { bbox: [165, 160, 210, 320], draw: (c) => `<path d="${sym([[250,165],[245,188],[205,195],[172,470],[200,474],[216,300],[218,420],[270,420]])}" fill="${c}"/><rect x="252" y="160" width="36" height="34" rx="10" fill="${shade(c,1.25)}"/>` },
  coat: { bbox: [160, 185, 220, 520], draw: (c) => `<path d="${sym([[245,185],[200,192],[162,480],[194,486],[208,300],[202,700],[270,700]])}" fill="${c}"/><path d="M245,185 L270,300 L295,185" fill="${shade(c,1.2)}"/><path d="M270,300 V700" stroke="${shade(c,0.7)}" stroke-width="3"/>${[360,430,500].map((y)=>`<circle cx="262" cy="${y}" r="4" fill="${shade(c,0.6)}"/>`).join('')}` },
  puffer: { bbox: [160, 185, 220, 340], draw: (c) => `<path d="${sym([[245,185],[200,192],[162,480],[194,486],[208,300],[205,540],[270,540]])}" fill="${c}"/><path d="M270,200 V540" stroke="${shade(c,0.7)}" stroke-width="3"/>${[250,310,370,430,490].map((y)=>`<path d="M207,${y} H333" stroke="${shade(c,0.75)}" stroke-width="3"/>`).join('')}` },
  trench: { bbox: [160, 185, 220, 450], draw: (c) => `<path d="${sym([[245,185],[200,192],[162,480],[194,486],[208,300],[204,640],[270,640]])}" fill="${c}"/><path d="M245,185 L270,310 L295,185" fill="${shade(c,1.15)}"/><path d="M206,420 H334" stroke="${shade(c,0.7)}" stroke-width="12"/><rect x="262" y="414" width="16" height="12" fill="${shade(c,0.55)}"/><path d="M270,310 V640" stroke="${shade(c,0.75)}" stroke-width="3"/>` },
  pants: { bbox: [200, 400, 140, 440], draw: (c) => `<path d="${sym([[218,410],[204,832],[256,832],[270,530]])}" fill="${c}"/><path d="M270,410 V530" stroke="${shade(c,0.7)}" stroke-width="2"/><rect x="218" y="410" width="104" height="10" fill="${shade(c,0.8)}"/>` },
  wide: { bbox: [185, 400, 170, 440], draw: (c) => `<path d="${sym([[218,410],[190,838],[258,838],[270,530]])}" fill="${c}"/><path d="M270,410 V530" stroke="${shade(c,0.7)}" stroke-width="2"/><rect x="218" y="410" width="104" height="10" fill="${shade(c,0.8)}"/>` },
  skirt: { bbox: [200, 400, 140, 250], draw: (c) => `<path d="${sym([[220,410],[205,640],[270,640]])}" fill="${c}"/><rect x="220" y="410" width="100" height="10" fill="${shade(c,0.8)}"/>` },
  pleat: { bbox: [175, 400, 190, 330], draw: (c) => `<path d="${sym([[220,410],[180,720],[270,720]])}" fill="${c}"/><rect x="220" y="410" width="100" height="10" fill="${shade(c,0.8)}"/>${[-60,-30,0,30,60].map((dx)=>`<path d="M${270+dx*0.5},425 L${270+dx*1.35},720" stroke="${shade(c,1.5)}" stroke-opacity=".35" stroke-width="2"/>`).join('')}` },
  sheath: { bbox: [205, 185, 130, 380], draw: (c) => `<path d="${sym([[250,190],[228,196],[224,300],[222,420],[218,640],[270,640]])}" fill="${c}"/>` },
  midi: { bbox: [185, 185, 170, 540], draw: (c) => `<path d="${sym([[250,190],[228,196],[222,300],[226,410],[185,720],[270,720]])}" fill="${c}"/><rect x="224" y="405" width="92" height="8" fill="${shade(c,0.7)}"/>` },
  loafer: { bbox: [205, 835, 130, 60], draw: (c) => `<path d="M222,845 L264,845 L268,872 Q268,886 250,886 L214,886 Q210,860 222,845 Z" fill="${c}"/><path d="M318,845 L276,845 L272,872 Q272,886 290,886 L326,886 Q330,860 318,845 Z" fill="${c}"/><rect x="212" y="884" width="58" height="5" fill="${shade(c,0.5)}"/><rect x="270" y="884" width="58" height="5" fill="${shade(c,0.5)}"/>` },
  sneaker: { bbox: [205, 835, 130, 60], draw: (c) => `<path d="M222,845 L264,845 L268,872 Q268,884 250,884 L214,884 Q210,860 222,845 Z" fill="${c}" stroke="#bbb"/><path d="M318,845 L276,845 L272,872 Q272,884 290,884 L326,884 Q330,860 318,845 Z" fill="${c}" stroke="#bbb"/><rect x="211" y="882" width="60" height="9" rx="4" fill="#e3ded5"/><rect x="269" y="882" width="60" height="9" rx="4" fill="#e3ded5"/>` },
  boot: { bbox: [205, 770, 130, 125], draw: (c) => `<path d="M222,780 L264,780 L268,872 Q268,886 250,886 L214,886 Q210,860 222,845 Z" fill="${c}"/><path d="M318,780 L276,780 L272,872 Q272,886 290,886 L326,886 Q330,860 318,845 Z" fill="${c}"/><rect x="212" y="884" width="58" height="6" fill="${shade(c,0.5)}"/><rect x="270" y="884" width="58" height="6" fill="${shade(c,0.5)}"/>` },
  bag: { bbox: [340, 420, 90, 150], draw: (c) => `<path d="M372,470 Q385,420 398,470" fill="none" stroke="${c}" stroke-width="5"/><path d="M355,470 H415 L422,565 H348 Z" fill="${c}"/>` },
  beanie: { bbox: [220, 60, 100, 70], draw: (c) => `<path d="M228,112 Q228,58 270,58 Q312,58 312,112 Z" fill="${c}"/><rect x="224" y="104" width="92" height="16" rx="7" fill="${shade(c,1.4)}"/><circle cx="270" cy="55" r="7" fill="${shade(c,1.4)}"/>` },
  gloves: { bbox: [150, 440, 240, 80], draw: (c) => `<rect x="156" y="456" width="32" height="52" rx="14" fill="${c}"/><rect x="352" y="456" width="32" height="52" rx="14" fill="${c}"/>` },
  scarf: { bbox: [215, 160, 110, 160], draw: (c) => `<rect x="236" y="168" width="68" height="28" rx="12" fill="${c}"/><path d="M280,190 L304,190 L310,310 L282,310 Z" fill="${shade(c,0.85)}"/>` },
};

const layerSvg = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960" width="540" height="960">${inner}</svg>`;

function cardSvg(shape, c) {
  const [bx, by, bw, bh] = shape.bbox;
  const k = Math.min(190 / bw, 230 / bh);
  const tx = 120 - (bx + bw / 2) * k;
  const ty = 150 - (by + bh / 2) * k;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 300" width="240" height="300"><rect width="240" height="300" rx="28" fill="#ece8e1"/><g transform="translate(${tx} ${ty}) scale(${k})">${shape.draw(c)}</g></svg>`;
}

// ---------- Заполнение базы ----------
const run = db.transaction(() => {
  for (const t of ['request_items', 'requests', 'assist_calls', 'looks', 'variants', 'products', 'categories'])
    db.prepare(`DELETE FROM ${t}`).run();

  const insCat = db.prepare('INSERT INTO categories (id, slug, name, icon, sort) VALUES (?, ?, ?, ?, ?)');
  categories.forEach(([slug, name, icon], i) => insCat.run(i + 1, slug, name, icon, i + 1));
  const catId = Object.fromEntries(categories.map(([slug], i) => [slug, i + 1]));

  const insP = db.prepare(
    `INSERT INTO products (id, category_id, name, price, color, color_hex, image, layer, layer_z, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insV = db.prepare('INSERT INTO variants (product_id, size, stock) VALUES (?, ?, ?)');
  const ids = {};

  catalog.forEach(([cat, name, price, color, hex, kind], i) => {
    const id = i + 1;
    ids[`${name}|${color}`] = id;
    ids[name] ??= id;
    const shape = shapes[kind];
    fs.writeFileSync(path.join(outDir, `${id}.svg`), cardSvg(shape, hex));
    fs.writeFileSync(path.join(outDir, `${id}-layer.svg`), layerSvg(shape.draw(hex)));
    insP.run(id, catId[cat], name, price, color, hex, `/products/${id}.svg`, `/products/${id}-layer.svg`, ZONE[cat], `${name}, цвет: ${color}.`);

    const sizes = cat === 'shoes' ? ['37', '38', '39', '40', '41'] : cat === 'accessories' ? ['Универсальный'] : ['XS', 'S', 'M', 'L', 'XL'];
    for (const size of sizes) {
      let stock = Math.floor(rand() * 7);
      // Гарантируем нулевые остатки для демонстрации серых размеров
      if ((name === 'Пальто прямое шерстяное' && size === 'XS') || (name === 'Кроссовки' && size === '41')) stock = 0;
      // А вещи для демо-сценария всегда есть в нужных размерах
      if (name === 'Пальто прямое шерстяное' && size === 'M') stock = Math.max(stock, 3);
      insV.run(id, size, stock);
    }
  });

  const insL = db.prepare('INSERT INTO looks (room_id, name, product_ids) VALUES (1, ?, ?)');
  const pid = (n, c) => ids[c ? `${n}|${c}` : n];
  insL.run('Осенний', JSON.stringify([pid('Пальто прямое шерстяное'), pid('Джемпер тонкой вязки'), pid('Брюки широкие'), pid('Лоферы'), pid('Шапка-бини')]));
  insL.run('Городской', JSON.stringify([pid('Пуховик стёганый'), pid('Водолазка'), pid('Джинсы прямые'), pid('Кроссовки')]));
  insL.run('Вечерний', JSON.stringify([pid('Платье-футляр'), pid('Пальто длинное'), pid('Ботинки')]));
});
run();

console.log(`Seed готов: ${catalog.length} товаров, SVG в client/public/products/`);
