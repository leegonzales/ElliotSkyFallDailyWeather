/**
 * Weather Broadcast Composition
 *
 * Remotion composition for rendering weather broadcasts with text overlays.
 */

import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
  interpolate,
  spring,
} from 'remotion';
import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import type { VideoTimeline, TimelineSegment } from './types';

export interface WeatherBroadcastProps {
  timeline: VideoTimeline;
}

/**
 * Microphone SVG Logo - matches the late-night broadcast aesthetic
 */
const MicrophoneLogo: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Microphone body */}
    <path
      d="M12 2C10.3431 2 9 3.34315 9 5V12C9 13.6569 10.3431 15 12 15C13.6569 15 15 13.6569 15 12V5C15 3.34315 13.6569 2 12 2Z"
      fill="url(#mic-gradient)"
      stroke="#fbbf24"
      strokeWidth="1.5"
    />
    {/* Stand base */}
    <path
      d="M8 21H16"
      stroke="#f97316"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Stand pole */}
    <path
      d="M12 18V21"
      stroke="#f97316"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Sound waves left */}
    <path
      d="M6 9C5.5 10 5.5 11.5 6 12.5"
      stroke="#fbbf24"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    {/* Sound waves right */}
    <path
      d="M18 9C18.5 10 18.5 11.5 18 12.5"
      stroke="#fbbf24"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.6"
    />
    {/* Mic arc */}
    <path
      d="M5 12C5 15.866 8.13401 19 12 19C15.866 19 19 15.866 19 12"
      stroke="#f97316"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <defs>
      <linearGradient id="mic-gradient" x1="9" y1="2" x2="15" y2="15" gradientUnits="userSpaceOnUse">
        <stop stopColor="#fbbf24" />
        <stop offset="1" stopColor="#f97316" />
      </linearGradient>
    </defs>
  </svg>
);

/**
 * Show branding component - lower right corner
 * Displays logo, show name, timestamp, and CatalystAI credit
 * Mic icon pulses with audio waveform
 */
const ShowBranding: React.FC<{ broadcastDate: string; audioPath: string }> = ({ broadcastDate, audioPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Format timestamp
  const d = new Date(broadcastDate);
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  // Load audio data for visualization
  const audioSrc = staticFile(audioPath);
  const audioData = useAudioData(audioSrc);

  // Calculate audio amplitude for mic pulsing
  let pulseScale = 1;
  let glowIntensity = 0.3;

  if (audioData) {
    // Get audio visualization data
    const visualization = visualizeAudio({
      fps,
      frame,
      audioData,
      numberOfSamples: 16,
    });

    // Calculate average amplitude from the visualization
    const avgAmplitude = visualization.reduce((sum, val) => sum + val, 0) / visualization.length;

    // Scale the pulse effect (subtle: 1.0 to 1.15)
    pulseScale = 1 + avgAmplitude * 0.15;
    glowIntensity = 0.3 + avgAmplitude * 0.5;
  }

  // Entrance animation
  const brandingSpring = spring({
    frame,
    fps,
    config: { damping: 25, stiffness: 60, mass: 0.8 },
  });

  const slideX = interpolate(brandingSpring, [0, 1], [100, 0]);
  const opacity = brandingSpring;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 30,
        right: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 12,
        opacity,
        transform: `translateX(${slideX}px)`,
      }}
    >
      {/* Main branding row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Microphone logo container with audio-reactive glow */}
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(8px)',
            border: '2px solid rgba(249, 115, 22, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 ${20 + glowIntensity * 30}px rgba(249, 115, 22, ${glowIntensity}), inset 0 0 20px rgba(0,0,0,0.5)`,
            transform: `scale(${pulseScale})`,
            transition: 'transform 0.05s ease-out',
          }}
        >
          <MicrophoneLogo size={28} />
        </div>

        {/* Show name stack */}
        <div style={{ textAlign: 'left' }}>
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 15,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              lineHeight: 1.2,
            }}
          >
            ELLIOT SKYFALL
          </div>
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 12,
              fontWeight: 500,
              color: '#fbbf24',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              marginTop: 2,
            }}
          >
            WEATHER
          </div>
          {/* Separator line */}
          <div
            style={{
              width: '100%',
              height: 1,
              background: 'linear-gradient(90deg, #f97316, transparent)',
              marginTop: 5,
              marginBottom: 3,
            }}
          />
          {/* Timestamp */}
          <div
            style={{
              fontFamily: '"Inter", sans-serif',
              fontSize: 11,
              fontWeight: 400,
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.02em',
              textShadow: '0 2px 8px rgba(0,0,0,0.8)',
            }}
          >
            {timeStr}
          </div>
        </div>
      </div>

      {/* CatalystAI credit row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'rgba(0,0,0,0.4)',
          backdropFilter: 'blur(6px)',
          borderRadius: 6,
          padding: '5px 10px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* CatalystAI mini icon */}
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #e8c48b 0%, #c9a66b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 10,
            fontWeight: 700,
            color: '#1a1a1a',
          }}
        >
          C
        </div>
        <div
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 9,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.5)',
            letterSpacing: '0.04em',
            textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          }}
        >
          Produced by{' '}
          <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 600 }}>
            CatalystAI
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Get weather icon based on condition keywords
 */
