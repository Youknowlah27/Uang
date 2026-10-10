import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {FPS, useSpec} from './timeline';
import {clamp, ease} from './anim';
import {CAPTION} from './safe';
import type {CaptionSkin} from './pack';
import type {Word} from './types';

/** House caption skin: dark pill + white text + lime active word. Readable on any background → used for style "mix". */
export const houseSkin: CaptionSkin = {
  fontSize: 58, fontFamily: 'InterDisplay, Inter, sans-serif', weight: 800, letterSpacing: -1, maxWords: 3, gap: 16,
  chunk: () => ({background: 'rgba(18,18,24,0.86)', padding: '14px 28px 18px', borderRadius: 26, boxShadow: '0 10px 30px rgba(0,0,0,0.35)'}),
  word: ({active, past}) => ({color: active ? '#B6F23B' : past ? '#FFFFFF' : 'rgba(255,255,255,0.55)'}),
};

const chunkWords = (words: Word[], max: number): Word[][] => {
  const n = Math.ceil(words.length / max);
  const size = Math.ceil(words.length / n);
  const out: Word[][] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
  return out;
};

/** Burned-in word-by-word captions inside the caption band (bottom-safe) */
export const Captions: React.FC<{skin: CaptionSkin}> = ({skin}) => {
  const spec = useSpec();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const beats = spec.timeline.beats;
  if (t < beats[0].start - 0.04) return null;
  let beat = beats[0];
  for (const b of beats) if (t >= b.start - 0.04) beat = b;
  const chunks = chunkWords(beat.words, skin.maxWords ?? 3);
  let ci = 0;
  chunks.forEach((c, i) => {
    if (t >= c[0].s - 0.02) ci = i;
  });
  const chunk = chunks[ci];
  const enter = interpolate(t, [chunk[0].s - 0.02, chunk[0].s + 0.2], [0, 1], {...clamp, easing: ease});
  const activeIdx = chunk.reduce((acc, w, i) => (t >= w.s ? i : acc), 0);
  const lastEnd = beats[beats.length - 1].end;
  const fadeOut = interpolate(t, [lastEnd + 0.1, lastEnd + 0.35], [1, 0], clamp);
  return (
    <div data-caption style={{position: 'absolute', left: CAPTION.left, width: CAPTION.right - CAPTION.left, top: CAPTION.cy, transform: 'translateY(-50%)', display: 'flex', justifyContent: 'center', opacity: fadeOut}}>
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline', columnGap: skin.gap ?? 18, rowGap: 4,
        fontFamily: skin.fontFamily, fontWeight: skin.weight as any, fontSize: skin.fontSize, letterSpacing: skin.letterSpacing ?? 0,
        textTransform: skin.uppercase ? 'uppercase' : 'none', lineHeight: 1.06, textAlign: 'center', maxWidth: CAPTION.right - CAPTION.left,
        ...(skin.chunk ? skin.chunk(enter) : {}), opacity: enter, transform: `translateY(${(1 - enter) * 16}px) scale(${0.96 + 0.04 * enter})`,
      }}>
        {chunk.map((w, i) => {
          const progress = interpolate(t, [w.s, w.s + 0.18], [0, 1], {...clamp, easing: ease});
          return <span key={i} style={{display: 'inline-block', ...skin.word({active: i === activeIdx, past: i < activeIdx, idx: i, progress})}}>{w.t}</span>;
        })}
      </div>
    </div>
  );
};
