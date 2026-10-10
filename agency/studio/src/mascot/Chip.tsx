import React from 'react';
import {rnd} from '../lib/anim';

export type Pose = 'idle' | 'talk' | 'point' | 'shock' | 'think' | 'cheer' | 'sad' | 'smug' | 'wave';

const GOLD = '#F6C945';
const TEAL1 = '#46C9D2';
const TEAL2 = '#1E7F8A';
const SCREEN = '#0C2A31';
const LIME = '#B6F23B';
const PINK = '#FF8FA8';

type Arm = {a: number; len: number}; // angle in degrees from "hanging down", length
const ARMS: Record<Pose, {l: Arm; r: Arm}> = {
  idle: {l: {a: 14, len: 34}, r: {a: -14, len: 34}},
  talk: {l: {a: 20, len: 34}, r: {a: -34, len: 34}},
  point: {l: {a: 16, len: 34}, r: {a: -118, len: 44}},
  shock: {l: {a: 150, len: 30}, r: {a: -150, len: 30}},
  think: {l: {a: 16, len: 34}, r: {a: -140, len: 30}},
  cheer: {l: {a: 160, len: 40}, r: {a: -160, len: 40}},
  sad: {l: {a: 6, len: 30}, r: {a: -6, len: 30}},
  smug: {l: {a: 26, len: 34}, r: {a: -40, len: 34}},
  wave: {l: {a: 16, len: 34}, r: {a: -150, len: 42}},
};

/**
 * Chip — a tiny robot with a microchip body. Pure SVG, rigged by parameters:
 *  pose (eyes/brows/mouth/arms), talk (0..1 mouth opening from voice loudness), f (frame for idle motion/blink).
 */
