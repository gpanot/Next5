// A pack's claimer swaps the welcome credits for the pack's free posts, once, and never loses spent or paid credits.

import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => {
  const state = { other: null as null | { id: string }, refs: new Set<string>(), balance: 897 };
  const prisma = {
    slideshowWallet: { findUnique: vi.fn(async () => ({ userId: 'user_1', balanceCents: state.balance })) },
    slideshowCreditEntry: { findFirst: vi.fn(async () => state.other) },
    $queryRaw: vi.fn(async (sql: TemplateStringsArray, ...values: unknown[]) => {
      if (sql.join('').includes('INSERT INTO')) {
        const ref = values[4] as string;
        if (state.refs.has(ref)) return [];
        state.refs.add(ref);
        return [{ id: 'entry' }];
      }
      const delta = values[0] as number;
      if (state.balance + delta < 0) return [];
      state.balance += delta;
      return [{ balance_cents: state.balance }];
    }),
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma)),
  };
  return { state, prisma };
});

vi.mock('../../../src/lib/db', () => ({ prisma: db.prisma }));

import { removeWelcomeCredits } from '../../../src/server/slideshowCredits/wallet';

beforeEach(() => {
  db.state.other = null;
  db.state.refs.clear();
  db.state.balance = 897;
});

describe('removeWelcomeCredits', () => {
  it('takes the unused welcome credits back', async () => {
    await removeWelcomeCredits('user_1');
    expect(db.state.balance).toBe(0);
  });

  it('applies once when a second pack is claimed', async () => {
    db.state.balance = 2_000;
    await removeWelcomeCredits('user_1');
    await removeWelcomeCredits('user_1');
    expect(db.state.balance).toBe(1_103);
  });

  it('leaves the balance alone once anything was spent or paid', async () => {
    db.state.other = { id: 'topup' };
    await removeWelcomeCredits('user_1');
    expect(db.state.balance).toBe(897);
  });
});