function getWeatherIcon(text: string): string {
  const lower = text.toLowerCase();

  // Temperature extremes
  if (lower.includes('hot') || lower.includes('heat')) return '🌡️';
  if (lower.includes('cold') || lower.includes('freeze') || lower.includes('frost')) return '🥶';

  // Precipitation
  if (lower.includes('snow') || lower.includes('blizzard')) return '❄️';
  if (lower.includes('rain') || lower.includes('shower')) return '🌧️';
  if (lower.includes('thunder') || lower.includes('storm') || lower.includes('lightning')) return '⛈️';
  if (lower.includes('hail')) return '🌨️';

  // Wind
  if (lower.includes('wind') || lower.includes('gust') || lower.includes('breezy')) return '💨';

  // Sky conditions
  if (lower.includes('sunny') || lower.includes('clear')) return '☀️';
  if (lower.includes('partly cloudy') || lower.includes('partly sunny')) return '⛅';
  if (lower.includes('cloudy') || lower.includes('overcast')) return '☁️';
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) return '🌫️';

  // Hazards
  if (lower.includes('warning') || lower.includes('hazard') || lower.includes('alert')) return '⚠️';
  if (lower.includes('watch')) return '👁️';

  // Time-based
  if (lower.includes('night') || lower.includes('tonight') || lower.includes('overnight')) return '🌙';
  if (lower.includes('sunrise') || lower.includes('morning')) return '🌅';
  if (lower.includes('sunset') || lower.includes('evening')) return '🌆';

  // Outlook/forecast
  if (lower.includes('outlook') || lower.includes('forecast') || lower.includes('extended')) return '📅';
  if (lower.includes('tomorrow')) return '📆';

  // Safety
  if (lower.includes('safety') || lower.includes('secure') || lower.includes('prepare')) return '🛡️';

  // Current conditions default
  if (lower.includes('current') || lower.includes('now')) return '📍';

  return '🌤️'; // Default weather icon
}

/**
 * Title case a string (capitalize first letter of each word)
 */
