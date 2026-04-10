// src/lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function resolveDatabaseUrl(): string | undefined {
  const explicitPoolerUrl = process.env.DATABASE_POOLER_URL || process.env.POSTGRES_PRISMA_URL;
  if (explicitPoolerUrl) return explicitPoolerUrl;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  // Supabase direct connections on 5432 can be flaky from serverless runtimes.
  // On Vercel, prefer the pooled port when DATABASE_URL points at Supabase direct host.
  if (process.env.VERCEL === '1') {
    try {
      const parsed = new URL(databaseUrl);
      if (parsed.hostname.endsWith('.supabase.co') && parsed.port === '5432') {
        parsed.port = '6543';
        if (!parsed.searchParams.has('sslmode')) {
          parsed.searchParams.set('sslmode', 'require');
        }
        if (!parsed.searchParams.has('pgbouncer')) {
          parsed.searchParams.set('pgbouncer', 'true');
        }
        // Allow more concurrent connections to handle Vercel serverless bursts.
        // Supabase pooler can handle higher limits; increasing from 5 to 15 for better throughput.
        if (!parsed.searchParams.has('connection_limit')) {
          parsed.searchParams.set('connection_limit', '15');
        }
        // Reduce connection wait time to fail fast instead of queueing indefinitely
        if (!parsed.searchParams.has('pool_timeout')) {
          parsed.searchParams.set('pool_timeout', '10');
        }
        return parsed.toString();
      }
    } catch {
      // Keep original DATABASE_URL if URL parsing fails.
    }
  }

  return databaseUrl;
}

const prismaOptions: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
};

const resolvedDatabaseUrl = resolveDatabaseUrl();
if (resolvedDatabaseUrl) {
  prismaOptions.datasources = { db: { url: resolvedDatabaseUrl } };
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient(prismaOptions);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
else globalForPrisma.prisma = db;
