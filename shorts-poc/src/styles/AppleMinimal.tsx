import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame} from 'remotion';
import {DURATION, FPS} from '../common/timeline';
import {FontLoader} from '../common/fonts';
import {Captions, CaptionSkin} from '../common/Captions';
import {Scene} from '../common/Scene';
import {clamp, pop, prog, progIO, fmt} from '../common/anim';
import {interpolate} from 'remotion';

/**
 * STYLE PACK 1 — "Apple Minimal"
 * Near-black canvas, slow aurora gradients, film grain, giant Inter Display type, frosted-glass cards,
 * spring motion and blur-in reveals. Accent: system blue/orange/pink + NVIDIA green for the product.
 */
const C = {
  green: '#76B900', lime: '#B6F23B', blue: '#0A84FF', orange: '#FF9F0A', pink: '#FF375F', red: '#FF453A',
  dim: 'rgba(255,255,255,0.55)', faint: 'rgba(255,255,255,0.12)',
};
const DISPLAY = 'InterDisplay, Inter, sans-serif';

const blurIn = (p: number, dy = 36, blur = 14): React.CSSProperties => ({
  opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined,
});
const grad = (a: string, b: string): React.CSSProperties => ({
  background: `linear-gradient(100deg, ${a}, ${b})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent',
});

const Bg: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#050507'}}>
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(1000px 800px at ${24 + 8 * Math.sin(f / 90)}% ${16 + 4 * Math.cos(f / 70)}%, rgba(70,90,255,0.34), transparent 70%),
                     radial-gradient(1100px 900px at ${82 + 6 * Math.cos(f / 80)}% ${80 + 5 * Math.sin(f / 60)}%, rgba(255,80,60,0.22), transparent 70%),
                     radial-gradient(700px 600px at 50% 52%, rgba(120,60,255,0.10), transparent 70%)`,
      }} />
      <Img src={staticFile('tex/grain.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55, mixBlendMode: 'overlay'}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    </AbsoluteFill>
  );
};

const Glass: React.FC<{style?: React.CSSProperties; children?: React.ReactNode; radius?: number}> = ({style, children, radius = 44}) => (
  <div style={{
    position: 'absolute', borderRadius: radius, overflow: 'hidden',
    background: 'linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))',
    border: '1.5px solid rgba(255,255,255,0.20)',
    backdropFilter: 'blur(28px) saturate(160%)',
    boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.45)',
    ...style,
  }}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, transparent 38%)', pointerEvents: 'none'}} />
    {children}
  </div>
);

const Chip: React.FC<{size: number; color?: string; opacity?: number; style?: React.CSSProperties}> = ({size, color = '#fff', opacity = 1, style}) => {
  const pins = [0, 1, 2, 3, 4, 5];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{opacity, ...style}}>
      <defs>
        <linearGradient id="cg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.30" />
        </linearGradient>
      </defs>
      {pins.map((i) => (
        <React.Fragment key={i}>
          <rect x={40 + i * 24} y={6} width={9} height={30} rx={4.5} fill="url(#cg)" />
          <rect x={40 + i * 24} y={164} width={9} height={30} rx={4.5} fill="url(#cg)" />
          <rect x={6} y={40 + i * 24} width={30} height={9} rx={4.5} fill="url(#cg)" />
          <rect x={164} y={40 + i * 24} width={30} height={9} rx={4.5} fill="url(#cg)" />
        </React.Fragment>
      ))}
      <rect x={34} y={34} width={132} height={132} rx={30} fill="rgba(255,255,255,0.10)" stroke="url(#cg)" strokeWidth={3.5} />
      <rect x={68} y={68} width={64} height={64} rx={14} fill="url(#cg)" />
    </svg>
  );
};

