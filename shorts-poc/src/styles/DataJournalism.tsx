import React from 'react';
import {AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, interpolate} from 'remotion';
import {DURATION} from '../common/timeline';
import {FontLoader} from '../common/fonts';
import {Captions, CaptionSkin} from '../common/Captions';
import {Scene} from '../common/Scene';
import {clamp, pop, prog, progIO, fmt} from '../common/anim';

/**
 * STYLE PACK 2 — "Data Journalism"
 * Warm newsprint canvas, serif headlines (Playfair), small-caps chart furniture, one highlight colour (claret)
 * against muted greys, thin rules, direct labels, sourced footers. Built to make numbers the hero.
 */
const K = {
  paper: '#FFF1E5', ink: '#33302E', mute: '#7A736E', rule: '#D9C9BB', claret: '#990F3D', teal: '#0D7680', blue: '#0F5499', gray: '#CCC1B7', pink: '#FFB3C9',
};
const SERIF = 'Playfair, Georgia, serif';

const rise = (p: number, dy = 26): React.CSSProperties => ({opacity: p, transform: `translateY(${(1 - p) * dy}px)`});

const Header: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      <div style={{position: 'absolute', top: 92, left: 70, right: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'Inter'}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 14}}>
          <div style={{width: 26, height: 26, background: K.claret}} />
          <div style={{fontWeight: 800, fontSize: 30, letterSpacing: 4, color: K.ink}}>THE BREAKDOWN</div>
        </div>
        <div style={{fontWeight: 600, fontSize: 24, letterSpacing: 3, color: K.mute}}>BUSINESS · TECH</div>
      </div>
      <div style={{position: 'absolute', top: 146, left: 70, right: 70, height: 6, background: K.rule}}>
        <div style={{height: '100%', width: `${(f / DURATION) * 100}%`, background: K.ink}} />
      </div>
    </>
  );
};

const Title: React.FC<{top?: number; title: string; sub?: string; p: number}> = ({top = 250, title, sub, p}) => (
  <div style={{position: 'absolute', left: 70, right: 70, top, ...rise(p, 18)}}>
    <div style={{fontFamily: SERIF, fontWeight: 700, fontSize: 66, lineHeight: 1.08, color: K.ink}}>{title}</div>
    {sub && <div style={{fontFamily: 'Inter', fontWeight: 500, fontSize: 34, color: K.mute, marginTop: 14}}>{sub}</div>}
  </div>
);
const Source: React.FC<{text: string; p: number; top?: number}> = ({text, p, top = 1085}) => (
  <div style={{position: 'absolute', left: 70, right: 70, top, fontFamily: 'Inter', fontWeight: 500, fontSize: 28, color: K.mute, borderTop: `2px solid ${K.rule}`, paddingTop: 14, opacity: p}}>{text}</div>
);

/* ------------------------------ scenes ------------------------------ */

const Hook: React.FC = () => (
  <Scene id="hook">{({f, wf}) => {
    const strike = prog(f, wf(6) + 2, 14);
    const wrong = pop(f, wf(7) - 2, 10, 170, 0.7);
    const line = (txt: string, at: number, top: number, extra?: React.ReactNode) => (
      <div style={{position: 'absolute', left: 70, top, fontFamily: SERIF, fontWeight: 900, fontSize: 124, lineHeight: 1.04, color: K.ink, letterSpacing: -2, ...rise(prog(f, at, 14), 30)}}>
        {txt}{extra}
      </div>
    );
    return (
      <>
        <div style={{position: 'absolute', left: 70, top: 250, fontFamily: 'Inter', fontWeight: 800, fontSize: 28, letterSpacing: 5, color: K.claret, ...rise(prog(f, 0, 12), 12)}}>THE CONVENTIONAL WISDOM</div>
        {line('Everyone thinks', wf(0), 320)}
        {line('Nvidia wins', wf(2), 450)}
        <div style={{position: 'absolute', left: 70, top: 580, ...rise(prog(f, wf(4), 14), 30)}}>
          <div style={{position: 'relative', display: 'inline-block', fontFamily: SERIF, fontWeight: 900, fontSize: 124, lineHeight: 1.04, color: K.ink, letterSpacing: -2}}>
            on <span style={{opacity: 1 - 0.5 * strike}}>chips.</span>
            <div style={{position: 'absolute', left: 150, top: '56%', height: 14, width: `${strike * 370}px`, background: K.claret, transform: 'rotate(-1.5deg)'}} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 70, top: 790, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 190, color: K.claret, letterSpacing: -3, transform: `scale(${0.6 + 0.4 * wrong}) rotate(${-5 + (1 - wrong) * 6}deg)`, transformOrigin: 'left center', opacity: interpolate(f, [wf(7) - 3, wf(7)], [0, 1], clamp)}}>
          Wrong.
        </div>
      </>
    );
  }}</Scene>
);

