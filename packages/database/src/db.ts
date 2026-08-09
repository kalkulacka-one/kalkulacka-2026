import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazily-constructed singleton. Forks run with no `DATABASE_URL` at all, and
 * the generated client throws on `new PrismaClient()` when the env var it
 * needs is missing — so the client must not be constructed at module load
 * (which `next build` triggers for every route file) but only when a caller
 * that has already checked `sessionsEnabled()` actually asks for it.
 */
export function db(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return globalForPrisma.prisma;
}
