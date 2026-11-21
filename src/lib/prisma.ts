import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';


const adapter = new PrismaPg({ connectionString: env.DATABASE_URL, max: 10 });

export const prisma = new PrismaClient({
  adapter,
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

// The type of the `tx` argument inside prisma.$transaction(async (tx) => ...)
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];