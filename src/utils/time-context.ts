/**
 * Time Context Utility
 *
 * Parses natural language time expressions and provides time-of-day context
 * for script generation, image creation, and weather forecasting.
 */

import * as chrono from 'chrono-node';

/**
 * Time of day periods for broadcast context
 */
export type TimeOfDay = 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'late-night';

/**
 * Complete broadcast time context
 */
export interface BroadcastTimeContext {
  /** Target broadcast date (YYYY-MM-DD) */
  date: string;
  /** Target broadcast time (HH:MM) */
  time: string;
  /** Hour in 24h format */
  hour: number;
  /** Time of day category */
  timeOfDay: TimeOfDay;
  /** Human-readable description */
  description: string;
  /** Greeting appropriate for this time */
  greeting: string;
  /** Atmospheric tone for script */
  atmosphericTone: string;
  /** Image lighting/mood keywords */
  imageMood: string[];
  /** Weather forecast focus */
  forecastFocus: string;
  /** Is this a late-night Art Bell style broadcast? */
  isLateNight: boolean;
}

/**
 * Parse a natural language time expression into a Date
 *
 * Examples:
 * - "now", "right now"
 * - "tonight at 9pm", "tonight 9"
 * - "tomorrow morning"
 * - "tomorrow at 6am"
 * - "this evening"
 */
export function parseNaturalTime(input: string, referenceDate: Date = new Date()): Date {
  // Handle "now" explicitly
  if (input.toLowerCase().trim() === 'now' || input.toLowerCase().trim() === 'right now') {
    return referenceDate;
  }

  // Use chrono to parse natural language
  const results = chrono.parse(input, referenceDate, { forwardDate: true });

  if (results.length === 0) {
    throw new Error(`Could not parse time expression: "${input}"`);
  }

  const parsed = results[0];
  return parsed.start.date();
}

/**
 * Determine the time of day from an hour
 */
export function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour < 9) return 'early-morning';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'late-night'; // 22:00 - 4:59
}

/**
 * Get greeting appropriate for time of day
 */
function getGreeting(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'early-morning':
      return 'Good morning, early risers of Denver';
    case 'morning':
      return 'Good morning, Denver';
    case 'afternoon':
      return 'Good afternoon, Denver';
    case 'evening':
      return 'Good evening, Denver';
    case 'late-night':
      return 'Good evening, Denver. This is Elliot Skyfall, and you\'re listening to the voice of the skies';
  }
}

/**
 * Get atmospheric tone description for script generation
 */
function getAtmosphericTone(timeOfDay: TimeOfDay): string {
  switch (timeOfDay) {
    case 'early-morning':
      return 'pre-dawn stillness, the world holding its breath before sunrise, quiet anticipation';
    case 'morning':
      return 'fresh light breaking through, the day awakening, crisp morning energy';
    case 'afternoon':
      return 'full daylight, the sun at its work, the busy hours of the day';
    case 'evening':
      return 'golden hour fading, the transition from day to night, settling in';
    case 'late-night':
      return 'deep night intimacy, the quiet hours when only night owls and insomniacs remain, cosmic solitude';
  }
}

/**
 * Get image mood keywords for the time of day
 */
function getImageMood(timeOfDay: TimeOfDay): string[] {
  switch (timeOfDay) {
    case 'early-morning':
      return ['pre-dawn', 'deep blue sky', 'first light on horizon', 'quiet streets', 'stars fading'];
    case 'morning':
      return ['golden sunrise', 'warm light', 'long shadows', 'fresh', 'awakening city'];
    case 'afternoon':
      return ['bright daylight', 'blue sky', 'full sun', 'active', 'clear visibility'];
    case 'evening':
      return ['golden hour', 'sunset colors', 'warm orange', 'pink clouds', 'city lights emerging'];
    case 'late-night':
      return ['dark sky', 'city lights', 'stars visible', 'moody', 'atmospheric', 'noir', 'midnight blue'];
  }
}

/**
 * Get weather forecast focus based on time of day
 */
function getForecastFocus(timeOfDay: TimeOfDay, hour: number): string {
  switch (timeOfDay) {
    case 'early-morning':
      return 'Focus on the upcoming day\'s conditions, morning commute weather, and how the day will unfold';
    case 'morning':
      return 'Emphasize current conditions, afternoon outlook, and any developing weather';
    case 'afternoon':
      return 'Cover current conditions, evening transition, and overnight expectations';
    case 'evening':
      return 'Focus on overnight conditions, tomorrow\'s preview, and any developing weather systems';
    case 'late-night':
      return 'Emphasize overnight conditions, what sleepers will wake up to, and the next day\'s outlook';
  }
}

/**
 * Get human-readable description of the target time
 */
function getTimeDescription(date: Date, timeOfDay: TimeOfDay): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };

  const formatted = date.toLocaleString('en-US', { ...options, timeZone: 'America/Denver' });

  const timeOfDayName = {
    'early-morning': 'early morning',
    'morning': 'morning',
    'afternoon': 'afternoon',
    'evening': 'evening',
    'late-night': 'late night',
  }[timeOfDay];

  return `${timeOfDayName} broadcast for ${formatted}`;
}

/**
 * Build complete broadcast time context from a natural language expression
 */
export function buildTimeContext(input: string, referenceDate: Date = new Date()): BroadcastTimeContext {
  const targetDate = parseNaturalTime(input, referenceDate);

  // Get components in Denver timezone
  const denverFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = denverFormatter.formatToParts(targetDate);
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = parseInt(getPart('hour'), 10);
  const minute = getPart('minute');

  const date = `${year}-${month}-${day}`;
  const time = `${hour.toString().padStart(2, '0')}:${minute}`;

  const timeOfDay = getTimeOfDay(hour);

  return {
    date,
    time,
    hour,
    timeOfDay,
    description: getTimeDescription(targetDate, timeOfDay),
    greeting: getGreeting(timeOfDay),
    atmosphericTone: getAtmosphericTone(timeOfDay),
    imageMood: getImageMood(timeOfDay),
    forecastFocus: getForecastFocus(timeOfDay, hour),
    isLateNight: timeOfDay === 'late-night',
  };
}

/**
 * Build time context for "now"
 */
export function buildCurrentTimeContext(): BroadcastTimeContext {
  return buildTimeContext('now');
}
