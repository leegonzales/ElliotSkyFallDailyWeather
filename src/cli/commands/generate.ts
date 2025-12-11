/**
 * Generate Command
 *
 * Main command for generating weather broadcast episodes.
 */

import chalk from 'chalk';
import ora from 'ora';
import { nanoid } from 'nanoid';
import { join } from 'node:path';
import { mkdirSync, existsSync } from 'node:fs';
import { getConfig, getBroadcastDate, getBroadcastTime, validateApiKeys } from '../../utils/config';
import { buildTimeContext, buildCurrentTimeContext, type BroadcastTimeContext } from '../../utils/time-context';
import { getDb, initializeDb, schema } from '../../storage/db';
import { eq } from 'drizzle-orm';
import { synthesizeAudio, isElevenLabsAvailable } from '../../audio/synthesizer';
import { generateImagesForCues, isGeminiAvailable } from '../../images/generator';
import { parseGraphicCues } from '../../script/graphic-cue-parser';
import { buildTimeline, renderVideo, isRemotionAvailable } from '../../video';

export interface GenerateOptions {
  for?: string;
  date?: string;
  location?: string;
  preview?: boolean;
  images?: boolean;
  video?: boolean;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const spinner = ora();

  try {
    // Build time context from --for option or use current time
    let timeContext: BroadcastTimeContext;

    if (options.for) {
      try {
        timeContext = buildTimeContext(options.for);
        console.log(chalk.bold(`\nTarget: ${chalk.cyan(timeContext.description)}`));
        console.log(chalk.dim(`  Time of day: ${timeContext.timeOfDay} (${timeContext.isLateNight ? 'Art Bell mode' : 'standard'})`));
        console.log(chalk.dim(`  Atmosphere: ${timeContext.atmosphericTone}`));
        console.log('');
      } catch (e) {
        console.error(chalk.red(`Could not parse time: "${options.for}"`));
        console.log(chalk.dim('  Examples: "now", "tonight 9pm", "tomorrow morning"'));
        process.exit(1);
      }
    } else if (options.date) {
      // Legacy --date support
      timeContext = buildTimeContext(`${options.date} at ${getBroadcastTime()}`);
    } else {
      // Default to now
      timeContext = buildCurrentTimeContext();
    }

    const broadcastDate = timeContext.date;
    const broadcastTime = timeContext.time;

    // Set location if specified
    const { setLocation, getCurrentLocation, LOCATIONS } = await import('../../weather/fetcher');

    if (options.location) {
      try {
        setLocation(options.location);
        console.log(chalk.bold(`Location: ${chalk.cyan(getCurrentLocation().name)}`));
      } catch (e) {
        console.error(chalk.red(`Invalid location: "${options.location}"`));
        console.log(chalk.dim(`  Available: ${Object.keys(LOCATIONS).join(', ')}`));
        process.exit(1);
      }
    }

    const locationName = getCurrentLocation().name;

    console.log(chalk.bold(`Generating episode for ${chalk.cyan(locationName)} on ${chalk.cyan(broadcastDate)} at ${chalk.cyan(broadcastTime)}\n`));

    // Initialize database
    spinner.start('Initializing database...');
    initializeDb();
    const db = getDb();
    spinner.succeed('Database initialized');

    // Check for existing episode
    spinner.start('Checking for existing episode...');
    const existing = await db
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.broadcastDate, broadcastDate))
      .limit(1);

    let episode;
    let episodeNumber: number;

    if (existing.length > 0) {
      episode = existing[0];
      episodeNumber = episode.episodeNumber;

      if (episode.status === 'done') {
        spinner.info(`Episode already exists and is complete`);
        console.log(chalk.dim(`  Video: ${episode.videoPath}`));
        console.log(chalk.dim(`  Audio: ${episode.audioPath}`));
        return;
      }

      spinner.info(`Resuming episode from state: ${episode.status}`);
    } else {
      // Get next episode number
      const config = getConfig();
      const lastEpisode = await db
        .select()
        .from(schema.episodes)
        .orderBy(schema.episodes.episodeNumber)
        .limit(1);

      episodeNumber = lastEpisode.length > 0
        ? lastEpisode[0].episodeNumber + 1
        : config.episodeStartNumber;

      // Create new episode record
      const newEpisode = {
        id: nanoid(),
        broadcastDate,
        broadcastTime,
        episodeNumber,
        status: 'init' as const,
      };

      await db.insert(schema.episodes).values(newEpisode);
      episode = newEpisode;
      spinner.succeed(`Created episode #${episodeNumber}`);
    }

    // Preview mode - just show what would happen
    if (options.preview) {
      console.log(chalk.yellow('\n📋 Preview mode - no generation will occur\n'));

      // Validate script generation keys only
      try {
        validateApiKeys('script');
        console.log(chalk.green('✓ Script generation: ready'));
      } catch (e) {
        console.log(chalk.red(`✗ Script generation: ${e}`));
      }

      // Show pipeline steps
      console.log(chalk.bold('\nPipeline steps:\n'));
      console.log(chalk.dim('  1. Fetch weather data from NWS'));
      console.log(chalk.dim('  2. Generate Elliot Skyfall script with Claude'));
      console.log(chalk.dim('  3. Parse [GRAPHIC:] cues from script'));

      if (options.images !== false) {
        console.log(chalk.dim('  4. Generate atmospheric and weather images'));
      }
      if (options.video !== false) {
        console.log(chalk.dim('  5. Synthesize audio with ElevenLabs'));
        console.log(chalk.dim('  6. Build timeline and sync graphics'));
        console.log(chalk.dim('  7. Render video with Remotion'));
      }

      console.log(chalk.dim('\n  8. Save episode metadata'));
      return;
    }

    // Full generation pipeline
    console.log(chalk.bold('\n🎬 Starting generation pipeline...\n'));

    // Phase 1: Fetch weather data
    spinner.start('Fetching weather data from NWS...');
    await updateEpisodeStatus(db, episode.id, 'fetching');

    const { fetchWeatherData, formatWeatherForScript } = await import('../../weather/fetcher');
    const weatherResult = await fetchWeatherData(episode.id);

    if (!weatherResult.success || !weatherResult.data) {
      throw new Error(`Failed to fetch weather data: ${weatherResult.error}`);
    }

    const weatherData = weatherResult.data;
    if (weatherResult.usedFallback) {
      spinner.warn(`Using cached weather data (${weatherData.staleAge}h old)`);
    } else {
      spinner.succeed('Weather data fetched');
    }

    // Show weather summary
    console.log(chalk.dim(`\n  Current: ${weatherData.forecast.current.temperature}°F, ${weatherData.forecast.current.conditions}`));
    console.log(chalk.dim(`  Wind: ${weatherData.forecast.current.windDirection} at ${weatherData.forecast.current.windSpeed} mph`));
    if (weatherData.afd.hazards.length > 0) {
      console.log(chalk.yellow(`  ⚠ Active hazards: ${weatherData.afd.hazards.map(h => h.type).join(', ')}`));
    }
    console.log('');

    // Phase 2: Generate script
    spinner.start('Generating Elliot Skyfall script with Claude...');
    await updateEpisodeStatus(db, episode.id, 'generating');

    const { generateScript, isClaudeAvailable } = await import('../../script/generator');

    if (!isClaudeAvailable()) {
      spinner.warn('Claude API key not configured - skipping script generation');
      console.log(chalk.dim('  Set ANTHROPIC_API_KEY in .env to enable script generation\n'));
    } else {
      const scriptResult = await generateScript({
        weatherData: formatWeatherForScript(weatherData, timeContext),
        broadcastDate,
        broadcastTime,
        episodeNumber,
        isStaleData: weatherData.isStale,
        staleAge: weatherData.staleAge,
        timeContext,
        location: locationName,
      });

      // Update episode with script
      await db
        .update(schema.episodes)
        .set({ script: scriptResult.script })
        .where(eq(schema.episodes.id, episode.id));

      spinner.succeed(`Script generated (${scriptResult.wordCount} words, ~${Math.round(scriptResult.estimatedDurationSecs / 60)}min)`);

      // Show script preview
      console.log(chalk.dim(`\n  Graphic cues: ${scriptResult.graphicCues.length}`));
      for (const cue of scriptResult.graphicCues.slice(0, 3)) {
        console.log(chalk.dim(`    - ${cue.description} (${cue.duration}s)`));
      }
      if (scriptResult.graphicCues.length > 3) {
        console.log(chalk.dim(`    ... and ${scriptResult.graphicCues.length - 3} more`));
      }
      console.log('');
    }

    // Phase 3: Audio synthesis
    const config = getConfig();
    const outputDir = join(config.outputDir, broadcastDate);

    // Ensure output directory exists
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Get the script from database (may have been generated in previous run)
    const currentEpisode = await db
      .select()
      .from(schema.episodes)
      .where(eq(schema.episodes.id, episode.id))
      .limit(1);

    const script = currentEpisode[0]?.script;

    if (!script) {
      throw new Error('No script available for audio synthesis');
    }

    let audioPath: string | undefined;
    let audioDuration: number | undefined;

    if (options.video !== false) {
      spinner.start('Synthesizing audio with ElevenLabs...');
      await updateEpisodeStatus(db, episode.id, 'synthesizing');

      if (!isElevenLabsAvailable()) {
        spinner.warn('ElevenLabs not configured - skipping audio synthesis');
        console.log(chalk.dim('  Set ELEVENLABS_API_KEY and ELLIOT_VOICE_ID in .env\n'));
      } else {
        const audioOutputPath = join(outputDir, `episode-${episodeNumber}.mp3`);
        const audioResult = await synthesizeAudio(script, audioOutputPath);

        audioPath = audioResult.audioPath;
        audioDuration = audioResult.duration;

        // Update episode with audio info
        await db
          .update(schema.episodes)
          .set({
            audioPath: audioResult.audioPath,
            durationSecs: audioResult.duration,
          })
          .where(eq(schema.episodes.id, episode.id));

        spinner.succeed(`Audio synthesized (${audioDuration.toFixed(1)}s)`);
        console.log(chalk.dim(`  Output: ${audioPath}\n`));
      }
    }

    // Phase 4: Image generation
    if (options.images !== false) {
      spinner.start('Generating images...');

      if (!isGeminiAvailable()) {
        spinner.warn('Gemini not configured - skipping image generation');
        console.log(chalk.dim('  Set GEMINI_API_KEY in .env\n'));
      } else {
        // Parse graphic cues from script
        const graphicCues = parseGraphicCues(script);

        if (graphicCues.length === 0) {
          spinner.info('No graphic cues found in script');
        } else {
          spinner.text = `Generating ${graphicCues.length} images...`;
          console.log(''); // New line for sub-progress

          const imageResults = await generateImagesForCues(
            graphicCues.map(cue => ({ description: cue.description })),
            outputDir,
            { timeContext }
          );

          const cachedCount = imageResults.filter(r => r.cached).length;
          spinner.succeed(`Generated ${imageResults.length} images (${cachedCount} cached)`);
        }
      }
    }

    // Phase 5: Timeline sync and Video composition
    if (options.video !== false) {
      if (!audioPath || !audioDuration) {
        spinner.warn('No audio available - skipping video composition');
      } else if (!isRemotionAvailable()) {
        spinner.warn('Remotion not available - skipping video composition');
      } else {
        // Build timeline
        spinner.start('Building timeline...');
        await updateEpisodeStatus(db, episode.id, 'syncing');

        const graphicCues = parseGraphicCues(script);

        // Build weather summary for end slide
        const weatherSummary = weatherData ? {
          temperature: `${weatherData.forecast.current.temperature}°F`,
          conditions: weatherData.forecast.current.conditions,
          wind: `${weatherData.forecast.current.windDirection} ${weatherData.forecast.current.windSpeed} mph`,
          hazards: weatherData.afd.hazards.map((h: { type: string }) => h.type),
          outlook: '', // Extended outlook handled in script
        } : undefined;

        const timeline = buildTimeline({
          graphicCues,
          audioPath,
          audioDuration,
          imagesDir: outputDir,
          // Use current time for broadcast date (not the weather data date)
          broadcastDate: new Date().toISOString(),
          location: locationName,
          weatherSummary,
        });

        spinner.succeed(`Timeline built (${timeline.segments.length} segments, ${timeline.durationInFrames} frames)`);

        // Render video
        spinner.start('Rendering video with Remotion...');
        await updateEpisodeStatus(db, episode.id, 'composing');

        const videoOutputPath = join(outputDir, `episode-${episodeNumber}.mp4`);
        const videoResult = await renderVideo(timeline, {
          outputPath: videoOutputPath,
        });

        // Update episode with video path
        await db
          .update(schema.episodes)
          .set({ videoPath: videoResult.videoPath })
          .where(eq(schema.episodes.id, episode.id));

        spinner.succeed(`Video rendered (${videoResult.durationSecs.toFixed(1)}s)`);
        console.log(chalk.dim(`  Output: ${videoResult.videoPath}\n`));
      }
    }

    // Mark complete
    await updateEpisodeStatus(db, episode.id, 'done');

    console.log(chalk.bold.green('\n✓ Episode generation complete!\n'));
    console.log(chalk.dim(`  Episode #${episodeNumber} for ${broadcastDate}`));
    console.log(chalk.dim(`  Output: ./output/${broadcastDate}/`));

  } catch (error) {
    spinner.fail('Generation failed');
    console.error(chalk.red(`\nError: ${error}`));
    process.exit(1);
  }
}

/**
 * Update episode status in database
 */
async function updateEpisodeStatus(
  db: ReturnType<typeof getDb>,
  episodeId: string,
  status: string
): Promise<void> {
  await db
    .update(schema.episodes)
    .set({
      status: status as any,
      updatedAt: new Date().toISOString(),
      ...(status === 'done' ? { completedAt: new Date().toISOString() } : {}),
    })
    .where(eq(schema.episodes.id, episodeId));
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
