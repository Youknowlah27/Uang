import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {FontLoader} from '../common/fonts';
import {Captions, CaptionSkin} from '../common/Captions';
import {Scene} from '../common/Scene';
import {clamp, pop, prog, rnd, fmt} from '../common/anim';

/**
 * STYLE PACK 3 — "Paper Cutout"
 * Everything is a physical piece of card: torn edges, paper grain, hard + soft drop shadows, tape, stamps.
 * Motion is stepped at 15 fps with per-piece wobble so it reads as hand-moved stop-motion.
 */
const P = {
  white: '#FBF8F1', ink: '#2B2A33', navy: '#1F3A5F', orange: '#F28C28', green: '#7DB83A', red: '#E04B3C', yellow: '#F6C945', teal: '#2E9CA6', pink: '#EE7F9B', gray: '#C9C2B8', cream: '#F2E8D0',
};
const BOW = 'Bowlby, Impact, sans-serif';
const HAND = 'Caveat, cursive';

const tear = (w: number, h: number, seed: number, amp = 5, step = 15) => {
  const pts: string[] = [];
  const j = (k: number) => rnd(seed * 13.7 + k) * amp;
  let k = 0;
  for (let x = 0; x < w; x += step) pts.push(`${x}px ${j(k++)}px`);
  for (let y = 0; y < h; y += step) pts.push(`${w - j(k++)}px ${y}px`);
  for (let x = w; x > 0; x -= step) pts.push(`${x}px ${h - j(k++)}px`);
  for (let y = h; y > 0; y -= step) pts.push(`${j(k++)}px ${y}px`);
  return `polygon(${pts.join(',')})`;
};

type PaperProps = {
  x: number; y: number; w: number; h: number; color: string; seed?: number; rot?: number; scale?: number; opacity?: number;
  amp?: number; shadow?: number; origin?: string; wobble?: number; children?: React.ReactNode; style?: React.CSSProperties; round?: number | string;
};
const Paper: React.FC<PaperProps> = ({x, y, w, h, color, seed = 1, rot = 0, scale = 1, opacity = 1, amp = 5, shadow = 9, origin = 'center', wobble = 1, children, style, round}) => {
  const f = useCurrentFrame();
  const q = Math.floor(f / 3);
  const jr = (rnd(seed * 7 + q) - 0.5) * 1.6 * wobble, jx = (rnd(seed * 3 + q) - 0.5) * 4 * wobble, jy = (rnd(seed * 5 + q) - 0.5) * 4 * wobble;
  const poly = useMemo(() => tear(w, h, seed, amp), [w, h, seed, amp]);
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width: w, height: h, opacity, transformOrigin: origin,
      transform: `translate(${jx}px, ${jy}px) rotate(${rot + jr}deg) scale(${scale})`,
      filter: `drop-shadow(0 ${shadow}px 0 rgba(70,45,20,0.20)) drop-shadow(0 ${shadow * 2}px 12px rgba(40,25,10,0.30))`, ...style,
    }}>
      <div style={{
        position: 'absolute', inset: 0, clipPath: round ? undefined : poly, borderRadius: round, backgroundColor: color,
        backgroundImage: `url(${staticFile('tex/paper_white.jpg')})`, backgroundBlendMode: 'multiply', backgroundSize: '512px 512px',
      }} />
      <div style={{position: 'absolute', inset: 0}}>{children}</div>
    </div>
  );
};

const Center: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', ...style}}>{children}</div>
);

const Chip: React.FC<{x: number; y: number; size: number; dim?: number; scale?: number}> = ({x, y, size, dim = 1, scale = 1}) => {
  const pins = [0, 1, 2, 3, 4, 5];
  const u = size / 300;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: size, height: size, opacity: dim, transform: `scale(${scale})`}}>
      {pins.map((i) => (
        <React.Fragment key={i}>
          <Paper x={(48 + i * 40) * u} y={0} w={22 * u} h={52 * u} color={P.yellow} seed={20 + i} amp={1} shadow={3} wobble={0.4} />
          <Paper x={(48 + i * 40) * u} y={248 * u} w={22 * u} h={52 * u} color={P.yellow} seed={30 + i} amp={1} shadow={3} wobble={0.4} />
          <Paper x={0} y={(48 + i * 40) * u} w={52 * u} h={22 * u} color={P.yellow} seed={40 + i} amp={1} shadow={3} wobble={0.4} />
          <Paper x={248 * u} y={(48 + i * 40) * u} w={52 * u} h={22 * u} color={P.yellow} seed={50 + i} amp={1} shadow={3} wobble={0.4} />
        </React.Fragment>
      ))}
      <Paper x={36 * u} y={36 * u} w={228 * u} h={228 * u} color={P.ink} seed={9} amp={3} shadow={8} />
      <Paper x={90 * u} y={90 * u} w={120 * u} h={120 * u} color={P.teal} seed={11} amp={2} shadow={4} />
    </div>
  );
};

