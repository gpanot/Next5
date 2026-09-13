import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from '../../src/lib/db';
import { enforceRateLimit } from '../../src/server/rateLimit';

afterAll(() => prisma.$disconnect());

describe('enforceRateLimit', () => {
  it('allows up to the limit per window, then throws 429, and resets next window', async () => {
    const key = `test:${Date.now()}`;
    const now = new Date('2026-09-14T10:00:10Z');
    for (let i = 0; i < 3; i += 1) await enforceRateLimit(key, 3, 60, now);
    await expect(enforceRateLimit(key, 3, 60, now)).rejects.toMatchObject({ status: 429 });
    await expect(enforceRateLimit(key, 3, 60, new Date('2026-09-14T10:01:05Z'))).resolves.toBeUndefined();
  });
});
