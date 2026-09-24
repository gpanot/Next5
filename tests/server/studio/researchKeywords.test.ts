/**
 * Research-time keyword resolution: stale keywords are regenerated, manual ones are kept, and a
 * B2B profile with no customer niches stops instead of searching the vendor's own vertical.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

const createMock = vi.fn();
const updateMock = vi.fn();
vi.mock('../../../src/lib/db', () => ({
  prisma: {
    studioBrandProfile: { create: (...a: unknown[]) => createMock(...a) },
    studioRun: { update: (...a: unknown[]) => updateMock(...a) },
  },
}));
const chatJsonMock = vi.fn().mockResolvedValue(null);
vi.mock('../../../src/server/ai/openai', () => ({ chatJson: (...a: unknown[]) => chatJsonMock(...a) }));

import { resolveResearchKeywords } from '../../../src/server/studio/researchKeywords';
import { keywordInputFromProfile, keywordInputSignature } from '../../../src/server/studio/keywordDiscovery';
import type { FieldEnvelope, StudioProfileData } from '../../../src/server/studio/types';

afterEach(() => vi.clearAllMocks());

const e = <T,>(value: T): FieldEnvelope<T> => ({ value, source: 'inferred', confidence: 0.8, locked: false });

function profileRow(opts: { idc: FieldEnvelope<string[]>; keywords: FieldEnvelope<string[]> }) {
  const data: StudioProfileData = {
    classification: { vertical: e('saas'), subVertical: e(''), businessModel: e('b2b') },
    identity: { businessName: e('Avenue'), tagline: e(''), description: e(''), logoUrl: e<string | null>(null), primaryColor: e<string | null>(null) },
    positioning: { promoting: e('Booking software'), offer: e(''), positioning: e(''), geography: e('') },
    market: { audienceDescription: e(''), targetCustomerIndustries: opts.idc, competitors: e<string[]>([]), keywords: opts.keywords },
    tone: { tone: e('casual'), hooks: e<string[]>([]) },
  };
  return { id: 'p1', sourceUrl: 'https://www.avenue2.au/', workspaceId: null, version: 5, data, crawl: {} };
}

describe('resolveResearchKeywords', () => {
  it('stops a B2B run with no customer niches instead of searching the wrong audience', async () => {
    const row = profileRow({ idc: e<string[]>([]), keywords: e(['software review']) });
    await expect(resolveResearchKeywords('run1', row)).rejects.toThrow(/IDC Niches/);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('ignores legacy ungrounded niches (the "beauty salons" profile) and stops', async () => {
    const row = profileRow({
      idc: e(['automotive', 'beauty salons', 'fitness studios']),
      keywords: e(['beauty salon strategies', 'fitness studio management']),
    });
    await expect(resolveResearchKeywords('run1', row)).rejects.toThrow(/IDC Niches/);
  });

  it('regenerates stale keywords from the niches and saves a new profile version', async () => {
    createMock.mockResolvedValueOnce({ id: 'p2' });
    const row = profileRow({
      idc: { ...e(['auto mechanics', 'electricians']), source: 'manual' },
      keywords: e(['beauty salon strategies']),
    });

    const keywords = await resolveResearchKeywords('run1', row);

    expect(keywords).toEqual(['auto mechanics', 'electricians']);
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0]![0].data.version).toBe(6);
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'run1' }, data: { brandProfileId: 'p2' } });
  });

  it('reuses stored keywords when their signature still matches', async () => {
    const idc = { ...e(['auto mechanics']), evidence: ['Owner at Nash Street Mechanical'] };
    const base = profileRow({ idc, keywords: e(['auto mechanics']) });
    const signature = keywordInputSignature(keywordInputFromProfile(base.data));
    const row = profileRow({ idc, keywords: { ...e(['auto mechanics']), derivedFrom: signature } });

    expect(await resolveResearchKeywords('run1', row)).toEqual(['auto mechanics']);
    expect(createMock).not.toHaveBeenCalled();
  });

  it('always uses keywords the admin typed in', async () => {
    const row = profileRow({ idc: e<string[]>([]), keywords: { ...e(['diesel mechanic']), source: 'manual' } });
    expect(await resolveResearchKeywords('run1', row)).toEqual(['diesel mechanic']);
  });

  it('stops and asks for keywords when no reliable B2C terms can be found', async () => {
    const row = profileRow({ idc: e<string[]>([]), keywords: e<string[]>([]) });
    row.data.classification.businessModel = e('b2c');
    await expect(resolveResearchKeywords('run1', row)).rejects.toThrow(/Profile → Market → Keywords/);
    expect(createMock).not.toHaveBeenCalled();
  });
});
