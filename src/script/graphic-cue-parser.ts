/**
 * Graphic Cue Parser
 *
 * Extract [GRAPHIC:] markers from generated scripts.
 */

import type { GraphicCue } from './types';

// Re-export GraphicCue for consumers
export type { GraphicCue } from './types';

/**
 * Parse graphic cues from script text
 */
export function parseGraphicCues(script: string): GraphicCue[] {
  const cues: GraphicCue[] = [];

  // Match [GRAPHIC: description | DURATION: Xs] or [GRAPHIC: description]
  const pattern = /\[GRAPHIC:\s*([^|\]]+)(?:\s*\|\s*DURATION:\s*(\d+)s?)?\]/gi;

  let match;
  let index = 0;

  while ((match = pattern.exec(script)) !== null) {
    const description = match[1].trim();
    const duration = match[2] ? parseInt(match[2], 10) : 5; // Default 5 seconds
    const position = match.index;

    // Determine graphic type from description
    const type = inferGraphicType(description);

    // Get surrounding context for timing alignment
    const contextText = getContextText(script, position);

    cues.push({
      index,
      description,
      duration,
      type,
      position,
      contextText,
    });

    index++;
  }

  return cues;
}

/**
 * Infer graphic type from description
 */
function inferGraphicType(description: string): 'atmospheric' | 'weather_graphic' | 'character' {
  const lower = description.toLowerCase();

  // Character-related
  if (lower.includes('elliot') || lower.includes('host') || lower.includes('broadcaster')) {
    return 'character';
  }

  // Weather graphics
  if (
    lower.includes('temperature') ||
    lower.includes('wind') ||
    lower.includes('humidity') ||
    lower.includes('forecast') ||
    lower.includes('conditions') ||
    lower.includes('hazard') ||
    lower.includes('warning') ||
    lower.includes('watch') ||
    lower.includes('radar') ||
    lower.includes('map') ||
    lower.includes('°')
  ) {
    return 'weather_graphic';
  }

  // Default to atmospheric
  return 'atmospheric';
}

/**
 * Get context text around a position for timing alignment
 */
function getContextText(script: string, position: number): string {
  // Get ~100 chars before and after the cue
  const start = Math.max(0, position - 100);
  const end = Math.min(script.length, position + 100);

  let context = script.slice(start, end);

  // Clean up the context
  context = context.replace(/\[GRAPHIC:[^\]]+\]/g, ''); // Remove graphic markers
  context = context.replace(/\[pause\]/g, ''); // Remove pause markers
  context = context.replace(/\s+/g, ' ').trim();

  return context;
}

/**
 * Remove graphic cues from script (for audio synthesis)
 */
export function removeGraphicCues(script: string): string {
  return script
    .replace(/\[GRAPHIC:[^\]]+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Remove pause markers from script (for word counting)
 */
export function removePauseMarkers(script: string): string {
  return script.replace(/\[pause\]/g, '').trim();
}

/**
 * Count words in script (excluding markers)
 */
export function countWords(script: string): number {
  const cleaned = removeGraphicCues(removePauseMarkers(script));
  return cleaned.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Estimate duration from word count (150 words per minute average)
 */
export function estimateDuration(script: string): number {
  const wordCount = countWords(script);
  return Math.round((wordCount / 150) * 60);
}

/**
 * Extract script for audio (clean text only)
 */
export function extractAudioScript(script: string): string {
  return script
    .replace(/\[GRAPHIC:[^\]]+\]/g, '') // Remove graphics
    .replace(/\[pause\]/g, ' ... ') // Convert pauses to ellipsis
    .replace(/\*([^*]+)\*/g, '$1') // Remove emphasis markers
    .replace(/\s+/g, ' ')
    .trim();
}
