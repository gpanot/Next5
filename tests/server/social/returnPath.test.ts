import { describe, expect, it } from 'vitest';
import { safeReturnPath } from '../../../src/server/social/links';

const WS = 'cmuqjc5i40008vufi4x90gb38';

describe('safeReturnPath', () => {
  it('keeps the workspace pages a connection can start from', () => {
    expect(safeReturnPath(`/slideshow/${WS}`, WS)).toBe(`/slideshow/${WS}`);
    expect(safeReturnPath(`/slideshow/${WS}/content`, WS)).toBe(`/slideshow/${WS}/content`);
    expect(safeReturnPath(`/slideshow/${WS}/content?tab=library&postNow=cmuxawza80001l806785b5gp7-b1791328799186&via=youtube`, WS))
      .toBe(`/slideshow/${WS}/content?tab=library&postNow=cmuxawza80001l806785b5gp7-b1791328799186&via=youtube`);
  });

  it('refuses another workspace, other pages, other sites and odd queries', () => {
    expect(safeReturnPath(`/slideshow/other/content`, WS)).toBeUndefined();
    expect(safeReturnPath(`/slideshow/${WS}x/content`, WS)).toBeUndefined();
    expect(safeReturnPath(`/admin/auto-slideshow`, WS)).toBeUndefined();
    expect(safeReturnPath(`//evil.com/slideshow/${WS}`, WS)).toBeUndefined();
    expect(safeReturnPath(`https://evil.com/slideshow/${WS}`, WS)).toBeUndefined();
    expect(safeReturnPath(`/slideshow/${WS}/content?next=https://evil.com`, WS)).toBeUndefined();
    expect(safeReturnPath(`/slideshow/${WS}/content#x`, WS)).toBeUndefined();
    expect(safeReturnPath(undefined, WS)).toBeUndefined();
    expect(safeReturnPath(`/slideshow/${WS}/content?${'a'.repeat(300)}`, WS)).toBeUndefined();
  });
});
