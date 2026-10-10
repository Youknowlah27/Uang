import React from 'react';
import {Composition} from 'remotion';
import {Video} from './Video';
import {MascotTest} from './MascotTest';
import {FPS, H, W, durationFrames} from './lib/timeline';
import type {Spec} from './lib/types';
import demo from './data/demo.spec.json';

export const Root: React.FC = () => (
  <>
    <Composition
      id="Video"
      component={Video as any}
      width={W}
      height={H}
      fps={FPS}
      durationInFrames={durationFrames(demo as unknown as Spec)}
      defaultProps={demo as any}
      calculateMetadata={({props}) => ({durationInFrames: durationFrames(props as unknown as Spec)})}
    />
    <Composition id="MascotTest" component={MascotTest} durationInFrames={30} fps={30} width={1080} height={1260} />
  </>
);