function toTitleCase(str: string): string {
  return str
    .split(' ')
    .map(word => {
      // Keep short words lowercase unless first word
      const lowerWords = ['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with'];
      if (lowerWords.includes(word.toLowerCase()) && str.indexOf(word) !== 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Parse caption into title, subtitle, and icon
 * Format: "Title - Description" or just "Title"
 */
function parseCaption(caption?: string): { title: string; subtitle?: string; icon: string } {
  if (!caption) return { title: '', icon: '🌤️' };

  const icon = getWeatherIcon(caption);
  const dashIndex = caption.indexOf(' - ');

  if (dashIndex > 0) {
    return {
      title: toTitleCase(caption.slice(0, dashIndex).trim()),
      subtitle: toTitleCase(caption.slice(dashIndex + 3).trim()),
      icon,
    };
  }
  return { title: toTitleCase(caption), icon };
}

/**
 * Extract temperature from subtitle if present (e.g., "40°F, Partly Cloudy")
 */
function extractTemperature(subtitle?: string): { temp?: string; rest?: string } {
  if (!subtitle) return {};

  // Match patterns like "40°F", "40°f", or "40°" at the start (case-insensitive)
  const tempMatch = subtitle.match(/^(-?\d+°[Ff]?)/);
  if (tempMatch) {
    // Normalize to uppercase F for display
    const temp = tempMatch[1].toUpperCase();
    const rest = subtitle.slice(tempMatch[1].length).replace(/^[,\s]+/, '').trim();
    return { temp, rest: rest || undefined };
  }
  return { rest: subtitle };
}

/**
 * Text overlay with glass panel design - lower left corner
 */
const TextOverlay: React.FC<{
  caption?: string;
  durationFrames: number;
}> = ({ caption, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!caption) return null;

  const { title, subtitle, icon } = parseCaption(caption);
  const { temp, rest } = extractTemperature(subtitle);

  // Animation timing
  const exitStart = durationFrames - fps * 0.5;

  // Spring animations
  const panelSpring = spring({
    frame,
    fps,
    config: { damping: 22, stiffness: 70, mass: 0.8 },
  });

  const contentSpring = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 20, stiffness: 65, mass: 0.8 },
  });

  // Exit fade
  const exitOpacity = frame > exitStart
    ? interpolate(frame, [exitStart, durationFrames], [1, 0], { extrapolateLeft: 'clamp' })
    : 1;

  // Animation values
  const panelSlideX = interpolate(panelSpring, [0, 1], [-50, 0]);
  const panelOpacity = panelSpring * exitOpacity;
  const contentOpacity = contentSpring * exitOpacity;
  const accentWidth = interpolate(panelSpring, [0, 1], [0, 4]);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'flex-start',
        padding: '0 0 50px 50px',
      }}
    >
      {/* Gradient backdrop for legibility */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '35%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Glass panel container */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          opacity: panelOpacity,
          transform: `translateX(${panelSlideX}px)`,
        }}
      >
        {/* Vertical accent bar */}
        <div
          style={{
            width: accentWidth,
            background: 'linear-gradient(180deg, #fbbf24 0%, #f97316 100%)',
            borderRadius: '4px 0 0 4px',
            boxShadow: '0 0 20px rgba(249, 115, 22, 0.6)',
          }}
        />

        {/* Main panel */}
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(12px)',
            borderRadius: '0 12px 12px 0',
            border: '1px solid rgba(255,255,255,0.1)',
            borderLeft: 'none',
            padding: '16px 28px 16px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Icon + Temperature column */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              opacity: contentOpacity,
              minWidth: temp ? 80 : 60,
            }}
          >
            {/* Weather icon */}
            <span
              style={{
                fontSize: temp ? 44 : 52,
                lineHeight: 1,
                filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
              }}
            >
              {icon}
            </span>
            {/* Temperature if available */}
            {temp && (
              <div
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 32,
                  fontWeight: 700,
                  color: '#fbbf24',
                  marginTop: 4,
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  lineHeight: 1,
                }}
              >
                {temp}
              </div>
            )}
          </div>

          {/* Vertical divider */}
          <div
            style={{
              width: 1,
              height: 50,
              background: 'rgba(255,255,255,0.2)',
            }}
          />

          {/* Text content */}
          <div style={{ opacity: contentOpacity }}>
            {/* Category label */}
            <div
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 13,
                fontWeight: 600,
                color: '#fbbf24',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 4,
                textShadow: '0 2px 8px rgba(0,0,0,0.8)',
              }}
            >
              {title}
            </div>
            {/* Condition details */}
            {(rest || (!temp && subtitle)) && (
              <div
                style={{
                  fontFamily: '"Inter", sans-serif',
                  fontSize: 22,
                  fontWeight: 500,
                  color: '#ffffff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  maxWidth: 400,
                  lineHeight: 1.3,
                }}
              >
                {rest || subtitle}
              </div>
            )}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/**
 * Single graphic segment with fade transitions and text overlay
 */