export const Chip: React.FC<{size?: number; pose?: Pose; talk?: number; f?: number; flip?: boolean; seed?: number; glow?: string; style?: React.CSSProperties}> = ({
  size = 200, pose = 'idle', talk = 0, f = 0, flip = false, seed = 1, glow, style,
}) => {
  const bob = Math.sin((f + seed * 7) / 9) * 3;
  const sway = pose === 'wave' ? Math.sin(f / 4) * 14 : pose === 'cheer' ? Math.sin(f / 3) * 8 : Math.sin((f + seed) / 17) * 2;
  // blink every ~3s with a 5-frame close
  const period = 84 + Math.floor(rnd(seed) * 30);
  const bf = f % period;
  const blink = bf < 5 ? 1 - Math.sin((bf / 5) * Math.PI) * 0.92 : 1;
  const arms = ARMS[pose];
  const wave = pose === 'wave' ? Math.sin(f / 3) * 22 : 0;
  const mouthOpen = Math.min(1, Math.max(0, talk));

  // eyes by pose
  let eye = {rx: 13, ry: 17, dx: 0, dy: 0, shape: 'oval' as 'oval' | 'arc' | 'half' | 'wide'};
  if (pose === 'shock') eye = {rx: 15, ry: 22, dx: 0, dy: 0, shape: 'wide'};
  if (pose === 'cheer') eye = {rx: 14, ry: 14, dx: 0, dy: 0, shape: 'arc'};
  if (pose === 'smug') eye = {rx: 14, ry: 17, dx: 2, dy: 2, shape: 'half'};
  if (pose === 'think') eye = {rx: 13, ry: 17, dx: 5, dy: -4, shape: 'oval'};
  if (pose === 'sad') eye = {rx: 13, ry: 16, dx: 0, dy: 3, shape: 'oval'};
  const browTilt = pose === 'sad' ? 14 : pose === 'smug' ? -8 : pose === 'shock' ? 0 : pose === 'think' ? 6 : 0;
  const browLift = pose === 'shock' ? -8 : pose === 'think' ? -3 : 0;

  const Eye = ({cx}: {cx: number}) => {
    const cy = 92;
    if (eye.shape === 'arc')
      return <path d={`M${cx - 13} ${cy + 6} Q${cx} ${cy - 16} ${cx + 13} ${cy + 6}`} fill="none" stroke={LIME} strokeWidth={7} strokeLinecap="round" />;
    const ry = eye.ry * blink;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={eye.rx} ry={ry} fill={LIME} />
        {pose !== 'shock' && <ellipse cx={cx + eye.dx} cy={cy + eye.dy} rx={6} ry={Math.min(9, ry)} fill={SCREEN} />}
        {pose === 'shock' && <ellipse cx={cx} cy={cy} rx={4} ry={5} fill={SCREEN} />}
        <circle cx={cx - 4 + eye.dx / 2} cy={cy - 6} r={3.2} fill="#fff" opacity={0.9} />
        {eye.shape === 'half' && <rect x={cx - 16} y={cy - 22} width={32} height={22 + 4} fill={SCREEN} />}
      </g>
    );
  };

  const mouth = () => {
    if (pose === 'shock') return <ellipse cx={100} cy={130} rx={9} ry={11 + mouthOpen * 4} fill="#3A0F1E" stroke={PINK} strokeWidth={2} />;
    if (pose === 'sad') return <path d="M84 134 Q100 120 116 134" fill="none" stroke={PINK} strokeWidth={5} strokeLinecap="round" />;
    if (pose === 'smug') return <path d="M84 128 Q104 140 118 122" fill="none" stroke={PINK} strokeWidth={5} strokeLinecap="round" />;
    if (pose === 'cheer') return <path d="M82 122 Q100 148 118 122 Z" fill="#3A0F1E" stroke={PINK} strokeWidth={3} strokeLinejoin="round" />;
    if (mouthOpen > 0.08 || pose === 'talk') {
      const o = Math.max(mouthOpen, pose === 'talk' ? 0.2 : 0);
      return (
        <g>
          <ellipse cx={100} cy={128} rx={12 + o * 3} ry={3 + o * 13} fill="#3A0F1E" stroke={PINK} strokeWidth={2.5} />
          {o > 0.45 && <ellipse cx={100} cy={128 + o * 6} rx={7} ry={3.5} fill={PINK} opacity={0.9} />}
        </g>
      );
    }
    return <path d="M86 128 Q100 138 114 128" fill="none" stroke={PINK} strokeWidth={5} strokeLinecap="round" />;
  };

  const arm = (side: 'l' | 'r') => {
    const A = arms[side];
    const sx = side === 'l' ? 30 : 170;
    const ang = A.a + (side === 'r' ? wave : 0);
    return (
      <g transform={`translate(${sx} 128) rotate(${ang})`}>
        <rect x={-6} y={-2} width={12} height={A.len} rx={6} fill={TEAL2} stroke="#14606A" strokeWidth={2.5} />
        <circle cx={0} cy={A.len + 4} r={9} fill={GOLD} stroke="#B98F12" strokeWidth={2.5} />
      </g>
    );
  };

  const pins = [58, 84, 110, 136];
  return (
    <svg data-critical="mascot" width={size} height={size * 1.2} viewBox="0 0 200 240" style={{overflow: 'visible', transform: flip ? 'scaleX(-1)' : undefined, filter: glow ? `drop-shadow(0 0 22px ${glow})` : undefined, ...style}}>
      <defs>
        <linearGradient id="chipBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={TEAL1} />
          <stop offset="1" stopColor={TEAL2} />
        </linearGradient>
        <linearGradient id="chipShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform={`translate(0 ${bob}) rotate(${sway} 100 130)`}>
        {/* antenna */}
        <line x1={100} y1={36} x2={100 + Math.sin(f / 8) * 3} y2={14} stroke="#14606A" strokeWidth={5} strokeLinecap="round" />
        <circle cx={100 + Math.sin(f / 8) * 3} cy={10} r={8} fill={LIME} opacity={0.6 + 0.4 * Math.sin(f / 6) ** 2} />
        {/* feet */}
        <rect x={58} y={172} width={26} height={22} rx={9} fill={GOLD} stroke="#B98F12" strokeWidth={2.5} />
        <rect x={116} y={172} width={26} height={22} rx={9} fill={GOLD} stroke="#B98F12" strokeWidth={2.5} />
        {/* chip pins */}
        {pins.map((y) => (
          <React.Fragment key={y}>
            <rect x={12} y={y} width={22} height={11} rx={5} fill={GOLD} stroke="#B98F12" strokeWidth={2} />
            <rect x={166} y={y} width={22} height={11} rx={5} fill={GOLD} stroke="#B98F12" strokeWidth={2} />
          </React.Fragment>
        ))}
        {/* arms behind body */}
        {arm('l')}
        {arm('r')}
        {/* body */}
        <rect x={30} y={34} width={140} height={146} rx={36} fill="url(#chipBody)" stroke="#14606A" strokeWidth={4} />
        <path d="M44 56 Q44 40 62 40 L120 40 Q70 52 60 90 Q44 80 44 56Z" fill="url(#chipShine)" />
        {/* screen / face */}
        <rect x={46} y={56} width={108} height={92} rx={24} fill={SCREEN} stroke="#1C5560" strokeWidth={3} />
        {/* brows */}
        <line x1={62} y1={68 + browLift} x2={90} y2={68 + browLift - browTilt * 0.4} stroke={LIME} strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
        <line x1={110} y1={68 + browLift - browTilt * 0.4} x2={138} y2={68 + browLift} stroke={LIME} strokeWidth={4.5} strokeLinecap="round" opacity={0.85} />
        <Eye cx={76} />
        <Eye cx={124} />
        <circle cx={60} cy={118} r={7} fill={PINK} opacity={0.45} />
        <circle cx={140} cy={118} r={7} fill={PINK} opacity={0.45} />
        {mouth()}
        {/* bow tie */}
        <g transform="translate(100 163)">
          <path d="M0 0 L-17 -9 L-17 9 Z" fill="#E04B3C" stroke="#9E2A1E" strokeWidth={2} strokeLinejoin="round" />
          <path d="M0 0 L17 -9 L17 9 Z" fill="#E04B3C" stroke="#9E2A1E" strokeWidth={2} strokeLinejoin="round" />
          <circle r={5} fill="#C73A2D" stroke="#9E2A1E" strokeWidth={2} />
        </g>
      </g>
    </svg>
  );
};
