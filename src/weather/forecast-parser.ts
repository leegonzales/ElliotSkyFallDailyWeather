/**
 * Forecast Parser
 *
 * Parse NWS digital forecast HTML into structured data.
 */

import type { ForecastData, HourlyForecast, CurrentConditions } from './types';

/**
 * Parse digital forecast HTML into structured data
 */
export function parseForecast(html: string): ForecastData {
  const hourly = parseHourlyData(html);
  const current = extractCurrentConditions(hourly);

  return {
    hourly,
    current,
    rawHtml: html,
  };
}

/**
 * Parse hourly forecast data from HTML table
 */
function parseHourlyData(html: string): HourlyForecast[] {
  const hourly: HourlyForecast[] = [];

  // Extract table rows - the digital forecast uses a specific table format
  // Each row is a weather element, each column is an hour

  // Temperature row
  const tempMatch = html.match(/Temperature[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const temps = extractRowValues(tempMatch?.[1] || '');

  // Dewpoint row
  const dewMatch = html.match(/Dewpoint[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const dews = extractRowValues(dewMatch?.[1] || '');

  // Humidity row
  const humidMatch = html.match(/Relative Humidity[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const humidity = extractRowValues(humidMatch?.[1] || '');

  // Wind speed row
  const windMatch = html.match(/Wind Speed[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const winds = extractRowValues(windMatch?.[1] || '');

  // Wind direction row
  const dirMatch = html.match(/Wind Direction[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const dirs = extractStringValues(dirMatch?.[1] || '');

  // Sky cover row
  const skyMatch = html.match(/Sky Cover[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const skies = extractRowValues(skyMatch?.[1] || '');

  // Precipitation probability row
  const precipMatch = html.match(/Precipitation Potential[^<]*<\/td>([\s\S]*?)<\/tr>/i);
  const precips = extractRowValues(precipMatch?.[1] || '');

  // Date/hour headers
  const dateMatch = html.match(/<th[^>]*>(\d+)<\/th>/g);
  const hours = dateMatch
    ? dateMatch.map(h => parseInt(h.match(/(\d+)/)?.[1] || '0', 10))
    : [];

  // Build hourly forecasts
  const today = new Date().toISOString().split('T')[0];
  const maxHours = Math.min(48, temps.length);

  for (let i = 0; i < maxHours; i++) {
    hourly.push({
      hour: hours[i] || i,
      date: today, // Simplified - would need better date handling
      temperature: temps[i] || 0,
      dewpoint: dews[i] || 0,
      humidity: humidity[i] || 0,
      windSpeed: winds[i] || 0,
      windDirection: dirs[i] || 'N',
      skyCover: skies[i] || 0,
      precipProbability: precips[i] || 0,
      weatherDescription: getWeatherDescription(skies[i] || 0, precips[i] || 0),
    });
  }

  // If parsing failed, create minimal data
  if (hourly.length === 0) {
    hourly.push(createDefaultHourlyForecast());
  }

  return hourly;
}

/**
 * Extract numeric values from table row
 */
function extractRowValues(html: string): number[] {
  const matches = html.match(/>(\d+)</g);
  return matches ? matches.map(m => parseInt(m.match(/(\d+)/)?.[1] || '0', 10)) : [];
}

/**
 * Extract string values from table row
 */
function extractStringValues(html: string): string[] {
  const matches = html.match(/>([NSEW]{1,3})</g);
  return matches ? matches.map(m => m.replace(/[><]/g, '')) : [];
}

/**
 * Get weather description from sky cover and precip
 */
function getWeatherDescription(skyCover: number, precipProb: number): string {
  if (precipProb > 60) {
    return skyCover > 80 ? 'Rain likely' : 'Chance of rain';
  }
  if (precipProb > 30) {
    return 'Slight chance of rain';
  }
  if (skyCover > 80) {
    return 'Cloudy';
  }
  if (skyCover > 50) {
    return 'Mostly cloudy';
  }
  if (skyCover > 20) {
    return 'Partly cloudy';
  }
  return 'Clear';
}

/**
 * Extract current conditions from hourly data
 */
function extractCurrentConditions(hourly: HourlyForecast[]): CurrentConditions {
  const current = hourly[0] || createDefaultHourlyForecast();

  return {
    temperature: current.temperature,
    dewpoint: current.dewpoint,
    humidity: current.humidity,
    windSpeed: current.windSpeed,
    windDirection: current.windDirection,
    skyCover: current.skyCover,
    conditions: current.weatherDescription,
    observationTime: new Date().toISOString(),
  };
}

/**
 * Create default hourly forecast for fallback
 */
function createDefaultHourlyForecast(): HourlyForecast {
  return {
    hour: new Date().getHours(),
    date: new Date().toISOString().split('T')[0],
    temperature: 40,
    dewpoint: 25,
    humidity: 45,
    windSpeed: 10,
    windDirection: 'W',
    skyCover: 50,
    precipProbability: 10,
    weatherDescription: 'Partly cloudy',
  };
}

/**
 * Parse text-based forecast (alternative format)
 */
export function parseTextForecast(text: string): Partial<ForecastData> {
  // For text-based forecasts, extract key information
  const hourly: HourlyForecast[] = [];

  // Look for temperature mentions
  const tempMatch = text.match(/(?:high|low|temperature)[^\d]*(\d+)/gi);
  const temps = tempMatch
    ? tempMatch.map(m => parseInt(m.match(/(\d+)/)?.[1] || '0', 10))
    : [];

  // Create minimal forecast
  if (temps.length > 0) {
    hourly.push({
      hour: new Date().getHours(),
      date: new Date().toISOString().split('T')[0],
      temperature: temps[0],
      dewpoint: Math.round(temps[0] * 0.7),
      humidity: 50,
      windSpeed: 10,
      windDirection: 'W',
      skyCover: 50,
      precipProbability: 0,
      weatherDescription: 'Conditions from text forecast',
    });
  }

  return {
    hourly,
    current: hourly.length > 0 ? extractCurrentConditions(hourly) : undefined,
  };
}
