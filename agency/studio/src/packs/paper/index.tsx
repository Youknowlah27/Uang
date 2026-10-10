import React, {useMemo} from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {clamp, pop, prog, rnd, fmt} from '../../lib/anim';
import type {Pack, TemplateComp} from '../../lib/pack';

/**
 * STYLE PACK — "Paper Cutout"
 * Everything is a physical piece of card: torn edges, grain, hard + soft shadows, tape, stamps.
 * Motion is stepped (15 fps) with per-piece wobble so it reads as hand-moved stop-motion.
 */
export const P = {white: '#FBF8F1', ink: '#2B2A33', navy: '#1F3A5F', orange: '#F28C28', green: '#7DB83A', red: '#E04B3C', yellow: '#F6C945', teal: '#2E9CA6', pink: '#EE7F9B', gray: '#C9C2B8', cream: '#F2E8D0'};
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

type PaperProps = {x: number; y: number; w: number; h: number; color: string; seed?: number; rot?: number; scale?: number; opacity?: number; amp?: number; shadow?: number; origin?: string; wobble?: number; children?: React.ReactNode};
const Paper: React.FC<PaperProps> = ({x, y, w, h, color, seed = 1, rot = 0, scale = 1, opacity = 1, amp = 5, shadow = 9, origin = 'center', wobble = 1, children}) => {
  const f = useCurrentFrame();
  const q = Math.floor(f / 3);
  const jr = (rnd(seed * 7 + q) - 0.5) * 1.6 * wobble, jx = (rnd(seed * 3 + q) - 0.5) * 4 * wobble, jy = (rnd(seed * 5 + q) - 0.5) * 4 * wobble;
  const poly = useMemo(() => tear(w, h, seed, amp), [w, h, seed, amp]);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity, transformOrigin: origin, transform: `translate(${jx}px, ${jy}px) rotate(${rot + jr}deg) scale(${scale})`, filter: `drop-shadow(0 ${shadow}px 0 rgba(70,45,20,0.20)) drop-shadow(0 ${shadow * 2}px 12px rgba(40,25,10,0.30))`}}>
      <div style={{position: 'absolute', inset: 0, clipPath: poly, backgroundColor: color, backgroundImage: `url(${staticFile('tex/paper_white.jpg')})`, backgroundBlendMode: 'multiply', backgroundSize: '512px 512px'}} />
      <div style={{position: 'absolute', inset: 0}}>{children}</div>
    </div>
  );
};
const Center: React.FC<{children: React.ReactNode}> = ({children}) => <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{children}</div>;
const Tape: React.FC<{x: number; y: number; rot?: number; w?: number}> = ({x, y, rot = -6, w = 190}) => (
  <div style={{position: 'absolute', left: x, top: y, width: w, height: 56, background: 'rgba(246,201,69,0.72)', transform: `rotate(${rot}deg)`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)', clipPath: 'polygon(0 8%,4% 0,8% 10%,12% 0,100% 0,100% 100%,92% 92%,88% 100%,4% 100%,0 92%)'}} />
);

const Bg: React.FC<{gf: number; total: number}> = ({gf}) => (
  <AbsoluteFill style={{background: '#E2CDA8'}} data-decor>
    <div style={{position: 'absolute', inset: -40, transform: `translate(${Math.sin(gf / 140) * 10}px, ${Math.cos(gf / 170) * 8}px) scale(${1.02 + gf * 0.00004})`}}>
      <Img src={staticFile('tex/kraft.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
    </div>
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(60,35,10,0.35) 100%)'}} />
  </AbsoluteFill>
);

const ChipPaper: React.FC<{x: number; y: number; size: number; dim?: number}> = ({x, y, size, dim = 1}) => {
  const u = size / 300;
  return (
    <div data-critical="icon" style={{position: 'absolute', left: x, top: y, width: size, height: size, opacity: dim}}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
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

/* ------------------------------ templates ------------------------------ */

const HookStamp: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const wrong = pop(g, wf(p.stamp?.at) - 2, 9, 200, 0.7);
  const xP = pop(g, wf(p.strike?.at) + 2, 12, 200, 0.6);
  const lines: any[] = p.lines ?? [];
  const cols = [P.navy, P.orange, P.teal];
  return (
    <>
      {p.icon !== 'none' && (
        <div style={{position: 'absolute', inset: 0, transform: `translateY(${(1 - prog(g, 0, 14)) * -80}px)`, opacity: prog(g, 0, 8)}}>
          <ChipPaper x={390} y={190} size={300} dim={interpolate(f, [wf(p.strike?.at), wf(p.strike?.at) + 8], [1, 0.45], clamp)} />
          <Paper x={290} y={310} w={500} h={60} color={P.red} seed={61} rot={38} scale={xP} amp={2} opacity={xP > 0 ? 1 : 0} />
          <Paper x={290} y={310} w={500} h={60} color={P.red} seed={62} rot={-38} scale={xP} amp={2} opacity={xP > 0 ? 1 : 0} />
        </div>
      )}
      {p.kicker && (
        <Paper x={70} y={560} w={560} h={100} color={P.white} seed={3} rot={-2.5} opacity={prog(g, wf(p.kicker.at), 8)} scale={0.9 + 0.1 * prog(g, wf(p.kicker.at), 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 52, color: P.ink, letterSpacing: 1}}>{p.kicker.text.toUpperCase()}</span></Center>
        </Paper>
      )}
      {lines.map((l, i) => {
        const pp = pop(g, wf(l.at), 12, 180);
        return (
          <Paper key={i} x={90 + i * 60} y={690 + i * 160} w={900 - i * 140} h={140} color={cols[i % 3]} seed={4 + i} rot={i % 2 ? -1.4 : 1.2} opacity={pp > 0.05 ? 1 : 0} scale={0.5 + 0.5 * pp}>
            <Center><span style={{fontFamily: BOW, fontSize: 104, color: i % 2 ? P.ink : P.white}}>{l.text.toUpperCase()}</span></Center>
          </Paper>
        );
      })}
      {p.stamp && (
        <Paper x={120} y={700} w={840} h={300} color={P.red} seed={8} rot={-9} scale={0.5 + 0.5 * wrong + 0.35 * (1 - wrong)} opacity={interpolate(f, [wf(p.stamp.at) - 3, wf(p.stamp.at)], [0, 1], clamp)} amp={7} shadow={14}>
          <Center><span style={{fontFamily: BOW, fontSize: 170, color: P.white, letterSpacing: 2}}>{p.stamp.text.toUpperCase().replace('.', '!')}</span></Center>
        </Paper>
      )}
    </>
  );
};

const Cards: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const cols = [P.orange, P.teal, P.yellow, P.pink];
  const items: any[] = p.items ?? [];
  return (
    <>
      <Paper x={70} y={280} w={700} h={110} color={P.white} seed={14} rot={-2} opacity={prog(g, 0, 8)}>
        <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 74, color: P.ink}}>{(p.title ?? p.kicker ?? '').toLowerCase()}</span></Center>
      </Paper>
      {items.map((r, i) => {
        const pp = pop(g, wf(r.at) - 2, 12, 150, 0.9);
        return (
          <Paper key={i} x={70} y={450 + i * 200} w={940} h={160} color={cols[i % 4]} seed={20 + i} rot={[-1.5, 1.2, -0.8, 1][i % 4]} opacity={pp > 0.02 ? 1 : 0} origin="left center" scale={0.6 + 0.4 * pp}>
            <div style={{position: 'absolute', left: 36, top: 52, width: 56, height: 56, borderRadius: 28, background: P.white, boxShadow: 'inset 0 4px 8px rgba(0,0,0,0.35)'}} />
            <div style={{position: 'absolute', left: 130, top: 28, fontFamily: BOW, fontSize: 84, color: P.ink}}>{r.name}</div>
            <div style={{position: 'absolute', right: 40, top: 52, fontFamily: HAND, fontWeight: 700, fontSize: 68, color: P.ink}}>{r.sub}</div>
          </Paper>
        );
      })}
      {p.note && (
        <Paper x={520} y={1030} w={480} h={100} color={P.white} seed={30} rot={3} opacity={prog(g, wf(p.note.at), 8)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 62, color: P.red}}>{p.note.text.toLowerCase()}</span></Center>
        </Paper>
      )}
    </>
  );
};