const GraphicSegment: React.FC<{
  segment: TimelineSegment;
  isFirst: boolean;
  isLast: boolean;
  broadcastDate: string;
  audioPath: string;
}> = ({ segment, isFirst, isLast, broadcastDate, audioPath }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade duration in frames (0.5 second)
  const fadeDuration = Math.floor(fps * 0.5);

  // Calculate opacity for fade in/out
  const fadeInEnd = fadeDuration;
  const fadeOutStart = segment.durationFrames - fadeDuration;

  let opacity = 1;

  // Fade in (skip for first segment)
  if (!isFirst && frame < fadeInEnd) {
    opacity = interpolate(frame, [0, fadeInEnd], [0, 1], {
      extrapolateRight: 'clamp',
    });
  }

  // Fade out (skip for last segment)
  if (!isLast && frame > fadeOutStart) {
    opacity = interpolate(
      frame,
      [fadeOutStart, segment.durationFrames],
      [1, 0],
      { extrapolateLeft: 'clamp' }
    );
  }

  // Subtle Ken Burns effect (slow zoom)
  const scale = interpolate(
    frame,
    [0, segment.durationFrames],
    [1, 1.05],
    { extrapolateRight: 'clamp' }
  );

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Image with Ken Burns zoom */}
      <Img
        src={staticFile(segment.imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
        }}
      />

      {/* Text overlay - lower left */}
      <TextOverlay
        caption={segment.caption}
        durationFrames={segment.durationFrames}
      />

      {/* Show branding - lower right */}
      <ShowBranding broadcastDate={broadcastDate} audioPath={audioPath} />
    </AbsoluteFill>
  );
};

/**
 * Format broadcast date for display
 */
function formatBroadcastDate(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  return {
    date: d.toLocaleDateString('en-US', options),
    time: d.toLocaleTimeString('en-US', timeOptions),
  };
}

/**
 * Summary slide shown at the end
 */
