import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { api } from '../api.js';
import { createSocket } from '../socket.js';

const REQ_FLOW = { new: ['accepted', 'Принять'], accepted: ['delivered', 'Принёс'] };
const ASSIST_FLOW = { new: ['accepted', 'Иду'], accepted: ['done', 'Готово'] };
const REQ_LABEL = { new: 'Новая', accepted: 'Принята', delivered: 'Доставлена', cancelled: 'Отменена' };
const ASSIST_LABEL = { new: 'Новый', accepted: 'Иду', done: 'Выполнен' };
const reqActive = (r) => r.status === 'new' || r.status === 'accepted';
const assistActive = (a) => a.status !== 'done';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.value = 0.15;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
    o.onended = () => ctx.close();
  } catch { /* звук недоступен — не критично */ }
}

const waitMin = (iso, now) => Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
const upsert = (list, item) => (list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item]);

export default function Staff() {
  const [requests, setRequests] = useState([]);
  const [assists, setAssists] = useState([]);
  const [filter, setFilter] = useState('active');
  const [sound, setSound] = useState(true);
  const [now, setNow] = useState(Date.now());
  const [fresh, setFresh] = useState([]); // ключи карточек, которые только что пришли
  const [online, setOnline] = useState(true);
  const [error, setError] = useState('');
  const soundRef = useRef(sound);
  soundRef.current = sound;

  useEffect(() => {
    const load = () => api.queue().then((q) => { setRequests(q.requests); setAssists(q.assists); }).catch(() => setError('Не удалось загрузить очередь'));
    load();
    const mark = (key) => {
      setFresh((f) => [...f, key]);
      setTimeout(() => setFresh((f) => f.filter((k) => k !== key)), 3500);
      if (soundRef.current) beep();
    };
    const socket = createSocket({ role: 'staff' });
    socket.on('connect', () => { setOnline(true); load(); });
    socket.on('disconnect', () => setOnline(false));
    socket.on('request:new', (r) => { setRequests((l) => upsert(l, r)); mark(`r${r.id}`); });
    socket.on('assist:new', (a) => { setAssists((l) => upsert(l, a)); mark(`a${a.id}`); });
    socket.on('request:updated', (r) => setRequests((l) => upsert(l, r)));
    socket.on('assist:updated', (a) => setAssists((l) => upsert(l, a)));
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => { socket.close(); clearInterval(tick); };
  }, []);

  const act = async (fn) => {
    try { setError(''); await fn(); } catch (e) { setError(e.message); }
  };

  const show = (active) => (filter === 'active' ? active : !active);
  const reqs = requests.filter((r) => show(reqActive(r))).sort((a, b) => a.id - b.id);
  const calls = assists.filter((a) => show(assistActive(a))).sort((a, b) => a.id - b.id);
  const activeCount = requests.filter(reqActive).length + assists.filter(assistActive).length;

  return (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(160deg,#9a958d,#8f8a82 55%,#837e76)' }}>
      <header className="flex flex-wrap items-center gap-4 px-6 py-4">
        <div className="text-3xl font-bold tracking-[0.18em]">LIME</div>
        <div className="font-light opacity-90">Панель консультанта</div>
        <span className="px-3 py-1 rounded-full bg-white/90 text-stone-700 text-sm font-semibold">Активных задач: {activeCount}</span>
        <div className="ml-auto flex items-center gap-2">
          {['active', 'done'].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-4 min-h-[44px] ${filter === f ? 'pill-active font-semibold' : 'glass'}`}>
              {f === 'active' ? 'Активные' : 'Выполненные'}
            </button>
          ))}
          <button onClick={() => setSound(!sound)} aria-label="Звук" className="glass rounded-full w-11 h-11 grid place-items-center">
            {sound ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
        </div>
      </header>

      {!online && <div className="mx-6 mb-2 px-4 py-2 rounded-xl bg-amber-600/95 text-sm">Нет связи, пробуем снова</div>}
      {error && <div className="mx-6 mb-2 px-4 py-2 rounded-xl bg-red-700/90 text-sm">{error}</div>}

      <main className="grid md:grid-cols-2 gap-6 px-6 pb-8">
        <Column title="Заявки на вещи" empty="Заявок нет" count={reqs.length}>
          {reqs.map((r) => {
            const min = waitMin(r.created_at, now);
            const late = reqActive(r) && min >= 3;
            return (
              <Card key={r.id} late={late} fresh={fresh.includes(`r${r.id}`)}>
                <CardHead room={r.room_id} min={min} status={REQ_LABEL[r.status]} />
                <div className="mt-3 space-y-2">
                  {r.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3">
                      <img src={it.image} alt="" className="w-12 h-14 rounded-lg object-cover bg-white/70" />
                      <div className="text-sm"><div>{it.name}</div><div className="opacity-70">Размер {it.size} · {it.color}</div></div>
                    </div>
                  ))}
                </div>
                {reqActive(r) && (
                  <div className="flex gap-2 mt-4">
                    {REQ_FLOW[r.status] && (
                      <button onClick={() => act(() => api.setRequest(r.id, REQ_FLOW[r.status][0]))} className="flex-1 min-h-[48px] rounded-2xl bg-white text-stone-800 font-semibold">
                        {REQ_FLOW[r.status][1]}
                      </button>
                    )}
                    <button onClick={() => act(() => api.setRequest(r.id, 'cancelled'))} className="px-4 min-h-[48px] rounded-2xl glass">Отменить</button>
                  </div>
                )}
              </Card>
            );
          })}
        </Column>

        <Column title="Вызовы консультанта" empty="Вызовов нет" count={calls.length}>
          {calls.map((a) => (
            <Card key={a.id} late={assistActive(a) && waitMin(a.created_at, now) >= 3} fresh={fresh.includes(`a${a.id}`)}>
              <CardHead room={a.room_id} min={waitMin(a.created_at, now)} status={ASSIST_LABEL[a.status]} />
              {ASSIST_FLOW[a.status] && (
                <button onClick={() => act(() => api.setAssist(a.id, ASSIST_FLOW[a.status][0]))} className="w-full mt-4 min-h-[48px] rounded-2xl bg-white text-stone-800 font-semibold">
                  {ASSIST_FLOW[a.status][1]}
                </button>
              )}
            </Card>
          ))}
        </Column>
      </main>
    </div>
  );
}

const Column = ({ title, count, empty, children }) => (
  <section>
    <h2 className="text-lg font-light mb-3">{title} <span className="opacity-70">({count})</span></h2>
    <div className="space-y-3">{count ? children : <div className="glass rounded-3xl p-6 text-center font-light opacity-80">{empty}</div>}</div>
  </section>
);

const Card = ({ late, fresh, children }) => (
  <div className={`rounded-3xl p-4 ${late ? 'bg-lime-accent/80 border border-white/40' : 'glass'} ${fresh ? 'flash' : ''}`}>{children}</div>
);

const CardHead = ({ room, min, status }) => (
  <div className="flex items-baseline justify-between">
    <div className="text-2xl font-semibold">Примерочная {room}</div>
    <div className="text-sm text-right"><div>{min < 1 ? 'только что' : `${min} мин`}</div><div className="opacity-80">{status}</div></div>
  </div>
);
