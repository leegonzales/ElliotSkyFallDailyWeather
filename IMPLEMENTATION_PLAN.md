# Elliot Skyfall Daily Weather - Implementation Plan

**Version:** 1.0.0
**Last Updated:** 2025-12-07
**Status:** Ready for Implementation
**Peer Review:** Completed (Gemini + Codex)

---

## Peer Review Synthesis

### Gemini's Key Insights
- Model orchestrator as **state machine** for resumability
- Enhance `[GRAPHIC:]` cues with explicit timing: `[GRAPHIC: desc | DURATION: 5s]`
- Derive graphic timing from **TTS word timestamps** (sentence boundaries)
- NWS fallback should acknowledge staleness in the script itself

### Codex's Key Insights
- Gate final assembly on **sync validation pass** (all assets exist)
- **Cache key strategy**: hash(prompt + model + style_version) for drift control
- **Fail fast with placeholder** if graphic cue can't resolve to image
- Add **structured logging** per pipeline step for debugging

### Consensus Points
1. Parallel audio/image generation is correct with post-sync validation
2. Image caching is critical (portrait, lower-thirds, templates)
3. SQLite appropriate with migration/backup story
4. NWS failure needs retry + fallback with "stale" notice
5. Graphic timing is core technical challenge

---

## Refined Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     CLI Interface (Commander.js)                 │
├─────────────────────────────────────────────────────────────────┤
│              Episode Orchestrator (State Machine)                │
│   States: init → fetch → script → media → compose → done/error  │
├──────────────────┬──────────────────┬───────────────────────────┤
│  Weather Fetcher │  Script Generator │  Media Pipeline           │
│  + Retry/Fallback│  + Graphic Cues   │  + Timeline Sync          │
├──────────────────┴──────────────────┴───────────────────────────┤
│                     Storage (SQLite + Cache + Filesystem)        │
└─────────────────────────────────────────────────────────────────┘
```

### State Machine States

```typescript
type EpisodeState =
  | 'init'           // Created, not started
  | 'fetching'       // Fetching weather data
  | 'generating'     // Generating script
  | 'synthesizing'   // Audio + Image generation (parallel)
  | 'syncing'        // Timeline reconciliation
  | 'composing'      // Remotion video render
  | 'done'           // Complete
  | 'error';         // Failed (with error details)
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
**Goal:** Project structure, database, configuration

#### Tasks
- [ ] Initialize Node.js project with TypeScript
  - `package.json` with dependencies (Commander, SQLite, dotenv, zod)
  - `tsconfig.json` for ES modules
- [ ] Create directory structure matching design
- [ ] Set up environment configuration
  - `.env.example` with all required variables
  - Config loader with validation (zod schemas)
- [ ] Initialize SQLite database
  - `drizzle.config.ts` and schema
  - Migration system (better-sqlite3)
  - Episode and weather_snapshot tables
- [ ] CLI scaffolding
  - Entry point with Commander.js
  - `generate`, `preview`, `list` command stubs

#### Deliverables
- Working `npm run dev generate --help`
- Database created and migrated
- Config validated from `.env`

#### Files to Create
```
src/
├── cli/
│   ├── index.ts              # CLI entry point
│   └── commands/
│       └── generate.ts       # Generate command stub
├── storage/
│   ├── db.ts                 # Database connection
│   └── schema.ts             # Drizzle schema
└── utils/
    └── config.ts             # Config loader
```

---

### Phase 2: Weather Integration (Day 1-2)
**Goal:** Fetch and parse NWS data with resilience

#### Tasks
- [ ] NWS AFD Fetcher
  - HTTP fetch with retry/backoff (3 attempts)
  - Parse key messages, hazards, discussion sections
  - Extract issue timestamp
- [ ] Digital Forecast Fetcher
  - Parse tabular hourly data
  - Extract current conditions
  - 48-hour forecast window
- [ ] Weather data types
  - Zod schemas for validation
  - Clean interfaces
- [ ] Fallback mechanism
  - Store successful fetches in `weather_snapshots`
  - Fall back to previous day with staleness flag
  - Return `{ data, isStale, staleAge }` tuple

#### Deliverables
- `fetchWeatherData()` returns validated weather data
- Automatic fallback on NWS failures
- Weather snapshots persisted

#### Files to Create
```
src/weather/
├── fetcher.ts            # Main fetch orchestrator
├── afd-parser.ts         # AFD text parsing
├── forecast-parser.ts    # Digital forecast parsing
├── types.ts              # WeatherData types
└── fallback.ts           # Fallback logic
```

---

### Phase 3: Script Generation (Day 2)
**Goal:** Generate Elliot Skyfall broadcast scripts

#### Tasks
- [ ] Claude API integration
  - Anthropic SDK setup
  - Model selection (claude-sonnet-4-20250514)
  - Token limits and streaming
- [ ] Prompt builder
  - Inject weather data into character prompt
  - Include date/time/episode number
  - Handle stale data acknowledgment in prompt
- [ ] Graphic cue parser
  - Extract `[GRAPHIC: description | DURATION: Xs]` markers
  - Parse into structured `GraphicCue[]`
  - Map cue index to position in script
