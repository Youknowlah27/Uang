import React from 'react';
import {AbsoluteFill, Img, staticFile, interpolate} from 'remotion';
import {clamp, pop, prog, progIO, fmt} from '../../lib/anim';
import type {Pack, SceneCtx, TemplateComp} from '../../lib/pack';
import {Chip} from '../../mascot/Chip';

/**
 * STYLE PACK — "Apple Minimal"
 * Near-black canvas, slow aurora gradients, film grain, giant Inter Display type, frosted glass, spring motion.
 */
export const C = {
  green: '#76B900', lime: '#B6F23B', blue: '#0A84FF', orange: '#FF9F0A', pink: '#FF375F', red: '#FF453A', dim: 'rgba(255,255,255,0.55)',
};
const DISPLAY = 'InterDisplay, Inter, sans-serif';

const blurIn = (p: number, dy = 36, blur = 14): React.CSSProperties => ({opacity: p, transform: `translateY(${(1 - p) * dy}px)`, filter: p < 1 ? `blur(${(1 - p) * blur}px)` : undefined});
const grad = (a: string, b: string): React.CSSProperties => ({background: `linear-gradient(100deg, ${a}, ${b})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent'});

const Bg: React.FC<{gf: number; total: number}> = ({gf: f, total}) => (
  <AbsoluteFill style={{background: '#050507'}} data-decor>
    <div style={{position: 'absolute', inset: 0, background: `radial-gradient(1000px 800px at ${24 + 8 * Math.sin(f / 90)}% ${16 + 4 * Math.cos(f / 70)}%, rgba(70,90,255,0.34), transparent 70%), radial-gradient(1100px 900px at ${82 + 6 * Math.cos(f / 80)}% ${80 + 5 * Math.sin(f / 60)}%, rgba(255,80,60,0.22), transparent 70%), radial-gradient(700px 600px at 50% 52%, rgba(120,60,255,0.10), transparent 70%)`}} />
    <Img src={staticFile('tex/grain.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55, mixBlendMode: 'overlay'}} />
    <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,0.55) 100%)'}} />
    <div style={{position: 'absolute', top: 70, left: 70, right: 70, height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.14)'}}>
      <div style={{height: '100%', width: `${(f / Math.max(1, total * 30)) * 100}%`, borderRadius: 3, background: 'rgba(255,255,255,0.8)'}} />
    </div>
  </AbsoluteFill>
);

const Glass: React.FC<{style?: React.CSSProperties; children?: React.ReactNode; radius?: number}> = ({style, children, radius = 44}) => (
  <div style={{position: 'absolute', borderRadius: radius, overflow: 'hidden', background: 'linear-gradient(160deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))', border: '1.5px solid rgba(255,255,255,0.20)', backdropFilter: 'blur(28px) saturate(160%)', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -1px 0 rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.45)', ...style}}>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(115deg, rgba(255,255,255,0.18) 0%, transparent 38%)', pointerEvents: 'none'}} />
    {children}
  </div>
);

const ChipIcon: React.FC<{size: number; opacity?: number}> = ({size, opacity = 1}) => (
  <svg data-critical="icon" width={size} height={size} viewBox="0 0 200 200" style={{opacity}}>
    <defs><linearGradient id="cg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.95" /><stop offset="1" stopColor="#fff" stopOpacity="0.30" /></linearGradient></defs>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <React.Fragment key={i}>
        <rect x={40 + i * 24} y={6} width={9} height={30} rx={4.5} fill="url(#cg)" /><rect x={40 + i * 24} y={164} width={9} height={30} rx={4.5} fill="url(#cg)" />
        <rect x={6} y={40 + i * 24} width={30} height={9} rx={4.5} fill="url(#cg)" /><rect x={164} y={40 + i * 24} width={30} height={9} rx={4.5} fill="url(#cg)" />
      </React.Fragment>
    ))}
    <rect x={34} y={34} width={132} height={132} rx={30} fill="rgba(255,255,255,0.10)" stroke="url(#cg)" strokeWidth={3.5} />
    <rect x={68} y={68} width={64} height={64} rx={14} fill="url(#cg)" />
  </svg>
);

const Tag: React.FC<{children: React.ReactNode; top: number; left?: number; p?: number}> = ({children, top, left = 70, p = 1}) => (
  <div style={{position: 'absolute', top, left, fontFamily: 'Inter', fontWeight: 600, fontSize: 26, letterSpacing: 3, color: 'rgba(255,255,255,0.42)', textTransform: 'uppercase', opacity: p}}>{children}</div>
);

const strikeBar = (w: string | number, extra?: React.CSSProperties): React.CSSProperties => ({position: 'absolute', left: -12, top: '56%', height: 14, borderRadius: 7, width: w, background: `linear-gradient(90deg, ${C.red}, ${C.pink})`, ...extra});

/* ------------------------------ templates ------------------------------ */

const HookStamp: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const wrongAt = wf(p.stamp?.at) - 2;
  const slam = pop(f, wrongAt, 11, 180, 0.7);
  const slashAt = wf(p.strike?.at) + 4;
  const slash = prog(f, slashAt, 14);
  const headDim = interpolate(f, [wrongAt, wrongAt + 8], [1, 0.08], clamp);
  const lines: {text: string; at: any}[] = p.lines ?? [];
  return (
    <>
      {p.icon !== 'none' && (
        <div style={{position: 'absolute', top: 230 + Math.sin(f / 16) * 8, left: 390, ...blurIn(prog(f, 0, 18), 20, 10)}}>
          <ChipIcon size={300} opacity={interpolate(f, [slashAt, slashAt + 10], [1, 0.35], clamp)} />
          <div style={{position: 'absolute', left: 150 - 200 * slash, top: 143, width: 400 * slash, height: 14, borderRadius: 7, background: `linear-gradient(90deg, ${C.red}, ${C.pink})`, transform: 'rotate(-38deg)', boxShadow: `0 0 30px ${C.red}`}} />
        </div>
      )}
      <div style={{position: 'absolute', left: 90, top: 590, opacity: headDim}}>
        {p.kicker && <div style={{fontFamily: 'Inter', fontWeight: 600, fontSize: 62, color: C.dim, ...blurIn(prog(f, wf(p.kicker.at), 14), 24, 8)}}>{p.kicker.text}</div>}
        {lines.map((l, i) => (
          <div key={i} style={{position: 'relative', display: 'block', width: 'fit-content', fontFamily: DISPLAY, fontWeight: 800, fontSize: 148, letterSpacing: -5, lineHeight: 1.02, color: '#fff', marginTop: i === 0 ? 6 : 0, ...blurIn(prog(f, wf(l.at), 16))}}>
            {l.text}
            {p.strike && p.strike.line === i && <div style={strikeBar(`${slash * 106}%`)} />}
          </div>
        ))}
      </div>
      {p.stamp && (
        <div style={{position: 'absolute', left: 0, right: 0, top: 640, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 250, letterSpacing: -9, transform: `scale(${0.7 + 0.3 * slam}) rotate(${(1 - slam) * -3}deg)`, opacity: interpolate(f, [wrongAt, wrongAt + 4], [0, 1], clamp), filter: 'drop-shadow(0 20px 60px rgba(255,55,95,0.5))', ...grad(C.orange, C.pink)}}>
          {p.stamp.text}
        </div>
      )}
    </>
  );
};

const Cards: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const cols = [C.orange, C.blue, C.pink, C.green];
  const items: any[] = p.items ?? [];
  return (
    <>
      <Tag top={300} p={prog(f, 0, 12)}>{p.kicker}</Tag>
      {items.map((r, i) => {
        const pp = pop(f, wf(r.at) - 2, 16, 150, 0.8);
        const check = pop(f, wf(p.check_at ?? r.at) + i * 4, 12, 200, 0.6);
        return (
          <Glass key={i} style={{left: 70, width: 940, top: 380 + i * 210, height: 180, opacity: pp, transform: `translateY(${(1 - pp) * 60}px) scale(${0.96 + 0.04 * pp})`}}>
            <div style={{position: 'absolute', left: 40, top: 40, width: 100, height: 100, borderRadius: 30, background: `linear-gradient(145deg, ${cols[i % 4]}, rgba(255,255,255,0.1))`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}><ChipIcon size={70} /></div>
            <div style={{position: 'absolute', left: 175, top: 30, fontFamily: DISPLAY, fontWeight: 700, fontSize: 70, color: '#fff', letterSpacing: -2}}>{r.name}</div>
            <div style={{position: 'absolute', left: 178, top: 112, fontFamily: 'Inter', fontWeight: 500, fontSize: 38, color: C.dim}}>{r.sub}</div>
            <div style={{position: 'absolute', right: 44, top: 46, width: 88, height: 88, borderRadius: 44, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${check})`, boxShadow: '0 0 40px rgba(118,185,0,0.55)'}}>
              <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
            </div>
          </Glass>
        );
      })}
    </>
  );
};

