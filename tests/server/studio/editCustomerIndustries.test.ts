/** Saving client types on the test database: the list, the rewritten Audience, the run copies, and nothing extra when unchanged. */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { editCustomerIndustries } from '../../../src/server/studio/customerIndustries';
import type { StudioProfileData } from '../../../src/server/studio/types';
import { createTestWorkspace, resetBusinessTables } from '../../helpers/db';

const chat = vi.hoisted(() => vi.fn());
vi.mock('../../../src/server/ai/openai', () => ({ chatJson: chat }));

const env = <T>(value: T) => ({ value, source: 'inferred', confidence: 0.8, locked: false });
const data = {
  identity: { businessName: env('Burns') },
  positioning: { promoting: env('Commercial plumbing') },
  market: { audienceDescription: env('Businesses'), targetCustomerIndustries: { ...env(['commercial', 'strata', 'aged care', 'retail']), evidence: ['c', 's', 'a', 'r'] } },
  brand: { audience: env('Property managers'), valueProp: env('Plumbing') },
};

async function setup() {
  const ws = await createTestWorkspace('slideshow');
  const profile = await prisma.studioBrandProfile.create({ data: { workspaceId: ws.id, sourceUrl: 'https://example.com', data: data as object } });
  const run = await prisma.autoSlideshowRun.create({ data: { url: 'https://example.com', count: 1, workspaceId: ws.id, status: 'COMPLETED', profile: { audience: 'Property managers', brandName: 'Burns' } } });
  return { workspaceId: ws.id, profileId: profile.id, runId: run.id };
}
const saved = async (id: string) => (await prisma.studioBrandProfile.findUniqueOrThrow({ where: { id } })).data as unknown as StudioProfileData;

beforeEach(async () => {
  await resetBusinessTables();
  chat.mockReset().mockResolvedValue({ audience: 'Landlords and agents who want fast repairs.' });
});
afterAll(() => prisma.$disconnect());

describe('editCustomerIndustries', () => {
  it('saves a changed list, rewrites the Audience and updates the run copy', async () => {
    const { workspaceId, profileId, runId } = await setup();
    const edit = await editCustomerIndustries(workspaceId, ['real estate', 'strata'], null);
    expect(edit.changed).toBe(true);
    const row = await saved(profileId);
    expect(row.market.targetCustomerIndustries).toMatchObject({ value: ['real estate', 'strata'], evidence: ['', 's'], source: 'manual' });
    expect(row.brand!.audience.value).toBe('Landlords and agents who want fast repairs.');
    const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId } });
    expect(run.profile).toMatchObject({ audience: 'Landlords and agents who want fast repairs.', brandName: 'Burns' });
  });

  it('confirming the shown list marks it checked, without any rewrite', async () => {
    const { workspaceId, profileId } = await setup();
    const edit = await editCustomerIndustries(workspaceId, ['commercial', 'strata', 'aged care'], null);
    expect(edit.changed).toBe(false);
    expect(edit.dto).toMatchObject({ edited: true, suggestions: ['retail'] });
    expect(chat).not.toHaveBeenCalled();
    expect((await saved(profileId)).brand!.audience.value).toBe('Property managers');
  });

  it('still saves when the rewrite fails, with a plain sentence', async () => {
    const { workspaceId, profileId } = await setup();
    chat.mockRejectedValue(new Error('down'));
    await editCustomerIndustries(workspaceId, ['schools'], null);
    expect((await saved(profileId)).brand!.audience.value).toBe('Clients in schools.');
  });

  it('refuses a user who does not own the workspace', async () => {
    const { workspaceId } = await setup();
    await expect(editCustomerIndustries(workspaceId, ['schools'], 'someone-else')).rejects.toThrow();
  });
});
