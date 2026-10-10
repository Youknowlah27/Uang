import React from 'react';
import {AbsoluteFill, Img, staticFile, interpolate} from 'remotion';
import {clamp, pop, prog, progIO, fmt} from '../../lib/anim';
import type {Pack, TemplateComp} from '../../lib/pack';

/**
 * STYLE PACK — "Data Journalism"
 * Warm newsprint, serif headlines, small-caps chart furniture, ONE highlight colour (claret) vs muted greys,
 * thin rules, direct labels, sourced footers. Numbers are the hero.
 */
export const K = {paper: '#FFF1E5', ink: '#33302E', mute: '#7A736E', rule: '#D9C9BB', claret: '#990F3D', teal: '#0D7680', gray: '#CCC1B7', pink: '#FFB3C9'};
const SERIF = 'Playfair, Georgia, serif';
const rise = (p: number, dy = 26): React.CSSProperties => ({opacity: p, transform: `translateY(${(1 - p) * dy}px)`});

const Bg: React.FC<{gf: number; total: number}> = ({gf, total}) => (
  <AbsoluteFill style={{background: K.paper}} data-decor>
    <Img src={staticFile('tex/newsprint.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
    <div style={{position: 'absolute', top: 92, left: 70, right: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter'}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14}}><div style={{width: 26, height: 26, background: K.claret}} /><div style={{fontWeight: 800, fontSize: 30, letterSpacing: 4, color: K.ink}}>THE BREAKDOWN</div></div>
      <div style={{fontWeight: 600, fontSize: 24, letterSpacing: 3, color: K.mute}}>BUSINESS · TECH</div>
    </div>
    <div style={{position: 'absolute', top: 146, left: 70, right: 70, height: 6, background: K.rule}}><div style={{height: '100%', width: `${(gf / Math.max(1, total * 30)) * 100}%`, background: K.ink}} /></div>
  </AbsoluteFill>
);

const Title: React.FC<{top?: number; title: string; sub?: string; p: number}> = ({top = 250, title, sub, p}) => (
  <div style={{position: 'absolute', left: 70, right: 70, top, ...rise(p, 18)}}>
    <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 66, lineHeight: 1.08, color: K.ink}}>{title}</div>
    {sub && <div style={{fontFamily: 'Inter', fontWeight: 500, fontSize: 34, color: K.mute, marginTop: 14}}>{sub}</div>}
  </div>
);
const Source: React.FC<{text: string; p: number; top?: number}> = ({text, p, top = 1085}) => (
  <div style={{position: 'absolute', left: 70, right: 70, top, fontFamily: 'Inter', fontWeight: 500, fontSize: 28, color: K.mute, borderTop: `2px solid ${K.rule}`, paddingTop: 14, opacity: p}}>{text}</div>
);

const HookStamp: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const strike = prog(f, wf(p.strike?.at) + 2, 14);
  const wrong = pop(f, wf(p.stamp?.at) - 2, 10, 170, 0.7);
  const lines: any[] = p.lines ?? [];
  return (
    <>
      <div style={{position: 'absolute', left: 70, top: 250, fontFamily: 'Inter', fontWeight: 800, fontSize: 28, letterSpacing: 5, color: K.claret, ...rise(prog(f, 0, 12), 12)}}>{p.label ?? 'THE CONVENTIONAL WISDOM'}</div>
      {p.kicker && <div style={{position: 'absolute', left: 70, top: 320, fontFamily: SERIF, fontWeight: 900, fontSize: 104, lineHeight: 1.04, color: K.ink, letterSpacing: -2, ...rise(prog(f, wf(p.kicker.at), 14), 30)}}>{p.kicker.text}</div>}
      {lines.map((l, i) => (
        <div key={i} style={{position: 'absolute', left: 70, top: 440 + i * 112, ...rise(prog(f, wf(l.at), 14), 30)}}>
          <div style={{position: 'relative', display: 'inline-block', fontFamily: SERIF, fontWeight: 900, fontSize: 104, lineHeight: 1.04, color: K.ink, letterSpacing: -2}}>
            <span style={{opacity: p.strike?.line === i ? 1 - 0.5 * strike : 1}}>{l.text}</span>
            {p.strike?.line === i && <div style={{position: 'absolute', left: 0, top: '56%', height: 14, width: `${strike * 104}%`, background: K.claret, transform: 'rotate(-1.5deg)'}} />}
          </div>
        </div>
      ))}
      {p.stamp && <div style={{position: 'absolute', left: 95, top: 720, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 175, color: K.claret, letterSpacing: -3, transform: `scale(${0.6 + 0.4 * wrong}) rotate(${-5 + (1 - wrong) * 6}deg)`, transformOrigin: 'left center', opacity: interpolate(f, [wf(p.stamp.at) - 3, wf(p.stamp.at)], [0, 1], clamp)}}>{p.stamp.text}</div>}
    </>
  );
};

const Cards: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const items: any[] = p.items ?? [];
  const brace = prog(f, wf(p.note?.at ?? p.check_at), 18);
  return (
    <>
      <Title p={prog(f, 0, 14)} title={p.title ?? p.kicker} sub={p.subtitle} />
      {items.map((r, i) => (
        <div key={i} style={{position: 'absolute', left: 70, width: 800, top: 500 + i * 170, height: 130, borderBottom: `2px solid ${K.rule}`, display: 'flex', alignItems: 'flex-end', paddingBottom: 18, fontFamily: 'Inter', ...rise(prog(f, wf(r.at) - 2, 14), 24)}}>
          <div style={{fontWeight: 800, fontSize: 70, color: K.ink, letterSpacing: -1}}>{r.name}</div>
          <div style={{flex: 1, borderBottom: `4px dotted ${K.gray}`, margin: '0 18px 14px'}} />
          <div style={{fontWeight: 500, fontSize: 46, color: K.mute}}>{r.sub}</div>
        </div>
      ))}
      <div style={{position: 'absolute', left: 890, top: 500, width: 120, height: 400}}>
        <svg width="120" height="400" viewBox="0 0 120 400" fill="none" stroke={K.claret} strokeWidth="6" strokeLinecap="round"><path d="M10 10 C 60 10, 60 20, 60 70 L 60 130 C 60 180, 70 200, 100 200 C 70 200, 60 220, 60 270 L 60 330 C 60 380, 50 390, 10 390" strokeDasharray="900" strokeDashoffset={900 * (1 - brace)} /></svg>
      </div>
      {p.note && <div style={{position: 'absolute', left: 70, top: 1000, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 70, color: K.claret, opacity: prog(f, wf(p.note.at) + 6, 14)}}>{p.note.text}</div>}
    </>
  );
};

