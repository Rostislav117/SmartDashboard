import { create } from 'zustand';
import { api } from './api.js';

// Зона надевания: у аксессуаров каждая вещь — своя зона, их можно комбинировать
export const zoneOf = (p) => (p.layer_z === 60 ? `60-${p.id}` : String(p.layer_z));

// Надеть/снять вещь с учётом зон. Платье (30) вытесняет низ (20) и верх (40) и наоборот.
export function applyWear(worn, product) {
  if (worn.some((p) => p.id === product.id)) return worn.filter((p) => p.id !== product.id);
  const z = product.layer_z;
  const conflicts = z === 30 ? ['20', '40'] : z === 20 || z === 40 ? ['30'] : [];
  const kill = new Set([zoneOf(product), ...conflicts]);
  return [...worn.filter((p) => !kill.has(zoneOf(p))), product];
}

let toastTimer;
const START_NAMES = ['Футболка базовая', 'Джинсы прямые', 'Кроссовки'];

export const useStore = create((set, get) => ({
  room: 1,
  categories: [],
  products: [],
  activeCategory: 'outerwear',
  worn: [],
  favorites: [],
  cart: [], // [{product, size}]
  looks: [],
  picked: [], // выбранное к заказу: 'look:<id>' или 'item:<id>'
  modalProduct: null,
  cartOpen: false,
  orderOpen: false,
  toast: null,
  connected: true,
  zoomed: false,

  init: async (room) => {
    set({ room });
    const [categories, products, looks] = await Promise.all([api.categories(), api.products(), api.looks(room)]);
    set({ categories, products, looks });
    get().resetKiosk();
  },
  refreshProducts: async () => set({ products: await api.products() }),
  upsertProduct: (p) => set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) })),

  startLook: () => {
    const { products } = get();
    return START_NAMES.map((n) => products.find((p) => p.name === n)).filter(Boolean);
  },
  // Режим киоска: возврат к исходному состоянию
  resetKiosk: () =>
    set({
      activeCategory: 'outerwear',
      worn: get().startLook(),
      cart: [],
      picked: [],
      modalProduct: null,
      cartOpen: false,
      orderOpen: false,
      zoomed: false,
    }),

  setCategory: (slug) => set({ activeCategory: slug }),
  wear: (product) => set((s) => ({ worn: applyWear(s.worn, product) })),
  setWorn: (worn) => set({ worn }),
  clearWorn: () => set({ worn: [] }),
  toggleFavorite: (id) =>
    set((s) => {
      const on = s.favorites.includes(id);
      return {
        favorites: on ? s.favorites.filter((x) => x !== id) : [...s.favorites, id],
        picked: on ? s.picked.filter((k) => k !== `item:${id}`) : s.picked,
      };
    }),
  openProduct: (p) => set({ modalProduct: p }),
  closeProduct: () => set({ modalProduct: null }),
  toggleZoom: () => set((s) => ({ zoomed: !s.zoomed })),

  addToCart: (product, size) =>
    set((s) =>
      s.cart.some((c) => c.product.id === product.id && c.size === size) ? s : { cart: [...s.cart, { product, size }] }
    ),
  removeFromCart: (i) => set((s) => ({ cart: s.cart.filter((_, j) => j !== i) })),
  setCartOpen: (cartOpen) => set({ cartOpen }),
  setOrderOpen: (orderOpen) => set({ orderOpen }),

  // Отправка заявки: items — [{product_id, size}]
  sendRequest: async (items) => {
    await api.createRequest(get().room, items);
    set({ cart: [], cartOpen: false, orderOpen: false, picked: [] });
  },

  saveLook: async () => {
    const { room, worn, looks } = get();
    if (!worn.length) throw new Error('Наденьте что-нибудь, чтобы сохранить образ');
    const look = await api.saveLook(room, worn.map((p) => p.id), `Образ ${looks.length + 1}`);
    set({ looks: [...looks, look] });
  },
  deleteLook: async (id) => {
    await api.deleteLook(id);
    set((s) => ({ looks: s.looks.filter((l) => l.id !== id), picked: s.picked.filter((x) => x !== `look:${id}`) }));
  },
  // Выбор образа или отдельной вещи для заказа; выбранное сразу надевается на аватар
  togglePick: (key) => {
    const { picked, products, looks, worn } = get();
    if (picked.includes(key)) return set({ picked: picked.filter((k) => k !== key) });
    const [type, id] = key.split(':');
    const byId = (i) => products.find((p) => p.id === i);
    if (type === 'look') {
      const look = looks.find((l) => l.id === Number(id));
      set({ worn: look.product_ids.map(byId).filter(Boolean), picked: [...picked, key] });
    } else {
      const p = byId(Number(id));
      set({ worn: worn.some((w) => w.id === p.id) ? worn : applyWear(worn, p), picked: [...picked, key] });
    }
  },
  // Уникальные товары из выбранных образов и вещей
  pickedProducts: () => {
    const { picked, products, looks, favorites } = get();
    const ids = [];
    for (const key of picked) {
      const [type, id] = key.split(':');
      if (type === 'look') ids.push(...(looks.find((l) => l.id === Number(id))?.product_ids || []));
      else if (favorites.includes(Number(id))) ids.push(Number(id));
    }
    return [...new Set(ids)].map((i) => products.find((p) => p.id === i)).filter(Boolean);
  },

  showToast: (text, kind = 'info') => {
    clearTimeout(toastTimer);
    set({ toast: { text, kind } });
    toastTimer = setTimeout(() => set({ toast: null }), 4000);
  },
  setConnected: (connected) => set({ connected }),
}));
