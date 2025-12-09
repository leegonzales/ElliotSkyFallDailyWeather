import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/storage/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || './data/elliot.db',
  },
});
