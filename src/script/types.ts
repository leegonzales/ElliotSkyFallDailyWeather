/**
 * Script Types
 *
 * Type definitions for script generation.
 */

import type { BroadcastTimeContext } from '../utils/time-context';

/**
 * Graphic cue extracted from script
 */
export interface GraphicCue {
  index: number;
  description: string;
  duration: number; // Seconds
  type: 'atmospheric' | 'weather_graphic' | 'character';
  position: number; // Character position in script
  contextText: string; // Surrounding text for timing
}

/**
 * Script generation request
 */
export interface ScriptGenerationRequest {
  weatherData: string; // Formatted weather data
  broadcastDate: string;
  broadcastTime: string;
  episodeNumber: number;
  isStaleData: boolean;
  staleAge?: number;
  timeContext?: BroadcastTimeContext; // Time-of-day awareness
  location?: string; // Location name (e.g., "New York City", "Denver, Colorado")
}

/**
 * Script generation result
 */
export interface ScriptGenerationResult {
  script: string;
  graphicCues: GraphicCue[];
  estimatedDurationSecs: number;
  characterCount: number;
  wordCount: number;
}

/**
 * Prompt building options
 */
export interface PromptOptions {
  targetDurationSecs: number;
  includeHazardWarnings: boolean;
  style: 'full' | 'concise';
}