const Share: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const t0 = wf(p.at) - 4;
  const pr = progIO(f, t0, 30);
  const R = 230, CIRC = 2 * Math.PI * R, share = (p.primary?.main ?? 0) / ((p.primary?.main ?? 0) + (p.primary?.rest ?? 1));
  const shown = Math.round((p.display_pct ?? share * 100) * pr);
  return (
    <>
      <Tag top={190} p={prog(f, 0, 12)}>{p.kicker}</Tag>
      <div style={{position: 'absolute', top: 245, left: 70, fontFamily: DISPLAY, fontWeight: 700, fontSize: 78, color: '#fff', letterSpacing: -2, ...blurIn(prog(f, 4, 16), 20, 8)}}>{p.total_label}</div>
      <div style={{position: 'absolute', left: 280, top: 400, width: 520, height: 520, ...blurIn(prog(f, 6, 18), 30, 10)}}>
        <svg width="520" height="520" viewBox="0 0 520 520" style={{transform: 'rotate(-90deg)'}}>
          <defs><linearGradient id="ring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C.green} /><stop offset="1" stopColor={C.lime} /></linearGradient></defs>
          <circle cx="260" cy="260" r={R} fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="56" />
          <circle cx="260" cy="260" r={R} fill="none" stroke="url(#ring)" strokeWidth="56" strokeLinecap="round" strokeDasharray={`${CIRC * share * pr} ${CIRC}`} style={{filter: 'drop-shadow(0 0 22px rgba(118,185,0,0.55))'}} />
        </svg>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 190, letterSpacing: -8, color: '#fff', fontVariantNumeric: 'tabular-nums'}}>{shown}<span style={{fontSize: 96, marginLeft: 4, color: C.dim}}>%</span></div>
      </div>
      {(p.legend ?? []).map((r: any, i: number) => (
        <div key={i} style={{position: 'absolute', left: 120, right: 120, top: 960 + i * 70, display: 'flex', alignItems: 'center', fontFamily: 'Inter', fontSize: 44, color: '#fff', ...blurIn(prog(f, wf(r.at), 14), 16, 6)}}>
          <div style={{width: 28, height: 28, borderRadius: 14, background: r.tone === 'muted' ? 'rgba(255,255,255,0.35)' : C.green, marginRight: 22}} />
          <div style={{fontWeight: 600, flex: 1}}>{r.label}</div>
          <div style={{fontWeight: 700, fontVariantNumeric: 'tabular-nums'}}>{r.value}</div>
        </div>
      ))}
      {(p.source_short ?? p.source) && <Tag top={1090} p={prog(f, 20, 14) * 0.9}>{p.source_short ?? p.source}</Tag>}
    </>
  );
};