- [ ] Script validation
  - Ensure script has intro/body/outro structure
  - Validate graphic cues are parseable

#### Deliverables
- `generateScript(weatherData)` returns script + cues
- Graphic cues extracted with timing hints
- Preview mode outputs script to stdout

#### Files to Create
```
src/script/
├── generator.ts          # Claude script generation
├── prompt-builder.ts     # Build Elliot prompt
├── graphic-cue-parser.ts # Extract [GRAPHIC:] markers
└── types.ts              # Script types
```

---

### Phase 4: Audio Synthesis (Day 2-3)
**Goal:** Convert script to audio with timestamps

#### Tasks
- [ ] Port ElevenLabs service from AI Talk Show CLI
  - `synthesizeSpeech()` with character timestamps
  - Voice configuration for Elliot (find baritone voice)
- [ ] Audio normalization
  - Port `AudioNormalizer` for format consistency
  - 44.1kHz stereo MP3 output
- [ ] Duration measurement
  - Port `ffprobe` utility
  - Measure actual audio duration
- [ ] Timeline extraction
  - Character-level timestamps from ElevenLabs
  - Word boundaries for graphic timing
  - Sentence boundaries for cue alignment

#### Deliverables
- `synthesizeAudio(script)` returns audio + timestamps
- Word-level timing data available
- Audio file normalized and measured

#### Files to Create
```
src/audio/
├── synthesizer.ts        # ElevenLabs wrapper
├── voice-config.ts       # Elliot voice settings
├── normalizer.ts         # Audio format normalization
└── timeline.ts           # Timestamp extraction
```

---

### Phase 5: Image Generation (Day 3)
**Goal:** Generate atmospheric and weather graphics

#### Tasks
- [ ] Image generator abstraction
  - Support Gemini (primary) and DALL-E (fallback)
  - Consistent interface: `generateImage(prompt, type)`
- [ ] Image types and prompts
  - **Atmospheric**: Night sky, Denver cityscape, moody backgrounds
  - **Weather Graphics**: Temperature displays, wind visualizations
  - **Character**: Elliot Skyfall portrait (generated once)
- [ ] Caching system
  - Cache key: `hash(prompt + model + style_version)`
  - Store in `./cache/images/` with metadata
  - Check cache before generation
- [ ] Graphic resolver
  - Map `[GRAPHIC:]` cues to image generation
  - Use cached images when prompt matches
  - Generate placeholder slate on failure (fail fast)

#### Deliverables
- `generateImages(graphicCues)` returns image paths
- Character portrait cached after first generation
- Weather graphics cached by prompt hash

#### Files to Create
```
src/images/
├── generator.ts          # Image generation orchestrator
├── providers/
│   ├── gemini.ts         # Gemini image generation
│   └── openai.ts         # DALL-E fallback
├── cache.ts              # Image caching logic
├── prompts.ts            # Prompt templates by type
└── types.ts              # Image types
```

---

### Phase 6: Timeline Synchronization (Day 3)
**Goal:** Align graphic cues with audio timestamps

#### Tasks
- [ ] Post-TTS timeline builder
  - Receive audio timestamps and graphic cues
  - Map each cue to closest sentence boundary
  - Calculate start/end times for each graphic
- [ ] Validation pass
  - Ensure no gaps between graphics (use default background)
  - Ensure no overlaps
  - Verify all cues resolved to images
- [ ] Timeline output
  - Structured timeline for Remotion:
    ```typescript
    { startFrame, endFrame, imagePath, captionText }[]
    ```

#### Deliverables
- `buildTimeline(audio, images, cues)` returns video timeline
- Validation catches sync issues before render
- Timeline ready for Remotion composition

#### Files to Create
```
src/video/
├── timeline-builder.ts   # Build video timeline
├── sync-validator.ts     # Validate no gaps/overlaps
└── types.ts              # Timeline types
```

---

### Phase 7: Video Composition (Day 3-4)
**Goal:** Render final video with Remotion

#### Tasks
- [ ] Remotion setup
  - Configure Remotion project
  - Install Chromium dependencies
  - Set video dimensions (1920x1080)
- [ ] WeatherBroadcast composition
  - Background layer (atmospheric image)
  - Graphic overlay layer (weather graphics)
  - Caption layer (synced to audio)
  - Optional: Elliot character overlay
- [ ] Caption component
  - Word-by-word highlighting (from timestamps)
  - Styled for readability
- [ ] Render orchestration
  - Bundle Remotion project
  - Render to MP4 (H.264)
  - Cleanup temporary files

#### Deliverables
- `renderVideo(timeline, audioPath)` produces MP4
- Captions synchronized to audio
- Graphics displayed at correct times

#### Files to Create
```
src/video/
├── renderer.ts           # Remotion render orchestration
└── remotion/
    ├── index.ts          # Remotion entry
    ├── WeatherBroadcast.tsx  # Main composition
    ├── GraphicOverlay.tsx    # Weather graphics layer
    ├── Captions.tsx          # Caption component
    └── Background.tsx        # Atmospheric background
```

---

### Phase 8: Orchestration & CLI (Day 4)
**Goal:** Wire everything together with state machine

