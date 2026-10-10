import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Chip, Pose} from './mascot/Chip';
const poses: Pose[] = ['idle', 'talk', 'point', 'shock', 'think', 'cheer', 'sad', 'smug', 'wave'];
export const MascotTest: React.FC = () => (
  <AbsoluteFill style={{background: '#1c1f2a', display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start'}}>
    {poses.map((p, i) => (
      <div key={p} style={{width: 360, height: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'sans-serif', fontSize: 28}}>
        <Chip size={250} pose={p} talk={p === 'talk' ? 0.8 : 0} f={30 + i * 3} seed={i + 1} />
        {p}
      </div>
    ))}
  </AbsoluteFill>
);
