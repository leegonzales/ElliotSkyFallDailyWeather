# Elliot Skyfall Daily Weather

Daily automated weather broadcasts for Denver, CO featuring **Elliot Skyfall**, an Art Bell-inspired late-night weather broadcaster.

## Overview

This CLI tool generates video weather broadcasts by:
1. Fetching weather data from the National Weather Service (NWS)
2. Generating scripts with Claude AI in Elliot Skyfall's distinctive voice
3. Synthesizing audio with ElevenLabs TTS
4. Creating atmospheric images with Gemini
5. Composing video with Remotion

## Installation

```bash
# Clone the repository
git clone https://github.com/leegonzales/ElliotSkyFallDailyWeather.git
cd ElliotSkyFallDailyWeather

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your API keys
```

## Configuration

Required API keys in `.env`:

| Key | Service | Purpose |
|-----|---------|---------|
| `ANTHROPIC_API_KEY` | Claude | Script generation |
| `ELEVENLABS_API_KEY` | ElevenLabs | Voice synthesis |
| `ELLIOT_VOICE_ID` | ElevenLabs | Elliot's voice ID |
| `GEMINI_API_KEY` | Google Gemini | Image generation |

## Usage

```bash
# Generate today's episode
npm run generate

# Generate for a specific date
npm run dev -- generate --date 2024-12-28

# Preview without rendering (dry run)
npm run preview

# List past episodes
npm run list

# List available ElevenLabs voices
npm run dev -- voices
```

## Output

Generated episodes are saved to `./output/{YYYY-MM-DD}/`:
- `episode-{N}.mp4` - Final video
- `episode-{N}.mp3` - Audio track
- `graphic-{N}.png` - Generated images

## Features

### Video Composition
- Glass panel lower-third overlays with weather data
- Weather icons based on conditions (sun, clouds, rain, snow, wind)
- Audio-reactive microphone logo that pulses with speech
- Progress bar showing video duration
- Summary slide with weather recap
- Smooth fade to black ending

### Weather Data
- NWS Area Forecast Discussion (AFD) parsing
- Digital forecast for hourly conditions
- Hazard detection and highlighting
- Stale data fallback with acknowledgment

### Character
Elliot Skyfall delivers weather with:
- Art Bell-inspired late-night radio persona
- Denver-centric local knowledge
- Dramatic atmospheric descriptions
- Cryptic sign-offs

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed system design.

## Tech Stack

- **Runtime**: Node.js 20+
- **Language**: TypeScript
- **CLI**: Commander.js
- **Database**: SQLite (Drizzle ORM)
- **Video**: Remotion
- **AI**: Claude (Anthropic), Gemini (Google)
- **TTS**: ElevenLabs

## License

MIT - See [LICENSE](./LICENSE)

## Author

Lee Gonzales / [CatalystAI](https://catalystai.com)