const Tape: React.FC<{x: number; y: number; rot?: number; w?: number}> = ({x, y, rot = -6, w = 190}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: 56, background: 'rgba(246,201,69,0.72)', transform: `rotate(${rot}deg)`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', clipPath: 'polygon(0 8%,4% 0,8% 10%,12% 0,100% 0,100% 100%,92% 92%,88% 100%,4% 100%,0 92%)'}} />
);

/* ------------------------------ scenes ------------------------------ */

const Hook: React.FC = () => (
  <Scene id="hook">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const wrong = pop(g, wf(7) - 2, 9, 200, 0.7);
    const xP = pop(g, wf(6) + 2, 12, 200, 0.6);
    return (
      <>
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - prog(g, 0, 14)) * -80}px)`, opacity: prog(g, 0, 8)}}>
          <Chip x={390} y={190} size={300} dim={interpolate(f, [wf(6), wf(6) + 8], [1, 0.45], clamp)} />
          <Paper x={290} y={310} w={500} h={60} color={P.red} seed={61} rot={38} scale={xP} amp={2} opacity={xP > 0 ? 1 : 0}> </Paper>
          <Paper x={290} y={310} w={500} h={60} color={P.red} seed={62} rot={-38} scale={xP} amp={2} opacity={xP > 0 ? 1 : 0}> </Paper>
        </div>
        <Paper x={70} y={560} w={560} h={100} color={P.white} seed={3} rot={-2.5} opacity={prog(g, wf(0), 8)} scale={0.9 + 0.1 * prog(g, wf(0), 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 52, color: P.ink, letterSpacing: 1}}>EVERYONE THINKS</span></Center>
        </Paper>
        <Paper x={90} y={690} w={900} h={140} color={P.navy} seed={4} rot={1.2} opacity={pop(g, wf(2), 12) > 0.05 ? 1 : 0} scale={0.5 + 0.5 * pop(g, wf(2), 12, 180)}>
          <Center><span style={{fontFamily: BOW, fontSize: 104, color: P.white}}>NVIDIA WINS</span></Center>
        </Paper>
        <Paper x={150} y={850} w={760} h={140} color={P.orange} seed={5} rot={-1.4} opacity={pop(g, wf(4), 12) > 0.05 ? 1 : 0} scale={0.5 + 0.5 * pop(g, wf(4), 12, 180)}>
          <Center><span style={{fontFamily: BOW, fontSize: 104, color: P.ink}}>ON CHIPS</span></Center>
        </Paper>
        <Paper x={120} y={700} w={840} h={300} color={P.red} seed={8} rot={-9} scale={0.5 + 0.5 * wrong + 0.35 * (1 - wrong)} opacity={interpolate(f, [wf(7) - 3, wf(7)], [0, 1], clamp)} amp={7} shadow={14}>
          <Center><span style={{fontFamily: BOW, fontSize: 210, color: P.white, letterSpacing: 2}}>WRONG!</span></Center>
        </Paper>
      </>
    );
  }}</Scene>
);

const Rivals: React.FC = () => (
  <Scene id="rivals">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const rows = [
      {name: 'AMD', prod: 'Instinct GPUs', at: wf(0), col: P.orange, rot: -1.5},
      {name: 'Google', prod: 'TPU', at: wf(1), col: P.teal, rot: 1.2},
      {name: 'Amazon', prod: 'Trainium', at: wf(3), col: P.yellow, rot: -0.8},
    ];
    return (
      <>
        <Paper x={70} y={280} w={700} h={110} color={P.white} seed={14} rot={-2} opacity={prog(g, 0, 8)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 74, color: P.ink}}>who else builds AI chips?</span></Center>
        </Paper>
        {rows.map((r, i) => {
          const p = pop(g, r.at - 2, 12, 150, 0.9);
          return (
            <Paper key={r.name} x={70} y={450 + i * 200} w={940} h={160} color={r.col} seed={20 + i} rot={r.rot} opacity={p > 0.02 ? 1 : 0} style={{transform: undefined}} origin="left center" scale={0.6 + 0.4 * p}>
              <div style={{position: 'absolute', left: 36, top: 52, width: 56, height: 56, borderRadius: 28, background: P.white, boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.35)'}} />
              <div style={{position: 'absolute', left: 130, top: 28, fontFamily: BOW, fontSize: 84, color: P.ink}}>{r.name}</div>
              <div style={{position: 'absolute', right: 40, top: 52, fontFamily: HAND, fontWeight: 700, fontSize: 68, color: P.ink}}>{r.prod}</div>
            </Paper>
          );
        })}
        <Paper x={560} y={1050} w={440} h={100} color={P.white} seed={30} rot={3} opacity={prog(g, wf(6), 8)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 62, color: P.red}}>all of them fast!</span></Center>
        </Paper>
      </>
    );
  }}</Scene>
);

const wedge = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`;
};

