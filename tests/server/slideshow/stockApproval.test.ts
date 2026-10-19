import type { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { shareApprovedStock } from '../../../src/server/slideshow/core/stockApproval';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(async () => {
  await resetBusinessTables();
  await prisma.assetDescriptor.deleteMany({ where: { id: { startsWith: 'desc-test' } } });
  await prisma.blitzAsset.deleteMany({ where: { id: { startsWith: 'test' } } });
});
afterAll(() => prisma.$disconnect());

/** A library photo of `workspaceId`: a stock one ('scraped') or an AI one. */
const photo = async (id: string, workspaceId: string, source: 'scraped' | 'ai_generated') => {
  const r2Key = `blitz/assets/${id}.jpg`;
  await prisma.blitzAsset.create({ data: { id, type: 'BACKGROUND', r2Key, name: id, tags: ['Retail & shopping', 'Stock'], source: 'library', workspaceId } });
  const descriptor = { subject: id, meaning: 'Shows: You buy snacks you already had.', pickedFor: { business: 'KitchenPal', audience: 'home cooks', categories: ['retail_shopping'] } };
  await prisma.assetDescriptor.create({
    data: { id: `desc-${id}`, blitzAssetId: id, workspaceId, kind: 'background', source, status: 'done', model: 'pexels', descriptor: descriptor as Prisma.InputJsonValue },
  });
  return r2Key;
};

const assetOf = (id: string) => prisma.blitzAsset.findUniqueOrThrow({ where: { id }, include: { descriptor: true } });

describe('shareApprovedStock', () => {
  it('shares the stock photos a scheduled video shows, tagged with the industry', async () => {
    const ws = await createTestWorkspace('slideshow');
    await prisma.workspace.update({ where: { id: ws.id }, data: { industry: 'food' } });
    const shown = await photo('test-shown', ws.id, 'scraped');
    await photo('test-unused', ws.id, 'scraped');
    const ai = await photo('test-ai', ws.id, 'ai_generated');

    const shared = await shareApprovedStock(ws.id, { currentAssets: { backgroundKey: 'blitz/hooks/h.mp4' }, slides: ['x', { backgroundKey: shown }, { backgroundKey: ai }] });

    expect(shared).toBe(1);
    const asset = await assetOf('test-shown');
    expect(asset.workspaceId).toBeNull();
    expect(asset.tags).toEqual(expect.arrayContaining(['Stock', 'Approved stock', 'Industry: food']));
    expect(asset.descriptor!.workspaceId).toBeNull();
    expect(asset.descriptor!.descriptor).toMatchObject({ approved: { workspaceId: ws.id, business: 'KitchenPal', industry: 'food' } });
    expect((await assetOf('test-unused')).workspaceId).toBe(ws.id);
    expect((await assetOf('test-ai')).workspaceId).toBe(ws.id);
  });

  it('never shares another workspace\'s photos', async () => {
    const mine = await createTestWorkspace('slideshow');
    const other = await createTestWorkspace('slideshow');
    const key = await photo('test-other', other.id, 'scraped');
    expect(await shareApprovedStock(mine.id, { slides: [{ backgroundKey: key }] })).toBe(0);
    expect((await assetOf('test-other')).workspaceId).toBe(other.id);
  });
});
