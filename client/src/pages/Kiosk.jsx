import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, RotateCcw, ZoomIn, Maximize, BellRing, X } from 'lucide-react';
import { useStore } from '../store.js';
import { api, formatPrice } from '../api.js';
import { createSocket } from '../socket.js';
import CategoryMenu from '../components/CategoryMenu.jsx';
import Avatar from '../components/Avatar.jsx';
import ProductList from '../components/ProductList.jsx';
import ProductModal from '../components/ProductModal.jsx';
import LooksStrip from '../components/LooksStrip.jsx';
import OrderSheet from '../components/OrderSheet.jsx';
import ToastStatus from '../components/ToastStatus.jsx';

const W = 720, H = 1280; // проектный размер экрана 9:16, масштабируется под окно
const IDLE_MS = 60_000;

const REQ_TEXT = {
  new: 'Заявка отправлена',
  accepted: 'Консультант принял заявку — вещи несут',
  delivered: 'Вещи в примерочной',
  cancelled: 'Заявка отменена',
};
const ASSIST_TEXT = { new: 'Консультант вызван', accepted: 'Консультант идёт к вам', done: 'Консультант помог' };

function useScale() {
  const calc = () => Math.min(window.innerWidth / W, window.innerHeight / H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const on = () => setScale(calc());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return scale;
}

export default function Kiosk() {
  const [params] = useSearchParams();
  const room = Math.min(6, Math.max(1, Number(params.get('room')) || 1));
  const scale = useScale();
  const s = useStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const st = useStore.getState();
    st.init(room).then(() => setReady(true)).catch(() => st.showToast('Не удалось загрузить каталог', 'warn'));

    const socket = createSocket({ role: 'kiosk', room });
    socket.on('connect', () => {
      // После переподключения подтягиваем актуальные остатки
      if (!useStore.getState().connected) useStore.getState().refreshProducts();
      useStore.getState().setConnected(true);
    });
    socket.on('disconnect', () => useStore.getState().setConnected(false));
    socket.on('connect_error', () => useStore.getState().setConnected(false));
    socket.on('request:updated', (r) => useStore.getState().showToast(REQ_TEXT[r.status]));
    socket.on('assist:updated', (a) => useStore.getState().showToast(ASSIST_TEXT[a.status]));
    socket.on('stock:updated', (p) => useStore.getState().upsertProduct(p));
    return () => socket.close();
  }, [room]);

  // Режим киоска: через 60 секунд без касаний сбрасываем всё
  useEffect(() => {
    let t;
    const arm = () => { clearTimeout(t); t = setTimeout(() => useStore.getState().resetKiosk(), IDLE_MS); };
    const evs = ['pointerdown', 'keydown'];
    evs.forEach((e) => window.addEventListener(e, arm));
    arm();
    return () => { clearTimeout(t); evs.forEach((e) => window.removeEventListener(e, arm)); };
  }, []);

  const callStaff = async () => {
    try { await api.callAssist(room); } catch (e) { s.showToast(e.message, 'warn'); }
  };

  const fullscreen = () =>
    document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();

  return (
    <div className="w-screen h-screen overflow-hidden relative" style={{ background: '#4d4a45' }}>
      <div
        className="relative overflow-hidden flex flex-col px-5 pt-4 pb-3"
        style={{ width: W, height: H, position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%,-50%) scale(${scale})`, background: 'linear-gradient(160deg,#9a958d,#8f8a82 55%,#837e76)' }}
      >
        {/* Шапка */}
        <header className="h-[68px] shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-[40px] font-bold tracking-[0.18em]">LIME</div>
            <button onClick={() => s.setCategory(null)} className="glass-btn flex items-center gap-1.5 !px-3 text-sm">
              <ArrowLeft size={18} /> Назад
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-light opacity-80">Примерочная {room}</span>
            <button onClick={callStaff} className="glass-btn flex items-center gap-2 text-sm">
              <BellRing size={18} /> Позвать консультанта
            </button>
          </div>
        </header>

        <ToastStatus />

        {/* Основная область */}
        <div className="flex-1 flex gap-3 min-h-0 mt-2">
          <CategoryMenu />
          <div className="flex-1 relative rounded-[32px] overflow-hidden min-w-0" style={{ background: 'radial-gradient(circle at 50% 35%,#e4dfd6,#cfc9be)' }}>
            {ready && <Avatar products={s.worn} />}
            <div className="absolute left-3 bottom-3 flex flex-col gap-2">
              {[[RotateCcw, s.clearWorn, 'Сбросить образ'], [ZoomIn, s.toggleZoom, 'Приблизить'], [Maximize, fullscreen, 'Во весь экран']].map(([Icon, fn, label]) => (
                <button key={label} onClick={fn} aria-label={label} className="w-12 h-12 rounded-full grid place-items-center bg-white/70 text-stone-700 active:scale-95">
                  <Icon size={22} strokeWidth={1.6} />
                </button>
              ))}
            </div>
          </div>
          <ProductList />
        </div>

        {/* Плавающая корзина запроса */}
        {s.cart.length > 0 && (
          <button
            onClick={() => s.setCartOpen(true)}
            className="absolute left-1/2 -translate-x-1/2 bottom-[168px] z-20 px-6 min-h-[52px] rounded-full bg-stone-800 shadow-xl text-[16px] slidein"
          >
            Принести в примерочную ({s.cart.length})
          </button>
        )}

        <LooksStrip />

        {s.cartOpen && <CartSheet />}
        <ProductModal />
        <OrderSheet />
      </div>
    </div>
  );
}

function CartSheet() {
  const { cart, removeFromCart, setCartOpen, sendRequest, showToast } = useStore();
  const [busy, setBusy] = useState(false);
  const total = cart.reduce((n, c) => n + c.product.price, 0);

  const send = async () => {
    if (cart.some((c) => !c.size)) return showToast('Выберите размер', 'warn');
    setBusy(true);
    try {
      await sendRequest(cart.map((c) => ({ product_id: c.product.id, size: c.size })));
    } catch (e) {
      showToast(e.message, 'warn');
    }
    setBusy(false);
  };

  return (
    <div className="absolute inset-0 z-30 bg-black/40 flex items-end" onClick={() => setCartOpen(false)}>
      <div className="w-full rounded-t-[32px] bg-[#e9e4dc] text-stone-800 p-5 slidein" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xl font-semibold">Принести в примерочную</h3>
          <button onClick={() => setCartOpen(false)} aria-label="Закрыть" className="w-12 h-12 grid place-items-center rounded-full bg-white/70"><X /></button>
        </div>
        <div className="max-h-[420px] overflow-y-auto space-y-2">
          {cart.map((c, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/60 rounded-2xl p-2">
              <img src={c.product.image} alt="" className="w-14 h-[70px] rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="truncate">{c.product.name}</div>
                <div className="text-sm text-stone-500">Размер {c.size} · {formatPrice(c.product.price)}</div>
              </div>
              <button onClick={() => removeFromCart(i)} aria-label="Убрать" className="w-12 h-12 grid place-items-center"><X size={18} /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between mt-4">
          <b>Итого: {formatPrice(total)}</b>
          <button disabled={busy} onClick={send} className="px-6 min-h-[52px] rounded-2xl bg-stone-800 text-white disabled:opacity-50">
            Отправить заявку
          </button>
        </div>
      </div>
    </div>
  );
}
