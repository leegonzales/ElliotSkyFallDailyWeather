/**
 * Script Generator
 *
 * Generate Elliot Skyfall broadcast scripts using Claude.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getConfig } from '../utils/config';
import { buildPrompt } from './prompt-builder';
import { parseGraphicCues, countWords, estimateDuration } from './graphic-cue-parser';
import type { ScriptGenerationRequest, ScriptGenerationResult } from './types';

let anthropicClient: Anthropic | null = null;

/**
 * Get or create Anthropic client
 */
function getClient(): Anthropic {
  if (anthropicClient) {
    return anthropicClient;
  }

  const config = getConfig();

  if (!config.anthropicApiKey) {
    throw new Error('ANTHROPIC_API_KEY is required for script generation');
  }

  anthropicClient = new Anthropic({
    apiKey: config.anthropicApiKey,
  });

  return anthropicClient;
}

/**
 * Generate broadcast script
 */
export async function generateScript(
  request: ScriptGenerationRequest
): Promise<ScriptGenerationResult> {
  const config = getConfig();
  const client = getClient();

  // Build the prompt
  const prompt = buildPrompt(request, {
    targetDurationSecs: config.targetDurationSecs,
    includeHazardWarnings: true,
    style: 'full',
  });

  // Generate with Claude
  const message = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text content
  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const script = textContent.text;

  // Parse graphic cues
  const graphicCues = parseGraphicCues(script);

  // Calculate metrics
  const wordCount = countWords(script);
  const estimatedDurationSecs = estimateDuration(script);

  return {
    script,
    graphicCues,
    estimatedDurationSecs,
    characterCount: script.length,
    wordCount,
  };
}

/**
 * Generate a preview (shorter) script
 */
export async function generatePreviewScript(
  request: ScriptGenerationRequest
): Promise<ScriptGenerationResult> {
  const config = getConfig();
  const client = getClient();

  // Build shorter prompt
  const prompt = buildPrompt(request, {
    targetDurationSecs: 60, // 1 minute preview
    includeHazardWarnings: true,
    style: 'concise',
  });

  // Generate with Claude
  const message = await client.messages.create({
    model: config.claudeModel,
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  // Extract text content
  const textContent = message.content.find((block) => block.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text content in Claude response');
  }

  const script = textContent.text;

  return {
    script,
    graphicCues: parseGraphicCues(script),
    estimatedDurationSecs: estimateDuration(script),
    characterCount: script.length,
    wordCount: countWords(script),
  };
}

/**
 * Check if Claude is available
 */
export function isClaudeAvailable(): boolean {
  const config = getConfig();
  return !!config.anthropicApiKey;
}
