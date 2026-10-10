import React from 'react';
import {Composition} from 'remotion';
import {DURATION, FPS, H, W} from './common/timeline';
import {AppleMinimal} from './styles/AppleMinimal';
import {DataJournalism} from './styles/DataJournalism';
import {PaperCutout} from './styles/PaperCutout';

export const Root: React.FC = () => (
  <>
    <Composition id="Apple" component={AppleMinimal} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Data" component={DataJournalism} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
    <Composition id="Paper" component={PaperCutout} durationInFrames={DURATION} fps={FPS} width={W} height={H} />
  </>
);
