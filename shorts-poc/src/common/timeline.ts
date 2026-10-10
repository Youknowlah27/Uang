import tl from '../data/timeline.json';

export type Word = {t: string; s: number; e: number};
export type Beat = {id: string; text: string; start: number; end: number; words: Word[]};

export const FPS = 30;
export const W = 1080;
export const H = 1920;
export const TIMELINE = tl as {total: number; title: string; beats: Beat[]; sources: string[]};
export const DURATION = Math.ceil((TIMELINE.total + 0.1) * FPS);

export const BEATS = TIMELINE.beats;
export const beat = (id: string): Beat => {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error('beat ' + id);
  return b;
};

/** frame at which word `i` of beat starts */
export const wordFrame = (id: string, i: number) => Math.round(beat(id).words[i].s * FPS);
/** frame range of a beat's *scene*: starts slightly before the first word, ends at next beat start */
export const sceneRange = (id: string) => {
  const i = BEATS.findIndex((x) => x.id === id);
  const start = Math.max(0, Math.round((BEATS[i].start - 0.12) * FPS));
  const end = i + 1 < BEATS.length ? Math.round((BEATS[i + 1].start - 0.12) * FPS) : DURATION;
  return {start, end, dur: end - start};
};
export const activeBeatId = (frame: number): string => {
  const t = frame / FPS + 0.12;
  let cur = BEATS[0].id;
  for (const b of BEATS) if (t >= b.start) cur = b.id;
  return cur;
};
