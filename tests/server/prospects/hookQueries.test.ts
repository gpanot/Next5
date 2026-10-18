// Hook photos: a search with no stock result is tried shorter, then with the content's cover search.

import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/lib/db', () => ({ prisma: {} }));

import { hookQueries } from '../../../src/server/prospects/hooksVolume';

describe('hookQueries', () => {
  it('drops the last word one at a time, then tries the cover search, without repeats', () => {
    expect(hookQueries('workshop front desk phone', 'mechanic workshop')).toEqual(['workshop front desk phone', 'workshop front desk', 'workshop front', 'workshop', 'mechanic workshop']);
    expect(hookQueries('', 'garage')).toEqual(['garage']);
    expect(hookQueries('garage', 'garage')).toEqual(['garage']);
  });
});
