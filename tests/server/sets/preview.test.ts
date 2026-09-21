import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/server/generation/pump', () => ({ pump: vi.fn().mockResolvedValue(undefined) }));

import { prisma } from '../../../src/lib/db';
import { getBalance } from '../../../src/server/credits/balance';
import { listSeries } from '../../../src/server/generation/library';
import { previewFor, startPreview } from '../../../src/server/sets/preview';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const brandWithSet = async () => {
  const ws = await createTestWorkspace('brand');
  const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'brand' } });
  const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: template.id, name: 'Office', locations: [], status: 'active' } });
  await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: 'face.jpg' } });
  return { ws, set };
};

describe('style previews', () => {
  it('makes two free photos of her in the style, once', async () => {
    const { ws, set } = await brandWithSet();
    const batch = await startPreview(ws, set.id);

    expect(batch.preview).toBe(true);
    expect(batch.name).toBe('Preview · Office');
    expect(await prisma.batchItem.count({ where: { batchId: batch.id } })).toBe(2);
    // Paid from free credits granted for it: nothing left over, and no plan credits touched.
    expect((await getBalance(ws.id)).total).toBe(0);

    const again = await startPreview(ws, set.id);
    expect(again.id).toBe(batch.id);
    expect(await prisma.batch.count({ where: { setId: set.id, preview: true } })).toBe(1);
    expect((await previewFor(set.id)).status).toBe('generating');
  });

  it('stays out of her library and style batch count', async () => {
    const { ws, set } = await brandWithSet();
    const batch = await startPreview(ws, set.id);
    await prisma.batchItem.updateMany({ where: { batchId: batch.id }, data: { status: 'ready', r2Key: 'preview.jpg' } });
    await prisma.batch.update({ where: { id: batch.id }, data: { status: 'ready' } });

    expect((await listSeries(ws.id, 'all', null)).batches).toHaveLength(0);
    const preview = await previewFor(set.id);
    expect(preview.status).toBe('ready');
    expect(preview.photos).toHaveLength(2);
  });

  it('needs her selfies for a Brand style', async () => {
    const ws = await createTestWorkspace('brand');
    const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'brand' } });
    const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: template.id, name: 'Office', locations: [], status: 'active' } });
    await expect(startPreview(ws, set.id)).rejects.toThrow(/selfies/i);
  });

  it('asks a Shop seller for a product first', async () => {
    const ws = await createTestWorkspace('shop');
    const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'shop' } });
    const set = await prisma.studioSet.create({ data: { workspaceId: ws.id, templateId: template.id, name: 'Beige', locations: [], status: 'active', modelRef: 'me' } });
    await expect(startPreview(ws, set.id)).rejects.toThrow(/Add a product/);
  });
});
