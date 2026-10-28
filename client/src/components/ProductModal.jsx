import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store.js';
import { formatPrice } from '../api.js';

export default function ProductModal() {
  const { modalProduct, products, worn, wear, closeProduct, addToCart, showToast } = useStore();
  const [size, setSize] = useState(null);
  if (!modalProduct) return null;
  // Берём свежую версию из стора, чтобы остатки обновлялись
  const p = products.find((x) => x.id === modalProduct.id) || modalProduct;
  const variant = p.variants.find((v) => v.size === size);
  const close = () => { setSize(null); closeProduct(); };

  const bring = () => {
    if (!size) return showToast('Выберите размер', 'warn');
    addToCart(p, size);
    showToast('Добавлено в список для примерочной');
    close();
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/40 grid place-items-center p-6" onClick={close}>
      <div className="w-full rounded-[32px] bg-[#e9e4dc] text-stone-800 p-5 relative slidein" onClick={(e) => e.stopPropagation()}>
        <button onClick={close} aria-label="Закрыть" className="absolute top-4 right-4 w-12 h-12 grid place-items-center rounded-full bg-white/70 z-10">
          <X />
        </button>
        <img src={p.image} alt={p.name} className="w-[300px] mx-auto rounded-3xl" />
        <h3 className="text-2xl font-semibold mt-3">{p.name}</h3>
        <div className="flex items-center gap-2 text-stone-600 mt-1">
          <span className="w-4 h-4 rounded-full border border-stone-400" style={{ background: p.color_hex }} />
          {p.color} · <b className="text-stone-800">{formatPrice(p.price)}</b>
        </div>
        <div className="mt-4 text-sm text-stone-500">Размер</div>
        <div className="flex flex-wrap gap-2 mt-1">
          {p.variants.map((v) => (
            <button
              key={v.size}
              disabled={v.stock === 0}
              onClick={() => setSize(v.size)}
              className={`min-w-[56px] min-h-[48px] px-3 rounded-2xl border text-[15px] ${
                v.stock === 0 ? 'bg-stone-300/60 text-stone-400 border-transparent cursor-not-allowed'
                : size === v.size ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-400'
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
        <div className="text-sm text-stone-500 mt-2 min-h-[20px]">
          {variant ? `В наличии: ${variant.stock} шт.` : 'Серые размеры закончились'}
        </div>
        <div className="flex gap-3 mt-4">
          <button onClick={() => { wear(p); close(); }} className="flex-1 min-h-[52px] rounded-2xl border border-stone-500">
            {worn.some((w) => w.id === p.id) ? 'Снять' : 'Примерить'}
          </button>
          <button onClick={bring} className="flex-[1.4] min-h-[52px] rounded-2xl bg-stone-800 text-white">
            Принести в примерочную
          </button>
        </div>
      </div>
    </div>
  );
}
