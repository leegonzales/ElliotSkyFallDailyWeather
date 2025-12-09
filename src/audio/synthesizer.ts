/**
 * Audio Synthesizer
 *
 * ElevenLabs TTS integration for Elliot Skyfall voice synthesis.
 */

import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { getConfig } from '../utils/config';
import { getAudioDuration } from '../utils/ffprobe';
import { extractAudioScript } from '../script/graphic-cue-parser';

export interface CharacterAlignment {
  characters: string[];
  characterStartTimes: number[];
  characterEndTimes: number[];
}

export interface AudioSynthesisResult {
  audioPath: string;
  duration: number;
  alignment?: CharacterAlignment;
}

let elevenlabsClient: ElevenLabsClient | null = null;

/**
 * Get or create ElevenLabs client
 */
function getClient(): ElevenLabsClient {
  if (elevenlabsClient) {
    return elevenlabsClient;
  }

  const config = getConfig();

  if (!config.elevenlabsApiKey) {
    throw new Error('ELEVENLABS_API_KEY is required for audio synthesis');
  }

  elevenlabsClient = new ElevenLabsClient({
    apiKey: config.elevenlabsApiKey,
  });

  return elevenlabsClient;
}

/**
 * Synthesize broadcast script to audio
 */
export async function synthesizeAudio(
  script: string,
  outputPath: string
): Promise<AudioSynthesisResult> {
  const config = getConfig();
  const client = getClient();

  // Get voice ID
  const voiceId = config.elliotVoiceId;
  if (!voiceId) {
    throw new Error('ELLIOT_VOICE_ID is required for audio synthesis');
  }

  // Extract clean audio script (remove graphic cues, convert pauses)
  const audioScript = extractAudioScript(script);

  console.log(`  Synthesizing ${audioScript.length} characters...`);

  // Ensure output directory exists
  const outputDir = dirname(outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  try {
    // Use ElevenLabs with timestamps for caption sync
    const response = await client.textToSpeech.convertWithTimestamps(voiceId, {
      text: audioScript,
      modelId: 'eleven_v3',
      voiceSettings: {
        stability: 0.5, // Natural (valid values: 0.0=Creative, 0.5=Natural, 1.0=Robust)
        similarityBoost: 0.75,
        style: 0.0, // v3 works best with style at 0
        useSpeakerBoost: true,
      },
    });

    // Save audio file
    const audioBuffer = Buffer.from(response.audioBase64, 'base64');
    writeFileSync(outputPath, audioBuffer);

    // Get actual duration with ffprobe
    const duration = await getAudioDuration(outputPath);

    // Extract alignment data
    let alignment: CharacterAlignment | undefined;
    if (response.alignment) {
      alignment = {
        characters: response.alignment.characters || [],
        characterStartTimes: response.alignment.characterStartTimesSeconds || [],
        characterEndTimes: response.alignment.characterEndTimesSeconds || [],
      };
    }

    return {
      audioPath: outputPath,
      duration,
      alignment,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`ElevenLabs synthesis failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check if ElevenLabs is available
 */
export function isElevenLabsAvailable(): boolean {
  const config = getConfig();
  return !!(config.elevenlabsApiKey && config.elliotVoiceId);
}

/**
 * List available voices (for finding Elliot's voice)
 */
export async function listVoices(): Promise<Array<{ id: string; name: string; labels: Record<string, string> }>> {
  const client = getClient();

  const response = await client.voices.getAll();

  return response.voices.map((voice) => ({
    id: voice.voiceId,
    name: voice.name || 'Unknown',
    labels: voice.labels || {},
  }));
}