const colorize = (line: string) =>
  line.split(/(__global__|void|float|int|\d+)/g).map((s, i) => (
    <span key={i} style={{color: s === '__global__' ? C.pink : /^(void|float|int)$/.test(s) ? '#64D2FF' : /^\d+$/.test(s) ? '#FFD60A' : 'rgba(255,255,255,0.92)'}}>{s}</span>
  ));

const Milestone: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const code: string[] = p.code ?? [];
  const total = code.join('\n').length;
  const typed = Math.floor(total * prog(f, wf(p.code_from ?? 0), Math.max(8, wf(p.code_to ?? 0) + 14 - wf(p.code_from ?? 0))));
  let left = typed;
  const lines = code.map((l) => {
    const n = Math.max(0, Math.min(l.length, left));
    left -= l.length + 1;
    return l.slice(0, n);
  });
  const lead = p.lead;
  const leadOut = lead ? 1 - prog(f, wf(p.year?.at) - 6, 8) : 0;
  const kw = pop(f, wf(p.keyword?.at) - 2, 12, 170, 0.7);
  const activeLine = lines.findIndex((x, k) => x.length < code[k].length);
  return (
    <>
      {lead && <div style={{position: 'absolute', left: 0, right: 0, top: 380, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 190, letterSpacing: -7, color: '#fff', ...blurIn(prog(f, wf(lead.at) - 2, 14), 30, 10), opacity: prog(f, wf(lead.at) - 2, 12) * leadOut}}>{lead.text}</div>}
      {p.year && <div style={{position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 250, letterSpacing: -10, ...blurIn(prog(f, wf(p.year.at), 16)), ...grad('#ffffff', 'rgba(255,255,255,0.35)')}}>{p.year.text}</div>}
      {p.label && <div style={{position: 'absolute', left: 0, right: 0, top: 545, textAlign: 'center', fontFamily: 'Inter', fontWeight: 600, fontSize: 40, letterSpacing: 6, color: C.dim, textTransform: 'uppercase', opacity: prog(f, wf(p.label.at), 12)}}>{p.label.text}</div>}
      {p.keyword && <div style={{position: 'absolute', left: 0, right: 0, top: 600, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 200, letterSpacing: -8, transform: `scale(${0.8 + 0.2 * kw})`, opacity: interpolate(f, [wf(p.keyword.at) - 3, wf(p.keyword.at)], [0, 1], clamp), filter: 'drop-shadow(0 0 50px rgba(118,185,0,0.6))', ...grad(C.green, C.lime)}}>{p.keyword.text}</div>}
      {code.length > 0 && (
        <Glass style={{left: 70, width: 940, top: 810, height: 320, opacity: prog(f, 4, 16), transform: `translateY(${(1 - prog(f, 4, 16)) * 40}px)`}} radius={36}>
          <div style={{position: 'absolute', left: 36, top: 26, display: 'flex', gap: 10}}>{['#FF5F57', '#FEBC2E', '#28C840'].map((c) => <div key={c} style={{width: 16, height: 16, borderRadius: 8, background: c}} />)}</div>
          <pre style={{position: 'absolute', left: 36, top: 62, margin: 0, fontFamily: 'JBMono, monospace', fontWeight: 500, fontSize: 34, lineHeight: '48px', whiteSpace: 'pre'}}>
            {lines.map((l, i) => <div key={i} style={{height: 48}}>{colorize(l)}{i === (activeLine < 0 ? code.length - 1 : activeLine) && Math.floor(f / 8) % 2 === 0 ? <span style={{color: C.green}}>▌</span> : null}</div>)}
          </pre>
        </Glass>
      )}
    </>
  );
};

