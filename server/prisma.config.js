import { defineConfig } from 'prisma/config';

// Load server/.env with Node's built-in loader (no dotenv needed).
// In CI or hosting there is no .env file; the variables come from the environment instead.
try {
  process.loadEnvFile('.env');
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