const Bar: React.FC<{d: any; p: number; show: number}> = ({d, p, show}) => {
  const W = 940, total = d.main + d.rest, share = d.main / total, dcW = W * share * p;
  return (
    <div style={{opacity: show, transform: `translateY(${(1 - show) * 20}px)`, width: W}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <div><div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 46, color: K.ink}}>{d.label}</div><div style={{fontFamily: 'Inter', fontWeight: 500, fontSize: 28, color: K.mute}}>{d.sub}</div></div>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 96, lineHeight: 0.9, color: K.claret, fontVariantNumeric: 'tabular-nums', opacity: p > 0.15 ? 1 : 0}}>{fmt(share * 100 * p, 1)}%</div>
      </div>
      <div style={{position: 'relative', width: W, height: 112, background: K.gray, marginTop: 14}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: dcW, background: K.claret, display: 'flex', alignItems: 'center', paddingLeft: 24, fontFamily: 'Inter', fontWeight: 800, fontSize: 44, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden'}}>{d.main_label} ${fmt(d.main, 1)}B</div>
      </div>
      <div style={{textAlign: 'right', marginTop: 8, fontFamily: 'Inter', fontWeight: 600, fontSize: 30, color: K.mute, opacity: p > 0.9 ? 1 : 0}}>Everything else ${fmt(d.rest, 1)}B</div>
    </div>
  );
};
const Share: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const p1 = progIO(f, wf(p.primary?.at ?? p.at) - 4, 30);
  const p2 = progIO(f, wf(p.secondary?.at), 26);
  return (
    <>
      <Title p={prog(f, 0, 14)} title={p.title} sub={p.subtitle} />
      <div style={{position: 'absolute', left: 70, top: 440}}>{p.primary && <Bar d={p.primary} p={p1} show={prog(f, 6, 14)} />}</div>
      {p.secondary && <div style={{position: 'absolute', left: 70, top: 780}}><Bar d={p.secondary} p={p2} show={prog(f, wf(p.secondary.at) - 6, 14)} /></div>}
      {p.source && <Source p={prog(f, 12, 14)} text={p.source} top={1085} />}
    </>
  );
};

