import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { CONSENT_VERSION } from '../../../src/config/consents';
import { addStudio, parseAccountInput, setupWorkspace, startAccount } from '../../../src/server/onboarding/account';
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

  it('adds a second studio from the existing profile and skips consent only when this studio needs nothing new', async () => {
    await startAccount(parseAccountInput({ product: 'shop', email: 'an@example.com', firstName: 'An', businessName: 'An Lingerie', handle: '@anlingerie' }));
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'an@example.com' } });
    const consent = (type: string) => ({ userId: user.id, type, version: CONSENT_VERSION });
    await prisma.consentRecord.createMany({ data: [consent('terms'), consent('ai_labeling')] });

    // Brand also needs face processing, which the Shop sign-up did not give.
    await addStudio(user.id, 'brand');
    const brand = await prisma.workspace.findFirstOrThrow({ where: { ownerUserId: user.id, product: 'brand' } });
    expect(brand).toMatchObject({ name: 'An Lingerie', handle: '@anlingerie', industry: null, onboardingStep: 1 });

    await prisma.workspace.delete({ where: { id: brand.id } });
    await prisma.consentRecord.create({ data: consent('face_processing') });
    await addStudio(user.id, 'brand');
    expect(await prisma.workspace.findFirstOrThrow({ where: { ownerUserId: user.id, product: 'brand' } })).toMatchObject({ onboardingStep: 2 });
  });
});
