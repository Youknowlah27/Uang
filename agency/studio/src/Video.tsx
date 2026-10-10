import React from 'react';
import {AbsoluteFill, Sequence, useCurrentFrame, interpolate} from 'remotion';
import {FontLoader} from './lib/fonts';
import {SpecProvider, FPS, LEAD, sceneRange, wordIndex, getBeat, useSpec} from './lib/timeline';
import {Captions, houseSkin} from './lib/Captions';
import {LintProbe} from './lib/LintProbe';
import {STAGE_SCALE, STAGE_TX, STAGE_TY} from './lib/safe';
import {clamp} from './lib/anim';
import type {Spec, StyleId} from './lib/types';
import type {Pack, SceneCtx} from './lib/pack';
import {PACKS} from './packs';
import {FxWrapper, FxOverlay} from './fx/Fx';
import {Host, Reactions} from './mascot/Mascot';

const FADE = 6;

const SceneInner: React.FC<{index: number; start: number; dur: number; pack: Pack; mix: boolean}> = ({index, start, dur, pack, mix}) => {
  const spec = useSpec();
  const f = useCurrentFrame();
  const sc = spec.scenes[index];
  const beat = getBeat(spec, sc.beat);
  const T = pack.templates[sc.template];
  if (!T) throw new Error(`pack ${pack.id} has no template "${sc.template}"`);
  const wf = (ref: any) => Math.round(beat.words[wordIndex(spec, sc.beat, ref)].s * FPS) - start;
  const ctx: SceneCtx = {f, gf: f + start, dur, id: sc.beat, beat, spec, wf};
  // pure style: content cross-fades over a global background; mix: opaque scenes stack (incoming fades in over outgoing)
  const opacity = mix ? interpolate(f, [0, FADE], [0, 1], clamp) : interpolate(f, [0, FADE, dur - 1, dur + FADE], [0, 1, 1, 0], clamp);
  return (
    <div style={{position: 'absolute', inset: 0, opacity}}>
      {mix && <pack.Bg gf={f + start} total={spec.timeline.total} />}
      <div data-stage style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920, transformOrigin: '0 0', transform: `translate(${STAGE_TX}px, ${STAGE_TY}px) scale(${STAGE_SCALE})`}}>
        <T ctx={ctx} p={sc.props ?? {}} />
      </div>
    </div>
  );
};

const Scenes: React.FC<{main: StyleId; mix: boolean}> = ({main, mix}) => {
  const spec = useSpec();
  return (
    <>
      {spec.scenes.map((sc, i) => {
        const bi = spec.timeline.beats.findIndex((b) => b.id === sc.beat);
        const r = sceneRange(spec, bi);
        const style = mix ? sc.style ?? main : main;
        return (
          <Sequence key={i} from={r.start} durationInFrames={r.dur + FADE + 1} layout="none" name={`${sc.beat}:${style}`}>
            <SceneInner index={i} start={r.start} dur={r.dur} pack={PACKS[style]} mix={mix} />
          </Sequence>
        );
      })}
    </>
  );
};

export const Video: React.FC<Spec> = (spec) => {
  const frame = useCurrentFrame();
  const mix = spec.style === 'mix';
  const main: StyleId = mix ? 'apple' : (spec.style as StyleId);
  const pack = PACKS[main];
  const skin = spec.captionSkin === 'house' || mix ? houseSkin : pack.caption;
  return (
    <SpecProvider spec={spec}>
      <AbsoluteFill style={{background: '#000'}}>
        <FontLoader />
        <FxWrapper>
          {!mix && <pack.Bg gf={frame} total={spec.timeline.total} />}
          <Scenes main={main} mix={mix} />
          <Reactions />
        </FxWrapper>
        <FxOverlay colors={pack.particles} />
        <Host glow={pack.accent} />
        <Captions skin={skin} />
        <LintProbe />
      </AbsoluteFill>
    </SpecProvider>
  );
};
