import { X } from 'lucide-react';
import { useStore } from '../store.js';
import Avatar from './Avatar.jsx';

export default function LooksStrip() {
  const { looks, products, favorites, picked, togglePick, toggleFavorite, deleteLook, saveLook, setOrderOpen, showToast } = useStore();
  const favItems = favorites.map((id) => products.find((p) => p.id === id)).filter(Boolean);

  const save = async () => {
    try { await saveLook(); showToast('Образ сохранён'); } catch (e) { showToast(e.message, 'warn'); }
  };
  const ring = (key) => (picked.includes(key) ? 'ring-[3px] ring-white' : 'opacity-90');

  return (
    <div className="h-[150px] shrink-0 flex items-center gap-3 px-1">
      <div className="flex-1 flex gap-3 overflow-x-auto no-scrollbar items-center py-2">
        {looks.length + favItems.length === 0 && (
          <div className="text-white/70 font-light text-sm">Сохраняйте образы и отмечайте вещи сердечком — их можно заказать отсюда</div>
        )}
        {looks.map((l) => {
          const items = l.product_ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
          const key = `look:${l.id}`;
          return (
            <div key={key} className="relative shrink-0">
              <button onClick={() => togglePick(key)} className={`w-[78px] h-[118px] rounded-2xl bg-[#d9d4cb] p-1 block ${ring(key)}`}>
                <Avatar products={items} mini />
              </button>
              <div className="text-[11px] text-center mt-0.5 font-light">{l.name}</div>
              <button aria-label="Удалить образ" onClick={() => deleteLook(l.id)} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/50 grid place-items-center">
                <X size={14} />
              </button>
            </div>
          );
        })}
        {favItems.map((p) => {
          const key = `item:${p.id}`;
          return (
            <div key={key} className="relative shrink-0">
              <button onClick={() => togglePick(key)} className={`w-[78px] h-[98px] rounded-2xl bg-[#d9d4cb] block overflow-hidden ${ring(key)}`}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" draggable="false" />
              </button>
              <div className="text-[11px] text-center mt-0.5 font-light w-[78px] truncate">{p.name}</div>
              <button aria-label="Убрать из избранного" onClick={() => toggleFavorite(p.id)} className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-black/50 grid place-items-center">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 w-[170px]">
        <button onClick={save} className="glass-btn bg-white/90 !text-stone-700 font-medium">Сохранить образ</button>
        <button onClick={() => setOrderOpen(true)} disabled={!picked.length} className="glass-btn disabled:opacity-40">
          Заказать{picked.length ? ` (${picked.length})` : ''}
        </button>
      </div>
    </div>
  );
}
