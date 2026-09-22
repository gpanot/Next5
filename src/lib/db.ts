import { Prisma, PrismaClient } from '@prisma/client';

/** Connection attempts per query. Only failures to open a connection are retried, so no query can run twice. */
const CONNECT_ATTEMPTS = 4;

/**
 * P1001 can't reach the server, P1002 the server timed out. Both mean the connection never opened.
 * The Railway public proxy drops burst concurrent connections from local dev machines — retrying with
 * a short jittered backoff lets the proxy settle before the next attempt.
 */
const isConnectFailure = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientInitializationError ||
  (err instanceof Prisma.PrismaClientKnownRequestError &&
    // P1001: can't reach server  P1002: server timed out  P1017: server closed the connection
    // P1017 happens when the Railway proxy drops an idle pooled connection; retrying opens a fresh one.
    ['P1001', 'P1002', 'P1017'].includes(err.code));

/** Staggered backoff: 800 ms + up to 400 ms jitter per attempt. */
const backoff = (attempt: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, attempt * 800 + Math.random() * 400));

/**
 * The extension only wraps queries (no new models or fields), so the client keeps the plain
 * PrismaClient type that the rest of the code and Prisma.TransactionClient expect.
 */
const createClient = (): PrismaClient =>
  new PrismaClient().$extends({
    query: {
      async $allOperations({ args, query, operation, model }) {
        for (let attempt = 1; ; attempt += 1) {
          try {
            return await query(args);
          } catch (err) {
            if (!isConnectFailure(err) || attempt >= CONNECT_ATTEMPTS) throw err;
            console.warn(`[db] ${model ?? ''}.${operation}: connection failed, retry ${attempt}/${CONNECT_ATTEMPTS - 1}`);
            await backoff(attempt);
          }
        }
      },
    },
  }) as unknown as PrismaClient;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** Returns true if the DATABASE_URL is set — use as a guard in API routes. */
export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** Upserts a user row by email, returning the user id. */
export async function upsertUserByEmail(email: string): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email },
    select: { id: true },
  });
  return user.id;
}
