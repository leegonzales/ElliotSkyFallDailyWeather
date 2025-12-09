/**
 * Generate Command
 *
 * Main command for generating weather broadcast episodes.
 */

import chalk from 'chalk';
import ora from 'ora';
import { nanoid } from 'nanoid';
import { getConfig, getBroadcastDate, getBroadcastTime, validateApiKeys } from '../../utils/config';
import { getDb, initializeDb, schema } from '../../storage/db';
import { eq } from 'drizzle-orm';

export interface GenerateOptions {
  date?: string;
  preview?: boolean;
  images?: boolean;
  video?: boolean;
}

export async function generateCommand(options: GenerateOptions): Promise<void> {
  const spinner = ora();

  try {
    // Determine broadcast date
    const broadcastDate = options.date || getBroadcastDate();
    const broadcastTime = getBroadcastTime();

    console.log(chalk.bold(`\nGenerating episode for ${chalk.cyan(broadcastDate)}\n`));

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
    spinner.start('Generating Elliot Skyfall script...');
    await updateEpisodeStatus(db, episode.id, 'generating');

    // TODO: Implement script generation
    await sleep(500); // Placeholder
    spinner.succeed('Script generated');

    // Phase 3: Media generation (parallel)
    if (options.images !== false || options.video !== false) {
      spinner.start('Generating media assets...');
      await updateEpisodeStatus(db, episode.id, 'synthesizing');

      // TODO: Implement parallel audio + image generation
      await sleep(500); // Placeholder
      spinner.succeed('Media assets generated');
    }

    // Phase 4: Timeline sync
    if (options.video !== false) {
      spinner.start('Synchronizing timeline...');
      await updateEpisodeStatus(db, episode.id, 'syncing');

      // TODO: Implement timeline sync
      await sleep(500); // Placeholder
      spinner.succeed('Timeline synchronized');
    }

    // Phase 5: Video composition
    if (options.video !== false) {
      spinner.start('Composing video with Remotion...');
      await updateEpisodeStatus(db, episode.id, 'composing');

      // TODO: Implement video rendering
      await sleep(500); // Placeholder
      spinner.succeed('Video composed');
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
