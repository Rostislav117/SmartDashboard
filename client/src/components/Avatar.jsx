import { useStore } from '../store.js';

const SKIN = '#f0d2bf';
const BASE = '#cfc7bb';

// Базовый силуэт модели (SVG в коде). Центр x=270, сцена 540×960.
function Body() {
  const sym = (pts) => {
    const right = [...pts].reverse().map(([x, y]) => [540 - x, y]);
    return 'M' + [...pts, ...right].map((p) => p.join(',')).join(' L') + ' Z';
  };
  return (
    <g>
      {/* руки */}
      <path d="M205,205 L178,470" stroke={SKIN} strokeWidth="30" strokeLinecap="round" />
      <path d="M335,205 L362,470" stroke={SKIN} strokeWidth="30" strokeLinecap="round" />
      {/* ноги */}
      <path d={sym([[218,500],[228,700],[236,845],[262,845],[268,520]])} fill={SKIN} />
      {/* торс с нейтральным бельём */}
      <path d={sym([[250,190],[205,198],[222,300],[226,410],[216,500],[270,500]])} fill={SKIN} />
      <path d={sym([[224,420],[216,500],[270,500]])} fill={BASE} />
      <path d={sym([[215,215],[222,290],[270,290]])} fill={BASE} opacity=".0" />
      {/* волосы сзади */}
      <path d="M232,110 Q226,60 270,58 Q314,60 308,110 Q320,170 312,230 Q300,262 270,240 Q240,262 228,230 Q220,170 232,110 Z" fill={HAIR_DARK} />
      {/* шея и лицо */}
      <rect x="256" y="160" width="28" height="40" rx="10" fill={SKIN} />
      <ellipse cx="270" cy="125" rx="33" ry="42" fill={SKIN} />
      <Face />
    </g>
  );
}

const HAIR = '#e6c27d';
const HAIR_DARK = '#c9a15c';

// Лицо: светлая кожа, веснушки, голубые глаза (по референсам)
function Face() {
  return (
    <g>
      <ellipse cx="258" cy="122" rx="5" ry="2.6" fill="#fff" />
      <ellipse cx="282" cy="122" rx="5" ry="2.6" fill="#fff" />
      <circle cx="258" cy="122" r="2.3" fill="#7d9bb5" />
      <circle cx="282" cy="122" r="2.3" fill="#7d9bb5" />
      <path d="M251,114 Q258,110 265,114 M275,114 Q282,110 289,114" stroke="#b8975a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M270,124 Q267,138 271,141" stroke="#d9b49d" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M262,153 Q270,157 278,153 Q270,151 262,153 Z" fill="#c9776c" />
      {[[252,134],[256,138],[261,133],[279,133],[284,138],[288,134],[266,130],[274,130],[257,128],[283,128]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.9" fill="#c98f6b" />
      ))}
    </g>
  );
}

// Передние пряди: рисуются поверх одежды, длинные волнистые локоны на плечи и грудь
function HairFront() {
  const lock = (d, w = 11) => <path d={d} stroke={HAIR} strokeWidth={w} fill="none" strokeLinecap="round" />;
  const hi = (d) => <path d={d} stroke={HAIR_DARK} strokeWidth="2" fill="none" strokeLinecap="round" opacity=".7" />;
  const L = 'M236,100 C224,130 240,150 228,180 C216,210 238,225 226,255 C220,272 232,282 238,288';
  const R = 'M304,100 C316,130 300,150 312,180 C324,210 302,225 314,255 C320,272 308,282 302,288';
  return (
    <g>
      {lock(L, 16)}{lock('M244,104 C236,140 250,160 240,195 C232,222 246,236 240,262', 11)}{hi(L)}
      {lock(R, 16)}{lock('M296,104 C304,140 290,160 300,195 C308,222 294,236 300,262', 11)}{hi(R)}
      {/* чёлка с пробором посередине */}
      <path d="M270,80 C246,82 234,104 234,128 C240,108 252,98 270,96 C288,98 300,108 306,128 C306,104 294,82 270,80 Z" fill={HAIR} />
      <path d="M270,80 V96" stroke={HAIR_DARK} strokeWidth="1.5" />
    </g>
  );
}

// Заготовка под virtual try-on: сейчас возвращает PNG/SVG-слои по порядку layer_z
export function renderLook(products) {
  return [...products]
    .sort((a, b) => a.layer_z - b.layer_z)
    .map((p) => <image key={p.id} href={p.layer} x="0" y="0" width="540" height="960" />);
}

export default function Avatar({ products, mini = false }) {
  const zoomed = useStore((s) => s.zoomed);
  const zoom = !mini && zoomed;
  return (
    <svg
      viewBox={mini ? '110 40 320 880' : '0 30 540 880'}
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      style={{ transition: 'transform .4s', transform: zoom ? 'scale(1.5)' : 'none', transformOrigin: '50% 35%' }}
    >
      <Body />
      {renderLook(products)}
      <HairFront />
    </svg>
  );
}
