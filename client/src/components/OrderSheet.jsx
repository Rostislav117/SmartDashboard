import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store.js';
import { formatPrice } from '../api.js';

// Заказ выбранных образов и отдельных вещей с выбором размера
export default function OrderSheet() {
  const { orderOpen, setOrderOpen, pickedProducts, sendRequest, showToast } = useStore();
  const [sizes, setSizes] = useState({}); // product_id -> размер
  const [busy, setBusy] = useState(false);
  if (!orderOpen) return null;

  const items = pickedProducts();
  const sizeOf = (p) => sizes[p.id] ?? p.variants.find((v) => v.stock > 0)?.size;
  const orderable = items.filter((p) => sizeOf(p));
  const total = orderable.reduce((n, p) => n + p.price, 0);

  const send = async () => {
    setBusy(true);
    try {
      await sendRequest(orderable.map((p) => ({ product_id: p.id, size: sizeOf(p) })));
    } catch (e) {
      showToast(e.message, 'warn');
    }
    setBusy(false);
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/40 flex items-end" onClick={() => setOrderOpen(false)}>
      <div className="w-full rounded-t-[32px] bg-[#e9e4dc] text-stone-800 p-5 slidein" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">Заказать выбранное</h3>
          <button onClick={() => setOrderOpen(false)} aria-label="Закрыть" className="w-12 h-12 grid place-items-center rounded-full bg-white/70"><X /></button>
        </div>
        <div className="max-h-[520px] overflow-y-auto space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-white/60 rounded-2xl p-2">
              <img src={p.image} alt="" className="w-14 h-[70px] rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{p.name}</div>
                <div className="text-sm text-stone-500">{formatPrice(p.price)}</div>
              </div>
              {sizeOf(p) ? (
                <div className="flex gap-1.5 flex-wrap justify-end max-w-[250px]">
                  {p.variants.map((v) => (
                    <button
                      key={v.size}
                      disabled={v.stock === 0}
                      onClick={() => setSizes({ ...sizes, [p.id]: v.size })}
                      className={`min-w-[48px] min-h-[48px] px-2 rounded-xl border text-sm ${
                        v.stock === 0 ? 'bg-stone-300/60 text-stone-400 border-transparent'
                        : sizeOf(p) === v.size ? 'bg-stone-800 text-white border-stone-800' : 'border-stone-400'
                      }`}
                    >
                      {v.size}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-stone-500 pr-2">Нет в наличии</span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <b>Итого: {formatPrice(total)}</b>
          <button disabled={busy || !orderable.length} onClick={send} className="px-6 min-h-[52px] rounded-2xl bg-stone-800 text-white disabled:opacity-50">
            Отправить заявку
          </button>
        </div>
      </div>
    </div>
  );
}
