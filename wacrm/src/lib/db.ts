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
        // Keep low connection counts per function to avoid exhausting Postgres
        // on serverless burst traffic.
        if (!parsed.searchParams.has('connection_limit')) {
          parsed.searchParams.set('connection_limit', '1');
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