const Money: React.FC = () => (
  <Scene id="money">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const t0 = wf(5) - 4;
    const p = interpolate(g, [t0, t0 + 30], [0, 1], clamp);
    const share = 193.7 / 215.938;
    const a0 = -Math.PI / 2;
    const aSplit = a0 + 2 * Math.PI * share * p;
    const small = pop(g, t0 + 28, 12, 200, 0.7);
    const mid = aSplit + (2 * Math.PI * (1 - share)) / 2;
    const cx = 540, cy = 640, R = 230;
    const shown = Math.round(90 * p);
    return (
      <>
        <Paper x={70} y={250} w={940} h={100} color={P.white} seed={40} rot={-1} opacity={prog(g, 0, 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 46, color: P.ink}}>NVIDIA FY2026 REVENUE: $215.9B</span></Center>
        </Paper>
        <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 12px 0 rgba(70,45,20,0.22)) drop-shadow(0 22px 14px rgba(40,25,10,0.3))', opacity: prog(g, 4, 8)}}>
          <defs>
            <pattern id="ptex" width="512" height="512" patternUnits="userSpaceOnUse"><image href={staticFile('tex/paper_white.jpg')} width="512" height="512" /></pattern>
          </defs>
          {p > 0.01 && <path d={wedge(cx, cy, R, a0, aSplit)} fill={P.green} />}
          {p > 0.01 && <path d={wedge(cx, cy, R, a0, aSplit)} fill="url(#ptex)" style={{mixBlendMode: 'multiply'}} />}
          {small > 0.02 && (
            <g transform={`translate(${Math.cos(mid) * 26 * small}, ${Math.sin(mid) * 26 * small})`}>
              <path d={wedge(cx, cy, R, aSplit, a0 + 2 * Math.PI)} fill={P.gray} />
              <path d={wedge(cx, cy, R, aSplit, a0 + 2 * Math.PI)} fill="url(#ptex)" style={{mixBlendMode: 'multiply'}} />
            </g>
          )}
        </svg>
        <Paper x={290} y={560} w={500} h={210} color={P.white} seed={44} rot={-4} opacity={prog(g, t0, 6)} scale={0.8 + 0.2 * prog(g, t0, 10)}>
          <Center><span style={{fontFamily: BOW, fontSize: 168, color: P.ink, fontVariantNumeric: 'tabular-nums'}}>{shown}<span style={{color: P.green}}>%</span></span></Center>
        </Paper>
        <Paper x={70} y={930} w={560} h={96} color={P.green} seed={46} rot={-1.5} opacity={prog(g, wf(10), 8)} scale={0.9 + 0.1 * prog(g, wf(10), 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 40, color: P.ink}}>DATA CENTER $193.7B</span></Center>
        </Paper>
        <Paper x={420} y={1040} w={590} h={90} color={P.gray} seed={47} rot={1.2} opacity={prog(g, wf(11) + 4, 8)} scale={0.9 + 0.1 * prog(g, wf(11) + 4, 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 36, color: P.ink}}>EVERYTHING ELSE $22.2B</span></Center>
        </Paper>
        <div style={{position: 'absolute', left: 70, top: 1140, fontFamily: HAND, fontWeight: 700, fontSize: 40, color: 'rgba(43,42,51,0.75)', opacity: prog(g, 18, 10)}}>source: NVIDIA FY2026 results</div>
      </>
    );
  }}</Scene>
);