const Tag: React.FC<{children: React.ReactNode; top: number; left?: number; p?: number}> = ({children, top, left = 70, p = 1}) => (
  <div style={{position: 'absolute', top, left, fontFamily: 'Inter', fontWeight: 600, fontSize: 30, letterSpacing: 5, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', opacity: p}}>{children}</div>
);

/* ------------------------------ scenes ------------------------------ */

const Hook: React.FC = () => (
  <Scene id="hook">{({f, wf}) => {
    const wrong = wf(7) - 2;
    const slam = pop(f, wrong, 11, 180, 0.7);
    const slash = prog(f, wf(6) + 4, 14);
    const headDim = interpolate(f, [wrong, wrong + 8], [1, 0.08], clamp);
    return (
      <>
        <div style={{position: 'absolute', top: 230 + Math.sin(f / 16) * 8, left: 390, ...blurIn(prog(f, 0, 18), 20, 10)}}>
          <Chip size={300} opacity={interpolate(f, [wf(6), wf(6) + 10], [1, 0.35], clamp)} />
          <div style={{position: 'absolute', left: 150 - 200 * slash, top: 150 - 7, width: 400 * slash, height: 14, borderRadius: 7, background: `linear-gradient(90deg, ${C.red}, ${C.pink})`, transform: 'rotate(-38deg)', transformOrigin: 'center', boxShadow: `0 0 30px ${C.red}`}} />
        </div>
        <div style={{position: 'absolute', left: 90, top: 590, opacity: headDim}}>
          <div style={{fontFamily: 'Inter', fontWeight: 600, fontSize: 62, color: C.dim, ...blurIn(prog(f, wf(0), 14), 24, 8)}}>Everyone thinks</div>
          <div style={{fontFamily: DISPLAY, fontWeight: 800, fontSize: 148, letterSpacing: -5, lineHeight: 1.0, color: '#fff', marginTop: 6, ...blurIn(prog(f, wf(2), 16))}}>Nvidia wins</div>
          <div style={{position: 'relative', display: 'inline-block', fontFamily: DISPLAY, fontWeight: 800, fontSize: 148, letterSpacing: -5, lineHeight: 1.05, color: '#fff', ...blurIn(prog(f, wf(4), 16))}}>
            on chips.
            <div style={{position: 'absolute', left: -12, top: '56%', height: 14, borderRadius: 7, width: `${slash * 106}%`, background: `linear-gradient(90deg, ${C.red}, ${C.pink})`}} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 300, letterSpacing: -10, transform: `scale(${0.7 + 0.3 * slam}) rotate(${(1 - slam) * -3}deg)`, opacity: interpolate(f, [wrong, wrong + 4], [0, 1], clamp), filter: `drop-shadow(0 20px 60px rgba(255,55,95,0.5))`, ...grad(C.orange, C.pink)}}>
          Wrong.
        </div>
      </>
    );
  }}</Scene>
);