const CountGrid: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const t0 = wf(p.at) - 2;
  const pr = progIO(f, t0, 44);
  const n = p.dots ?? 60, cols = p.cols ?? 10;
  return (
    <>
      <Tag top={190} p={prog(f, 0, 12)}>{p.kicker}</Tag>
      <div style={{position: 'absolute', left: 0, right: 0, top: 230, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 320, letterSpacing: -14, fontVariantNumeric: 'tabular-nums', ...blurIn(prog(f, 4, 14), 30, 10), ...grad('#ffffff', 'rgba(255,255,255,0.55)')}}>
        {fmt((p.value ?? 0) * pr, p.decimals ?? 1)}<span style={grad(C.green, C.lime)}>{p.suffix}</span>
      </div>
      <div style={{position: 'absolute', left: 0, right: 0, top: 560, textAlign: 'center', fontFamily: 'Inter', fontWeight: 500, fontSize: 48, color: C.dim, opacity: prog(f, wf(p.label_at ?? p.at), 12)}}>{p.label}</div>
      <div style={{position: 'absolute', left: 176, top: 660, width: 728, height: 440}}>
        {Array.from({length: n}).map((_, i) => {
          const s = pop(f, t0 + (i / n) * 40, 12, 220, 0.5);
          return <div key={i} style={{position: 'absolute', left: (i % cols) * 76, top: Math.floor(i / cols) * 76, width: 44, height: 44, borderRadius: 22, transform: `scale(${s})`, opacity: Math.min(1, s), background: `radial-gradient(circle at 35% 30%, ${C.lime}, ${C.green})`, boxShadow: '0 0 18px rgba(118,185,0,0.5)'}} />;
        })}
      </div>
      {p.source && <Tag top={1090} p={prog(f, 20, 14) * 0.9}>{p.source}</Tag>}
    </>
  );
};

