#!/usr/bin/env node
/**
 * Elliot Skyfall Daily Weather CLI
 *
 * Command-line interface for generating daily weather broadcasts.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { generateCommand } from './commands/generate';
import { listCommand } from './commands/list';
import { voicesCommand } from './commands/voices';
import { hasEnvFile } from '../utils/config';

const program = new Command();

// ASCII art banner
const banner = `
${chalk.cyan('╔═══════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')}  ${chalk.yellow('☀')}  ${chalk.bold.white('ELLIOT SKYFALL DAILY WEATHER')}  ${chalk.yellow('☁')}                    ${chalk.cyan('║')}
${chalk.cyan('║')}     ${chalk.dim('Your guide through the ever-changing skies')}           ${chalk.cyan('║')}
${chalk.cyan('╚═══════════════════════════════════════════════════════════╝')}
`;

program
  .name('esw')
  .description('Generate daily weather broadcasts featuring Elliot Skyfall')
  .version('0.1.0')
  .hook('preAction', () => {
    // Check for .env file before running commands
    if (!hasEnvFile()) {
      console.log(chalk.yellow('\n⚠ No .env file found.'));
      console.log(chalk.dim('  Copy .env.example to .env and add your API keys.\n'));
    }
  });

// Generate command
program
  .command('generate')
  .description('Generate a new weather broadcast episode')
  .option('-f, --for <time>', 'Target broadcast time (e.g., "now", "tonight 9pm", "tomorrow morning")')
  .option('-l, --location <location>', 'Location for weather data (e.g., "denver", "nyc")')
  .option('-d, --date <date>', 'Broadcast date (YYYY-MM-DD) - overridden by --for')
  .option('-p, --preview', 'Preview script only (no audio/video)')
  .option('--no-images', 'Skip image generation')
  .option('--no-video', 'Skip video generation (audio only)')
  .action(async (options) => {
    console.log(banner);
    await generateCommand(options);
  });

// List command
program
  .command('list')
  .description('List recent episodes')
  .option('-n, --limit <number>', 'Number of episodes to show', '10')
  .action(async (options) => {
    console.log(banner);
    await listCommand(options);
  });

// Voices command
program
  .command('voices')
  .description('List available ElevenLabs voices')
  .action(async () => {
    console.log(banner);
    await voicesCommand();
  });

// Show command
program
  .command('show <date>')
  .description('Show details for a specific episode')
  .action(async (date) => {
    console.log(banner);
    console.log(chalk.dim(`Showing episode for ${date}...\n`));
    // TODO: Implement show command
    console.log(chalk.yellow('Not yet implemented.'));
  });

// Status command
program
  .command('status')
  .description('Show system status and configuration')
  .action(async () => {
    console.log(banner);
    console.log(chalk.bold('\nSystem Status:\n'));

    // Check config
    try {
      const { getConfig, validateApiKeys } = await import('../utils/config');
      const config = getConfig();

      console.log(chalk.green('✓ Configuration loaded'));
      console.log(chalk.dim(`  Broadcast time: ${config.broadcastTime}`));
      console.log(chalk.dim(`  Target duration: ${config.targetDurationSecs}s`));
      console.log(chalk.dim(`  Image provider: ${config.imageProvider}`));
      console.log(chalk.dim(`  Output dir: ${config.outputDir}`));

      // Check API keys
      const apiChecks = [
        { name: 'Anthropic', key: config.anthropicApiKey },
        { name: 'ElevenLabs', key: config.elevenlabsApiKey },
        { name: 'Gemini', key: config.geminiApiKey },
        { name: 'OpenAI', key: config.openaiApiKey },
      ];

      console.log(chalk.bold('\nAPI Keys:\n'));
      for (const { name, key } of apiChecks) {
        if (key) {
          console.log(chalk.green(`✓ ${name}: configured`));
        } else {
          console.log(chalk.dim(`○ ${name}: not set`));
        }
      }

      // Check database
      const { initializeDb } = await import('../storage/db');
      initializeDb();
      console.log(chalk.bold('\nDatabase:\n'));
      console.log(chalk.green(`✓ SQLite: ${config.databasePath}`));

    } catch (error) {
      console.log(chalk.red(`✗ Configuration error: ${error}`));
    }
  });

// Parse arguments
program.parse();
