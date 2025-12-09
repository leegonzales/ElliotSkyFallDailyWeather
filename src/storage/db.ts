/**
 * Database Connection
 *
 * SQLite database connection using better-sqlite3 and Drizzle ORM.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as schema from './schema';
import { getConfig } from '../utils/config';

let dbInstance: ReturnType<typeof drizzle> | null = null;
let sqliteInstance: Database.Database | null = null;

/**
 * Get or create the database connection
 */
export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const config = getConfig();
  const dbPath = config.databasePath;

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create SQLite connection
  sqliteInstance = new Database(dbPath);

  // Enable WAL mode for better performance
  sqliteInstance.pragma('journal_mode = WAL');

  // Create Drizzle instance
  dbInstance = drizzle(sqliteInstance, { schema });

  return dbInstance;
}

/**
 * Get the raw SQLite instance (for migrations, etc.)
 */
export function getSqlite() {
  if (!sqliteInstance) {
    getDb(); // Initialize if needed
  }
  return sqliteInstance!;
}

/**
 * Close the database connection
 */
export function closeDb() {
  if (sqliteInstance) {
    sqliteInstance.close();
    sqliteInstance = null;
    dbInstance = null;
  }
}

/**
 * Initialize database tables
 */
export function initializeDb() {
  const sqlite = getSqlite();

  // Create episodes table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS episodes (
      id TEXT PRIMARY KEY,
      broadcast_date TEXT NOT NULL UNIQUE,
      broadcast_time TEXT NOT NULL,
      episode_number INTEGER NOT NULL,
      status TEXT DEFAULT 'init' NOT NULL,
      weather_data_timestamp TEXT,
      weather_is_stale INTEGER DEFAULT 0,
      script TEXT,
      audio_path TEXT,
      video_path TEXT,
      duration_secs REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      completed_at TEXT,
      error TEXT
    )
  `);

  // Create weather_snapshots table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weather_snapshots (
      id TEXT PRIMARY KEY,
      episode_id TEXT REFERENCES episodes(id),
      afd_raw TEXT,
      forecast_raw TEXT,
      parsed_data TEXT,
      fetched_at TEXT NOT NULL,
      nws_issued_at TEXT
    )
  `);

  // Create image_cache table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS image_cache (
      id TEXT PRIMARY KEY,
      prompt_hash TEXT NOT NULL,
      image_type TEXT NOT NULL,
      style_version INTEGER NOT NULL,
      image_path TEXT NOT NULL,
      prompt TEXT NOT NULL,
      model TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      last_used_at TEXT,
      use_count INTEGER DEFAULT 1
    )
  `);

  // Create indexes
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_episodes_date ON episodes(broadcast_date);
    CREATE INDEX IF NOT EXISTS idx_episodes_status ON episodes(status);
    CREATE INDEX IF NOT EXISTS idx_weather_episode ON weather_snapshots(episode_id);
    CREATE INDEX IF NOT EXISTS idx_image_cache_hash ON image_cache(prompt_hash, style_version);
  `);
}

// Re-export schema for convenience
export { schema };
export const db = {
  get instance() {
    return getDb();
  }
};
