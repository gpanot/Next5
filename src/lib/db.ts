import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

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
