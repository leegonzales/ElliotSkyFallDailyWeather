/**
 * Image Generator
 *
 * AI image generation for weather graphics using Gemini Imagen.
 */

import { GoogleGenAI } from '@google/genai';
import { writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { getConfig } from '../utils/config';
import { getDb, schema } from '../storage/db';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export interface ImageGenerationRequest {
  prompt: string;
  imageType: 'atmospheric' | 'weather_graphic' | 'character';
  outputPath: string;
}

export interface ImageGenerationResult {
  imagePath: string;
  prompt: string;
  cached: boolean;
}

let genaiClient: GoogleGenAI | null = null;

/**
 * Get or create Gemini client
 */
function getClient(): GoogleGenAI {
  if (genaiClient) {
    return genaiClient;
  }

  const config = getConfig();

  if (!config.geminiApiKey) {
    throw new Error('GEMINI_API_KEY is required for image generation');
  }

  genaiClient = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return genaiClient;
}

/**
 * Generate a hash for cache lookup
 */
function generateCacheKey(prompt: string, imageType: string): string {
  const config = getConfig();
  const content = `${prompt}|${imageType}|${config.styleVersion}`;
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Check cache for existing image
 */
async function checkCache(
  promptHash: string,
  imageType: string
): Promise<string | null> {
  const config = getConfig();
  const db = getDb();

  const cached = await db
    .select()
    .from(schema.imageCache)
    .where(
      and(
        eq(schema.imageCache.promptHash, promptHash),
        eq(schema.imageCache.imageType, imageType as any),
        eq(schema.imageCache.styleVersion, config.styleVersion)
      )
    )
    .limit(1);

  if (cached.length > 0 && existsSync(cached[0].imagePath)) {
    // Update last used timestamp
    await db
      .update(schema.imageCache)
      .set({
        lastUsedAt: new Date().toISOString(),
        useCount: (cached[0].useCount || 1) + 1,
      })
      .where(eq(schema.imageCache.id, cached[0].id));

    return cached[0].imagePath;
  }

  return null;
}

/**
 * Save image to cache
 */
async function saveToCache(
  promptHash: string,
  imageType: string,
  imagePath: string,
  prompt: string,
  model: string
): Promise<void> {
  const config = getConfig();
  const db = getDb();

  await db.insert(schema.imageCache).values({
    id: nanoid(),
    promptHash,
    imageType: imageType as any,
    styleVersion: config.styleVersion,
    imagePath,
    prompt,
    model,
  });
}

/**
 * Generate a weather graphic image
 */
export async function generateImage(
  request: ImageGenerationRequest
): Promise<ImageGenerationResult> {
  const config = getConfig();
  const promptHash = generateCacheKey(request.prompt, request.imageType);

  // Check cache first
  const cachedPath = await checkCache(promptHash, request.imageType);
  if (cachedPath) {
    // Copy cached image to the requested output path
    const outputDir = dirname(request.outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    copyFileSync(cachedPath, request.outputPath);

    return {
      imagePath: request.outputPath,
      prompt: request.prompt,
      cached: true,
    };
  }

  // Ensure output directory exists
  const outputDir = dirname(request.outputPath);
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const client = getClient();

  // Build style-enhanced prompt
  const stylePrompt = buildStylePrompt(request.prompt, request.imageType);

  try {
    // Use Gemini Imagen for image generation
    const response = await client.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: stylePrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: {
          aspectRatio: '16:9',
          imageSize: '2K',
        },
      },
    });

    // Extract image from response
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error('No response parts from Gemini');
    }

    let imageData: string | null = null;
    for (const part of parts) {
      if (part.inlineData?.mimeType?.startsWith('image/') && part.inlineData.data) {
        imageData = part.inlineData.data;
        break;
      }
    }

    if (!imageData) {
      throw new Error('No image generated in response');
    }

    // Save image to file
    const imageBuffer = Buffer.from(imageData, 'base64');
    writeFileSync(request.outputPath, imageBuffer);

    // Save to cache
    await saveToCache(
      promptHash,
      request.imageType,
      request.outputPath,
      request.prompt,
      'gemini-3-pro-image-preview'
    );

    return {
      imagePath: request.outputPath,
      prompt: request.prompt,
      cached: false,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Image generation failed: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Build a style-enhanced prompt for the image type
 *
 * IMPORTANT: We avoid ALL text in generated images because AI image generators
 * produce garbled, unreadable text. Text overlays will be added via Remotion.
 */
function buildStylePrompt(prompt: string, imageType: string): string {
  const baseStyle = `
    CRITICAL: DO NOT include ANY text, words, letters, numbers, labels, or writing in this image.
    NO text of any kind - the image should be purely visual with no written elements.

    Style: Cinematic, broadcast-quality, 16:9 aspect ratio.
    Aesthetic: Late-night mystery broadcast (Coast to Coast AM vibes).
    Color palette: Deep blues, purples, warm amber accents, dramatic lighting.
  `;

  switch (imageType) {
    case 'atmospheric':
      return `
        ${baseStyle}

        Create a moody, atmospheric background scene for a late-night weather broadcast.
        Think: starry desert skies over distant mountains, dramatic cloud formations at dusk,
        aurora borealis over snow-capped peaks, foggy valleys with subtle light.

        Evoke mystery and contemplation. Cinematic composition.

        Scene concept: ${prompt}

        Remember: NO TEXT whatsoever in the image.
      `;

    case 'weather_graphic':
      return `
        ${baseStyle}

        Create a PURELY VISUAL weather scene - NO text, numbers, or labels.
        Show the weather conditions through dramatic imagery:
        - For wind: swaying trees, blowing leaves, rippling flags
        - For snow: falling flakes, snow-covered landscape, frost patterns
        - For rain: droplets on glass, wet streets reflecting lights
        - For sun: golden rays, lens flares, warm lighting on landscape
        - For storms: dramatic clouds, lightning, atmospheric tension

        Make it cinematic and evocative, like a movie still.

        Weather to visualize: ${prompt}

        IMPORTANT: Absolutely NO text, numbers, temperature readings, or labels.
        Pure visual storytelling only.
      `;

    case 'character':
      return `
        ${baseStyle}

        Create a stylized portrait of a mysterious late-night radio broadcaster.
        Style: Film noir meets 1990s talk radio. Dramatic side lighting.
        The figure is silhouetted or partially lit, contemplative, knowledgeable.
        Background: vintage radio equipment, glowing dials, warm amber lights.

        Think: Art Bell in his studio, mysterious and inviting.

        Character notes: ${prompt}

        NO text, labels, or writing in the image.
      `;

    default:
      return `${baseStyle}\n\nVisualize this concept with NO text: ${prompt}`;
  }
}

/**
 * Generate all images for graphic cues
 */
export async function generateImagesForCues(
  cues: Array<{ description: string; type?: string }>,
  outputDir: string
): Promise<ImageGenerationResult[]> {
  const results: ImageGenerationResult[] = [];

  for (let i = 0; i < cues.length; i++) {
    const cue = cues[i];
    const imageType = inferImageType(cue.description);
    const filename = `graphic-${String(i + 1).padStart(2, '0')}.png`;
    const outputPath = join(outputDir, filename);

    console.log(`    Generating image ${i + 1}/${cues.length}: ${cue.description.slice(0, 40)}...`);

    const result = await generateImage({
      prompt: cue.description,
      imageType,
      outputPath,
    });

    results.push(result);

    if (result.cached) {
      console.log(`      (cached)`);
    }
  }

  return results;
}

/**
 * Infer image type from cue description
 */
function inferImageType(description: string): 'atmospheric' | 'weather_graphic' | 'character' {
  const lower = description.toLowerCase();

  // Character-related
  if (lower.includes('elliot') || lower.includes('host') || lower.includes('broadcaster')) {
    return 'character';
  }

  // Atmospheric scenes
  if (
    lower.includes('background') ||
    lower.includes('scene') ||
    lower.includes('sky') ||
    lower.includes('sunset') ||
    lower.includes('sunrise') ||
    lower.includes('night')
  ) {
    return 'atmospheric';
  }

  // Default to weather graphic
  return 'weather_graphic';
}

/**
 * Check if Gemini is available for image generation
 */
export function isGeminiAvailable(): boolean {
  const config = getConfig();
  return !!config.geminiApiKey;
}
