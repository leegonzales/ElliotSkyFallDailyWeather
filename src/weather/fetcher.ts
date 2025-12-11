/**
 * Weather Fetcher
 *
 * Fetch weather data from NWS with retry logic and fallback support.
 */

import { parseAFD } from './afd-parser';
import { parseForecast } from './forecast-parser';
import type { WeatherData, WeatherFetchResult, AFDData, ForecastData } from './types';
import type { BroadcastTimeContext } from '../utils/time-context';
import { getDb, schema } from '../storage/db';
import { nanoid } from 'nanoid';
import { desc, eq } from 'drizzle-orm';

// Location configurations for NWS data
export interface LocationConfig {
  name: string;
  nwsOffice: string;
  lat: number;
  lon: number;
  timezone: string;
}

export const LOCATIONS: Record<string, LocationConfig> = {
  denver: {
    name: 'Denver, Colorado',
    nwsOffice: 'BOU', // Boulder NWS office
    lat: 39.77,
    lon: -104.89,
    timezone: 'America/Denver',
  },
  nyc: {
    name: 'New York City',
    nwsOffice: 'OKX', // New York NWS office
    lat: 40.7128,
    lon: -74.0060,
    timezone: 'America/New_York',
  },
};

// Current location (can be changed via setLocation)
let currentLocation: LocationConfig = LOCATIONS.denver;

/**
 * Set the active location for weather fetching
 */
export function setLocation(locationKey: string): void {
  const loc = LOCATIONS[locationKey.toLowerCase()];
  if (!loc) {
    throw new Error(`Unknown location: ${locationKey}. Available: ${Object.keys(LOCATIONS).join(', ')}`);
  }
  currentLocation = loc;
}

/**
 * Get the current location
 */
export function getCurrentLocation(): LocationConfig {
  return currentLocation;
}

/**
 * Build NWS URLs for current location
 */
