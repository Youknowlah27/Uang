import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Chip, Pose} from './Chip';
import {FPS, cueTime, useSpec} from '../lib/timeline';
import {pop} from '../lib/anim';
import {HOST, REACTION_SLOTS} from '../lib/safe';

const envAt = (env: number[] | undefined, f: number) => (env ? env[Math.min(env.length - 1, Math.max(0, f))] ?? 0 : 0);

/** The host: Chip lives next to the captions and lip-syncs to the voice loudness. */
export const Host: React.FC<{glow: string}> = ({glow}) => {
  const f = useCurrentFrame();
  const spec = useSpec();
  if (!spec.mascot?.host) return null;
  const e = envAt(spec.envelope, f);
  const talking = e > 0.12;
  return (
    <div style={{position: 'absolute', left: HOST.x, top: HOST.y, width: HOST.size, height: HOST.size * 1.2}}>
      <Chip size={HOST.size} pose={talking ? 'talk' : 'idle'} talk={Math.min(1, e * 1.25)} f={f} seed={3} glow={talking ? glow : undefined} />
    </div>
  );
};

/** One-off reaction stickers (shock / cheer / sad / smug / wave) that pop in at a word and pop out. */
export const Reactions: React.FC = () => {
  const f = useCurrentFrame();
  const spec = useSpec();
  return (
    <>
      {(spec.mascot?.reactions ?? []).map((r, i) => {
        const start = Math.round((cueTime(spec, {beat: r.beat, word: r.word}) - 0.03) * FPS);
        const dur = Math.round((r.dur ?? 1.1) * FPS);
        const lf = f - start;
        if (lf < 0 || lf > dur + 8) return null;
        const inn = pop(f, start, 12, 190, 0.7);
        const out = lf > dur ? Math.max(0, 1 - (lf - dur) / 8) : 1;
        const tpl = spec.scenes.find((s) => s.beat === r.beat)?.template ?? 'hook_stamp';
        const slot = REACTION_SLOTS[tpl] ?? REACTION_SLOTS.hook_stamp;
        const size = r.size ?? slot.size;
        const e = envAt(spec.envelope, f);
        return (
          <div key={i} data-reaction style={{position: 'absolute', left: r.x ?? slot.x, top: r.y ?? slot.y, width: size, height: size * 1.2, transform: `scale(${inn * out}) rotate(${(1 - inn) * -12}deg)`, transformOrigin: '50% 80%', opacity: out, filter: 'drop-shadow(0 18px 24px rgba(0,0,0,0.35))'}}>
            <Chip size={size} pose={r.pose as Pose} talk={r.pose === 'shock' ? 0.6 : e * 0.8} f={f} seed={i + 5} flip={r.flip} />
          </div>
        );
      })}
    </>
  );
};
