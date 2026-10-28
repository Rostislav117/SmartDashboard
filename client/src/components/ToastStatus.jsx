import { WifiOff } from 'lucide-react';
import { useStore } from '../store.js';

export default function ToastStatus() {
  const { toast, connected } = useStore();
  return (
    <div className="absolute top-[88px] left-0 right-0 z-40 flex flex-col items-center gap-2 pointer-events-none">
      {!connected && (
        <div className="px-4 py-2 rounded-full bg-amber-600/95 text-sm flex items-center gap-2 slidein">
          <WifiOff size={16} /> Нет связи, пробуем снова
        </div>
      )}
      {toast && (
        <div key={toast.text} className={`px-5 py-3 rounded-full text-[15px] shadow-lg slidein ${toast.kind === 'warn' ? 'bg-amber-600/95' : 'bg-stone-800/90'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
