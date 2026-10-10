import {interpolate, spring, Easing} from 'remotion';
import {FPS} from './timeline';

export const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);

export const prog = (frame: number, from: number, dur: number) => interpolate(frame, [from, from + dur], [0, 1], {...clamp, easing: ease});
export const progIO = (frame: number, from: number, dur: number) => interpolate(frame, [from, from + dur], [0, 1], {...clamp, easing: easeInOut});
export const pop = (frame: number, from: number, damping = 14, stiffness = 140, mass = 0.8) => spring({frame: frame - from, fps: FPS, config: {damping, stiffness, mass}});
export const rnd = (seed: number) => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
export const fmt = (n: number, d = 0) => n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d});
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
