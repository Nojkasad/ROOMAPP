import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.ts';

// One shared Prisma client for the whole server.
// The pg adapter is the driver that actually talks to Postgres (required since Prisma 7).
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter });
