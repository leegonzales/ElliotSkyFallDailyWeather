/**
 * Voices Command
 *
 * List available ElevenLabs voices to help find the right one for Elliot.
 */

import chalk from 'chalk';
import ora from 'ora';
import { listVoices } from '../../audio/synthesizer';
import { getConfig } from '../../utils/config';

export async function voicesCommand(): Promise<void> {
  const spinner = ora();

  try {
    const config = getConfig();

    if (!config.elevenlabsApiKey) {
      console.error(chalk.red('\nError: ELEVENLABS_API_KEY is required'));
      console.log(chalk.dim('Add your API key to .env file\n'));
      process.exit(1);
    }

    spinner.start('Fetching available voices...');
    const voices = await listVoices();
    spinner.succeed(`Found ${voices.length} voices\n`);

    console.log(chalk.bold('Available ElevenLabs Voices:\n'));

    // Group by category if available
    const categorized: Record<string, typeof voices> = {};

    for (const voice of voices) {
      const category = voice.labels.use_case || voice.labels.accent || 'other';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(voice);
    }

    // Display voices
    for (const voice of voices) {
      const labels = Object.entries(voice.labels)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ');

      console.log(chalk.cyan(`  ${voice.name}`));
      console.log(chalk.dim(`    ID: ${voice.id}`));
      if (labels) {
        console.log(chalk.dim(`    ${labels}`));
      }
      console.log('');
    }

    // Show current selection
    if (config.elliotVoiceId) {
      const current = voices.find(v => v.id === config.elliotVoiceId);
      if (current) {
        console.log(chalk.green(`\n✓ Current ELLIOT_VOICE_ID: ${current.name} (${config.elliotVoiceId})`));
      } else {
        console.log(chalk.yellow(`\n⚠ Current ELLIOT_VOICE_ID not found in voice list: ${config.elliotVoiceId}`));
      }
    } else {
      console.log(chalk.yellow('\n⚠ ELLIOT_VOICE_ID not set in .env'));
      console.log(chalk.dim('  Add ELLIOT_VOICE_ID=<voice-id> to your .env file'));
      console.log(chalk.dim('  Look for a deep, baritone voice for the Art Bell character\n'));
    }

  } catch (error) {
    spinner.fail('Failed to fetch voices');
    console.error(chalk.red(`\nError: ${error}`));
    process.exit(1);
  }
}
