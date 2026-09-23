import type { ProductLine } from '@prisma/client';
import { prisma } from '../../src/lib/db';
import { seedContentTemplates } from '../../src/server/templates/seed';

const BUSINESS_TABLES = [
  'template_usages',
  'campaign_posts',
  'campaigns',
  'social_posts',
  'social_connections',
  'post_slots',
  'listings',
  'post_materials',
  'post_schedules',
  'drop_schedules',
  'listing_packs',
  'product_snapshots',
  'shop_connections',
  'promise_claims',
  'email_logs',
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

/**
 * Truncating `workspaces` cascades into `content_templates` (overrides point at a workspace),
 * which takes the seeded global library with it. Re-seed when it has been emptied so template
 * tests start from the same 18-template library the app ships with.
 */
export const ensureContentTemplates = async (): Promise<void> => {
  const count = await prisma.contentTemplate.count();
  if (count > 0) return;
  await seedContentTemplates(prisma);
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
