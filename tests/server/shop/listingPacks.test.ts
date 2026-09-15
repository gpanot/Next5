import { describe, expect, it } from 'vitest';
import { packFileNames, resolvePack } from '../../../src/server/shop/listingPacks';

const t = (m: number) => new Date(Date.UTC(2026, 8, 16, 10, m));
const item = (id: string, format: string, shot: string | null, m = 0) => ({ id, format, shot, completedAt: t(m) });

describe('resolvePack', () => {
  const items = [
    item('detail-sq', 'square_1_1', 'detail_closeup', 1),
    item('half-45', 'portrait_4_5', 'half_body', 2),
    item('front-sq', 'square_1_1', 'full_body_front', 3),
    item('half-sq', 'square_1_1', 'half_body', 4),
    item('cover-old', 'story_9_16', 'full_body_front', 5),
    item('cover-new', 'story_9_16', 'half_body', 6),
  ];

  it('defaults to square photos first, full body as the main image, newest 9:16 as cover', () => {
    const pack = resolvePack(items, null);
    expect(pack.slots).toEqual(['front-sq', 'half-sq', 'detail-sq', 'half-45']);
    expect(pack.coverItemId).toBe('cover-new');
    expect(pack.warnings).toEqual([]);
  });

  it('keeps the saved order, drops hidden photos, appends new ones, caps at 9 and warns on a non-square main', () => {
    const pack = resolvePack(items, { slotItemIds: ['half-45', 'front-sq', 'gone'], hiddenItemIds: ['detail-sq'], coverItemId: 'cover-old' });
    expect(pack.slots).toEqual(['half-45', 'front-sq', 'half-sq']);
    expect(pack.coverItemId).toBe('cover-old');
    expect(pack.warnings[0]).toMatch(/square/);
    const many = Array.from({ length: 12 }, (_, i) => item(`p${i}`, 'square_1_1', 'half_body', i));
    const capped = resolvePack(many, null);
    expect(capped.slots).toHaveLength(9);
    expect(capped.extra).toHaveLength(3);
    expect(capped.warnings[0]).toMatch(/9:16/);
  });
});

describe('packFileNames', () => {
  it('names files in TikTok upload order', () => {
    expect(packFileNames('SSD-Sage 01', 3, true)).toEqual({ slots: ['ssd-sage-01_01_main.jpg', 'ssd-sage-01_02.jpg', 'ssd-sage-01_03.jpg'], cover: 'ssd-sage-01_cover_9x16.jpg' });
    expect(packFileNames('Váy lụa!', 1, false)).toEqual({ slots: ['vay-lua_01_main.jpg'], cover: null });
  });
});
