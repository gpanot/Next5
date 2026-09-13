import type { ProductLine } from '@prisma/client';
import { prisma } from '../../src/lib/db';

const BUSINESS_TABLES = [
  'bank_transactions',
  'payments',
  'credit_ledger',
  'subscriptions',
  'batch_items',
  'batches',
  'products',
  'studio_sets',
  'identity_references',
  'consent_records',
  'workspaces',
] as const;

/** Empties business tables plus users. Keeps templates/themes (seeded reference data). */
export const resetBusinessTables = async (): Promise<void> => {
  const tables = [...BUSINESS_TABLES, 'photos', 'booking_regenerations', 'bookings', 'users']
    .map((t) => `"${t}"`)
    .join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables} CASCADE`);
};

let counter = 0;

export const createTestWorkspace = async (product: ProductLine = 'brand') => {
  counter += 1;
  const user = await prisma.user.create({
    data: { id: `user_${Date.now()}_${counter}`, email: `test${Date.now()}_${counter}@example.com` },
  });
  return prisma.workspace.create({
    data: { ownerUserId: user.id, product, name: `Test ${product} ${counter}` },
  });
};

export const at = (iso: string): Date => new Date(iso);