const SwitchCost: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const widths = [0.9, 0.7, 0.95, 0.55, 0.8, 0.65, 0.92, 0.5, 0.75];
  const fillP = progIO(f, wf(p.fill) - 2, 40);
  const arrow = pop(f, wf(p.arrow), 14, 160, 0.8);
  return (
    <>
      <Tag top={300} p={prog(f, 0, 12)}>{p.title}</Tag>
      <Glass style={{left: 60, top: 380, width: 410, height: 560, opacity: prog(f, 2, 14), transform: `translateX(${(1 - prog(f, 2, 14)) * -40}px)`}} radius={40}>
        <div style={{position: 'absolute', left: 32, top: 28, fontFamily: 'Inter', fontWeight: 600, fontSize: 36, color: C.dim}}>{p.from?.label}</div>
        {widths.map((w, i) => <div key={i} style={{position: 'absolute', left: 32, top: 110 + i * 48, height: 28, width: 346 * w * prog(f, 6 + i * 2, 14), borderRadius: 14, background: `linear-gradient(90deg, ${C.green}, ${C.lime})`}} />)}
      </Glass>
      <div style={{position: 'absolute', left: 470, width: 140, top: 620, textAlign: 'center', fontFamily: DISPLAY, fontSize: 90, fontWeight: 700, color: '#fff', transform: `scale(${arrow})`}}>→</div>
      <Glass style={{left: 610, top: 380, width: 410, height: 560, opacity: prog(f, wf(p.arrow), 14), transform: `translateX(${(1 - prog(f, wf(p.arrow), 14)) * 40}px)`}} radius={40}>
        <div style={{position: 'absolute', left: 32, top: 28, fontFamily: 'Inter', fontWeight: 600, fontSize: 36, color: C.dim}}>{p.to?.label}</div>
        {widths.map((w, i) => {
          const rp = Math.max(0, Math.min(1, fillP * (widths.length + 1) - i));
          return (
            <div key={i} style={{position: 'absolute', left: 32, top: 110 + i * 48, height: 28, width: 346 * w, borderRadius: 14, border: '2.5px dashed rgba(255,69,58,0.55)', boxSizing: 'border-box'}}>
              <div style={{height: '100%', width: `${rp * 100}%`, borderRadius: 14, background: `linear-gradient(90deg, ${C.red}, ${C.orange})`}} />
            </div>
          );
        })}
      </Glass>
      {p.stamp && <div style={{position: 'absolute', left: 610, width: 410, top: 975, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 56, opacity: prog(f, wf(p.stamp.at), 12), ...grad(C.red, C.orange)}}>{p.stamp.text}</div>}
    </>
  );
};

