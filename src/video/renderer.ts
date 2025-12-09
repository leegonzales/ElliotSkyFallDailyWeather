/**
 * Video Renderer
 *
 * Renders weather broadcast video using Remotion.
 * Fails loudly on errors, no silent failures.
 */

import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { existsSync, mkdirSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VideoTimeline, VideoRenderOptions, VideoRenderResult } from './types';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DEFAULT_WIDTH = 1920;
const DEFAULT_HEIGHT = 1080;
const DEFAULT_FPS = 30;

/**
 * Render a weather broadcast video
 *
 * This function:
 * 1. Bundles the Remotion composition
 * 2. Prepares assets (copies to public dir)
 * 3. Renders the video
 *
 * Throws on any error - no silent failures.
 */
export async function renderVideo(
  timeline: VideoTimeline,
  options: VideoRenderOptions
): Promise<VideoRenderResult> {
  const width = options.width || DEFAULT_WIDTH;
  const height = options.height || DEFAULT_HEIGHT;
  const fps = options.fps || timeline.fps || DEFAULT_FPS;

  // Ensure output directory exists
  const outputDir = dirname(options.outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Create temporary public directory for assets
  const publicDir = join(outputDir, '.remotion-public');
  if (!existsSync(publicDir)) {
    mkdirSync(publicDir, { recursive: true });
  }

  console.log('    Preparing assets...');

  // Copy audio file to public directory
  const audioFilename = 'audio.mp3';
  const audioPublicPath = join(publicDir, audioFilename);
  if (!existsSync(timeline.audioPath)) {
    throw new Error(`Audio file not found: ${timeline.audioPath}`);
  }
  copyFileSync(timeline.audioPath, audioPublicPath);

  // Update timeline with public paths and copy images
  const publicTimeline: VideoTimeline = {
    ...timeline,
    audioPath: audioFilename,
    segments: timeline.segments.map((segment, index) => {
      const imageFilename = `graphic-${String(index + 1).padStart(2, '0')}.png`;
      const imagePublicPath = join(publicDir, imageFilename);

      if (!existsSync(segment.imagePath)) {
        throw new Error(`Image file not found: ${segment.imagePath}`);
      }
      copyFileSync(segment.imagePath, imagePublicPath);

      return {
        ...segment,
        imagePath: imageFilename,
      };
    }),
  };

  // Write timeline data for composition
  const timelineDataPath = join(publicDir, 'timeline.json');
  writeFileSync(timelineDataPath, JSON.stringify(publicTimeline, null, 2));

  console.log('    Bundling composition...');

  // Bundle the composition
  const bundleLocation = await bundle({
    entryPoint: resolve(__dirname, 'remotion-entry.tsx'),
    publicDir,
  });

  console.log('    Selecting composition...');

  // Select the composition
  const composition = await selectComposition({
    serveUrl: bundleLocation,
    id: 'WeatherBroadcast',
    inputProps: {
      timeline: publicTimeline,
    },
  });

  console.log(`    Rendering ${composition.durationInFrames} frames at ${fps}fps...`);

  // Render the video
  await renderMedia({
    composition,
    serveUrl: bundleLocation,
    codec: 'h264',
    outputLocation: options.outputPath,
    inputProps: {
      timeline: publicTimeline,
    },
    onProgress: ({ progress }) => {
      const percent = Math.round(progress * 100);
      process.stdout.write(`\r    Progress: ${percent}%`);
    },
  });

  console.log(''); // New line after progress

  // Verify output was created
  if (!existsSync(options.outputPath)) {
    throw new Error(`Video rendering failed: output file not created at ${options.outputPath}`);
  }

  return {
    videoPath: options.outputPath,
    durationSecs: timeline.audioDuration,
    width,
    height,
    fps,
  };
}

/**
 * Check if Remotion rendering is available
 * Always returns true since we have the deps installed.
 * Errors will propagate during actual rendering.
 */
export function isRemotionAvailable(): boolean {
  // Remotion is available - we have it in dependencies
  // Any runtime issues will surface during actual rendering
  return true;
}