const Milestone: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const x0 = 135, x1 = 945, y = 760;
  const sp = p.span ?? {from: 2006, to: 2026};
  const line = progIO(f, wf(p.year?.at ?? p.marker?.at), 52);
  const m1 = pop(f, wf(p.marker?.at ?? p.year?.at), 12, 180, 0.7);
  const m2 = pop(f, wf(p.keyword?.at) + 2, 12, 180, 0.7);
  const years = Array.from({length: sp.to - sp.from + 1}, (_, i) => sp.from + i);
  const mid = Math.round((sp.from + sp.to) / 2);
  return (
    <>
      <Title p={prog(f, 0, 14)} title={p.title ?? p.lead?.text ?? ''} sub={p.subtitle} />
      <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0}}>
        <line x1={x0} y1={y} x2={x1} y2={y} stroke={K.rule} strokeWidth="6" />
        <line x1={x0} y1={y} x2={x0 + (x1 - x0) * line} y2={y} stroke={K.claret} strokeWidth="10" />
        {years.map((yr, i) => {
          const x = x0 + ((x1 - x0) * i) / (years.length - 1);
          const major = yr === sp.from || yr === mid || yr === sp.to;
          return <line key={yr} x1={x} y1={y - (major ? 20 : 10)} x2={x} y2={y + (major ? 20 : 10)} stroke={K.mute} strokeWidth={major ? 4 : 2} opacity={prog(f, 4 + i, 8)} />;
        })}
        <circle cx={x0} cy={y} r={20 * m1} fill={K.claret} />
        <circle cx={x1} cy={y} r={20 * m2} fill={K.claret} />
      </svg>
      {[sp.from, mid, sp.to].map((yr, i) => <div key={yr} style={{position: 'absolute', left: x0 + ((x1 - x0) * i) / 2 - 80, top: y + 38, width: 160, textAlign: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: 38, color: K.mute, opacity: prog(f, 6 + i * 4, 10)}}>{yr}</div>)}
      <div style={{position: 'absolute', left: x0 - 20, top: y - 230, width: 640, fontFamily: SERIF, fontWeight: 900, fontSize: 84, color: K.ink, lineHeight: 1.05, opacity: m1, transform: `scale(${0.9 + 0.1 * m1})`, transformOrigin: 'left bottom'}}>
        {p.keyword?.text}<span style={{color: K.claret}}> {p.marker?.label?.replace(p.keyword?.text ?? '', '').trim() || 'announced'}</span>
      </div>
      {sp.text && <div style={{position: 'absolute', left: 0, right: 100, top: y - 100, textAlign: 'right', fontFamily: 'Inter', fontWeight: 800, fontSize: 44, letterSpacing: 4, color: K.claret, opacity: prog(f, wf(p.span?.at), 14)}}>{sp.text}</div>}
      {p.source && <Source p={prog(f, 20, 14)} text={p.source} top={1085} />}
    </>
  );
};

const CountGrid: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const t0 = wf(p.at) - 2;
  const pr = progIO(f, t0, 44);
  const n = p.dots ?? 60, cols = Math.ceil(n / 4);
  return (
    <>
      <Title p={prog(f, 0, 14)} title={p.kicker} sub={p.per_dot} />
      <div style={{position: 'absolute', left: 70, top: 440, fontFamily: SERIF, fontWeight: 900, fontSize: 260, lineHeight: 1, color: K.ink, letterSpacing: -6, fontVariantNumeric: 'tabular-nums', opacity: prog(f, 4, 14)}}>{fmt((p.value ?? 0) * pr, p.decimals ?? 1)}<span style={{color: K.claret}}>{p.suffix}</span></div>
      <div style={{position: 'absolute', left: 80, top: 720, width: 920, height: 360}}>
        {Array.from({length: n}).map((_, i) => {
          const s = pop(f, t0 + (i / n) * 40, 14, 220, 0.5);
          return <div key={i} style={{position: 'absolute', left: (i % cols) * 62, top: Math.floor(i / cols) * 84, width: 40, height: 40, borderRadius: 20, background: K.teal, transform: `scale(${s})`, opacity: Math.min(1, s)}} />;
        })}
      </div>
      {p.source && <Source p={prog(f, 20, 14)} text={p.source} top={1085} />}
    </>
  );
};

const SwitchCost: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const rows: any[] = p.rows ?? [];
  return (
    <>
      <Title p={prog(f, 0, 14)} title={p.title} />
      {rows.map((r, i) => {
        const pp = prog(f, wf(r.at), 14), tagP = pop(f, wf(r.at) + 8, 12, 200, 0.6);
        return (
          <div key={i} style={{position: 'absolute', left: 70, right: 70, top: 440 + i * 165, height: 140, borderBottom: `2px solid ${K.rule}`, fontFamily: 'Inter', ...rise(pp, 24)}}>
            <div style={{position: 'absolute', left: 0, top: 6, fontWeight: 800, fontSize: 62, color: K.ink, letterSpacing: -1}}>{r.k}</div>
            <div style={{position: 'absolute', left: 0, top: 86, fontWeight: 500, fontSize: 34, color: K.mute}}>{r.v}</div>
            <div style={{position: 'absolute', right: 0, top: 22, padding: '10px 22px', background: K.claret, color: '#fff', fontWeight: 800, fontSize: 36, letterSpacing: 3, transform: `scale(${tagP})`, transformOrigin: 'right center'}}>{r.tag}</div>
          </div>
        );
      })}
    </>
  );
};