const Rivals: React.FC = () => (
  <Scene id="rivals">{({f, wf}) => {
    const rows = [
      {name: 'AMD', prod: 'Instinct GPUs', at: wf(0)},
      {name: 'Google', prod: 'TPU', at: wf(1)},
      {name: 'Amazon', prod: 'Trainium', at: wf(3)},
    ];
    const brace = prog(f, wf(6), 18);
    return (
      <>
        <Title p={prog(f, 0, 14)} title="Who builds AI accelerators?" sub="Selected competing silicon" />
        {rows.map((r, i) => {
          const p = prog(f, r.at - 2, 14);
          return (
            <div key={r.name} style={{position: 'absolute', left: 70, width: 800, top: 500 + i * 170, height: 130, borderBottom: `2px solid ${K.rule}`, display: 'flex', alignItems: 'flex-end', paddingBottom: 18, fontFamily: 'Inter', ...rise(p, 24)}}>
              <div style={{fontWeight: 800, fontSize: 70, color: K.ink, letterSpacing: -1}}>{r.name}</div>
              <div style={{flex: 1, borderBottom: `4px dotted ${K.gray}`, margin: '0 18px 14px'}} />
              <div style={{fontWeight: 500, fontSize: 46, color: K.mute}}>{r.prod}</div>
            </div>
          );
        })}
        <div style={{position: 'absolute', left: 890, top: 500, width: 120, height: 400}}>
          <svg width="120" height="400" viewBox="0 0 120 400" fill="none" stroke={K.claret} strokeWidth="6" strokeLinecap="round">
            <path d="M10 10 C 60 10, 60 20, 60 70 L 60 130 C 60 180, 70 200, 100 200 C 70 200, 60 220, 60 270 L 60 330 C 60 380, 50 390, 10 390" strokeDasharray="900" strokeDashoffset={900 * (1 - brace)} />
          </svg>
        </div>
        <div style={{position: 'absolute', left: 70, top: 1000, fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 70, color: K.claret, opacity: prog(f, wf(6) + 6, 14)}}>Fast AI chips, all of them.</div>
      </>
    );
  }}</Scene>
);

