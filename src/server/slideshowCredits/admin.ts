// server-only — never import from a 'use client' file.
// Admin view of Auto Slideshow credits: every slideshow user with their balance, their history, and manual credit.

import { prisma } from '../../lib/db';
import type { AdminCreditUserDto, CreditReason } from '../../types/admin/slideshowCredits';
import { HttpError } from '../http';
import { addEntry, ensureWallet, recentEntries } from './wallet';

const LIST_LIMIT = 200;

/** Users with a slideshow workspace or a wallet, newest first, optionally filtered by email. */
export const listCreditUsers = async (query: string): Promise<AdminCreditUserDto[]> => {
  const q = query.trim();
  const wallets = await prisma.slideshowWallet.findMany({ select: { userId: true } });
  const users = await prisma.user.findMany({
    where: {
      OR: [{ workspaces: { some: { product: 'slideshow' } } }, { id: { in: wallets.map((w) => w.userId) } }],
      ...(q ? { email: { contains: q, mode: 'insensitive' as const } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: LIST_LIMIT,
    select: { id: true, email: true, displayName: true, createdAt: true, _count: { select: { workspaces: { where: { product: 'slideshow' } } } } },
  });
  const ids = users.map((u) => u.id);
  const [balances, spent] = await Promise.all([
    prisma.slideshowWallet.findMany({ where: { userId: { in: ids } }, select: { userId: true, balanceCents: true, autoRechargeEnabled: true } }),
    prisma.slideshowCreditEntry.groupBy({ by: ['userId'], where: { userId: { in: ids }, reason: 'slideshow_charge' }, _count: { _all: true } }),
  ]);
  const walletOf = new Map(balances.map((b) => [b.userId, b]));
  const spentOf = new Map(spent.map((s) => [s.userId, s._count._all]));
  return users.map((u) => ({
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    createdAt: u.createdAt.toISOString(),
    workspaces: u._count.workspaces,
    // No wallet yet: they still get the free slideshow on first use.
    balanceCents: walletOf.get(u.id)?.balanceCents ?? null,
    autoRecharge: walletOf.get(u.id)?.autoRechargeEnabled ?? false,
    slideshowsCharged: spentOf.get(u.id) ?? 0,
  }));
};

export const creditHistory = async (userId: string) => {
  const wallet = await ensureWallet(userId);
  const entries = await recentEntries(userId, 50);
  return {
    balanceCents: wallet.balanceCents,
    history: entries.map((e) => ({ id: e.id, deltaCents: e.deltaCents, reason: e.reason as CreditReason, note: e.note, createdAt: e.createdAt.toISOString() })),
  };
};

const MAX_ADJUST_CENTS = 1_000_000;

/** Adds (or removes, when negative) credits by hand. A removal cannot take the balance below zero. */
export const adjustCredits = async (userId: string, amountCents: unknown, note: unknown): Promise<number> => {
  if (typeof amountCents !== 'number' || !Number.isInteger(amountCents) || amountCents === 0 || Math.abs(amountCents) > MAX_ADJUST_CENTS) {
    throw new HttpError(400, 'bad_amount', 'Enter an amount between -$10,000 and $10,000, not $0.');
  }
  const reason = typeof note === 'string' ? note.trim().slice(0, 200) : '';
  if (!reason) throw new HttpError(400, 'no_note', 'Add a short note (why).');
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new HttpError(404, 'user_not_found', 'User not found.');
  const balance = await addEntry({ userId, deltaCents: amountCents, reason: 'admin_adjust', note: reason }, amountCents < 0);
  return balance ?? 0;
};
