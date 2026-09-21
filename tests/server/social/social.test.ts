import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { decryptToken, encryptToken } from '../../../src/server/social/crypto';
import { disconnect, listConnections, PROVIDERS, publishSlot, saveConnection } from '../../../src/server/social/connections';
import { mediaUrlFor, readMediaToken, signState, verifyState } from '../../../src/server/social/links';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterEach(() => vi.restoreAllMocks());
afterAll(() => prisma.$disconnect());

const TOKENS = { externalId: 'ig_123', username: 'jenna.realty', avatarUrl: null, accessToken: 'secret-access', refreshToken: null, expiresAt: new Date(Date.now() + 30 * 86_400_000), refreshExpiresAt: null, scopes: ['instagram_business_basic'] };

const tokenOf = (url: string): string => url.split('/api/media/')[1]!;

describe('token encryption', () => {
  it('round-trips and never stores the plain token', () => {
    const stored = encryptToken('secret-access');
    expect(stored).not.toContain('secret-access');
    expect(decryptToken(stored)).toBe('secret-access');
  });

  it('rejects a tampered value', () => {
    const [v, iv, tag, data] = encryptToken('secret-access').split('.');
    expect(() => decryptToken([v, iv, tag, `${data}x`].join('.'))).toThrow();
  });
});

describe('media links', () => {
  it('point to one item as a JPEG and expire', () => {
    const url = mediaUrlFor('item_1');
    expect(url).toMatch(/\/api\/media\/.+\.jpg$/);
    expect(readMediaToken(tokenOf(url))).toBe('item_1');
    expect(readMediaToken(tokenOf(mediaUrlFor('item_1', -10)))).toBeNull();
  });

  it('reject a forged signature', () => {
    const [body] = tokenOf(mediaUrlFor('item_1')).split('.');
    expect(readMediaToken(`${body}.forged.jpg`)).toBeNull();
  });
});

describe('oauth state', () => {
  it('only verifies for the platform it was made for', () => {
    const state = signState({ workspaceId: 'ws_1', product: 'brand', provider: 'tiktok' });
    expect(verifyState(state, 'tiktok').workspaceId).toBe('ws_1');
    expect(() => verifyState(state, 'instagram')).toThrow(/expired/);
  });
});

describe('connections and posting', () => {
  const slotWithPhoto = async (workspaceId: string) => {
    const batch = await prisma.batch.create({ data: { workspaceId, kind: 'brand_theme', status: 'ready', name: 'Just Listed', formats: ['portrait_4_5'] } });
    const item = await prisma.batchItem.create({ data: { batchId: batch.id, format: 'portrait_4_5', prompt: 'p', status: 'ready', r2Key: 'key-1', postKit: { hook: 'Just listed!', caption: 'Come see it.', hashtags: ['#realtor', '#justlisted'] } } });
    return prisma.postSlot.create({ data: { workspaceId, itemId: item.id, scheduledFor: new Date('2026-09-22') } });
  };

  it('stores one account per platform, encrypted, and forgets it on disconnect', async () => {
    const ws = await createTestWorkspace('brand');
    await saveConnection(ws.id, 'instagram', TOKENS);
    await saveConnection(ws.id, 'instagram', { ...TOKENS, username: 'jenna.new' });
    expect((await listConnections(ws.id)).map((c) => c.username)).toEqual(['jenna.new']);
    const row = await prisma.socialConnection.findFirstOrThrow({ where: { workspaceId: ws.id } });
    expect(row.accessToken).not.toContain('secret-access');
    await disconnect(ws.id, 'instagram');
    expect(await listConnections(ws.id)).toEqual([]);
  });

  it('posts the photo with the Post Kit caption, logs it and marks the day posted', async () => {
    const ws = await createTestWorkspace('brand');
    await saveConnection(ws.id, 'instagram', TOKENS);
    const slot = await slotWithPhoto(ws.id);
    const publish = vi.spyOn(PROVIDERS.instagram, 'publishPhoto').mockResolvedValue({ externalId: 'media_9', postUrl: 'https://www.instagram.com/p/abc/' });

    await publishSlot(ws.id, slot.id, 'instagram');

    const input = publish.mock.calls[0]![0];
    expect(input.accessToken).toBe('secret-access');
    expect(input.caption).toBe('Just listed!\n\nCome see it.\n\n#realtor #justlisted');
    expect(readMediaToken(tokenOf(input.imageUrl))).toBe(slot.itemId);
    const after = await prisma.postSlot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(after.status).toBe('posted');
    expect(after.postUrl).toBe('https://www.instagram.com/p/abc/');
    expect((await prisma.socialPost.findFirstOrThrow({ where: { slotId: slot.id } })).status).toBe('sent');
  });

  it('logs a failure and leaves the day planned', async () => {
    const ws = await createTestWorkspace('brand');
    await saveConnection(ws.id, 'instagram', TOKENS);
    const slot = await slotWithPhoto(ws.id);
    vi.spyOn(PROVIDERS.instagram, 'publishPhoto').mockRejectedValue(new Error('Instagram said: aspect ratio not supported'));

    await expect(publishSlot(ws.id, slot.id, 'instagram')).rejects.toThrow(/aspect ratio/);
    expect((await prisma.postSlot.findUniqueOrThrow({ where: { id: slot.id } })).status).toBe('planned');
    expect((await prisma.socialPost.findFirstOrThrow({ where: { slotId: slot.id } })).status).toBe('failed');
  });

  it('asks her to connect first when the platform is not connected', async () => {
    const ws = await createTestWorkspace('brand');
    const slot = await slotWithPhoto(ws.id);
    await expect(publishSlot(ws.id, slot.id, 'tiktok')).rejects.toThrow(/Connect TikTok/);
  });
});
