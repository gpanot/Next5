// server-only — never import from a 'use client' file.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';

export type Tx = Prisma.TransactionClient;

const MAX_ATTEMPTS = 4;

const isSerializationFailure = (err: unknown): boolean =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2034';

/**
 * Runs `fn` in a SERIALIZABLE transaction and retries on serialization conflicts.
 * Use for every write that moves credits or changes plan/payment state.
 */
export const withSerializable = async <T>(fn: (tx: Tx) => Promise<T>): Promise<T> => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 15_000,
      });
    } catch (err) {
      lastError = err;
      if (!isSerializationFailure(err) || attempt === MAX_ATTEMPTS) throw err;
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.random() * 30));
    }
  }
  throw lastError;
};