const Statement: TemplateComp = ({ctx, p}) => {
  const {f, wf} = ctx;
  const strike = prog(f, wf(p.strike?.at) + 2, 14);
  const hl = p.highlight;
  const hlP = prog(f, wf(hl?.at) + 2, 16);
  const code = pop(f, wf(hl?.at) - 2, 12, 150, 0.8);
  const lines: any[] = p.lines ?? [];
  const struckIdx = p.strike?.line ?? -1;
  return (
    <>
      <div style={{position: 'absolute', left: 70, top: 330, fontFamily: 'Inter', fontWeight: 800, fontSize: 28, letterSpacing: 5, color: K.claret, ...rise(prog(f, 0, 12), 12)}}>{(p.kicker ?? 'The takeaway').toUpperCase()}</div>
      <div style={{position: 'absolute', left: 70, top: 400, fontFamily: SERIF, fontWeight: 900, fontSize: 118, lineHeight: 1.04, color: K.ink, letterSpacing: -2}}>
        {lines.map((l, i) => (
          <div key={i} style={{...rise(prog(f, wf(l.at), 14), 30)}}>
            <span style={{position: 'relative', display: 'inline-block'}}>
              <span style={{opacity: struckIdx === i ? 1 - 0.5 * strike : 1}}>{l.text}</span>
              {struckIdx === i && <span style={{position: 'absolute', left: -6, top: '56%', height: 14, width: `${strike * 104}%`, background: K.claret, transform: 'rotate(-1deg)'}} />}
            </span>
          </div>
        ))}
      </div>
      {hl && (
        <div style={{position: 'absolute', left: 70, top: 700, transform: `scale(${0.88 + 0.12 * code})`, transformOrigin: 'left center', opacity: interpolate(f, [wf(hl.at) - 3, wf(hl.at)], [0, 1], clamp)}}>
          <div style={{position: 'relative', display: 'inline-block', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 150, color: K.claret, letterSpacing: -3}}>
            <div style={{position: 'absolute', left: -8, bottom: 8, height: 40, background: K.pink, width: `${hlP * 104}%`, zIndex: 0, opacity: 0.8}} />
            <span style={{position: 'relative', zIndex: 1}}>{hl.text}</span>
          </div>
        </div>
      )}
    </>
  );
};

const CtaEnd: TemplateComp = ({ctx, p}) => {
  const {f, spec} = ctx;
  const cta = {...spec.cta, ...p};
  const enter = pop(f, 6, 14, 150, 0.9);
  const label = cta.type === 'follow' ? 'FOLLOW' : cta.type === 'link' ? 'LINK IN BIO' : `COMMENT “${(cta.keyword ?? '').toUpperCase()}”`;
  return (
    <>
      <div style={{position: 'absolute', left: 70, right: 70, top: 600, fontFamily: SERIF, fontWeight: 900, fontSize: 112, lineHeight: 1.04, color: K.ink, letterSpacing: -2, ...rise(prog(f, 2, 16), 30)}}>{cta.headline}</div>
      {cta.sub && <div style={{position: 'absolute', left: 70, right: 70, top: 850, fontFamily: 'Inter', fontWeight: 500, fontSize: 42, color: K.mute, lineHeight: 1.25, opacity: prog(f, 14, 14)}}>{cta.sub}</div>}
      <div style={{position: 'absolute', left: 70, top: 980, padding: '22px 50px', background: K.claret, color: '#fff', fontFamily: 'Inter', fontWeight: 800, fontSize: 58, letterSpacing: 5, boxShadow: `10px 10px 0 ${K.ink}`, transform: `scale(${enter * (1 + 0.025 * Math.sin(f / 5))})`, transformOrigin: 'left center'}}>{label}</div>
    </>
  );
};

export const dataPack: Pack = {
  id: 'data',
  Bg,
  templates: {hook_stamp: HookStamp, cards: Cards, share: Share, milestone: Milestone, count_grid: CountGrid, switch_cost: SwitchCost, statement: Statement, cta_end: CtaEnd},
  caption: {
    fontSize: 58, fontFamily: 'Inter', weight: 800, letterSpacing: -1, maxWords: 3, gap: 16,
    chunk: () => ({background: K.ink, padding: '14px 28px 18px', boxShadow: `8px 8px 0 ${K.claret}`}),
    word: ({active, past}) => ({color: active ? K.pink : past ? '#FFF1E5' : 'rgba(255,241,229,0.55)'}),
  },
  accent: K.claret,
  particles: [K.claret, K.teal, K.ink, K.pink, '#E6B422'],
};
