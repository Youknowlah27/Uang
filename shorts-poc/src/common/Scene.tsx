import React from 'react';
import {Sequence, useCurrentFrame, interpolate} from 'remotion';
import {sceneRange, wordFrame} from './timeline';
import {clamp} from './anim';

export type SceneCtx = {f: number; dur: number; wf: (i: number) => number; id: string};

/** A scene = one beat. Provides local frame `f`, a helper `wf(i)` → local frame where word i starts,
 *  and a quick cross-fade in/out so cuts never flash black. */
export const Scene: React.FC<{id: string; fade?: number; children: (c: SceneCtx) => React.ReactNode}> = ({id, fade = 6, children}) => {
  const r = sceneRange(id);
  return (
    <Sequence from={r.start} durationInFrames={r.dur + fade} layout="none" name={id}>
      <Inner id={id} start={r.start} dur={r.dur} fade={fade}>{children}</Inner>
    </Sequence>
  );
};

const Inner: React.FC<{id: string; start: number; dur: number; fade: number; children: (c: SceneCtx) => React.ReactNode}> = ({id, start, dur, fade, children}) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, fade, dur - 1, dur + fade], [0, 1, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {children({f, dur, id, wf: (i) => wordFrame(id, i) - start})}
    </div>
  );
};
