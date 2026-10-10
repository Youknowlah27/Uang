export type StyleId = 'apple' | 'data' | 'paper';
export type WordRef = number | string; // index in beat, or word text ("Google"); "foo*" = prefix match

export type Word = {t: string; s: number; e: number};
export type Beat = {id: string; text: string; start: number; end: number; words: Word[]};

/** A cue = a moment where we want a sound effect and/or a visual effect. Read by BOTH Remotion and the Python mixer. */
export type CueSpec = {
  beat?: string; word?: WordRef; at?: number; // absolute seconds when beat/word not given
  offset?: number;                            // seconds added to the resolved time
  sfx?: string; vfx?: string; gain?: number; dur?: number; intensity?: number;
};

export type SceneSpec = {
  beat: string;
  template: string;
  style?: StyleId;      // per-scene style (used by style 'mix')
  props?: Record<string, any>;
};

export type ReactionSpec = {beat: string; word?: WordRef; pose: string; dur?: number; x?: number; y?: number; size?: number; flip?: boolean};

export type CtaSpec = {type: 'follow' | 'link' | 'comment'; headline: string; sub?: string; keyword?: string};

export type Spec = {
  id: string;
  title: string;
  style: StyleId | 'mix';
  mood: string;
  goal?: string;
  lane?: string;
  account?: string;
  timeline: {total: number; beats: Beat[]};
  /** voice loudness per frame (0..1) for mascot lip-sync */
  envelope?: number[];
  scenes: SceneSpec[];
  cta: CtaSpec;
  cues: CueSpec[];
  mascot: {host: boolean; reactions: ReactionSpec[]};
  captionSkin?: 'pack' | 'house';
  lint?: boolean;
  [k: string]: any;
};
