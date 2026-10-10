import type React from 'react';
import type {Spec, StyleId, WordRef, Beat} from './types';

export type SceneCtx = {
  f: number;      // local frame inside the scene
  gf: number;     // global frame
  dur: number;
  id: string;     // beat id
  beat: Beat;
  spec: Spec;
  /** local frame at which the referenced word of this scene's beat starts */
  wf: (ref: WordRef | undefined) => number;
};
export type TemplateComp = React.FC<{ctx: SceneCtx; p: any}>;

export type CaptionSkin = {
  fontSize: number;
  fontFamily: string;
  weight: number | string;
  uppercase?: boolean;
  letterSpacing?: number;
  maxWords?: number;
  gap?: number;
  word: (s: {active: boolean; past: boolean; idx: number; progress: number}) => React.CSSProperties;
  chunk?: (p: number) => React.CSSProperties;
};

export type Pack = {
  id: StyleId;
  Bg: React.FC<{gf: number; total: number}>;
  templates: Record<string, TemplateComp>;
  caption: CaptionSkin;
  /** accent colour used by shared overlays (host avatar glow, CTA ring, particles) */
  accent: string;
  particles: string[];
};