function getNWSUrls(): { afd: string; forecast: string } {
  const { nwsOffice, lat, lon } = currentLocation;
  return {
    afd: `https://forecast.weather.gov/product.php?site=${nwsOffice}&issuedby=${nwsOffice}&product=AFD&format=txt&version=1&glossary=0`,
    forecast: `https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lon}&unit=0&lg=english&FcstType=digital`,
  };
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Fetch weather data with retry and fallback
 */
export async function fetchWeatherData(episodeId?: string): Promise<WeatherFetchResult> {
  let lastError: Error | null = null;

  // Try to fetch fresh data with retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  Fetching weather data (attempt ${attempt}/${MAX_RETRIES})...`);

      const [afd, forecast] = await Promise.all([
        fetchAFD(),
        fetchForecast(),
      ]);

      const weatherData: WeatherData = {
        afd,
        forecast,
        fetchedAt: new Date().toISOString(),
        isStale: false,
      };

      // Save snapshot for future fallback
      await saveWeatherSnapshot(weatherData, episodeId);

      return {
        success: true,
        data: weatherData,
        usedFallback: false,
      };

    } catch (error) {
      lastError = error as Error;
      console.log(`  Attempt ${attempt} failed: ${lastError.message}`);

      if (attempt < MAX_RETRIES) {
        // Exponential backoff
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`  Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // All retries failed - try fallback
  console.log('  Fresh fetch failed, attempting fallback to cached data...');
  const fallback = await getFallbackData();

  if (fallback) {
    return {
      success: true,
      data: fallback,
      usedFallback: true,
    };
  }

  // No fallback available
  return {
    success: false,
    error: lastError?.message || 'Unknown error fetching weather data',
    usedFallback: false,
  };
}

/**
 * Fetch Area Forecast Discussion
 */
async function fetchAFD(): Promise<AFDData> {
  const urls = getNWSUrls();
  const response = await fetch(urls.afd, {
    headers: {
      'User-Agent': 'ElliotSkyfallWeather/1.0 (weather broadcast generator)',
    },
  });

  if (!response.ok) {
    throw new Error(`AFD fetch failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  // Extract the actual forecast text from HTML wrapper
  const preMatch = text.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  const rawText = preMatch ? preMatch[1] : text;

  // Clean HTML entities
  const cleanedText = rawText
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/<[^>]+>/g, ''); // Remove any remaining HTML tags

  return parseAFD(cleanedText);
}

/**
 * Fetch digital forecast
 */
async function fetchForecast(): Promise<ForecastData> {
  const urls = getNWSUrls();
  const response = await fetch(urls.forecast, {
    headers: {
      'User-Agent': 'ElliotSkyfallWeather/1.0 (weather broadcast generator)',
    },
  });

  if (!response.ok) {
    throw new Error(`Forecast fetch failed: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseForecast(html);
}

/**
 * Save weather snapshot to database for future fallback
 */
async function saveWeatherSnapshot(
  data: WeatherData,
  episodeId?: string
): Promise<void> {
  try {
    const db = getDb();

    await db.insert(schema.weatherSnapshots).values({
      id: nanoid(),
      episodeId: episodeId || null,
      afdRaw: data.afd.rawText,
      forecastRaw: data.forecast.rawHtml,
      parsedData: JSON.stringify(data),
      fetchedAt: data.fetchedAt,
      nwsIssuedAt: data.afd.issueTime,
    });
  } catch (error) {
    // Don't fail if snapshot save fails
    console.log(`  Warning: Failed to save weather snapshot: ${error}`);
  }
}

/**
 * Get fallback data from most recent snapshot
 */
async function getFallbackData(): Promise<WeatherData | null> {
  try {
    const db = getDb();

    const snapshots = await db
      .select()
      .from(schema.weatherSnapshots)
      .orderBy(desc(schema.weatherSnapshots.fetchedAt))
      .limit(1);

    if (snapshots.length === 0) {
      return null;
    }

    const snapshot = snapshots[0];
    const parsedData = JSON.parse(snapshot.parsedData || '{}') as WeatherData;

    // Calculate staleness
    const fetchedAt = new Date(snapshot.fetchedAt);
    const staleAge = Math.round((Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60)); // Hours

    return {
      ...parsedData,
      isStale: true,
      staleAge,
    };
  } catch (error) {
    console.log(`  Warning: Failed to get fallback data: ${error}`);
    return null;
  }
}

/**
 * Check if we have recent weather data (within last 6 hours)
 */
export async function hasRecentWeatherData(): Promise<boolean> {
  try {
    const db = getDb();

    const snapshots = await db
      .select()
      .from(schema.weatherSnapshots)
      .orderBy(desc(schema.weatherSnapshots.fetchedAt))
      .limit(1);

    if (snapshots.length === 0) {
      return false;
    }

    const fetchedAt = new Date(snapshots[0].fetchedAt);
    const ageHours = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);

    return ageHours < 6;
  } catch {
    return false;
  }
}

/**
 * Get the forecast focus description based on time of day
 */
function getForecastFocusLabel(timeContext?: BroadcastTimeContext): string {
  if (!timeContext) {
    return '12-HOUR OUTLOOK';
  }

  switch (timeContext.timeOfDay) {
    case 'early-morning':
      return 'TODAY\'S FORECAST (what to expect as the day unfolds)';
    case 'morning':
      return 'REST OF TODAY (through tonight)';
    case 'afternoon':
      return 'EVENING AND OVERNIGHT OUTLOOK';
    case 'evening':
      return 'OVERNIGHT AND TOMORROW PREVIEW';
    case 'late-night':
      return 'OVERNIGHT AND TOMORROW MORNING';
    default:
      return '12-HOUR OUTLOOK';
  }
}

/**
 * Format weather data for script generation
 */
export function formatWeatherForScript(data: WeatherData, timeContext?: BroadcastTimeContext): string {
  const { afd, forecast, isStale, staleAge } = data;
  const current = forecast.current;

  let output = '';

  // Stale data warning
  if (isStale) {
    output += `[DATA NOTE: Using cached weather data from ${staleAge} hours ago. Fresh data was unavailable.]\n\n`;
  }

  // Time context reminder
  if (timeContext) {
    output += `[BROADCAST TIME: ${timeContext.timeOfDay} broadcast for ${timeContext.date} at ${timeContext.time} MST]\n`;
    output += `[FORECAST EMPHASIS: ${timeContext.forecastFocus}]\n\n`;
  }

  // Current conditions
  output += `CURRENT CONDITIONS (${current.observationTime}):\n`;
  output += `- Temperature: ${current.temperature}°F\n`;
  output += `- Conditions: ${current.conditions}\n`;
  output += `- Wind: ${current.windDirection} at ${current.windSpeed} mph\n`;
  output += `- Humidity: ${current.humidity}%\n`;
  output += `- Sky Cover: ${current.skyCover}%\n\n`;

  // Key messages from AFD
  if (afd.keyMessages.length > 0) {
    output += `KEY MESSAGES FROM NWS BOULDER:\n`;
    for (const msg of afd.keyMessages) {
      output += `- ${msg}\n`;
    }
    output += '\n';
  }

  // Hazards
  if (afd.hazards.length > 0) {
    output += `ACTIVE HAZARDS:\n`;
    for (const hazard of afd.hazards) {
      output += `- ${hazard.type}: ${hazard.description}\n`;
      if (hazard.timing) {
        output += `  Timing: ${hazard.timing}\n`;
      }
    }
    output += '\n';
  }

  // Forecast discussion excerpt
  if (afd.discussion) {
    output += `FORECAST DISCUSSION:\n`;
    output += afd.discussion.slice(0, 1500) + '...\n\n';
  }

  // Hourly outlook with time-context-aware label
  const forecastLabel = getForecastFocusLabel(timeContext);
  output += `${forecastLabel}:\n`;
  for (let i = 0; i < Math.min(12, forecast.hourly.length); i++) {
    const h = forecast.hourly[i];
    output += `- Hour ${h.hour}: ${h.temperature}°F, ${h.weatherDescription}, Wind ${h.windDirection} ${h.windSpeed}mph\n`;
  }

  return output;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