const CODE = ['__global__ void add(', '    float* a, float* b, float* c) {', '  int i = threadIdx.x;', '  c[i] = a[i] + b[i];', '}'];

const Cuda: React.FC = () => (
  <Scene id="cuda">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const total = CODE.join('\n').length;
    const typed = Math.floor(total * prog(g, wf(2), wf(7) + 14 - wf(2)));
    let left = typed;
    const lines = CODE.map((l) => {
      const n = Math.max(0, Math.min(l.length, left));
      left -= l.length + 1;
      return l.slice(0, n);
    });
    const letters = [
      {c: 'C', col: P.red, rot: -5, tc: P.white},
      {c: 'U', col: P.yellow, rot: 4, tc: P.ink},
      {c: 'D', col: P.teal, rot: -3, tc: P.white},
      {c: 'A', col: P.orange, rot: 5, tc: P.ink},
    ];
    const cal = pop(g, wf(4) - 1, 12, 160, 0.8);
    return (
      <>
        <Paper x={70} y={250} w={440} h={340} color={P.white} seed={60} rot={-3} opacity={cal > 0.02 ? 1 : 0} scale={0.6 + 0.4 * cal} origin="left top">
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 100, background: P.red}} />
          {[90, 220, 350].map((x) => <div key={x} style={{position: 'absolute', left: x, top: 24, width: 26, height: 26, borderRadius: 13, background: P.white, boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.4)'}} />)}
          <div style={{position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', fontFamily: BOW, fontSize: 150, color: P.ink}}>2006</div>
          <div style={{position: 'absolute', left: 0, right: 0, top: 268, textAlign: 'center', fontFamily: HAND, fontWeight: 700, fontSize: 48, color: P.red}}>CUDA announced</div>
        </Paper>
        <Paper x={560} y={300} w={450} h={150} color={P.yellow} seed={61} rot={4} opacity={prog(g, wf(3) - 2, 8)} scale={0.8 + 0.2 * prog(g, wf(3) - 2, 10)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 96, color: P.ink}}>software!</span></Center>
        </Paper>
        {letters.map((l, i) => {
          const p = pop(g, wf(7) - 3 + i * 3, 10, 200, 0.7);
          return (
            <Paper key={l.c} x={70 + i * 238} y={640} w={214} h={240} color={l.col} seed={70 + i} rot={l.rot} opacity={p > 0.02 ? 1 : 0} scale={0.3 + 0.7 * p} amp={4}>
              <Center><span style={{fontFamily: BOW, fontSize: 190, color: l.tc}}>{l.c}</span></Center>
            </Paper>
          );
        })}
        <Paper x={70} y={910} w={940} h={290} color={P.cream} seed={80} rot={-0.8} opacity={prog(g, 4, 8)} amp={3}>
          {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 62 + i * 46, height: 2, background: 'rgba(60,110,190,0.28)'}} />)}
          <pre style={{position: 'absolute', left: 36, top: 30, margin: 0, fontFamily: 'JBMono, monospace', fontWeight: 500, fontSize: 31, lineHeight: '46px', color: P.ink, whiteSpace: 'pre'}}>{lines.join('\n')}</pre>
        </Paper>
        <Tape x={430} y={880} rot={-3} />
      </>
    );
  }}</Scene>
);

const Person: React.FC<{col: string}> = ({col}) => (
  <svg width="56" height="76" viewBox="0 0 56 76">
    <circle cx="28" cy="16" r="14" fill={col} />
    <path d="M6 70 C6 42, 18 34, 28 34 C38 34, 50 42, 50 70 Z" fill={col} />
  </svg>
);

