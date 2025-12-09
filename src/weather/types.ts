/**
 * Weather Data Types
 *
 * Type definitions for NWS weather data.
 */

import { z } from 'zod';

/**
 * Hazard information from AFD
 */
export interface Hazard {
  type: string;
  areas: string[];
  timing: string;
  description: string;
}

/**
 * Area Forecast Discussion data
 */
export interface AFDData {
  keyMessages: string[];
  discussion: string;
  hazards: Hazard[];
  aviation: string;
  issueTime: string;
  forecaster: string;
  rawText: string;
}

/**
 * Hourly forecast point
 */
export interface HourlyForecast {
  hour: number;
  date: string;
  temperature: number;
  dewpoint: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  skyCover: number;
  precipProbability: number;
  weatherDescription: string;
}

/**
 * Current conditions
 */
export interface CurrentConditions {
  temperature: number;
  dewpoint: number;
  humidity: number;
  windSpeed: number;
  windDirection: string;
  skyCover: number;
  conditions: string;
  observationTime: string;
}

/**
 * Digital forecast data
 */
export interface ForecastData {
  hourly: HourlyForecast[];
  current: CurrentConditions;
  rawHtml: string;
}

/**
 * Complete weather data package
 */
export interface WeatherData {
  afd: AFDData;
  forecast: ForecastData;
  fetchedAt: string;
  isStale: boolean;
  staleAge?: number; // Hours since fresh data
}

/**
 * Weather fetch result
 */
export interface WeatherFetchResult {
  success: boolean;
  data?: WeatherData;
  error?: string;
  usedFallback: boolean;
}

// Zod schemas for validation
export const hazardSchema = z.object({
  type: z.string(),
  areas: z.array(z.string()),
  timing: z.string(),
  description: z.string(),
});

export const afdDataSchema = z.object({
  keyMessages: z.array(z.string()),
  discussion: z.string(),
  hazards: z.array(hazardSchema),
  aviation: z.string(),
  issueTime: z.string(),
  forecaster: z.string(),
  rawText: z.string(),
});

export const hourlyForecastSchema = z.object({
  hour: z.number(),
  date: z.string(),
  temperature: z.number(),
  dewpoint: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windDirection: z.string(),
  skyCover: z.number(),
  precipProbability: z.number(),
  weatherDescription: z.string(),
});

export const currentConditionsSchema = z.object({
  temperature: z.number(),
  dewpoint: z.number(),
  humidity: z.number(),
  windSpeed: z.number(),
  windDirection: z.string(),
  skyCover: z.number(),
  conditions: z.string(),
  observationTime: z.string(),
});

export const forecastDataSchema = z.object({
  hourly: z.array(hourlyForecastSchema),
  current: currentConditionsSchema,
  rawHtml: z.string(),
});

export const weatherDataSchema = z.object({
  afd: afdDataSchema,
  forecast: forecastDataSchema,
  fetchedAt: z.string(),
  isStale: z.boolean(),
  staleAge: z.number().optional(),
});
