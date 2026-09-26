import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import type { Prisma } from '@prisma/client';
import { SHOP_TEMPLATES } from '../../../src/content/business/catalog/templates';
import { prisma } from '../../../src/lib/db';
import { expandDraft } from '../../../src/server/generation/expand';
import { createSet } from '../../../src/server/sets/sets';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const setup = async () => {
  const ws = await createTestWorkspace('shop');
  await prisma.identityReference.create({ data: { workspaceId: ws.id, kind: 'face', r2Key: `ws/${ws.id}/identity/face.jpg` } });
  await prisma.identityReference.deleteMany({ where: { isStudioModel: true, studioModelSlug: 'model-emma' } });
  await prisma.identityReference.create({ data: { isStudioModel: true, studioModelSlug: 'model-emma', kind: 'face', r2Key: 'studio/model-emma/face.jpg' } });
  const template = await prisma.setTemplate.findFirstOrThrow({ where: { product: 'shop', isActive: true } });
  const me = await createSet(ws, { templateId: template.id, modelRef: 'me' });
  const emma = await createSet(ws, { templateId: template.id, modelRef: 'model-emma' });
  const products = await Promise.all(['A', 'B', 'C'].map((name) =>
    prisma.product.create({ data: { workspaceId: ws.id, name, category: 'dress', frontR2Key: `ws/${ws.id}/products/${name}.jpg` } })));
  return { ws, me, emma, productIds: products.map((p) => p.id) };
};

describe('shop batches with several models', () => {
  it('gives each product one model, in turn, and keeps the set on every photo', async () => {
    const { ws, me, emma, productIds } = await setup();
    const batch = await expandDraft(ws, { kind: 'shop_products', setId: me.id, setIds: [emma.id], productIds, packId: 'listing', formats: ['square_1_1'], highRes: false });

    const setOf = (productId: string) => [...new Set(batch.items.filter((i) => i.productId === productId).map((i) => i.setId))];
    expect(setOf(productIds[0]!)).toEqual([me.id]);
    expect(setOf(productIds[1]!)).toEqual([emma.id]);
    expect(setOf(productIds[2]!)).toEqual([me.id]);
    expect(batch.items.filter((i) => i.setId === emma.id).every((i) => i.inputR2Keys[0] === 'studio/model-emma/face.jpg')).toBe(true);
    expect(batch.setId).toBe(me.id);
    expect(batch.name).toMatch(/2 models/);
  });

  it('costs the same as one model', async () => {
    const { ws, me, emma, productIds } = await setup();
    const base = { kind: 'shop_products' as const, setId: me.id, productIds, packId: 'listing' as const, formats: ['square_1_1' as const], highRes: false };
    const one = await expandDraft(ws, base);
    const two = await expandDraft(ws, { ...base, setIds: [emma.id] });
    expect(two.items.length).toBe(one.items.length);
  });
});

describe('create a drop with scenes and poses', () => {
  const upsertScene = async (id: string) => {
    const t = SHOP_TEMPLATES.find((x) => x.id === id)!;
    const data = { product: t.product, name: t.name, description: t.description, coverImage: t.coverImage, sortOrder: t.sortOrder, config: t.config as unknown as Prisma.InputJsonValue, isActive: true };
    await prisma.setTemplate.upsert({ where: { id }, update: data, create: { id, ...data } });
  };

  it('makes every product with every model in every picked pose', async () => {
    const { ws, me, emma, productIds } = await setup();
    await Promise.all(['pool', 'gym'].map(upsertScene));
    const scenes = [{ id: 'pool', poseIds: ['standing', 'lounger'] }, { id: 'gym', poseIds: ['bench'] }];
    const batch = await expandDraft(ws, { kind: 'shop_products', setId: me.id, setIds: [emma.id], scenes, productIds: [productIds[0]!], packId: 'listing', formats: ['square_1_1'], highRes: false });

    // 1 product × 2 models × 3 poses × 1 format.
    expect(batch.items).toHaveLength(6);
    expect(batch.items.filter((i) => i.setId === emma.id && i.sceneId === 'pool')).toHaveLength(2);
    // The scene's own pose goes into the prompt.
    expect(batch.items.some((i) => i.sceneId === 'gym' && i.shot === 'seated_pose' && i.prompt.includes('workout bench'))).toBe(true);
  });

  it('refuses a pose the scene does not have', async () => {
    const { ws, me, productIds } = await setup();
    await upsertScene('pool');
    await expect(expandDraft(ws, { kind: 'shop_products', setId: me.id, scenes: [{ id: 'pool', poseIds: ['bench'] }], productIds, packId: 'listing', formats: ['square_1_1'], highRes: false })).rejects.toThrow(/pose/);
  });
});
