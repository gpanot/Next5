import { describe, expect, it } from 'vitest';
import { parseAppShot } from '../../../src/server/autoSlideshow/campaign/appShot/request';
import { warpOnto } from '../../../src/server/autoSlideshow/campaign/appShot/warp';

/** A 2x2 RGBA source: red, green / blue, white. */
const src = { data: Buffer.from([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]), width: 2, height: 2 };
const px = (out: Buffer, w: number, x: number, y: number) => [...out.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)];

describe('warpOnto', () => {
  it('puts each source corner on its quad corner and leaves outside pixels clear', () => {
    const out = warpOnto(src, [[10, 10], [50, 12], [48, 90], [12, 88]], 64, 100);
    expect(px(out, 64, 11, 11)[0]).toBeGreaterThan(200);
    expect(px(out, 64, 11, 11)[3]).toBe(255);
    expect(px(out, 64, 48, 13)[1]).toBeGreaterThan(200);
    expect(px(out, 64, 13, 86)[2]).toBeGreaterThan(200);
    expect(px(out, 64, 2, 2)[3]).toBe(0);
    expect(px(out, 64, 60, 95)[3]).toBe(0);
  });
});

describe('parseAppShot', () => {
  it('needs a screen, and a scene or a background', () => {
    expect(() => parseAppShot({ pose: 'held-up', scene: 'golf' })).toThrow();
    expect(() => parseAppShot({ pose: 'held-up', screenId: 'abc' })).toThrow();
    expect(parseAppShot({ pose: 'held-up', screenId: 'abc', scene: '  golf   course ' })).toEqual({ pose: 'held-up', screenId: 'abc', scene: 'golf course', background: null });
    expect(parseAppShot({ screenId: 'abc', background: { source: 'unsplash', id: 'x1' } }).background).toEqual({ source: 'unsplash', id: 'x1' });
  });
});
