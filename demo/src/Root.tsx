import React from 'react';
import { Composition } from 'remotion';
import plan from '../public/plan.json';
import { PlumeClockVideo } from './Video';

export const Root: React.FC = () => (
  <Composition
    id="PlumeClock"
    component={PlumeClockVideo}
    width={1920}
    height={1080}
    fps={30}
    durationInFrames={plan.totalFrames}
    defaultProps={{ plan }}
  />
);
