/**
 * List Command
 *
 * List recent episodes with their status.
 */

import chalk from 'chalk';
import { getDb, initializeDb, schema } from '../../storage/db';
import { desc } from 'drizzle-orm';

export interface ListOptions {
  limit: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  const limit = parseInt(options.limit, 10) || 10;

  try {
    // Initialize database
    initializeDb();
    const db = getDb();

    // Fetch episodes
    const episodes = await db
      .select()
      .from(schema.episodes)
      .orderBy(desc(schema.episodes.broadcastDate))
      .limit(limit);

    if (episodes.length === 0) {
      console.log(chalk.yellow('\nNo episodes found.\n'));
      console.log(chalk.dim('Run `esw generate` to create your first episode.\n'));
      return;
    }

    console.log(chalk.bold(`\nRecent Episodes (${episodes.length}):\n`));

    // Table header
    console.log(
      chalk.dim('  ') +
      chalk.bold.white('Date'.padEnd(12)) +
      chalk.bold.white('Episode'.padEnd(10)) +
      chalk.bold.white('Status'.padEnd(14)) +
      chalk.bold.white('Duration')
    );
    console.log(chalk.dim('  ' + '─'.repeat(50)));

    // Table rows
    for (const ep of episodes) {
      const statusColor = getStatusColor(ep.status);
      const duration = ep.durationSecs
        ? `${Math.round(ep.durationSecs)}s`
        : '—';

      console.log(
        chalk.dim('  ') +
        chalk.white(ep.broadcastDate.padEnd(12)) +
        chalk.cyan(`#${ep.episodeNumber}`.padEnd(10)) +
        statusColor(ep.status.padEnd(14)) +
        chalk.dim(duration)
      );
    }

    console.log('');

  } catch (error) {
    console.error(chalk.red(`\nError listing episodes: ${error}\n`));
    process.exit(1);
  }
}

/**
 * Get chalk color for status
 */
function getStatusColor(status: string): (text: string) => string {
  switch (status) {
    case 'done':
      return chalk.green;
    case 'error':
      return chalk.red;
    case 'init':
      return chalk.dim;
    default:
      return chalk.yellow;
  }
}