const wedge = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const pt = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
  return `M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
};
const Share: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const t0 = wf(p.at) - 4;
  const pr = interpolate(g, [t0, t0 + 30], [0, 1], clamp);
  const main = p.primary?.main ?? 0, rest = p.primary?.rest ?? 1;
  const share = main / (main + rest);
  const a0 = -Math.PI / 2, aSplit = a0 + 2 * Math.PI * share * pr;
  const small = pop(g, t0 + 28, 12, 200, 0.7);
  const mid = aSplit + (2 * Math.PI * (1 - share)) / 2;
  const cx = 540, cy = 670, R = 215;
  const shown = Math.round((p.display_pct ?? share * 100) * pr);
  const banner = `${(p.kicker ?? p.title ?? '').toUpperCase()}${p.total_label ? ': ' + p.total_label : ''}`;
  const leg = p.legend ?? [];
  return (
    <>
      <Paper x={70} y={250} w={940} h={100} color={P.white} seed={40} rot={-1} opacity={prog(g, 0, 8)}>
        <Center><span style={{fontFamily: BOW, fontSize: 36, color: P.ink}}>{banner}</span></Center>
      </Paper>
      <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 12px 0 rgba(70,45,20,0.22)) drop-shadow(0 22px 14px rgba(40,25,10,0.3))', opacity: prog(g, 4, 8)}}>
        <defs><pattern id="ptex" width="512" height="512" patternUnits="userSpaceOnUse"><image href={staticFile('tex/paper_white.jpg')} width="512" height="512" /></pattern></defs>
        {pr > 0.01 && <path d={wedge(cx, cy, R, a0, aSplit)} fill={P.green} />}
        {pr > 0.01 && <path d={wedge(cx, cy, R, a0, aSplit)} fill="url(#ptex)" style={{mixBlendMode: 'multiply'}} />}
        {small > 0.02 && (
          <g transform={`translate(${Math.cos(mid) * 26 * small}, ${Math.sin(mid) * 26 * small})`}>
            <path d={wedge(cx, cy, R, aSplit, a0 + 2 * Math.PI)} fill={P.gray} />
            <path d={wedge(cx, cy, R, aSplit, a0 + 2 * Math.PI)} fill="url(#ptex)" style={{mixBlendMode: 'multiply'}} />
          </g>
        )}
      </svg>
      <Paper x={290} y={590} w={500} h={210} color={P.white} seed={44} rot={-4} opacity={prog(g, t0, 6)} scale={0.8 + 0.2 * prog(g, t0, 10)}>
        <Center><span style={{fontFamily: BOW, fontSize: 168, color: P.ink, fontVariantNumeric: 'tabular-nums'}}>{shown}<span style={{color: P.green}}>%</span></span></Center>
      </Paper>
      {leg[0] && (
        <Paper x={70} y={925} w={560} h={90} color={P.green} seed={46} rot={-1.5} opacity={prog(g, wf(leg[0].at), 8)} scale={0.9 + 0.1 * prog(g, wf(leg[0].at), 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 36, color: P.ink}}>{leg[0].label.toUpperCase()} {leg[0].value}</span></Center>
        </Paper>
      )}
      {leg[1] && (
        <Paper x={420} y={1030} w={590} h={90} color={P.gray} seed={47} rot={1.2} opacity={prog(g, wf(leg[1].at) + 4, 8)} scale={0.9 + 0.1 * prog(g, wf(leg[1].at) + 4, 8)}>
          <Center><span style={{fontFamily: BOW, fontSize: 32, color: P.ink}}>{leg[1].label.toUpperCase()} {leg[1].value}</span></Center>
        </Paper>
      )}
      {p.source && <div style={{position: 'absolute', left: 70, top: 360, fontFamily: HAND, fontWeight: 700, fontSize: 40, color: 'rgba(43,42,51,0.75)', opacity: prog(g, 18, 10)}}>{p.source.toLowerCase()}</div>}
    </>
  );
};

const Milestone: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const code: string[] = p.code ?? [];
  const total = code.join('\n').length;
  const typed = Math.floor(total * prog(g, wf(p.code_from ?? 0), Math.max(8, wf(p.code_to ?? 0) + 14 - wf(p.code_from ?? 0))));
  let left = typed;
  const lines = code.map((l) => {
    const n = Math.max(0, Math.min(l.length, left));
    left -= l.length + 1;
    return l.slice(0, n);
  });
  const kw: string = p.keyword?.text ?? '';
  const colors = [{col: P.red, tc: P.white}, {col: P.yellow, tc: P.ink}, {col: P.teal, tc: P.white}, {col: P.orange, tc: P.ink}, {col: P.pink, tc: P.ink}];
  const cal = pop(g, wf(p.year?.at) - 1, 12, 160, 0.8);
  const letterW = Math.min(214, Math.floor(940 / Math.max(1, kw.length)) - 22);
  return (
    <>
      {p.year && (
        <Paper x={70} y={250} w={440} h={330} color={P.white} seed={60} rot={-3} opacity={cal > 0.02 ? 1 : 0} scale={0.6 + 0.4 * cal} origin="left top">
          <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 100, background: P.red}} />
          {[90, 220, 350].map((x) => <div key={x} style={{position: 'absolute', left: x, top: 24, width: 26, height: 26, borderRadius: 13, background: P.white, boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.4)'}} />)}
          <div style={{position: 'absolute', left: 0, right: 0, top: 110, textAlign: 'center', fontFamily: BOW, fontSize: 150, color: P.ink}}>{p.year.text}</div>
          {p.marker && <div style={{position: 'absolute', left: 0, right: 0, top: 268, textAlign: 'center', fontFamily: HAND, fontWeight: 700, fontSize: 48, color: P.red}}>{p.marker.label}</div>}
        </Paper>
      )}
      {p.lead && (
        <Paper x={560} y={300} w={450} h={150} color={P.yellow} seed={61} rot={4} opacity={prog(g, wf(p.lead.at) - 2, 8)} scale={0.8 + 0.2 * prog(g, wf(p.lead.at) - 2, 10)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 96, color: P.ink}}>{p.lead.text.toLowerCase()}</span></Center>
        </Paper>
      )}
      {kw.split('').map((ch, i) => {
        const pp = pop(g, wf(p.keyword.at) - 3 + i * 3, 10, 200, 0.7);
        const c = colors[i % colors.length];
        return (
          <Paper key={i} x={70 + i * (letterW + 24)} y={610} w={letterW} h={230} color={c.col} seed={70 + i} rot={[-5, 4, -3, 5, -4][i % 5]} opacity={pp > 0.02 ? 1 : 0} scale={0.3 + 0.7 * pp} amp={4}>
            <Center><span style={{fontFamily: BOW, fontSize: 190, color: c.tc}}>{ch}</span></Center>
          </Paper>
        );
      })}
      {code.length > 0 && (
        <>
          <Paper x={70} y={865} w={940} h={265} color={P.cream} seed={80} rot={-0.8} opacity={prog(g, 4, 8)} amp={3}>
            {[0, 1, 2, 3, 4].map((i) => <div key={i} style={{position: 'absolute', left: 0, right: 0, top: 56 + i * 44, height: 2, background: 'rgba(60,110,190,0.28)'}} />)}
            <pre style={{position: 'absolute', left: 36, top: 22, margin: 0, fontFamily: 'JBMono, monospace', fontWeight: 500, fontSize: 30, lineHeight: '44px', color: P.ink, whiteSpace: 'pre'}}>{lines.join('\n')}</pre>
          </Paper>
          <Tape x={430} y={835} rot={-3} />
        </>
      )}
    </>
  );
};

const Person: React.FC<{col: string}> = ({col}) => (
  <svg width="56" height="76" viewBox="0 0 56 76"><circle cx="28" cy="16" r="14" fill={col} /><path d="M6 70 C6 42, 18 34, 28 34 C38 34, 50 42, 50 70 Z" fill={col} /></svg>
);
const CountGrid: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const t0 = wf(p.at) - 2;
  const pr = interpolate(g, [t0, t0 + 44], [0, 1], clamp);
  const n = p.dots ?? 60, cols = p.cols ?? 10;
  const shades = [P.green, '#6AA52F', '#93C94E'];
  return (
    <>
      <Paper x={70} y={260} w={760} h={290} color={P.white} seed={90} rot={-2.5} opacity={prog(g, 2, 8)} scale={0.85 + 0.15 * prog(g, 2, 10)}>
        <Center><span style={{fontFamily: BOW, fontSize: 230, color: P.ink, fontVariantNumeric: 'tabular-nums'}}>{fmt((p.value ?? 0) * pr, p.decimals ?? 1)}<span style={{color: P.green}}>{p.suffix}</span></span></Center>
      </Paper>
      <Paper x={400} y={560} w={600} h={96} color={P.orange} seed={92} rot={2.5} opacity={prog(g, wf(p.label_at ?? p.at), 8)} scale={0.9 + 0.1 * prog(g, wf(p.label_at ?? p.at), 10)}>
        <Center><span style={{fontFamily: BOW, fontSize: 52, color: P.ink}}>{(p.label ?? '').toUpperCase()}</span></Center>
      </Paper>
      <div style={{position: 'absolute', left: 60, top: 680, width: 960, height: 400, filter: 'drop-shadow(0 6px 0 rgba(70,45,20,0.22)) drop-shadow(0 12px 8px rgba(40,25,10,0.28))'}}>
        {Array.from({length: n}).map((_, i) => {
          const s = pop(g, t0 + (i / n) * 40, 14, 240, 0.5);
          const jr = (rnd(i * 3 + Math.floor(f / 3)) - 0.5) * 6;
          return <div key={i} style={{position: 'absolute', left: (i % cols) * 94 + 10, top: Math.floor(i / cols) * 66, transform: `scale(${s}) rotate(${jr}deg)`, opacity: s > 0.02 ? 1 : 0}}><div style={{transform: 'scale(0.82)', transformOrigin: 'top left'}}><Person col={shades[i % 3]} /></div></div>;
        })}
      </div>
      <div style={{position: 'absolute', left: 70, top: 1085, fontFamily: HAND, fontWeight: 700, fontSize: 36, color: 'rgba(43,42,51,0.75)', opacity: prog(g, 20, 10)}}>{(p.per_dot ?? '').toLowerCase()} · {(p.source ?? '').replace('Source: ', 'source: ').toLowerCase()}</div>
    </>
  );
};

const SwitchCost: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const stamp = pop(g, wf(p.stamp?.at), 9, 200, 0.7);
  const arrow = pop(g, wf(p.arrow), 12, 160, 0.8);
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <Paper key={i} x={70 + i * 6} y={380 + i * 8} w={380} h={470} color={P.white} seed={100 + i} rot={-4 + i * 2.2} opacity={prog(g, 2 + i * 2, 8)} amp={4}>
          {i === 4 && (
            <>
              <div style={{position: 'absolute', left: 28, top: 22, fontFamily: BOW, fontSize: 30, color: P.ink, whiteSpace: 'nowrap'}}>{(p.from?.label ?? '').toUpperCase()}</div>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => <div key={k} style={{position: 'absolute', left: 28, top: 100 + k * 44, height: 14, borderRadius: 7, width: 320 * (0.45 + 0.5 * rnd(k + 3)), background: P.green}} />)}
            </>
          )}
        </Paper>
      ))}
      <Paper x={470} y={560} w={150} h={150} color={P.orange} seed={110} opacity={arrow > 0.02 ? 1 : 0} scale={0.3 + 0.7 * arrow} amp={2}><Center><span style={{fontFamily: BOW, fontSize: 110, color: P.ink}}>→</span></Center></Paper>
      <Paper x={640} y={380} w={380} h={470} color={P.white} seed={120} rot={3} opacity={prog(g, wf(p.arrow), 8)} amp={4}>
        <div style={{position: 'absolute', left: 28, top: 22, fontFamily: BOW, fontSize: 30, color: P.ink, whiteSpace: 'nowrap'}}>{(p.to?.label ?? '').toUpperCase()}</div>
        <div style={{position: 'absolute', left: 24, right: 24, top: 100, bottom: 30, border: `4px dashed ${P.red}`, borderRadius: 6}} />
      </Paper>
      {p.stamp && (
        <Paper x={600} y={520} w={440} h={170} color={P.red} seed={130} rot={-11} opacity={interpolate(f, [wf(p.stamp.at) - 3, wf(p.stamp.at)], [0, 1], clamp)} scale={0.5 + 0.5 * stamp + 0.35 * (1 - stamp)} amp={6} shadow={12}>
          <Center><span style={{fontFamily: BOW, fontSize: 46, color: P.white, whiteSpace: 'nowrap'}}>{p.stamp.text.toUpperCase()}</span></Center>
        </Paper>
      )}
      {p.note && (
        <Paper x={70} y={920} w={420} h={90} color={P.yellow} seed={140} rot={-2} opacity={prog(g, wf(p.note.at), 8)} scale={0.9 + 0.1 * prog(g, wf(p.note.at), 10)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 56, color: P.ink}}>{p.note.text}</span></Center>
        </Paper>
      )}
    </>
  );
};

const Statement: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const g = Math.floor(f / 2) * 2;
  const strike = pop(g, wf(p.strike?.at) + 2, 10, 200, 0.6);
  const hl = p.highlight;
  const code = pop(g, wf(hl?.at) - 2, 10, 170, 0.8);
  const icon = pop(g, wf(hl?.at) + 6, 10, 180, 0.7);
  const lines: any[] = p.lines ?? [];
  const idx = p.strike?.line ?? -1;
  return (
    <>
      <Paper x={70} y={290} w={940} h={330} color={P.navy} seed={150} rot={-1.2} opacity={prog(g, 0, 8)} scale={0.9 + 0.1 * prog(g, 0, 10)}>
        <div style={{position: 'absolute', left: 50, top: 36, fontFamily: BOW, fontSize: 92, color: P.white, lineHeight: 1.1}}>
          {lines.map((l, i) => (
            <div key={i} style={{position: 'relative', display: 'block', width: 'fit-content', opacity: prog(g, wf(l.at), 8)}}>
              <span style={{opacity: idx === i ? 1 - 0.45 * strike : 1}}>{l.text.toUpperCase()}</span>
              {idx === i && <div style={{position: 'absolute', left: -10, top: '50%', height: 18, width: `${strike * 106}%`, background: P.red, transform: 'rotate(-2deg)'}} />}
            </div>
          ))}
        </div>
      </Paper>
      {hl && (
        <Paper x={70} y={690} w={940} h={250} color={P.green} seed={160} rot={1.4} opacity={code > 0.02 ? 1 : 0} scale={0.5 + 0.5 * code + 0.2 * (1 - code)} amp={6} shadow={13}>
          <Center><span style={{fontFamily: BOW, fontSize: 112, color: P.ink}}>{hl.text.toUpperCase()}</span></Center>
        </Paper>
      )}
      {p.icon === 'code' && (
        <Paper x={70} y={990} w={180} h={150} color={P.yellow} seed={170} rot={-6} opacity={icon > 0.02 ? 1 : 0} scale={0.3 + 0.7 * icon} amp={3}>
          <Center><span style={{fontFamily: 'JBMono, monospace', fontWeight: 700, fontSize: 70, color: P.ink}}>{'</>'}</span></Center>
        </Paper>
      )}
    </>
  );
};

const CtaEnd: TemplateComp = ({ctx, p}) => {
  const {f, spec} = ctx;
  const g = Math.floor(f / 2) * 2;
  const cta = {...spec.cta, ...p};
  const pp = pop(g, 3, 12, 170, 0.8), bp = pop(g, 12, 10, 200, 0.7);
  const label = cta.type === 'follow' ? 'FOLLOW!' : cta.type === 'link' ? 'LINK IN BIO' : `COMMENT “${(cta.keyword ?? '').toUpperCase()}”`;
  return (
    <>
      <Paper x={70} y={590} w={940} h={250} color={P.white} seed={180} rot={-1.5} opacity={pp > 0.02 ? 1 : 0} scale={0.6 + 0.4 * pp}>
        <Center><span style={{fontFamily: BOW, fontSize: 88, color: P.ink, textAlign: 'center', lineHeight: 1.05, padding: '0 30px'}}>{String(cta.headline).toUpperCase()}</span></Center>
      </Paper>
      {cta.sub && (
        <Paper x={100} y={860} w={880} h={110} color={P.yellow} seed={181} rot={1.2} opacity={prog(g, 12, 8)}>
          <Center><span style={{fontFamily: HAND, fontWeight: 700, fontSize: 62, color: P.ink}}>{cta.sub}</span></Center>
        </Paper>
      )}
      <Paper x={230} y={1000} w={620} h={130} color={P.green} seed={182} rot={-2} opacity={bp > 0.02 ? 1 : 0} scale={(0.4 + 0.6 * bp) * (1 + 0.03 * Math.sin(f / 5))} amp={5} shadow={12}>
        <Center><span style={{fontFamily: BOW, fontSize: 74, color: P.ink}}>{label}</span></Center>
      </Paper>
    </>
  );
};

export const paperPack: Pack = {
  id: 'paper',
  Bg,
  templates: {hook_stamp: HookStamp, cards: Cards, share: Share, milestone: Milestone, count_grid: CountGrid, switch_cost: SwitchCost, statement: Statement, cta_end: CtaEnd},
  caption: {
    fontSize: 54, fontFamily: BOW, weight: 400, letterSpacing: 0.5, maxWords: 3, gap: 14, uppercase: true,
    chunk: () => ({background: P.white, padding: '12px 26px 16px', boxShadow: '0 10px 0 rgba(70,45,20,0.25), 0 20px 24px rgba(40,25,10,0.25)', transform: 'rotate(-1deg)'}),
    word: ({active}) => ({color: P.ink, position: 'relative', padding: '0 8px', background: active ? P.yellow : 'transparent', opacity: active ? 1 : 0.62}),
  },
  accent: P.yellow,
  particles: [P.red, P.yellow, P.teal, P.orange, P.green, P.pink],
};
