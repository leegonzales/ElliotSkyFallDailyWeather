/**
 * Timeline Builder
 *
 * Builds video timeline from graphic cues and audio alignment data.
 */

import type { GraphicCue } from '../script/graphic-cue-parser';
import type { CharacterAlignment } from '../audio/synthesizer';
import type { VideoTimeline, TimelineSegment, WeatherSummary } from './types';
import { join, resolve } from 'node:path';

const DEFAULT_FPS = 30;

export interface TimelineBuildOptions {
  graphicCues: GraphicCue[];
  audioPath: string;
  audioDuration: number;
  alignment?: CharacterAlignment;
  imagesDir: string;
  fps?: number;
  // Metadata for summary slide
  broadcastDate?: string; // Defaults to current date/time
  location?: string;
  weatherSummary?: WeatherSummary;
}

/**
 * Build a video timeline from graphic cues
 *
 * This function distributes graphic cues across the audio duration,
 * using the duration hints from the cues when available.
 */
export function buildTimeline(options: TimelineBuildOptions): VideoTimeline {
  const fps = options.fps || DEFAULT_FPS;
  const totalFrames = Math.ceil(options.audioDuration * fps);

  // Resolve paths to absolute
  const imagesDir = resolve(options.imagesDir);
  const audioPath = resolve(options.audioPath);

  // If no cues, create a single segment spanning the whole video
  if (options.graphicCues.length === 0) {
    return {
      fps,
      durationInFrames: totalFrames,
      segments: [{
        startFrame: 0,
        endFrame: totalFrames,
        durationFrames: totalFrames,
        imagePath: join(imagesDir, 'placeholder.png'),
      }],
      audioPath,
      audioDuration: options.audioDuration,
      broadcastDate: options.broadcastDate || new Date().toISOString(),
      location: options.location || 'Denver, Colorado',
      weatherSummary: options.weatherSummary,
    };
  }

  const segments: TimelineSegment[] = [];
  let currentFrame = 0;

  // Calculate total specified duration from cues
  const totalSpecifiedDuration = options.graphicCues.reduce(
    (sum, cue) => sum + (cue.duration || 5),
    0
  );

  // Scale factor to fit cues to audio duration
  const scaleFactor = options.audioDuration / totalSpecifiedDuration;

  for (let i = 0; i < options.graphicCues.length; i++) {
    const cue = options.graphicCues[i];
    const cueDuration = (cue.duration || 5) * scaleFactor;
    const durationFrames = Math.round(cueDuration * fps);

    // Ensure we don't exceed total frames
    const startFrame = currentFrame;
    const endFrame = Math.min(currentFrame + durationFrames, totalFrames);

    segments.push({
      startFrame,
      endFrame,
      durationFrames: endFrame - startFrame,
      imagePath: join(imagesDir, `graphic-${String(i + 1).padStart(2, '0')}.png`),
      caption: cue.description,
    });

    currentFrame = endFrame;
  }

  // If there's remaining time, extend the last segment
  if (segments.length > 0 && currentFrame < totalFrames) {
    const lastSegment = segments[segments.length - 1];
    lastSegment.endFrame = totalFrames;
    lastSegment.durationFrames = totalFrames - lastSegment.startFrame;
  }

  return {
    fps,
    durationInFrames: totalFrames,
    segments,
    audioPath,
    audioDuration: options.audioDuration,
    // Use actual current date/time for broadcast, not the weather data date
    broadcastDate: options.broadcastDate || new Date().toISOString(),
    location: options.location || 'Denver, Colorado',
    weatherSummary: options.weatherSummary,
  };
}

/**
 * Convert timeline to a format suitable for serialization
 */
export function serializeTimeline(timeline: VideoTimeline): string {
  return JSON.stringify(timeline, null, 2);
}

/**
 * Load timeline from serialized format
 */
export function deserializeTimeline(json: string): VideoTimeline {
  return JSON.parse(json);
}
