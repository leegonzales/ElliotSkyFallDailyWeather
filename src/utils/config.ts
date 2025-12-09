/**
 * Configuration Loader
 *
 * Loads and validates environment configuration using Zod schemas.
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Load .env file
dotenvConfig();

/**
 * Configuration schema with validation
 */
const configSchema = z.object({
  // Episode Settings
  broadcastTime: z.string().regex(/^\d{2}:\d{2}$/).default('22:00'),
  targetDurationSecs: z.coerce.number().min(60).max(600).default(180),
  episodeStartNumber: z.coerce.number().min(1).default(1),

  // Claude (Script Generation)
  anthropicApiKey: z.string().min(1).optional(),
  claudeModel: z.string().default('claude-sonnet-4-20250514'),

  // ElevenLabs (Audio)
  elevenlabsApiKey: z.string().min(1).optional(),
  elliotVoiceId: z.string().optional(),

  // Image Generation
  imageProvider: z.enum(['gemini', 'openai']).default('gemini'),
  geminiApiKey: z.string().min(1).optional(),
  openaiApiKey: z.string().min(1).optional(),

  // Paths
  outputDir: z.string().default('./output'),
  cacheDir: z.string().default('./cache'),
  databasePath: z.string().default('./data/elliot.db'),

  // Style Versioning
  styleVersion: z.coerce.number().min(1).default(1),

  // Debug
  debug: z.coerce.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;

let cachedConfig: Config | null = null;

/**
 * Load and validate configuration from environment
 */
export function loadConfig(): Config {
  const rawConfig = {
    broadcastTime: process.env.BROADCAST_TIME,
    targetDurationSecs: process.env.TARGET_DURATION_SECS,
    episodeStartNumber: process.env.EPISODE_START_NUMBER,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    claudeModel: process.env.CLAUDE_MODEL,
    elevenlabsApiKey: process.env.ELEVENLABS_API_KEY,
    elliotVoiceId: process.env.ELLIOT_VOICE_ID,
    imageProvider: process.env.IMAGE_PROVIDER,
    geminiApiKey: process.env.GEMINI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    outputDir: process.env.OUTPUT_DIR,
    cacheDir: process.env.CACHE_DIR,
    databasePath: process.env.DATABASE_PATH,
    styleVersion: process.env.STYLE_VERSION,
    debug: process.env.DEBUG,
  };

  const result = configSchema.safeParse(rawConfig);

  if (!result.success) {
    const errors = result.error.issues.map(
      (issue) => `  - ${issue.path.join('.')}: ${issue.message}`
    );
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }

  return result.data;
}

/**
 * Get cached configuration (loads on first call)
 */
export function getConfig(): Config {
  if (!cachedConfig) {
    cachedConfig = loadConfig();
  }
  return cachedConfig;
}

/**
 * Validate that required API keys are present for a given operation
 */
export function validateApiKeys(operation: 'script' | 'audio' | 'image' | 'all'): void {
  const config = getConfig();
  const missing: string[] = [];

  if (operation === 'script' || operation === 'all') {
    if (!config.anthropicApiKey) {
      missing.push('ANTHROPIC_API_KEY (required for script generation)');
    }
  }

  if (operation === 'audio' || operation === 'all') {
    if (!config.elevenlabsApiKey) {
      missing.push('ELEVENLABS_API_KEY (required for audio synthesis)');
    }
    if (!config.elliotVoiceId) {
      missing.push('ELLIOT_VOICE_ID (required for audio synthesis)');
    }
  }

  if (operation === 'image' || operation === 'all') {
    if (config.imageProvider === 'gemini' && !config.geminiApiKey) {
      missing.push('GEMINI_API_KEY (required for image generation)');
    }
    if (config.imageProvider === 'openai' && !config.openaiApiKey) {
      missing.push('OPENAI_API_KEY (required for image generation)');
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required API keys:\n${missing.map((m) => `  - ${m}`).join('\n')}\n\nCopy .env.example to .env and add your API keys.`
    );
  }
}

/**
 * Check if .env file exists
 */
export function hasEnvFile(): boolean {
  return existsSync(join(process.cwd(), '.env'));
}

/**
 * Get the current date in broadcast format (YYYY-MM-DD)
 */
export function getBroadcastDate(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get the current time in broadcast format (HH:MM)
 */
export function getBroadcastTime(date: Date = new Date()): string {
  return date.toTimeString().slice(0, 5);
}
