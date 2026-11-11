// Link opens: a real browser on a live link counts; bots and dead links do not. The admin row gets the count and latest.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = { pack: null as null | { id: string; status: string }, rows: [] as Array<Record<string, unknown>> };
  const prisma = {
    prospectPack: { findUnique: vi.fn(async () => state.pack) },
    prospectPackOpen: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => void state.rows.push(data)),
      findMany: vi.fn(async () => state.rows),
    },
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));

import { isBotAgent, opensOf, recordProspectOpen } from '../../../src/server/prospects/opens';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0 Safari/537.36';

beforeEach(() => {
  db.state.pack = { id: 'pp_1', status: 'ready' };
  db.state.rows = [];
});

describe('recordProspectOpen', () => {
  it('saves an open with the device and country', async () => {
    await expect(recordProspectOpen('tok', IPHONE, 'US')).resolves.toBe(true);
    await recordProspectOpen('tok', MAC, null);
    expect(db.state.rows).toEqual([{ packId: 'pp_1', device: 'mobile', country: 'US' }, { packId: 'pp_1', device: 'desktop', country: null }]);
  });

  it('skips bots, a wrong token and a link that is not live', async () => {
    expect(isBotAgent('')).toBe(true);
    await expect(recordProspectOpen('tok', 'Mozilla/5.0 (compatible; Googlebot/2.1)', null)).resolves.toBe(false);
    db.state.pack!.status = 'review';
    await expect(recordProspectOpen('tok', MAC, null)).resolves.toBe(false);
    db.state.pack = null;
    await expect(recordProspectOpen('nope', MAC, null)).resolves.toBe(false);
    expect(db.state.rows).toEqual([]);
  });
});

describe('opensOf', () => {
  it('counts every open but lists only the latest 20', async () => {
    db.state.rows = Array.from({ length: 25 }, (_, i) => ({ packId: 'pp_1', openedAt: new Date(1_800_000_000_000 - i * 1000), device: 'mobile', country: null }));
    const opens = (await opensOf(['pp_1'])).get('pp_1');
    expect(opens?.count).toBe(25);
    expect(opens?.latest).toHaveLength(20);
    expect(opens?.latest[0].at).toBe(new Date(1_800_000_000_000).toISOString());
  });
});