const Bar: React.FC<{label: string; sub: string; dc: number; other: number; total: number; p: number; show: number}> = ({label, sub, dc, other, total, p, show}) => {
  const W = 940;
  const share = dc / total;
  const dcW = W * share * p;
  return (
    <div style={{opacity: show, transform: `translateY(${(1 - show) * 20}px)`, width: W}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
        <div>
          <div style={{fontFamily: 'Inter', fontWeight: 800, fontSize: 46, color: K.ink}}>{label}</div>
          <div style={{fontFamily: 'Inter', fontWeight: 500, fontSize: 28, color: K.mute}}>{sub}</div>
        </div>
        <div style={{fontFamily: SERIF, fontWeight: 900, fontSize: 96, lineHeight: 0.9, color: K.claret, fontVariantNumeric: 'tabular-nums', opacity: p > 0.15 ? 1 : 0}}>{fmt(share * 100 * p, 1)}%</div>
      </div>
      <div style={{position: 'relative', width: W, height: 112, background: K.gray, marginTop: 14}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: dcW, background: K.claret, display: 'flex', alignItems: 'center', paddingLeft: 24, fontFamily: 'Inter', fontWeight: 800, fontSize: 44, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden'}}>
          Data Center ${fmt(dc, 1)}B
        </div>
      </div>
      <div style={{textAlign: 'right', marginTop: 8, fontFamily: 'Inter', fontWeight: 600, fontSize: 30, color: K.mute, opacity: p > 0.9 ? 1 : 0}}>Everything else ${fmt(other, 1)}B</div>
    </div>
  );
};

const Money: React.FC = () => (
  <Scene id="money">{({f, wf}) => {
    const p1 = progIO(f, wf(5) - 4, 30);
    const p2 = progIO(f, wf(9), 26);
    return (
      <>
        <Title p={prog(f, 0, 14)} title="Data Center share of revenue" sub="% of Nvidia's total revenue" />
        <div style={{position: 'absolute', left: 70, top: 440}}>
          <Bar label="Fiscal 2026" sub="Year to Jan 25, 2026 · total $215.9B" dc={193.7} other={22.2} total={215.938} p={p1} show={prog(f, 6, 14)} />
        </div>
        <div style={{position: 'absolute', left: 70, top: 780}}>
          <Bar label="Q2 fiscal 2027" sub="Quarter to Jul 26, 2026 · total $96.2B" dc={89.023} other={7.198} total={96.221} p={p2} show={prog(f, wf(8), 14)} />
        </div>
        <Source p={prog(f, 12, 14)} text="Source: NVIDIA FY2026 results; Q2 FY2027 8-K filing" top={1110} />
      </>
    );
  }}</Scene>
);

const Cuda: React.FC = () => (
  <Scene id="cuda">{({f, wf}) => {
    const x0 = 100, x1 = 980, y = 760;
    const line = progIO(f, wf(4), 52);
    const m1 = pop(f, wf(4), 12, 180, 0.7);
    const m2 = pop(f, wf(7) + 2, 12, 180, 0.7);
    const years = Array.from({length: 21}, (_, i) => 2006 + i);
    return (
      <>
        <Title p={prog(f, 0, 14)} title="The reason: software" sub="CUDA — Nvidia's platform for programming its GPUs" />
        <div style={{position: 'absolute', left: 0, top: 0, right: 0, bottom: 0}}>
          <svg width="1080" height="1920" style={{position: 'absolute', left: 0, top: 0}}>
            <line x1={x0} y1={y} x2={x1} y2={y} stroke={K.rule} strokeWidth="6" />
            <line x1={x0} y1={y} x2={x0 + (x1 - x0) * line} y2={y} stroke={K.claret} strokeWidth="10" />
            {years.map((yr, i) => {
              const x = x0 + ((x1 - x0) * i) / 20;
              const major = yr % 10 === 6;
              return <line key={yr} x1={x} y1={y - (major ? 20 : 10)} x2={x} y2={y + (major ? 20 : 10)} stroke={K.mute} strokeWidth={major ? 4 : 2} opacity={prog(f, 4 + i, 8)} />;
            })}
            <circle cx={x0} cy={y} r={20 * m1} fill={K.claret} />
            <circle cx={x1} cy={y} r={20 * m2} fill={K.claret} />
          </svg>
          {[2006, 2016, 2026].map((yr, i) => (
            <div key={yr} style={{position: 'absolute', left: x0 + ((x1 - x0) * i) / 2 - 80, top: y + 38, width: 160, textAlign: 'center', fontFamily: 'Inter', fontWeight: 700, fontSize: 38, color: K.mute, opacity: prog(f, 6 + i * 4, 10)}}>{yr}</div>
          ))}
          <div style={{position: 'absolute', left: x0 - 20, top: y - 230, width: 640, fontFamily: SERIF, fontWeight: 900, fontSize: 84, color: K.ink, lineHeight: 1.05, opacity: m1, transform: `scale(${0.9 + 0.1 * m1})`, transformOrigin: 'left bottom'}}>
            CUDA<span style={{color: K.claret}}> announced</span>
          </div>
          <div style={{position: 'absolute', left: 0, right: 100, top: y - 100, textAlign: 'right', fontFamily: 'Inter', fontWeight: 800, fontSize: 44, letterSpacing: 4, color: K.claret, opacity: prog(f, wf(6), 14)}}>20 YEARS</div>
        </div>
        <Source p={prog(f, 20, 14)} text="Source: NVIDIA GTC 2026 (CUDA 20-year milestone)" top={1085} />
      </>
    );
  }}</Scene>
);

const Devs: React.FC = () => (
  <Scene id="devs">{({f, wf}) => {
    const t0 = wf(1) - 2;
    const p = progIO(f, t0, 44);
    return (
      <>
        <Title p={prog(f, 0, 14)} title="CUDA developers" sub="Each dot = 100,000 developers" />
        <div style={{position: 'absolute', left: 70, top: 440, fontFamily: SERIF, fontWeight: 900, fontSize: 260, lineHeight: 1, color: K.ink, letterSpacing: -6, fontVariantNumeric: 'tabular-nums', opacity: prog(f, 4, 14)}}>
          {fmt(6 * p, 1)}<span style={{color: K.claret}}>M</span>
        </div>
        <div style={{position: 'absolute', left: 80, top: 720, width: 920, height: 360}}>
          {Array.from({length: 60}).map((_, i) => {
            const col = i % 15, row = Math.floor(i / 15);
            const s = pop(f, t0 + (i / 60) * 40, 14, 220, 0.5);
            return <div key={i} style={{position: 'absolute', left: col * 62, top: row * 84, width: 40, height: 40, borderRadius: 20, background: K.teal, transform: `scale(${s})`, opacity: Math.min(1, s)}} />;
          })}
        </div>
        <Source p={prog(f, 20, 14)} text="Source: NVIDIA GTC 2026" top={1085} />
      </>
    );
  }}</Scene>
);

const Switch: React.FC = () => (
  <Scene id="switch">{({f, wf}) => {
    const rows = [
      {k: 'Libraries', v: 'cuDNN, cuBLAS and friends', tag: 'RE-PORT', at: wf(0)},
      {k: 'Custom kernels', v: 'CUDA C++ you wrote', tag: 'REWRITE', at: wf(3)},
      {k: 'Tooling', v: 'Profilers, debuggers', tag: 'RELEARN', at: wf(4)},
      {k: 'Team skills', v: 'Engineers fluent in CUDA', tag: 'RETRAIN', at: wf(5) + 2},
    ];
    return (
      <>
        <Title p={prog(f, 0, 14)} title="Leaving CUDA means redoing…" />
        {rows.map((r, i) => {
          const p = prog(f, r.at, 14);
          const tagP = pop(f, r.at + 8, 12, 200, 0.6);
          return (
            <div key={r.k} style={{position: 'absolute', left: 70, right: 70, top: 440 + i * 180, height: 150, borderBottom: `2px solid ${K.rule}`, fontFamily: 'Inter', ...rise(p, 24)}}>
              <div style={{position: 'absolute', left: 0, top: 6, fontWeight: 800, fontSize: 62, color: K.ink, letterSpacing: -1}}>{r.k}</div>
              <div style={{position: 'absolute', left: 0, top: 86, fontWeight: 500, fontSize: 34, color: K.mute}}>{r.v}</div>
              <div style={{position: 'absolute', right: 0, top: 22, padding: '10px 22px', background: K.claret, color: '#fff', fontWeight: 800, fontSize: 36, letterSpacing: 3, transform: `scale(${tagP})`, transformOrigin: 'right center'}}>{r.tag}</div>
            </div>
          );
        })}
      </>
    );
  }}</Scene>
);

const Payoff: React.FC = () => (
  <Scene id="payoff">{({f, wf}) => {
    const strike = prog(f, wf(4) + 2, 14);
    const hl = prog(f, wf(5) + 2, 16);
    const code = pop(f, wf(5) - 2, 12, 150, 0.8);
    return (
      <>
        <div style={{position: 'absolute', left: 70, top: 330, fontFamily: 'Inter', fontWeight: 800, fontSize: 28, letterSpacing: 5, color: K.claret, ...rise(prog(f, 0, 12), 12)}}>THE TAKEAWAY</div>
        <div style={{position: 'absolute', left: 70, top: 400, fontFamily: SERIF, fontWeight: 900, fontSize: 118, lineHeight: 1.04, color: K.ink, letterSpacing: -2, ...rise(prog(f, wf(0), 14), 30)}}>
          The moat isn't
          <div style={{position: 'relative', display: 'inline-block'}}>
            <span style={{opacity: 1 - 0.5 * strike}}>the chip.</span>
            <div style={{position: 'absolute', left: -10, top: '56%', height: 14, width: `${strike * 104}%`, background: K.claret, transform: 'rotate(-1deg)'}} />
          </div>
        </div>
        <div style={{position: 'absolute', left: 70, top: 700, transform: `scale(${0.88 + 0.12 * code})`, transformOrigin: 'left center', opacity: interpolate(f, [wf(5) - 3, wf(5)], [0, 1], clamp)}}>
          <div style={{position: 'relative', display: 'inline-block', fontFamily: SERIF, fontStyle: 'italic', fontWeight: 700, fontSize: 150, color: K.claret, letterSpacing: -3}}>
            <div style={{position: 'absolute', left: -8, right: -8, bottom: 8, height: 40, background: K.pink, width: `${hl * 104}%`, zIndex: 0, opacity: 0.8}} />
            <span style={{position: 'relative', zIndex: 1}}>It's the code.</span>
          </div>
        </div>
      </>
    );
  }}</Scene>
);

/* ------------------------------ composition ------------------------------ */

const skin: CaptionSkin = {
  top: 1255, fontSize: 68, fontFamily: 'Inter', weight: 800, letterSpacing: -1, maxWords: 3, gap: 18,
  chunk: () => ({background: K.ink, padding: '16px 30px 20px', boxShadow: `8px 8px 0 ${K.claret}`}),
  word: ({active, past}) => ({color: active ? K.pink : past ? '#FFF1E5' : 'rgba(255,241,229,0.55)'}),
};

export const DataJournalism: React.FC = () => (
  <AbsoluteFill style={{background: K.paper}}>
    <FontLoader />
    <Img src={staticFile('tex/newsprint.jpg')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%'}} />
    <Header />
    <Hook /><Rivals /><Money /><Cuda /><Devs /><Switch /><Payoff />
    <Captions skin={skin} />
    <Audio src={staticFile('voice.mp3')} />
  </AbsoluteFill>
);
