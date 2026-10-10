import React from 'react';
import {useCurrentFrame, interpolate} from 'remotion';
import {BEATS, FPS, Word} from './timeline';
import {ease, clamp} from './anim';

export type CaptionSkin = {
  top: number; // y of caption block centre
  fontSize: number;
  fontFamily: string;
  weight: number | string;
  uppercase?: boolean;
  letterSpacing?: number;
  maxWords?: number;
  /** style for a word given its state */
  word: (s: {active: boolean; past: boolean; idx: number; progress: number}) => React.CSSProperties;
  /** optional wrapper style for the whole chunk (e.g. a paper strip) */
  chunk?: (p: number) => React.CSSProperties;
  gap?: number;
};

/** Split a beat's words into balanced chunks of at most `max` words. */
const chunkWords = (words: Word[], max: number): Word[][] => {
  const n = Math.ceil(words.length / max);
  const size = Math.ceil(words.length / n);
  const out: Word[][] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
  return out;
};

export const Captions: React.FC<{skin: CaptionSkin}> = ({skin}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  let beat = BEATS[0];
  for (const b of BEATS) if (t >= b.start - 0.04) beat = b;
  if (t < BEATS[0].start - 0.04) return null;
  const chunks = chunkWords(beat.words, skin.maxWords ?? 3);
  let ci = 0;
  chunks.forEach((c, i) => {
    if (t >= c[0].s - 0.02) ci = i;
  });
  const chunk = chunks[ci];
  const enter = interpolate(t, [chunk[0].s - 0.02, chunk[0].s + 0.22], [0, 1], {...clamp, easing: ease});
  const activeIdx = chunk.reduce((acc, w, i) => (t >= w.s ? i : acc), 0);
  // fade out after the last beat words end
  const lastEnd = BEATS[BEATS.length - 1].end;
  const fadeOut = interpolate(t, [lastEnd + 0.15, lastEnd + 0.45], [1, 0], clamp);

  return (
    <div
      style={{
        position: 'absolute', left: 60, right: 60, top: skin.top, transform: 'translateY(-50%)',
        display: 'flex', justifyContent: 'center', opacity: fadeOut,
      }}
    >
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'baseline',
          columnGap: skin.gap ?? 22, rowGap: 6,
          fontFamily: skin.fontFamily, fontWeight: skin.weight as any, fontSize: skin.fontSize,
          letterSpacing: skin.letterSpacing ?? 0, textTransform: skin.uppercase ? 'uppercase' : 'none',
          lineHeight: 1.08, textAlign: 'center',
          ...(skin.chunk ? skin.chunk(enter) : {}),
          opacity: enter, transform: `translateY(${(1 - enter) * 18}px) scale(${0.96 + 0.04 * enter})`,
        }}
      >
        {chunk.map((w, i) => {
          const active = i === activeIdx;
          const progress = interpolate(t, [w.s, w.s + 0.18], [0, 1], {...clamp, easing: ease});
          return (
            <span key={i} style={{display: 'inline-block', ...skin.word({active, past: i < activeIdx, idx: i, progress})}}>
              {w.t}
            </span>
          );
        })}
      </div>
    </div>
  );
};