const Devs: React.FC = () => (
  <Scene id="devs">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const t0 = wf(1) - 2;
    const p = interpolate(g, [t0, t0 + 44], [0, 1], clamp);
    const cols = [P.green, '#6AA52F', '#93C94E'];
    return (
      <>
        <Paper x={70} y={260} w={760} h={290} color={P.white} seed={90} rot={-2.5} opacity={prog(g, 2, 8)} scale={0.85 + 0.15 * prog(g, 2, 10)}>
          <Center><span style={{fontFamily: BOW, fontSize: 230, color: P.ink, fontVariantNumeric: 'tabular-nums'}}>{fmt(6 * p, 1)}<span style={{color: P.green}}>M</span></span></Center>
        </Paper>
        <Paper x={400} y={560} w={600} h={96} color={P.orange} seed={92} rot={2.5} opacity={prog(g, wf(3), 8)} scale={0.9 + 0.1 * prog(g, wf(3), 10)}>
          <Center><span style={{fontFamily: BOW, fontSize: 52, color: P.ink}}>DEVELOPERS</span></Center>
        </Paper>
        <div style={{position: 'absolute', left: 60, top: 690, width: 960, height: 440, filter: 'drop-shadow(0 6px 0 rgba(70,45,20,0.22)) drop-shadow(0 12px 8px rgba(40,25,10,0.28))'}}>
          {Array.from({length: 60}).map((_, i) => {
            const col = i % 10, row = Math.floor(i / 10);
            const s = pop(g, t0 + (i / 60) * 40, 14, 240, 0.5);
            const jr = (rnd(i * 3 + Math.floor(f / 3)) - 0.5) * 6;
            return (
              <div key={i} style={{position: 'absolute', left: col * 94 + 10, top: row * 74, transform: `scale(${s}) rotate(${jr}deg)`, opacity: s > 0.02 ? 1 : 0}}>
                <div style={{transform: 'scale(0.82)', transformOrigin: 'top left'}}><Person col={cols[i % 3]} /></div>
              </div>
            );
          })}
        </div>
        <div style={{position: 'absolute', left: 70, top: 1150, fontFamily: HAND, fontWeight: 700, fontSize: 40, color: 'rgba(43,42,51,0.75)', opacity: prog(g, 20, 10)}}>1 figure = 100k developers · source: NVIDIA GTC 2026</div>
      </>
    );
  }}</Scene>
);

const Switch: React.FC = () => (
  <Scene id="switch">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const stamp = pop(g, wf(3), 9, 200, 0.7);
    const arrow = pop(g, wf(1), 12, 160, 0.8);
    return (
      <>
        {[0, 1, 2, 3, 4].map((i) => (
          <Paper key={i} x={70 + i * 6} y={380 + i * 8} w={380} h={470} color={P.white} seed={100 + i} rot={-4 + i * 2.2} opacity={prog(g, 2 + i * 2, 8)} amp={4}>
            {i === 4 && (
              <>
                <div style={{position: 'absolute', left: 28, top: 22, fontFamily: BOW, fontSize: 44, color: P.ink}}>CUDA CODE</div>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <div key={k} style={{position: 'absolute', left: 28, top: 100 + k * 44, height: 14, borderRadius: 7, width: 320 * (0.45 + 0.5 * rnd(k + 3)), background: P.green}} />)}
              </>
            )}
          </Paper>
        ))}
        <Paper x={470} y={560} w={150} h={150} color={P.orange} seed={110} rot={0} opacity={arrow > 0.02 ? 1 : 0} scale={0.3 + 0.7 * arrow} amp={2} style={{clipPath: undefined}}>
          <Center><span style={{fontFamily: BOW, fontSize: 110, color: P.ink}}>→</span></Center>
        </Paper>
        <Paper x={640} y={380} w={380} h={470} color={P.white} seed={120} rot={3} opacity={prog(g, wf(1), 8)} amp={4}>
          <div style={{position: 'absolute', left: 28, top: 22, fontFamily: BOW, fontSize: 44, color: P.ink}}>NEW CHIP</div>
          <div style={{position: 'absolute', left: 24, right: 24, top: 100, bottom: 30, border: `4px dashed ${P.red}`, borderRadius: 6}} />
        </Paper>
        <Paper x={600} y={520} w={440} h={170} color={P.red} seed={130} rot={-11} opacity={interpolate(f, [wf(3) - 3, wf(3)], [0, 1], clamp)} scale={0.5 + 0.5 * stamp + 0.35 * (1 - stamp)} amp={6} shadow={12}>
          <Center><span style={{fontFamily: BOW, fontSize: 84, color: P.white}}>REWRITE!</span></Center>
        </Paper>
        <Paper x={70} y={920} w={420} h={90} color={P.yellow} seed={140} rot={-2} opacity={prog(g, wf(4), 8)} scale={0.9 + 0.1 * prog(g, wf(4), 10)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 56, color: P.ink}}>years of code…</span></Center>
        </Paper>
      </>
    );
  }}</Scene>
);

