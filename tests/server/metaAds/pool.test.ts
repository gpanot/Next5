import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));
vi.mock('../../../src/lib/admin-auth', () => ({ signAdminToken: () => 'token' }));

describe('runPool', () => {
  it('never runs more than the limit at once and finishes every item in start order', async () => {
    const { runPool } = await import('../../../src/server/metaAds/pipeline');
    let inFlight = 0;
    let peak = 0;
    const started: number[] = [];
    const items = Array.from({ length: 15 }, (_, i) => i);
    await runPool(items, 5, async (n) => {
      started.push(n);
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5 + (n % 3) * 5));
      inFlight -= 1;
    });
    expect(peak).toBe(5);
    expect(started).toEqual(items);
  });

  it('handles fewer items than the limit', async () => {
    const { runPool } = await import('../../../src/server/metaAds/pipeline');
    const done: number[] = [];
    await runPool([1, 2], 5, async (n) => {
      done.push(n);
    });
    expect(done.sort()).toEqual([1, 2]);
  });
});
