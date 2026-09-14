import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { parseAccountInput, setupWorkspace, startAccount } from '../../../src/server/onboarding/account';
import { resetBusinessTables } from '../../helpers/db';

beforeEach(resetBusinessTables);
afterAll(() => prisma.$disconnect());

describe('onboarding account', () => {
  it('does not require a business name and names the workspace after the person', async () => {
    const input = parseAccountInput({ product: 'brand', email: 'Linh@Example.com', firstName: 'Linh' });
    expect(input.businessName).toBe('');
    expect(await startAccount(input)).toMatchObject({ status: 'session' });
    const ws = await prisma.workspace.findFirstOrThrow({ where: { owner: { email: 'linh@example.com' } } });
    expect(ws).toMatchObject({ name: 'Linh', product: 'brand', onboardingStep: 1 });
  });

  it('asks an existing account to confirm by email, then finishes setup for the signed-in user without a loop', async () => {
    await startAccount(parseAccountInput({ product: 'shop', email: 'mai@example.com', firstName: 'Mai', businessName: 'Mai Closet' }));
    expect(await startAccount(parseAccountInput({ product: 'brand', email: 'mai@example.com', firstName: 'Mai' }))).toEqual({ status: 'check_email' });

    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'mai@example.com' } });
    await setupWorkspace(user.id, { product: 'brand', firstName: 'Mai', businessName: '', industry: 'coach', handle: null });
    await setupWorkspace(user.id, { product: 'brand', firstName: 'Mai', businessName: '', industry: 'coach', handle: null });
    const workspaces = await prisma.workspace.findMany({ where: { ownerUserId: user.id }, orderBy: { product: 'asc' } });
    expect(workspaces.map((w) => [w.product, w.name, w.onboardingStep])).toEqual([['brand', 'Mai', 1], ['shop', 'Mai Closet', 1]]);
  });
});
