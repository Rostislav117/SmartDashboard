import { Heart } from 'lucide-react';
import { useStore } from '../store.js';
import { formatPrice } from '../api.js';

export default function ProductList() {
  const { products, categories, activeCategory, worn, favorites, wear, openProduct, toggleFavorite } = useStore();
  const cat = categories.find((c) => c.slug === activeCategory);
  const list = cat ? products.filter((p) => p.category_id === cat.id) : products;

  return (
    <aside className="w-[215px] shrink-0 flex flex-col min-h-0 py-2">
      <h2 className="text-lg font-light mb-3 px-1">Примерить образ</h2>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 no-scrollbar">
        {list.map((p) => {
          const on = worn.some((w) => w.id === p.id);
          const fav = favorites.includes(p.id);
          return (
            <div
              key={p.id}
              onClick={() => wear(p)}
              className={`relative rounded-3xl p-2 cursor-pointer transition glass ${on ? 'ring-2 ring-white' : ''}`}
            >
              <img src={p.image} alt={p.name} className="w-full rounded-2xl aspect-[4/5] object-cover" draggable="false" />
              <button
                aria-label="В избранное"
                onClick={(e) => { e.stopPropagation(); toggleFavorite(p.id); }}
                className="absolute top-3 right-3 w-10 h-10 grid place-items-center rounded-full bg-white/60"
              >
                <Heart size={20} className={fav ? 'fill-rose-500 text-rose-500' : 'text-stone-600'} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openProduct(p); }}
                className="block text-left mt-2 px-1 min-h-[48px] w-full"
              >
                <div className="text-[14px] leading-snug underline-offset-2 hover:underline">{p.name}</div>
                <div className="text-[15px] font-semibold">{formatPrice(p.price)}</div>
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