#### Tasks
- [ ] Episode orchestrator
  - State machine implementation
  - Persist state to SQLite on each transition
  - Resume from last successful state on restart
- [ ] Progress indicators
  - Port `ora` spinner from AI Talk Show CLI
  - Show current state and progress
- [ ] CLI commands
  - `generate`: Full pipeline
  - `generate --preview`: Script only
  - `generate --no-images`: Skip image gen (faster)
  - `generate --date YYYY-MM-DD`: Specific date
  - `list`: Show recent episodes
  - `show <date>`: Episode details
- [ ] Output management
  - Organize files by date: `output/YYYY-MM-DD/`
  - Generate metadata.json with episode info
  - Save script as markdown

#### Deliverables
- Full `esw generate` command working
- Resumable pipeline on failures
- Clean output organization

#### Files to Create
```
src/
├── orchestration/
│   └── episode-orchestrator.ts  # State machine
├── cli/
│   ├── ui/
│   │   └── progress.ts          # Progress indicators
│   └── commands/
│       ├── generate.ts          # Generate command (full)
│       ├── list.ts              # List episodes
│       └── show.ts              # Show episode details
└── utils/
    └── output-manager.ts        # File organization
```

---

### Phase 9: Testing & Polish (Day 5)
**Goal:** End-to-end testing and refinements

#### Tasks
- [ ] Integration test
  - Full pipeline from weather fetch to video
  - Test with real NWS data
  - Verify output quality
- [ ] Error handling
  - Graceful failures at each step
  - Informative error messages
  - Cleanup on failure
- [ ] Documentation
  - README.md with setup instructions
  - Environment variable documentation
  - Example outputs
- [ ] Voice testing
  - Test multiple ElevenLabs voices
  - Select best "Art Bell baritone" match

#### Deliverables
- Working end-to-end pipeline
- Documentation complete
- Voice selected and configured

---

## Technology Stack

### Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.37.0",
    "@elevenlabs/elevenlabs-js": "^2.26.0",
    "@google/genai": "^1.31.0",
    "@remotion/bundler": "^4.0.0",
    "@remotion/renderer": "^4.0.0",
    "better-sqlite3": "^11.0.0",
    "chalk": "^5.3.0",
    "commander": "^12.0.0",
    "dotenv": "^16.4.5",
    "drizzle-orm": "^0.39.1",
    "nanoid": "^5.0.7",
    "node-fetch": "^3.3.0",
    "ora": "^8.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "remotion": "^4.0.0",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.11",
    "@types/node": "^20.14.0",
    "@types/react": "^18.2.0",
    "drizzle-kit": "^0.31.7",
    "tsx": "^4.19.0",
    "typescript": "^5.6.3"
  }
}
```

### System Requirements
- Node.js 20+
- ffmpeg (for audio processing)
- ffprobe (for duration measurement)
- Chromium (auto-installed by Remotion)

### API Keys Required
- `ANTHROPIC_API_KEY` - Claude for script generation
- `ELEVENLABS_API_KEY` - TTS audio synthesis
- `GEMINI_API_KEY` or `OPENAI_API_KEY` - Image generation

---

## Configuration

```env
# Episode Settings
BROADCAST_TIME=22:00              # Default time (10 PM MST)
TARGET_DURATION_SECS=180          # 3 minute target
EPISODE_START_NUMBER=1            # Initial episode number

# Claude (Script Generation)
ANTHROPIC_API_KEY=sk-ant-xxx
CLAUDE_MODEL=claude-sonnet-4-20250514

# ElevenLabs (Audio)
ELEVENLABS_API_KEY=xxx
ELLIOT_VOICE_ID=xxx               # TBD after voice testing

# Image Generation
IMAGE_PROVIDER=gemini             # gemini or openai
GEMINI_API_KEY=xxx
OPENAI_API_KEY=xxx

# Paths
OUTPUT_DIR=./output
CACHE_DIR=./cache
DATABASE_PATH=./data/elliot.db

# Style Versioning
STYLE_VERSION=1                   # Increment to invalidate image cache
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| NWS API down | Retry + fallback to cached forecast with "stale" notice |
| ElevenLabs rate limit | Queue with delays, circuit breaker |
| Image generation slow | Parallel with audio, aggressive caching |
| Remotion render fails | State machine allows retry from `composing` state |
| Style drift over time | Version prompts, lock seeds, cache by hash |
| Audio/visual desync | Post-TTS timeline reconciliation, validation pass |

---

## Success Criteria

- [ ] Full episode generates in < 10 minutes
- [ ] Video output is 2-4 minutes
- [ ] Captions sync within 100ms of audio
- [ ] Graphics appear at appropriate times
- [ ] NWS failures don't block episode creation
- [ ] Pipeline is resumable on partial failures
- [ ] Character voice is consistent Art Bell style

---

## Next Steps

1. **Start Phase 1** - Initialize project structure
2. **Test NWS endpoints** - Verify data availability
3. **Explore ElevenLabs voices** - Find Elliot's voice
4. **Generate test images** - Establish visual style

---

*Ready for implementation. Start with `Phase 1: Foundation`.*