const SummarySlide: React.FC<{
  broadcastDate: string;
  location: string;
  weatherSummary?: {
    temperature: string;
    conditions: string;
    wind: string;
    hazards: string[];
    outlook: string;
  };
  durationFrames: number;
}> = ({ broadcastDate, location, weatherSummary, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { date, time } = formatBroadcastDate(broadcastDate);

  // Fade in animation
  const fadeIn = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });

  // Staggered element animations
  const titleSpring = spring({ frame, fps, config: { damping: 20, stiffness: 60 } });
  const dateSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 18, stiffness: 50 } });
  const summarySpring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 16, stiffness: 45 } });
  const signoffSpring = spring({ frame: Math.max(0, frame - 35), fps, config: { damping: 14, stiffness: 40 } });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#0a0a0a',
        opacity: fadeIn,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      {/* Decorative top accent */}
      <div
        style={{
          width: interpolate(titleSpring, [0, 1], [0, 200]),
          height: 4,
          background: 'linear-gradient(90deg, #f97316 0%, #fbbf24 50%, #f97316 100%)',
          marginBottom: 40,
          borderRadius: 2,
          boxShadow: '0 0 30px rgba(249, 115, 22, 0.6)',
        }}
      />

      {/* Show title */}
      <h1
        style={{
          fontFamily: '"Inter", "SF Pro Display", -apple-system, sans-serif',
          fontSize: 64,
          fontWeight: 800,
          color: '#ffffff',
          margin: 0,
          marginBottom: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          textShadow: '0 4px 30px rgba(249, 115, 22, 0.4)',
          opacity: titleSpring,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
        }}
      >
        Elliot Skyfall
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: 24,
          fontWeight: 300,
          color: 'rgba(255,255,255,0.7)',
          margin: 0,
          marginBottom: 50,
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
          opacity: titleSpring,
        }}
      >
        Daily Weather
      </p>

      {/* Date and time */}
      <div
        style={{
          textAlign: 'center',
          marginBottom: 40,
          opacity: dateSpring,
          transform: `translateY(${interpolate(dateSpring, [0, 1], [20, 0])}px)`,
        }}
      >
        <p
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 32,
            fontWeight: 500,
            color: '#ffffff',
            margin: 0,
            marginBottom: 8,
          }}
        >
          {date}
        </p>
        <p
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 22,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.6)',
            margin: 0,
          }}
        >
          {time} • {location}
        </p>
      </div>

      {/* Weather summary box */}
      {weatherSummary && (
        <div
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16,
            padding: '30px 50px',
            marginBottom: 40,
            opacity: summarySpring,
            transform: `translateY(${interpolate(summarySpring, [0, 1], [20, 0])}px)`,
          }}
        >
          <div style={{ display: 'flex', gap: 60, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 48, fontWeight: 700, color: '#fbbf24', margin: 0 }}>
                {weatherSummary.temperature}
              </p>
              <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: 0, marginTop: 4 }}>
                {weatherSummary.conditions}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 24, fontWeight: 500, color: '#ffffff', margin: 0 }}>
                {weatherSummary.wind}
              </p>
              <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 16, color: 'rgba(255,255,255,0.6)', margin: 0, marginTop: 4 }}>
                Wind
              </p>
            </div>
          </div>
          {weatherSummary.hazards.length > 0 && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 18, fontWeight: 600, color: '#ef4444', margin: 0 }}>
                {weatherSummary.hazards.join(' • ')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sign-off */}
      <p
        style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: 20,
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.5)',
          margin: 0,
          opacity: signoffSpring,
          transform: `translateY(${interpolate(signoffSpring, [0, 1], [15, 0])}px)`,
        }}
      >
        "Keep watching the skies..."
      </p>

      {/* Bottom accent */}
      <div
        style={{
          position: 'absolute',
          bottom: 60,
          width: interpolate(signoffSpring, [0, 1], [0, 100]),
          height: 2,
          background: 'linear-gradient(90deg, transparent, rgba(249, 115, 22, 0.5), transparent)',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Progress bar component - bottom of screen
 * Shows progress through the entire broadcast
 */
const ProgressBar: React.FC<{ totalDurationFrames: number }> = ({ totalDurationFrames }) => {
  const frame = useCurrentFrame();

  const progress = Math.min(1, frame / totalDurationFrames);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 100,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${progress * 100}%`,
          background: 'linear-gradient(90deg, #f97316, #fbbf24)',
          boxShadow: '0 0 10px rgba(249, 115, 22, 0.6)',
          transition: 'width 0.033s linear',
        }}
      />
    </div>
  );
};

/**
 * Fade to black ending
 */
const FadeToBlack: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, durationFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000000',
        opacity,
      }}
    />
  );
};

// Duration constants (in seconds)
const SUMMARY_DURATION = 6; // 6 seconds for summary slide
const FADE_TO_BLACK_DURATION = 2; // 2 seconds fade to black

/**
 * Main weather broadcast composition
 */
export const WeatherBroadcast: React.FC<WeatherBroadcastProps> = ({
  timeline,
}) => {
  const { fps } = useVideoConfig();

  // Calculate frames for summary and fade
  const summaryFrames = Math.floor(SUMMARY_DURATION * fps);
  const fadeFrames = Math.floor(FADE_TO_BLACK_DURATION * fps);

  // Last segment ends at audio duration
  const lastSegmentEnd = timeline.segments.length > 0
    ? timeline.segments[timeline.segments.length - 1].endFrame
    : timeline.durationInFrames;

  // Summary starts after last segment
  const summaryStart = lastSegmentEnd;
  const fadeStart = summaryStart + summaryFrames;

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
      {/* Background layer - graphic segments */}
      <AbsoluteFill>
        {timeline.segments.map((segment, index) => (
          <Sequence
            key={index}
            from={segment.startFrame}
            durationInFrames={segment.durationFrames}
          >
            <GraphicSegment
              segment={segment}
              isFirst={index === 0}
              isLast={false} // Never skip fade since summary follows
              broadcastDate={timeline.broadcastDate}
              audioPath={timeline.audioPath}
            />
          </Sequence>
        ))}
      </AbsoluteFill>

      {/* Summary slide */}
      <Sequence from={summaryStart} durationInFrames={summaryFrames + fadeFrames}>
        <SummarySlide
          broadcastDate={timeline.broadcastDate}
          location={timeline.location}
          weatherSummary={timeline.weatherSummary}
          durationFrames={summaryFrames}
        />
      </Sequence>

      {/* Fade to black */}
      <Sequence from={fadeStart} durationInFrames={fadeFrames}>
        <FadeToBlack durationFrames={fadeFrames} />
      </Sequence>

      {/* Audio layer */}
      <Audio src={staticFile(timeline.audioPath)} />

      {/* Progress bar - spans entire video */}
      <ProgressBar totalDurationFrames={fadeStart + fadeFrames} />
    </AbsoluteFill>
  );
};
