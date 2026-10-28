import { Layers, Shirt, Waves, Ruler, Rows3, Triangle, Sparkles, Footprints, ShoppingBag, Circle } from 'lucide-react';
import { useStore } from '../store.js';

const ICONS = { Layers, Shirt, Waves, Ruler, Rows3, Triangle, Sparkles, Footprints, ShoppingBag };

export default function CategoryMenu() {
  const { categories, activeCategory, setCategory } = useStore();
  return (
    <nav className="flex flex-col gap-1.5 w-[150px] shrink-0 py-2">
      {categories.map((c) => {
        const Icon = ICONS[c.icon] || Circle;
        const active = c.slug === activeCategory;
        return (
          <button
            key={c.id}
            onClick={() => setCategory(c.slug)}
            className={`flex items-center gap-2.5 min-h-[52px] px-3 rounded-full text-left text-[15px] leading-tight transition ${
              active ? 'pill-active font-semibold' : 'text-white/90 font-light hover:bg-white/10'
            }`}
          >
            <Icon size={20} strokeWidth={1.5} className="shrink-0" />
            <span>{c.name}</span>
          </button>
        );
      })}
    </nav>
  );
}