const Rivals: React.FC = () => (
  <Scene id="rivals">{({f, wf}) => {
    const rows = [
      {name: 'AMD', prod: 'Instinct GPUs', at: wf(0), col: C.orange},
      {name: 'Google', prod: 'TPU', at: wf(1), col: C.blue},
      {name: 'Amazon', prod: 'Trainium', at: wf(3), col: C.pink},
    ];
    return (
      <>
        <Tag top={300} p={prog(f, 0, 12)}>AI accelerators</Tag>
        {rows.map((r, i) => {
          const p = pop(f, r.at - 2, 16, 150, 0.8);
          const check = pop(f, wf(6) + i * 4, 12, 200, 0.6);
          return (
            <Glass key={r.name} style={{left: 70, width: 940, top: 380 + i * 210, height: 180, opacity: p, transform: `translateY(${(1 - p) * 60}px) scale(${0.96 + 0.04 * p})`}}>
              <div style={{position: 'absolute', left: 40, top: 40, width: 100, height: 100, borderRadius: 30, background: `linear-gradient(145deg, ${r.col}, rgba(255,255,255,0.1))`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                <Chip size={70} />
              </div>
              <div style={{position: 'absolute', left: 175, top: 30, fontFamily: DISPLAY, fontWeight: 700, fontSize: 70, color: '#fff', letterSpacing: -2}}>{r.name}</div>
              <div style={{position: 'absolute', left: 178, top: 112, fontFamily: 'Inter', fontWeight: 500, fontSize: 38, color: C.dim}}>{r.prod}</div>
              <div style={{position: 'absolute', right: 44, top: 46, width: 88, height: 88, borderRadius: 44, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${check})`, boxShadow: '0 0 40px rgba(118,185,0,0.55)'}}>
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </div>
            </Glass>
          );
        })}
      </>
    );
  }}</Scene>
);

const Money: React.FC = () => (
  <Scene id="money">{({f, wf}) => {
    const t0 = wf(5) - 4;
    const p = progIO(f, t0, 30);
    const R = 230, CIRC = 2 * Math.PI * R, share = 193.7 / 215.938;
    const shown = Math.round(90 * p);
    return (
      <>
        <Tag top={190} p={prog(f, 0, 12)}>NVIDIA · fiscal 2026 revenue</Tag>
        <div style={{position: 'absolute', top: 245, left: 70, fontFamily: DISPLAY, fontWeight: 700, fontSize: 78, color: '#fff', letterSpacing: -2, ...blurIn(prog(f, 4, 16), 20, 8)}}>$215.9B</div>
        <div style={{position: 'absolute', left: 540 - 260, top: 400, width: 520, height: 520, ...blurIn(prog(f, 6, 18), 30, 10)}}>
          <svg width="520" height="520" viewBox="0 0 520 520" style={{transform: 'rotate(-90deg)'}}>
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.green} /><stop offset="1" stopColor={C.lime} /></linearGradient>
            </defs>
            <circle cx="260" cy="260" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="56" />
            <circle cx="260" cy="260" r={R} fill="none" stroke="url(#ring)" strokeWidth="56" strokeLinecap="round" strokeDasharray={`${CIRC * share * p} ${CIRC}`} style={{filter: 'drop-shadow(0 0 22px rgba(118,185,0,0.55))'}} />
          </svg>
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 190, letterSpacing: -8, color: '#fff', fontVariantNumeric: 'tabular-nums'}}>
            {shown}<span style={{fontSize: 96, marginLeft: 4, color: C.dim}}>%</span>
          </div>
        </div>
        {[
          {col: C.green, label: 'Data Center', val: '$193.7B', at: wf(10)},
          {col: 'rgba(255,255,255,0.35)', label: 'Everything else', val: '$22.2B', at: wf(11) + 6},
        ].map((r, i) => (
          <div key={i} style={{position: 'absolute', left: 120, right: 120, top: 960 + i * 70, display: 'flex', alignItems: 'center', fontFamily: 'Inter', fontSize: 44, color: '#fff', ...blurIn(prog(f, r.at, 14), 16, 6)}}>
            <div style={{width: 28, height: 28, borderRadius: 14, background: r.col, marginRight: 22}} />
            <div style={{fontWeight: 600, flex: 1}}>{r.label}</div>
            <div style={{fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{r.val}</div>
          </div>
        ))}
        <Tag top={1385} p={prog(f, 20, 14) * 0.9}>Source: NVIDIA FY2026 results</Tag>
      </>
    );
  }}</Scene>
);

const CODE = [
  '__global__ void add(',
  '    float* a, float* b, float* c) {',
  '  int i = threadIdx.x;',
  '  c[i] = a[i] + b[i];',
  '}',
];
const colorize = (line: string) => {
  const parts = line.split(/(__global__|void|float|int|\d+)/g);
  return parts.map((s, i) => {
    const col = s === '__global__' ? C.pink : /^(void|float|int)$/.test(s) ? '#64D2FF' : /^\d+$/.test(s) ? '#FFD60A' : 'rgba(255,255,255,0.92)';
    return <span key={i} style={{color: col}}>{s}</span>;
  });
};

const Cuda: React.FC = () => (
  <Scene id="cuda">{({f, wf}) => {
    const total = CODE.join('\n').length;
    const typed = Math.floor(total * prog(f, wf(2), wf(7) + 14 - wf(2)));
    let left = typed;
    const lines = CODE.map((l) => {
      const n = Math.max(0, Math.min(l.length, left));
      left -= l.length + 1;
      return l.slice(0, n);
    });
    const softwareOut = 1 - prog(f, wf(4) - 6, 8);
    const cudaP = pop(f, wf(7) - 2, 12, 170, 0.7);
    return (
      <>
        <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 190, letterSpacing: -7, color: '#fff', ...blurIn(prog(f, wf(3) - 2, 14), 30, 10), opacity: prog(f, wf(3) - 2, 12) * softwareOut}}>
          Software.
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 250, letterSpacing: -10, ...blurIn(prog(f, wf(4), 16)), ...grad('#ffffff', 'rgba(255,255,255,0.35)')}}>2006</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 545, textAlign: 'center', fontFamily: 'Inter', fontWeight: 600, fontSize: 40, letterSpacing: 6, color: C.dim, textTransform: 'uppercase', opacity: prog(f, wf(5), 12)}}>Nvidia announces</div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 200, letterSpacing: -8, transform: `scale(${0.8 + 0.2 * cudaP})`, opacity: interpolate(f, [wf(7) - 3, wf(7)], [0, 1], clamp), filter: 'drop-shadow(0 0 50px rgba(118,185,0,0.6))', ...grad(C.green, C.lime)}}>CUDA</div>
        <Glass style={{left: 70, width: 940, top: 820, height: 340, opacity: prog(f, 4, 16), transform: `translateY(${(1 - prog(f, 4, 16)) * 40}px)`}} radius={36}>
          <div style={{position: 'absolute', left: 36, top: 26, display: 'flex', gap: 10}}>
            {['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c}} />)}
          </div>
          <pre style={{position: 'absolute', left: 36, top: 62, margin: 0, fontFamily: 'JBMono, monospace', fontWeight: 500, fontSize: 34, lineHeight: '48px', whiteSpace: 'pre'}}>
            {lines.map((l, i) => <div key={i} style={{height: 48}}>{colorize(l)}{i === lines.findIndex((x, k) => x.length < CODE[k].length || k === CODE.length - 1) && Math.floor(f / 8) % 2 === 0 ? <span style={{color: C.green}}>▌</span> : null}</div>)}
          </pre>
        </Glass>
      </>
    );
  }}</Scene>
);

const Devs: React.FC = () => (
  <Scene id="devs">{({f, wf}) => {
    const t0 = wf(1) - 2;
    const p = progIO(f, t0, 44);
    const n = 60;
    const count = 6 * p;
    return (
      <>
        <Tag top={190} p={prog(f, 0, 12)}>CUDA developers</Tag>
        <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 320, letterSpacing: -14, fontVariantNumeric: 'tabular-nums', ...blurIn(prog(f, 4, 14), 30, 10), ...grad('#ffffff', 'rgba(255,255,255,0.55)')}}>
          {fmt(count, 1)}<span style={{...grad(C.green, C.lime)}}>M</span>
        </div>
        <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: 'Inter', fontWeight: 500, fontSize: 48, color: C.dim, opacity: prog(f, wf(3), 12)}}>developers build on CUDA</div>
        <div style={{position: 'absolute', left: 176, top: 660, width: 728, height: 440}}>
          {Array.from({length: n}).map((_, i) => {
            const col = i % 10, row = Math.floor(i / 10);
            const at = t0 + (i / n) * 40;
            const s = pop(f, at, 12, 220, 0.5);
            return (
              <div key={i} style={{position: 'absolute', left: col * 76, top: row * 76, width: 44, height: 44, borderRadius: 22, transform: `scale(${s})`, opacity: Math.min(1, s), background: `radial-gradient(circle at 35% 30%, ${C.lime}, ${C.green})`, boxShadow: '0 0 18px rgba(118,185,0,0.5)'}} />
            );
          })}
        </div>
        <Tag top={1385} p={prog(f, 20, 14) * 0.9}>Source: NVIDIA GTC 2026 · 1 dot = 100k developers</Tag>
      </>
    );
  }}</Scene>
);

const Switch: React.FC = () => (
  <Scene id="switch">{({f, wf}) => {
    const widths = [0.9, 0.7, 0.95, 0.55, 0.8, 0.65, 0.92, 0.5, 0.75];
    const fillStart = wf(3) - 2;
    const fillP = progIO(f, fillStart, 40);
    const arrow = pop(f, wf(1), 14, 160, 0.8);
    return (
      <>
        <Tag top={300} p={prog(f, 0, 12)}>Switching cost</Tag>
        <Glass style={{left: 60, top: 380, width: 410, height: 560, opacity: prog(f, 2, 14), transform: `translateX(${(1 - prog(f, 2, 14)) * -40}px)`}} radius={40}>
          <div style={{position: 'absolute', left: 32, top: 28, fontFamily: 'Inter', fontWeight: 600, fontSize: 36, color: C.dim}}>Your CUDA code</div>
          {widths.map((w, i) => (
            <div key={i} style={{position: 'absolute', left: 32, top: 110 + i * 48, height: 28, width: 346 * w * prog(f, 6 + i * 2, 14), borderRadius: 14, background: `linear-gradient(90deg, ${C.green}, ${C.lime})`, opacity: 0.95}} />
          ))}
        </Glass>
        <div style={{position: 'absolute', left: 470, width: 140, top: 620, textAlign: 'center', fontFamily: DISPLAY, fontSize: 90, fontWeight: 700, color: '#fff', transform: `scale(${arrow})`}}>→</div>
        <Glass style={{left: 610, top: 380, width: 410, height: 560, opacity: prog(f, wf(1), 14), transform: `translateX(${(1 - prog(f, wf(1), 14)) * 40}px)`}} radius={40}>
          <div style={{position: 'absolute', left: 32, top: 28, fontFamily: 'Inter', fontWeight: 600, fontSize: 36, color: C.dim}}>New chip</div>
          {widths.map((w, i) => {
            const rp = Math.max(0, Math.min(1, fillP * (widths.length + 1) - i));
            return (
              <div key={i} style={{position: 'absolute', left: 32, top: 110 + i * 48, height: 28, width: 346 * w, borderRadius: 14, border: '2.5px dashed rgba(255,69,58,0.55)', boxSizing: 'border-box'}}>
                <div style={{height: '100%', width: `${rp * 100}%`, borderRadius: 14, background: `linear-gradient(90deg, ${C.red}, ${C.orange})`}} />
              </div>
            );
          })}
        </Glass>
        <div style={{position: 'absolute', left: 610, width: 410, top: 975, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 56, color: C.red, opacity: prog(f, wf(4), 12), ...grad(C.red, C.orange)}}>Rewrite it all.</div>
      </>
    );
  }}</Scene>
);

const Payoff: React.FC = () => (
  <Scene id="payoff">{({f, wf}) => {
    const strike = prog(f, wf(4) + 2, 14);
    const codeP = pop(f, wf(5) - 2, 13, 150, 0.8);
    const iconP = pop(f, wf(5) + 6, 12, 160, 0.7);
    return (
      <>
        <div style={{position: 'absolute', left: 90, top: 300, fontFamily: DISPLAY, fontWeight: 700, fontSize: 100, letterSpacing: -3, color: C.dim, ...blurIn(prog(f, wf(0), 14), 24, 8)}}>The moat</div>
        <div style={{position: 'absolute', left: 90, top: 410, display: 'inline-block', fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, letterSpacing: -5, color: '#fff', ...blurIn(prog(f, wf(2), 16))}}>
          <span style={{position: 'relative', display: 'inline-block', opacity: 1 - 0.55 * strike}}>
            isn't the chip.
            <span style={{position: 'absolute', left: -10, top: '56%', height: 14, width: `${strike * 104}%`, borderRadius: 7, background: `linear-gradient(90deg, ${C.red}, ${C.pink})`}} />
          </span>
        </div>
        <div style={{position: 'absolute', left: 90, top: 640, fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, letterSpacing: -5, transform: `scale(${0.85 + 0.15 * codeP})`, transformOrigin: 'left center', opacity: interpolate(f, [wf(5) - 3, wf(5)], [0, 1], clamp), filter: 'drop-shadow(0 0 50px rgba(118,185,0,0.45))', ...grad(C.green, C.lime)}}>
          It's the code.
        </div>
        <Glass style={{left: 90, top: 880, width: 220, height: 200, transform: `scale(${iconP})`, transformOrigin: 'left center'}} radius={50}>
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JBMono, monospace', fontWeight: 700, fontSize: 104, color: C.lime}}>{'</>'}</div>
        </Glass>
      </>
    );
  }}</Scene>
);

/* ------------------------------ composition ------------------------------ */

const skin: CaptionSkin = {
  top: 1255, fontSize: 80, fontFamily: DISPLAY, weight: 800, letterSpacing: -2, maxWords: 3, gap: 22,
  word: ({active, past, progress}) => ({
    color: active ? '#fff' : past ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.38)',
    transform: `scale(${active ? 1 + 0.06 * progress : 1})`,
    textShadow: active ? '0 0 34px rgba(255,255,255,0.35)' : 'none',
  }),
};

export const AppleMinimal: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{background: '#000'}}>
      <FontLoader />
      <Bg />
      <Hook /><Rivals /><Money /><Cuda /><Devs /><Switch /><Payoff />
      <Captions skin={skin} />
      <div style={{position: 'absolute', top: 70, left: 70, right: 70, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.14)'}}>
        <div style={{height: '100%', width: `${(f / DURATION) * 100}%`, borderRadius: 3, background: 'rgba(255,255,255,0.8)'}} />
      </div>
      <Audio src={staticFile('voice.mp3')} />
    </AbsoluteFill>
  );
};
