import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {FPS, cueTime, useSpec} from '../lib/timeline';
import {clamp, rnd} from '../lib/anim';

export type FxEvt = {f: number; kind: string; dur: number; intensity: number; seed: number};

/** vfx cues from the shared cue list (the same list the mixer reads for sfx) */
export const useFxEvents = (): FxEvt[] => {
  const spec = useSpec();
  return React.useMemo(
    () =>
      (spec.cues ?? [])
        .filter((c) => c.vfx)
        .map((c, i) => ({f: Math.round(cueTime(spec, c) * FPS), kind: c.vfx as string, dur: Math.max(2, Math.round((c.dur ?? 0.4) * FPS)), intensity: c.intensity ?? 1, seed: i + 1})),
    [spec],
  );
};

const active = (evts: FxEvt[], frame: number, kind: string) => evts.filter((e) => e.kind === kind && frame >= e.f && frame < e.f + e.dur);

/** Wraps bg + scenes + reactions (NOT captions/host): shake, zoom-punch and RGB-split glitch. */
export const FxWrapper: React.FC<{children: React.ReactNode}> = ({children}) => {
  const frame = useCurrentFrame();
  const evts = useFxEvents();
  let dx = 0, dy = 0, rot = 0, scale = 1, glitch = 0;
  for (const e of active(evts, frame, 'shake')) {
    const k = 1 - (frame - e.f) / e.dur;
    const amp = 20 * e.intensity * k * k;
    dx += (rnd(frame * 1.7 + e.seed) - 0.5) * 2 * amp;
    dy += (rnd(frame * 2.3 + e.seed * 3) - 0.5) * 2 * amp;
    rot += (rnd(frame * 3.1 + e.seed * 7) - 0.5) * amp * 0.12;
  }
  for (const e of active(evts, frame, 'punch')) {
    const t = (frame - e.f) / e.dur;
    scale += 0.05 * e.intensity * Math.sin(Math.PI * Math.min(1, t * 1.4)) * (1 - t);
  }
  for (const e of active(evts, frame, 'glitch')) glitch = Math.max(glitch, (1 - (frame - e.f) / e.dur) * 14 * e.intensity);
  return (
    <div style={{position: 'absolute', inset: 0, transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(${scale})`, transformOrigin: '50% 45%', filter: glitch > 0.2 ? 'url(#rgbsplit)' : undefined}}>
      {glitch > 0.2 && (
        <svg width="0" height="0" style={{position: 'absolute'}}>
          <filter id="rgbsplit" x="-5%" y="-5%" width="110%" height="110%" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g" />
            <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b" />
            <feOffset in="r" dx={glitch} dy="0" result="r2" />
            <feOffset in="b" dx={-glitch} dy="0" result="b2" />
            <feBlend in="r2" in2="g" mode="screen" result="rg" />
            <feBlend in="rg" in2="b2" mode="screen" />
          </filter>
        </svg>
      )}
      {children}
    </div>
  );
};

/** Pure decoration drawn above everything except captions. Everything here is data-decor (ignored by the safe-zone lint). */
export const FxOverlay: React.FC<{colors: string[]}> = ({colors}) => {
  const frame = useCurrentFrame();
  const evts = useFxEvents();
  const nodes: React.ReactNode[] = [];

  for (const e of active(evts, frame, 'flash')) {
    const k = 1 - (frame - e.f) / e.dur;
    nodes.push(<div key={'fl' + e.seed} style={{position: 'absolute', inset: 0, background: '#fff', opacity: 0.65 * e.intensity * k * k, mixBlendMode: 'screen'}} />);
  }
  for (const e of active(evts, frame, 'leak')) {
    const t = (frame - e.f) / e.dur;
    const x = interpolate(t, [0, 1], [-1500, 1300]);
    nodes.push(<div key={'lk' + e.seed} style={{position: 'absolute', top: -200, left: x, width: 1400, height: 2400, transform: 'rotate(18deg)', background: 'linear-gradient(90deg, transparent, rgba(255,170,70,0.55), rgba(255,70,130,0.35), transparent)', mixBlendMode: 'screen', opacity: Math.sin(Math.PI * t)}} />);
  }
  for (const e of active(evts, frame, 'speed')) {
    const t = (frame - e.f) / e.dur;
    nodes.push(
      <svg key={'sp' + e.seed} width="1080" height="1920" style={{position: 'absolute', inset: 0, opacity: 0.55 * (1 - t)}}>
        {Array.from({length: 40}).map((_, i) => {
          const a = rnd(i * 3.3 + e.seed) * Math.PI * 2, r0 = 380 + rnd(i) * 220 + t * 160, r1 = r0 + 160 + rnd(i * 1.7) * 260;
          return <line key={i} x1={540 + Math.cos(a) * r0} y1={900 + Math.sin(a) * r0 * 1.5} x2={540 + Math.cos(a) * r1} y2={900 + Math.sin(a) * r1 * 1.5} stroke="#fff" strokeWidth={2 + rnd(i * 5) * 3} strokeLinecap="round" />;
        })}
      </svg>,
    );
  }
  for (const e of active(evts, frame, 'sparks')) {
    const t = (frame - e.f) / e.dur;
    nodes.push(
      <svg key={'sk' + e.seed} width="1080" height="1920" style={{position: 'absolute', inset: 0}}>
        {Array.from({length: 26}).map((_, i) => {
          const a = rnd(i * 4.1 + e.seed) * Math.PI * 2, d0 = 60 + 380 * (1 - (1 - t) ** 2) * (0.5 + rnd(i * 2.2)), len = 36 * (1 - t) + 6;
          return <line key={i} x1={540 + Math.cos(a) * d0} y1={640 + Math.sin(a) * d0} x2={540 + Math.cos(a) * (d0 + len)} y2={640 + Math.sin(a) * (d0 + len)} stroke={colors[i % colors.length]} strokeWidth={6} strokeLinecap="round" opacity={1 - t} />;
        })}
      </svg>,
    );
  }
  for (const e of active(evts, frame, 'confetti')) {
    const t = (frame - e.f) / FPS;
    nodes.push(
      <div key={'cf' + e.seed} style={{position: 'absolute', inset: 0, overflow: 'hidden'}}>
        {Array.from({length: 70}).map((_, i) => {
          const ang = -Math.PI / 2 + (rnd(i * 1.3 + e.seed) - 0.5) * 1.5;
          const v = 800 + rnd(i * 2.1) * 900;
          const x = 540 + Math.cos(ang) * v * t + (rnd(i * 3.7) - 0.5) * 200;
          const y = 1000 + Math.sin(ang) * v * t + 0.5 * 2200 * t * t;
          const sz = 14 + rnd(i * 5.3) * 16;
          const fade = 1 - Math.max(0, (frame - e.f) / e.dur - 0.7) / 0.3;
          return <div key={i} style={{position: 'absolute', left: x, top: y, width: sz, height: sz * 0.55, background: colors[i % colors.length], transform: `rotate(${(rnd(i * 7.7) * 360 + t * 480 * (rnd(i) - 0.5) * 2)}deg)`, opacity: Math.max(0, Math.min(1, fade)), borderRadius: 3}} />;
        })}
      </div>,
    );
  }
  for (const e of active(evts, frame, 'pulse')) {
    const k = 1 - (frame - e.f) / e.dur;
    nodes.push(<div key={'pl' + e.seed} style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 220px rgba(255,255,255,${0.35 * k})`}} />);
  }
  return <div data-decor style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>{nodes}</div>;
};
