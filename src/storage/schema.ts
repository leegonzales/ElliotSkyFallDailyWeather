/**
 * Database Schema
 *
 * Minimal SQLite schema for episode tracking and weather data caching.
 */

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

/**
 * Episodes table - tracks each daily broadcast
 */
export const episodes = sqliteTable('episodes', {
  id: text('id').primaryKey(),
  broadcastDate: text('broadcast_date').notNull().unique(),
  broadcastTime: text('broadcast_time').notNull(),
  episodeNumber: integer('episode_number').notNull(),

  // State machine status
  status: text('status', {
    enum: ['init', 'fetching', 'generating', 'synthesizing', 'syncing', 'composing', 'done', 'error']
  }).default('init').notNull(),

  // Weather data reference
  weatherDataTimestamp: text('weather_data_timestamp'),
  weatherIsStale: integer('weather_is_stale', { mode: 'boolean' }).default(false),

  // Generated content
  script: text('script'),
  audioPath: text('audio_path'),
  videoPath: text('video_path'),
  durationSecs: real('duration_secs'),

  // Metadata
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  updatedAt: text('updated_at').default('CURRENT_TIMESTAMP'),
  completedAt: text('completed_at'),
  error: text('error'),
});

/**
 * Weather snapshots - cached weather data for fallback
 */
export const weatherSnapshots = sqliteTable('weather_snapshots', {
  id: text('id').primaryKey(),
  episodeId: text('episode_id').references(() => episodes.id),

  // Raw data from NWS
  afdRaw: text('afd_raw'),
  forecastRaw: text('forecast_raw'),

  // Parsed and structured data
  parsedData: text('parsed_data'), // JSON string

  // Timestamps
  fetchedAt: text('fetched_at').notNull(),
  nwsIssuedAt: text('nws_issued_at'),
});

/**
 * Image cache - track generated images for reuse
 */
export const imageCache = sqliteTable('image_cache', {
  id: text('id').primaryKey(),

  // Cache key components
  promptHash: text('prompt_hash').notNull(),
  imageType: text('image_type', {
    enum: ['character', 'atmospheric', 'weather_graphic']
  }).notNull(),
  styleVersion: integer('style_version').notNull(),

  // File reference
  imagePath: text('image_path').notNull(),

  // Metadata
  prompt: text('prompt').notNull(),
  model: text('model').notNull(),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  lastUsedAt: text('last_used_at'),
  useCount: integer('use_count').default(1),
});

// Type exports
export type Episode = typeof episodes.$inferSelect;
export type NewEpisode = typeof episodes.$inferInsert;
export type WeatherSnapshot = typeof weatherSnapshots.$inferSelect;
export type NewWeatherSnapshot = typeof weatherSnapshots.$inferInsert;
export type ImageCacheEntry = typeof imageCache.$inferSelect;
export type NewImageCacheEntry = typeof imageCache.$inferInsert;