const Statement: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const strike = prog(f, wf(p.strike?.at) + 2, 14);
  const hl = p.highlight;
  const code = pop(f, wf(hl?.at) - 2, 13, 150, 0.8);
  const icon = pop(f, wf(hl?.at) + 6, 12, 160, 0.7);
  const lines: any[] = p.lines ?? [];
  return (
    <>
      {lines.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: 90, top: i === 0 ? 300 : 410, fontFamily: DISPLAY, fontWeight: i === 0 ? 700 : 800, fontSize: i === 0 ? 100 : 150, letterSpacing: i === 0 ? -3 : -5, color: i === 0 ? C.dim : '#fff', ...blurIn(prog(f, wf(l.at), 14), 24, 8)}}>
          <span style={{position: 'relative', display: 'inline-block', opacity: p.strike?.line === i ? 1 - 0.55 * strike : 1}}>
            {l.text}
            {p.strike?.line === i && <span style={strikeBar(`${strike * 104}%`, {left: -10})} />}
          </span>
        </div>
      ))}
      {hl && <div style={{position: 'absolute', left: 90, top: 640, fontFamily: DISPLAY, fontWeight: 800, fontSize: 150, letterSpacing: -5, transform: `scale(${0.85 + 0.15 * code})`, transformOrigin: 'left center', opacity: interpolate(f, [wf(hl.at) - 3, wf(hl.at)], [0, 1], clamp), filter: 'drop-shadow(0 0 50px rgba(118,185,0,0.45))', ...grad(C.green, C.lime)}}>{hl.text}</div>}
      {p.icon === 'code' && (
        <Glass style={{left: 90, top: 880, width: 220, height: 200, transform: `scale(${icon})`, transformOrigin: 'left center'}} radius={50}>
          <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'JBMono, monospace', fontWeight: 700, fontSize: 104, color: C.lime}}>{'</>'}</div>
        </Glass>
      )}
    </>
  );
};

const CtaEnd: TemplateComp = ({ctx, p}) => {
  const {f, spec} = ctx;
  const cta = {...spec.cta, ...p};
  const enter = pop(f, 6, 14, 150, 0.9);
  const pulse = 1 + 0.03 * Math.sin(f / 5);
  const label = cta.type === 'follow' ? 'Follow' : cta.type === 'link' ? 'Link in bio' : `Comment “${cta.keyword ?? ''}”`;
  return (
    <>
      <div style={{position: 'absolute', left: 70, right: 70, top: 590, textAlign: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 118, lineHeight: 1.02, letterSpacing: -4, color: '#fff', ...blurIn(prog(f, 2, 16), 30, 10)}}>{cta.headline}</div>
      {cta.sub && <div style={{position: 'absolute', left: 80, right: 80, top: 860, textAlign: 'center', fontFamily: 'Inter', fontWeight: 500, fontSize: 44, lineHeight: 1.25, color: C.dim, opacity: prog(f, 14, 14)}}>{cta.sub}</div>}
      <Glass style={{left: 260, width: 560, top: 985, height: 140, transform: `scale(${enter * pulse})`, background: `linear-gradient(135deg, ${C.green}, ${C.lime})`, border: 'none', boxShadow: `0 0 60px rgba(118,185,0,${0.35 + 0.15 * Math.sin(f / 6)})`}} radius={70}>
        <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 800, fontSize: 62, color: '#0b1200', letterSpacing: -1}}>{label}</div>
      </Glass>
    </>
  );
};

export const applePack: Pack = {
  id: 'apple',
  Bg,
  templates: {hook_stamp: HookStamp, cards: Cards, share: Share, milestone: Milestone, count_grid: CountGrid, switch_cost: SwitchCost, statement: Statement, cta_end: CtaEnd},
  caption: {
    fontSize: 62, fontFamily: DISPLAY, weight: 800, letterSpacing: -2, maxWords: 3, gap: 18,
    word: ({active, past, progress}) => ({color: active ? '#fff' : past ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.38)', transform: `scale(${active ? 1 + 0.06 * progress : 1})`, textShadow: active ? '0 0 34px rgba(255,255,255,0.35)' : '0 4px 18px rgba(0,0,0,0.5)'}),
  },
  accent: C.lime,
  particles: [C.lime, C.green, '#ffffff', C.blue, C.orange],
};
