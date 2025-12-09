/**
 * Video Types
 *
 * Type definitions for video composition.
 */

export interface TimelineSegment {
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  imagePath: string;
  caption?: string;
}

export interface WeatherSummary {
  temperature: string;
  conditions: string;
  wind: string;
  hazards: string[];
  outlook: string;
}

export interface VideoTimeline {
  fps: number;
  durationInFrames: number;
  segments: TimelineSegment[];
  audioPath: string;
  audioDuration: number;
  // Metadata for summary slide
  broadcastDate: string; // ISO date string of actual broadcast
  location: string;
  weatherSummary?: WeatherSummary;
}

export interface VideoRenderOptions {
  outputPath: string;
  width?: number;
  height?: number;
  fps?: number;
}

export interface VideoRenderResult {
  videoPath: string;
  durationSecs: number;
  width: number;
  height: number;
  fps: number;
}
