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
 * VHS Scan Lines Overlay - Art Bell late-night broadcast aesthetic
 * Subtle horizontal lines with occasional static bursts
 */
const VHSScanLines: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Occasional static burst (every ~10 seconds, lasting ~3 frames)
  const burstCycle = Math.floor(fps * 10);
  const frameInCycle = frame % burstCycle;
  const isStaticBurst = frameInCycle < 3 && Math.floor(frame / burstCycle) % 3 === 0;

  // Slight scan line movement (drifting effect)
  const scanOffset = (frame * 0.5) % 4;

  // Random noise seed for static
  const noiseSeed = Math.sin(frame * 12.9898) * 43758.5453;
  const noiseValue = noiseSeed - Math.floor(noiseSeed);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Scan lines - more visible */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.15) 2px,
            rgba(0, 0, 0, 0.15) 4px
          )`,
          backgroundPositionY: scanOffset,
          opacity: 0.8,
        }}
      />

      {/* CRT vignette - darker edges */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)',
          opacity: 0.7,
        }}
      />

      {/* Static burst overlay - more dramatic */}
      {isStaticBurst && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            opacity: 0.2 + noiseValue * 0.1,
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Color fringing on edges (chromatic aberration) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxShadow: 'inset 3px 0 12px rgba(255,0,0,0.06), inset -3px 0 12px rgba(0,255,255,0.06)',
        }}
      />

      {/* Subtle horizontal distortion lines (VHS tracking artifact) */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: `${10 + (frame * 0.3) % 80}%`,
          height: 2,
          background: 'rgba(255,255,255,0.03)',
          filter: 'blur(1px)',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Cinematic Letterbox - 2.35:1 aspect ratio bars
 * Animated entrance for dramatic moments
 */
const CinematicLetterbox: React.FC<{
  active: boolean;
  intensity?: number;
}> = ({ active, intensity = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();

  // Smooth spring animation for bars
  const barSpring = spring({
    frame: active ? frame : 0,
    fps,
    config: { damping: 25, stiffness: 40 },
  });

  // Calculate bar height for 2.35:1 aspect ratio
  // Original is 16:9 (1.78:1), target is 2.35:1
  // Bar height = (height - (width / 2.35)) / 2
  const targetBarHeight = height * 0.12 * intensity; // ~12% of height per bar
  const currentBarHeight = interpolate(barSpring, [0, 1], [0, targetBarHeight]);

  if (!active && barSpring < 0.01) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {/* Top bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: currentBarHeight,
          background: '#000000',
        }}
      />
      {/* Bottom bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: currentBarHeight,
          background: '#000000',
        }}
      />
    </AbsoluteFill>
  );
};

/**
 * Temperature Gauge - Animated dial with needle
 */
const TemperatureGauge: React.FC<{
  temperature: number;
  size?: number;
}> = ({ temperature, size = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animate needle to temperature
  const needleSpring = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 30 },
  });

  // Map temperature to angle (-30°F to 110°F -> -135° to 135°)
  const minTemp = -30;
  const maxTemp = 110;
  const clampedTemp = Math.max(minTemp, Math.min(maxTemp, temperature));
  const targetAngle = interpolate(clampedTemp, [minTemp, maxTemp], [-135, 135]);
  const currentAngle = interpolate(needleSpring, [0, 1], [-135, targetAngle]);

  // Color based on temperature
  const tempColor = temperature < 32 ? '#60a5fa' : // Cold - blue
                    temperature < 60 ? '#fbbf24' : // Mild - gold
                    temperature < 85 ? '#f97316' : // Warm - orange
                    '#ef4444'; // Hot - red

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      {/* Gauge background */}
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="rgba(0,0,0,0.6)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />

        {/* Temperature arc - cold to hot */}
        <path
          d="M 15 70 A 40 40 0 1 1 85 70"
          fill="none"
          stroke="url(#tempGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* Tick marks */}
        {[-135, -90, -45, 0, 45, 90, 135].map((angle, i) => {
          const rad = (angle - 90) * Math.PI / 180;
          const x1 = 50 + 35 * Math.cos(rad);
          const y1 = 50 + 35 * Math.sin(rad);
          const x2 = 50 + 42 * Math.cos(rad);
          const y2 = 50 + 42 * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(255,255,255,0.5)"
              strokeWidth="1.5"
            />
          );
        })}

        {/* Needle */}
        <g transform={`rotate(${currentAngle}, 50, 50)`}>
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="18"
            stroke={tempColor}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="6" fill={tempColor} />
          <circle cx="50" cy="50" r="3" fill="#ffffff" />
        </g>

        {/* Gradient definition */}
        <defs>
          <linearGradient id="tempGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
      </svg>

      {/* Temperature readout */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: '"Inter", monospace',
          fontSize: size * 0.18,
          fontWeight: 700,
          color: tempColor,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        }}
      >
        {temperature}°
      </div>
    </div>
  );
};

/**
 * Wind Compass - Animated direction indicator
 */
const WindCompass: React.FC<{
  direction: string;
  speed: number;
  size?: number;
}> = ({ direction, speed, size = 80 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Convert direction to angle
  const directionAngles: Record<string, number> = {
    'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5,
    'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5,
    'S': 180, 'SSW': 202.5, 'SW': 225, 'WSW': 247.5,
    'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5,
  };

  const targetAngle = directionAngles[direction.toUpperCase()] ?? 0;

  // Animate compass needle
  const needleSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 25 },
  });

  const currentAngle = interpolate(needleSpring, [0, 1], [0, targetAngle]);

  // Subtle oscillation for "wind" effect
  const windOscillation = Math.sin(frame * 0.15) * (speed / 20) * 3;

  // Wind intensity color
  const windColor = speed < 10 ? '#60a5fa' :
                    speed < 20 ? '#fbbf24' :
                    speed < 35 ? '#f97316' :
                    '#ef4444';

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        {/* Outer ring */}
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="rgba(0,0,0,0.6)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth="2"
        />

        {/* Cardinal directions */}
        {['N', 'E', 'S', 'W'].map((dir, i) => {
          const angle = i * 90;
          const rad = (angle - 90) * Math.PI / 180;
          const x = 50 + 36 * Math.cos(rad);
          const y = 50 + 36 * Math.sin(rad);
          return (
            <text
              key={dir}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="rgba(255,255,255,0.6)"
              fontSize="10"
              fontFamily="Inter, sans-serif"
              fontWeight="600"
            >
              {dir}
            </text>
          );
        })}

        {/* Wind direction arrow */}
        <g transform={`rotate(${currentAngle + windOscillation}, 50, 50)`}>
          {/* Arrow body */}
          <path
            d="M 50 20 L 56 45 L 50 40 L 44 45 Z"
            fill={windColor}
            opacity="0.9"
          />
          {/* Arrow tail */}
          <line
            x1="50"
            y1="40"
            x2="50"
            y2="75"
            stroke={windColor}
            strokeWidth="3"
            opacity="0.6"
          />
          {/* Center dot */}
          <circle cx="50" cy="50" r="5" fill={windColor} />
          <circle cx="50" cy="50" r="2" fill="#ffffff" />
        </g>
      </svg>

      {/* Wind speed readout */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontFamily: '"Inter", monospace',
          fontSize: size * 0.14,
          fontWeight: 700,
          color: windColor,
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
          whiteSpace: 'nowrap',
        }}
      >
        {speed} mph
      </div>
    </div>
  );
};

/**
 * Weather Dials Panel - Bottom right corner display
 */
const WeatherDials: React.FC<{
  temperature?: number;
  windDirection?: string;
  windSpeed?: number;
}> = ({ temperature, windDirection, windSpeed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Staggered entrance
  const panelSpring = spring({
    frame: Math.max(0, frame - 15),
    fps,
    config: { damping: 20, stiffness: 50 },
  });

  if (!temperature && !windDirection) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 160, // Above ShowBranding
        right: 50,
        display: 'flex',
        gap: 12,
        opacity: panelSpring,
        transform: `translateX(${interpolate(panelSpring, [0, 1], [50, 0])}px)`,
      }}
    >
      {temperature !== undefined && (
        <TemperatureGauge temperature={temperature} size={70} />
      )}
      {windDirection && windSpeed !== undefined && (
        <WindCompass direction={windDirection} speed={windSpeed} size={70} />
      )}
    </div>
  );
};

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
        bottom: 40,
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
        {/* CatalystAI logo */}
        <Img
          src={staticFile('catalyst-logo.jpeg')}
          style={{
            width: 20,
            height: 20,
            borderRadius: 4,
            objectFit: 'cover',
          }}
        />
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
 * Extract wind data from caption (e.g., "W wind 10mph" or "NW at 15 mph")
 */
function extractWindData(caption?: string): { direction?: string; speed?: number } {
  if (!caption) return {};

  const lower = caption.toLowerCase();

  // Match patterns like "W wind 10mph", "NW at 15 mph", "wind W 10mph"
  const windMatch = lower.match(/\b(n|s|e|w|ne|nw|se|sw|nne|nnw|ene|ese|sse|ssw|wnw|wsw)\b.*?(\d+)\s*mph/i);
  if (windMatch) {
    return {
      direction: windMatch[1].toUpperCase(),
      speed: parseInt(windMatch[2], 10),
    };
  }

  // Try reverse pattern: "10 mph W"
  const reverseMatch = lower.match(/(\d+)\s*mph.*?\b(n|s|e|w|ne|nw|se|sw)\b/i);
  if (reverseMatch) {
    return {
      direction: reverseMatch[2].toUpperCase(),
      speed: parseInt(reverseMatch[1], 10),
    };
  }

  return {};
}

/**
 * Check if caption indicates a hazard/warning segment
 */
function isHazardSegment(caption?: string): boolean {
  if (!caption) return false;
  const lower = caption.toLowerCase();
  return lower.includes('warning') ||
         lower.includes('watch') ||
         lower.includes('advisory') ||
         lower.includes('hazard') ||
         lower.includes('alert') ||
         lower.includes('red flag');
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

  // Extract weather data from caption for dials
  const { temp } = extractTemperature(segment.caption?.split(' - ')[1]);
  const temperature = temp ? parseInt(temp.replace(/[°F]/g, ''), 10) : undefined;
  const windData = extractWindData(segment.caption);

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
  const logoSpring = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 12, stiffness: 35 } });

  // Subtle pulsing glow effect for the logo (oscillates between 0.3 and 0.6 opacity)
  const glowPulse = 0.3 + 0.15 * Math.sin((frame - 50) * 0.08);

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
          marginBottom: 40,
          opacity: signoffSpring,
          transform: `translateY(${interpolate(signoffSpring, [0, 1], [15, 0])}px)`,
        }}
      >
        "Keep watching the skies..."
      </p>

      {/* Credits - Brought to you by Catalyst AI */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          opacity: logoSpring,
        }}
      >
        <p
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 14,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            letterSpacing: '0.05em',
            opacity: logoSpring,
            transform: `translateY(${interpolate(logoSpring, [0, 1], [10, 0])}px)`,
          }}
        >
          Brought to you by
        </p>
        {/* CatalystAI logo with fade+scale and pulsing glow */}
        <div
          style={{
            position: 'relative',
            borderRadius: 12,
            overflow: 'hidden',
            transform: `scale(${interpolate(logoSpring, [0, 1], [0.85, 1])})`,
            opacity: logoSpring,
          }}
        >
          {/* Pulsing glow behind logo */}
          <div
            style={{
              position: 'absolute',
              inset: -8,
              background: 'radial-gradient(ellipse at center, rgba(232, 196, 139, 0.4) 0%, transparent 70%)',
              opacity: glowPulse * logoSpring,
              filter: 'blur(12px)',
              zIndex: 0,
            }}
          />
          <Img
            src={staticFile('catalyst-logo.jpeg')}
            style={{
              width: 220,
              height: 'auto',
              display: 'block',
              position: 'relative',
              zIndex: 1,
              borderRadius: 12,
              boxShadow: `0 4px 30px rgba(232, 196, 139, ${0.2 + glowPulse * 0.3})`,
            }}
          />
        </div>
        <p
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 14,
            fontWeight: 400,
            color: 'rgba(255,255,255,0.4)',
            margin: 0,
            opacity: logoSpring,
            transform: `translateY(${interpolate(logoSpring, [0, 1], [10, 0])}px)`,
          }}
        >
          leegonzales.substack.com
        </p>
      </div>

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
