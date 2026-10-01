import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/lib/db';
import { requireCredits } from '../../../src/server/slideshowCredits/charge';
import { adjustCredits } from '../../../src/server/slideshowCredits/admin';
import { addEntry, ensureWallet } from '../../../src/server/slideshowCredits/wallet';
import { resetBusinessTables } from '../../helpers/db';

const newUser = () => prisma.user.create({ data: { email: `u${Date.now()}${Math.random()}@test.dev` } });
const balance = async (userId: string) => (await prisma.slideshowWallet.findUniqueOrThrow({ where: { userId } })).balanceCents;
const ledgerSum = async (userId: string) => (await prisma.slideshowCreditEntry.aggregate({ where: { userId }, _sum: { deltaCents: true } }))._sum.deltaCents;

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE slideshow_credit_ledger, slideshow_wallets');
  await resetBusinessTables();
});
afterAll(() => prisma.$disconnect());

describe('slideshow wallet', () => {
  it('gives one free slideshow once', async () => {
    const user = await newUser();
    await Promise.all([ensureWallet(user.id), ensureWallet(user.id)]);
    expect(await balance(user.id)).toBe(99);
    expect(await prisma.slideshowCreditEntry.count({ where: { userId: user.id, reason: 'free_grant' } })).toBe(1);
  });

  it('credits a payment once, even when reported twice', async () => {
    const user = await newUser();
    await addEntry({ userId: user.id, deltaCents: 2_500, reason: 'topup', ref: 'cs_1' });
    expect(await addEntry({ userId: user.id, deltaCents: 2_500, reason: 'topup', ref: 'cs_1' })).toBeNull();
    expect(await balance(user.id)).toBe(99 + 2_500);
    expect(await ledgerSum(user.id)).toBe(await balance(user.id));
  });

  it('charges a slideshow once', async () => {
    const user = await newUser();
    await addEntry({ userId: user.id, deltaCents: -99, reason: 'slideshow_charge', ref: 'show_1' });
    await addEntry({ userId: user.id, deltaCents: -99, reason: 'slideshow_charge', ref: 'show_1' });
    expect(await balance(user.id)).toBe(0);
  });

  it('blocks a run the balance cannot cover', async () => {
    const user = await newUser();
    await expect(requireCredits(user.id, 1)).resolves.toBeUndefined();
    await expect(requireCredits(user.id, 2)).rejects.toMatchObject({ status: 402, code: 'no_credits' });
  });

  it('lets an admin add credits but not remove below zero', async () => {
    const user = await newUser();
    expect(await adjustCredits(user.id, 1_000, 'Goodwill')).toBe(1_099);
    await expect(adjustCredits(user.id, -5_000, 'Too much')).rejects.toMatchObject({ status: 402 });
    await expect(adjustCredits(user.id, 500, '')).rejects.toMatchObject({ status: 400 });
    expect(await balance(user.id)).toBe(1_099);
    expect(await ledgerSum(user.id)).toBe(1_099);
  });
});
