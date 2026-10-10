import React, {createContext, useContext} from 'react';
import type {Beat, CueSpec, Spec, WordRef} from './types';

export const FPS = 30;
export const W = 1080;
export const H = 1920;

const SpecCtx = createContext<Spec | null>(null);
export const SpecProvider: React.FC<{spec: Spec; children: React.ReactNode}> = ({spec, children}) => <SpecCtx.Provider value={spec}>{children}</SpecCtx.Provider>;
export const useSpec = (): Spec => {
  const s = useContext(SpecCtx);
  if (!s) throw new Error('SpecProvider missing');
  return s;
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$.]/g, '');

export const durationFrames = (spec: Spec) => Math.ceil((spec.timeline.total + 0.1) * FPS);
export const getBeat = (spec: Spec, id: string): Beat => {
  const b = spec.timeline.beats.find((x) => x.id === id);
  if (!b) throw new Error(`beat "${id}" not in timeline`);
  return b;
};

/** resolve a WordRef to an index (unresolved refs fall back to 0 and log a lint-visible error) */
export const wordIndex = (spec: Spec, beatId: string, ref: WordRef | undefined): number => {
  const b = getBeat(spec, beatId);
  if (ref === undefined) return 0;
  if (typeof ref === 'number') return Math.max(0, Math.min(b.words.length - 1, ref));
  const prefix = ref.endsWith('*');
  const key = norm(prefix ? ref.slice(0, -1) : ref);
  const i = b.words.findIndex((w) => (prefix ? norm(w.t).startsWith(key) : norm(w.t) === key || norm(w.t).includes(key)));
  if (i < 0) {
    console.error(`LINTERR|unresolved word ref "${ref}" in beat ${beatId}`);
    return 0;
  }
  return i;
};
export const wordTime = (spec: Spec, beatId: string, ref?: WordRef) => getBeat(spec, beatId).words[wordIndex(spec, beatId, ref)].s;

export const cueTime = (spec: Spec, c: CueSpec): number => {
  let t = c.at ?? 0;
  if (c.beat) t = c.word === undefined ? getBeat(spec, c.beat).start : wordTime(spec, c.beat, c.word);
  return t + (c.offset ?? 0);
};

/** Scene i spans [beat_i.start - lead, beat_{i+1}.start - lead) */
export const LEAD = 0.12;
export const sceneRange = (spec: Spec, i: number) => {
  const beats = spec.timeline.beats;
  const start = Math.max(0, Math.round((beats[i].start - LEAD) * FPS));
  const end = i + 1 < beats.length ? Math.round((beats[i + 1].start - LEAD) * FPS) : durationFrames(spec);
  return {start, end, dur: end - start};
};
