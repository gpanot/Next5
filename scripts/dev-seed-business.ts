/**
 * Local-only demo data for the business app. Refuses to run against a non-localhost database.
 *   DATABASE_URL=postgres://$USER@localhost:5432/next5_dev npx tsx --env-file=.env.local scripts/dev-seed-business.ts
 * Prints a magic sign-in link (valid 15 min) for http://localhost:3100/app.
 */

import sharp from 'sharp';
import { prisma } from '../src/lib/db';
import { signMagicToken } from '../src/lib/studio-auth';
import { grant } from '../src/server/credits/ledger';
import { withSerializable } from '../src/server/db/transaction';
import { createWorkspace } from '../src/server/workspaces/workspaces';
import { putObject } from '../src/server/storage/objectStore';
import { identityKey } from '../src/server/storage/keys';

const EMAIL = process.argv[2] ?? 'demo-brand@next5.local';
const PRODUCT = (process.argv[3] === 'shop' ? 'shop' : 'brand') as 'brand' | 'shop';

const main = async (): Promise<void> => {
  const url = process.env.DATABASE_URL ?? '';
  if (!/@localhost[:/]/.test(url)) throw new Error('Refusing to seed: DATABASE_URL is not localhost.');
  process.env.NEXT5_STORAGE = 'local';

  const user = await prisma.user.upsert({ where: { email: EMAIL }, update: {}, create: { email: EMAIL, displayName: 'Linh' } });
  const ws = await createWorkspace({ ownerUserId: user.id, product: PRODUCT, name: PRODUCT === 'brand' ? 'Linh Realty' : 'Linh Closet', industry: PRODUCT === 'brand' ? 'realtor' : 'fashion' });
  await prisma.workspace.update({ where: { id: ws.id }, data: { onboardingStep: 6, onboardingCompletedAt: new Date() } });

  const face = await sharp('public/images/business/brand/sets/studio-backdrop.png').resize(768).jpeg().toBuffer();
  const existing = await prisma.identityReference.findFirst({ where: { workspaceId: ws.id, deletedAt: null } });
  if (!existing) {
    const ref = await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: 'pending' } });
    const key = identityKey(ws.id, ref.id);
    await putObject(key, face);
    await prisma.identityReference.update({ where: { id: ref.id }, data: { r2Key: key } });
  }
  const templateId = PRODUCT === 'brand' ? 'modern-office' : 'beige-wall';
  if ((await prisma.studioSet.count({ where: { workspaceId: ws.id } })) === 0) {
    await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId, name: PRODUCT === 'brand' ? 'Office look' : 'Boutique wall', locations: [], modelRef: PRODUCT === 'shop' ? 'me' : null } });
  }
  await withSerializable((tx) => grant(tx, { workspaceId: ws.id, bucket: 'bonus', amount: 40, reason: 'admin_adjust', refType: 'admin', refId: `dev-seed-${ws.id}`, expiresAt: null, note: 'dev seed' }));

  console.log(`User ${EMAIL} · ${PRODUCT} workspace ${ws.id}`);
  console.log(`Sign in: http://localhost:3100/app?token=${signMagicToken(EMAIL)}`);
};

main().catch((err: unknown) => { console.error(err); process.exitCode = 1; }).finally(() => prisma.$disconnect());