const Payoff: React.FC = () => (
  <Scene id="payoff">{({f, wf}) => {
    const g = Math.floor(f / 2) * 2;
    const strike = pop(g, wf(4) + 2, 10, 200, 0.6);
    const code = pop(g, wf(5) - 2, 10, 170, 0.8);
    const icon = pop(g, wf(5) + 6, 10, 180, 0.7);
    return (
      <>
        <Paper x={70} y={290} w={940} h={330} color={P.navy} seed={150} rot={-1.2} opacity={prog(g, 0, 8)} scale={0.9 + 0.1 * prog(g, 0, 10)} amp={5}>
          <div style={{position: 'absolute', left: 50, top: 36, fontFamily: BOW, fontSize: 92, color: P.white, lineHeight: 1.1}}>
            THE MOAT ISN'T
            <div style={{position: 'relative', display: 'inline-block', marginTop: 8}}>
              <span style={{opacity: 1 - 0.45 * strike}}>THE CHIP</span>
              <div style={{position: 'absolute', left: -10, top: '50%', height: 18, width: `${strike * 106}%`, background: P.red, transform: 'rotate(-2deg)'}} />
            </div>
          </div>
        </Paper>
        <Paper x={70} y={690} w={940} h={250} color={P.green} seed={160} rot={1.4} opacity={code > 0.02 ? 1 : 0} scale={0.5 + 0.5 * code + 0.2 * (1 - code)} amp={6} shadow={13}>
          <Center><span style={{fontFamily: BOW, fontSize: 112, color: P.ink}}>IT'S THE CODE</span></Center>
        </Paper>
        <Paper x={70} y={990} w={180} h={150} color={P.yellow} seed={170} rot={-6} opacity={icon > 0.02 ? 1 : 0} scale={0.3 + 0.7 * icon} amp={3}>
          <Center><span style={{fontFamily: 'JBMono, monospace', fontWeight: 700, fontSize: 70, color: P.ink}}>{'</>'}</span></Center>
        </Paper>
      </>
    );
  }}</Scene>
);

/* ------------------------------ composition ------------------------------ */

const skin: CaptionSkin = {
  top: 1255, fontSize: 58, fontFamily: BOW, weight: 400, letterSpacing: 0.5, maxWords: 3, gap: 16, uppercase: true,
  chunk: () => ({background: P.white, padding: '14px 30px 18px', boxShadow: '0 10px 0 rgba(70,45,20,0.25), 0 20px 24px rgba(40,25,10,0.25)', transform: 'rotate(-1deg)'}),
  word: ({active}) => ({
    color: P.ink, position: 'relative', padding: '0 8px',
    background: active ? P.yellow : 'transparent',
    opacity: active ? 1 : 0.62,
  }),
};

export const PaperCutout: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#E2CDA8'}}>
      <FontLoader />
      <div style={{position: 'absolute', inset: -40, transform: `translate(${Math.sin(f / 140) * 10}px, ${Math.cos(f / 170) * 8}px) scale(${1.02 + f * 0.00004})`}}>
        <Img src={staticFile('tex/kraft.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
      </div>
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(60,35,10,0.35) 100%)'}} />
      <Hook /><Rivals /><Money /><Cuda /><Devs /><Switch /><Payoff />
      <Captions skin={skin} />
      <Audio src={staticFile('voice.mp3')} />
    </AbsoluteFill>
  );
};
