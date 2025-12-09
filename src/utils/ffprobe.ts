/**
 * FFprobe Wrapper
 *
 * Utilities for extracting audio metadata using ffprobe.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { access, constants } from 'node:fs/promises';

const execFileAsync = promisify(execFile);

export interface AudioMetadata {
  duration: number;
  sampleRate: number;
  channels: number;
  codec: string;
  bitrate: number;
  format: string;
}

/**
 * Get audio duration from file using ffprobe
 */
export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`Audio file not accessible: ${filePath}`);
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'json',
      filePath,
    ]);

    const data = JSON.parse(stdout);

    if (!data.format?.duration) {
      throw new Error('Duration not found in ffprobe output');
    }

    const duration = parseFloat(data.format.duration);

    if (isNaN(duration) || duration <= 0) {
      throw new Error(`Invalid duration: ${data.format.duration}`);
    }

    return duration;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ffprobe failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get complete audio metadata from file
 */
export async function getAudioMetadata(filePath: string): Promise<AudioMetadata> {
  try {
    await access(filePath, constants.R_OK);
  } catch {
    throw new Error(`Audio file not accessible: ${filePath}`);
  }

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-show_entries', 'format=duration,bit_rate,format_name:stream=codec_name,sample_rate,channels',
      '-of', 'json',
      filePath,
    ]);

    const data = JSON.parse(stdout);
    const format = data.format;
    const stream = data.streams?.[0];

    return {
      duration: parseFloat(format?.duration || '0'),
      sampleRate: parseInt(stream?.sample_rate || '0', 10),
      channels: stream?.channels || 0,
      codec: stream?.codec_name || 'unknown',
      bitrate: parseInt(format?.bit_rate || '0', 10),
      format: format?.format_name || 'unknown',
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ffprobe failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if ffprobe is available
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  try {
    await execFileAsync('ffprobe', ['-version']);
    return true;
  } catch {
    return false;
  }
}
