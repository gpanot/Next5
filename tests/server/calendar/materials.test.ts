import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { addMaterial, archiveMaterial, countUnused, listMaterials, markMaterialsUsed, nextUnusedMaterials } from '../../../src/server/calendar/materials';
import { composeBrandPrompt } from '../../../src/server/generation/composer/brand';
import { at, createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

const png = Buffer.from('89504e470d0a1a0a', 'hex');

describe('drop box', () => {
  it('stores a listing under a server-made key and lists it newest first', async () => {
    const ws = await createTestWorkspace('brand');
    const first = await addMaterial(ws, png, { kind: 'listing', label: '24 Oak St' });
    const second = await addMaterial(ws, png, { kind: 'room', label: 'Front desk' });

    expect(first.r2Key).toBe(`ws/${ws.id}/materials/${first.id}.jpg`);
    expect((await listMaterials(ws.id)).map((m) => m.id)).toEqual([second.id, first.id]);
    expect(await countUnused(ws.id)).toBe(2);
  });

  it('is Brand only', async () => {
    const shop = await createTestWorkspace('shop');
    await expect(addMaterial(shop, png, { kind: 'listing', label: null })).rejects.toMatchObject({ status: 400 });
  });

  it('hands out the oldest listing first, and never the same one twice', async () => {
    const ws = await createTestWorkspace('brand');
    const oldest = await addMaterial(ws, png, { kind: 'listing', label: 'First' });
    await addMaterial(ws, png, { kind: 'listing', label: 'Second' });

    const [next] = await nextUnusedMaterials(ws.id, 1);
    expect(next?.id).toBe(oldest.id);

    await markMaterialsUsed([oldest.id], at('2026-09-15T00:00:00Z'));
    expect((await nextUnusedMaterials(ws.id, 2)).map((m) => m.label)).toEqual(['Second']);
    expect(await countUnused(ws.id)).toBe(1);
  });

  it('archives a photo she removes and keeps it out of the queue', async () => {
    const ws = await createTestWorkspace('brand');
    const material = await addMaterial(ws, png, { kind: 'listing', label: 'Gone' });
    await archiveMaterial(ws.id, material.id);
    expect(await listMaterials(ws.id)).toEqual([]);
    expect(await nextUnusedMaterials(ws.id, 5)).toEqual([]);
    await expect(archiveMaterial(ws.id, material.id)).rejects.toMatchObject({ status: 404 });
  });

  it('will not archive another workspace’s photo', async () => {
    const mine = await createTestWorkspace('brand');
    const theirs = await createTestWorkspace('brand');
    const material = await addMaterial(theirs, png, { kind: 'listing', label: 'Theirs' });
    await expect(archiveMaterial(mine.id, material.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe('brand prompt with her own place', () => {
  const base = {
    template: { locations: [{ id: 'office', direction: 'A bright office.' }], lighting: 'Soft daylight.', defaults: { wardrobe: 'smart', poseEnergy: 'calm' } },
    set: { locations: ['office'], wardrobe: null, poseEnergy: null, brandColors: [] },
    scene: { id: 'doorway', label: 'Doorway', direction: 'Standing in a doorway.' },
    index: 0,
    sceneCount: 1,
    format: 'portrait_4_5' as const,
    industry: 'real-estate',
    identityImageCount: 2,
  };

  it('uses the set location when her drop box is empty', () => {
    const prompt = composeBrandPrompt({ ...base, material: null } as never);
    expect(prompt).toContain('A bright office.');
    expect(prompt).not.toContain('Image 3 shows');
  });

  it('puts her inside her own listing, and tells the model to leave the place alone', () => {
    const prompt = composeBrandPrompt({ ...base, material: { kind: 'listing', label: '24 Oak St' } } as never);
    expect(prompt).toContain('Image 3 shows a real property (24 Oak St)');
    expect(prompt).toContain('unchanged');
    expect(prompt).toContain('Do not redecorate');
    expect(prompt).not.toContain('A bright office.'); // her place replaces the stock set
  });
});
