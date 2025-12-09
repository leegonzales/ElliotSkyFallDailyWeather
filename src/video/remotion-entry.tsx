/**
 * Remotion Entry Point
 *
 * Registers compositions for video rendering.
 */

import React from 'react';
import { Composition, getInputProps, registerRoot } from 'remotion';
import { WeatherBroadcast } from './WeatherBroadcast';
import type { VideoTimeline } from './types';

// Duration constants (must match WeatherBroadcast.tsx)
const SUMMARY_DURATION_SECS = 6;
const FADE_TO_BLACK_DURATION_SECS = 2;
const EXTRA_FRAMES_SECS = SUMMARY_DURATION_SECS + FADE_TO_BLACK_DURATION_SECS;

// Default timeline for preview
const defaultTimeline: VideoTimeline = {
  fps: 30,
  durationInFrames: 300,
  segments: [],
  audioPath: 'audio.mp3',
  audioDuration: 10,
  broadcastDate: new Date().toISOString(),
  location: 'Denver, Colorado',
};

const RemotionRoot: React.FC = () => {
  // Get input props passed during rendering
  const inputProps = getInputProps() as { timeline?: VideoTimeline };
  const timeline = inputProps.timeline || defaultTimeline;

  // Calculate total duration including summary slide and fade to black
  const fps = timeline.fps || 30;
  const extraFrames = Math.floor(EXTRA_FRAMES_SECS * fps);
  const totalDuration = (timeline.durationInFrames || 300) + extraFrames;

  return (
    <>
      <Composition
        id="WeatherBroadcast"
        component={WeatherBroadcast as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={totalDuration}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          timeline,
        }}
      />
    </>
  );
};

// Register the root component with Remotion
registerRoot(RemotionRoot);
