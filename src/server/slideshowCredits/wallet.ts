// server-only — never import from a 'use client' file.
// Auto Slideshow wallet: one USD balance per user. Every change goes through `applyEntry`, which writes the ledger row
// and moves the balance in one transaction, so the balance always equals the sum of the ledger.

import { randomUUID } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import { FREE_GRANT_CENTS, type CreditReason } from '../../types/admin/slideshowCredits';
import { HttpError } from '../http';

type Tx = Prisma.TransactionClient;

export type Entry = { userId: string; deltaCents: number; reason: CreditReason; ref?: string | null; note?: string | null };

/**
 * Writes one ledger row and moves the balance. Returns the new balance, or null when the row was already applied
 * (payments, the free grant and slideshow charges are applied once per ref). With `cover`, a debit that would take the
 * balance below zero throws 402 instead.
 */
export const applyEntry = async (tx: Tx, entry: Entry, cover = false): Promise<number | null> => {
  const { userId, deltaCents, reason, ref = null, note = null } = entry;
  const inserted = await tx.$queryRaw<{ id: string }[]>`
    INSERT INTO slideshow_credit_ledger (id, user_id, delta_cents, reason, ref, note)
    VALUES (${randomUUID()}, ${userId}, ${deltaCents}, ${reason}, ${ref}, ${note})
    ON CONFLICT (reason, ref) WHERE reason IN ('free_grant', 'topup', 'auto_recharge', 'slideshow_charge') DO NOTHING
    RETURNING id`;
  if (inserted.length === 0) return null;
  const rows = cover
    ? await tx.$queryRaw<{ balance_cents: number }[]>`
        UPDATE slideshow_wallets SET balance_cents = balance_cents + ${deltaCents}, updated_at = NOW()
        WHERE user_id = ${userId} AND balance_cents + ${deltaCents} >= 0 RETURNING balance_cents`
    : await tx.$queryRaw<{ balance_cents: number }[]>`
        UPDATE slideshow_wallets SET balance_cents = balance_cents + ${deltaCents}, updated_at = NOW()
        WHERE user_id = ${userId} RETURNING balance_cents`;
  if (rows.length === 0) throw new HttpError(402, 'no_credits', 'Not enough credits.');
  return rows[0]!.balance_cents;
};

/** The user's wallet, created on first use with one free slideshow. */
export const ensureWallet = async (userId: string) => {
  const existing = await prisma.slideshowWallet.findUnique({ where: { userId } });
  if (existing) return existing;
  await prisma.$transaction(async (tx) => {
    const created = await tx.$executeRaw`INSERT INTO slideshow_wallets (user_id) VALUES (${userId}) ON CONFLICT (user_id) DO NOTHING`;
    if (created === 1) await applyEntry(tx, { userId, deltaCents: FREE_GRANT_CENTS, reason: 'free_grant', ref: userId, note: 'Welcome gift: 1 free slideshow' });
  });
  return prisma.slideshowWallet.findUniqueOrThrow({ where: { userId } });
};

/** Applies one entry in its own transaction, creating the wallet first when needed. */
export const addEntry = async (entry: Entry, cover = false): Promise<number | null> => {
  await ensureWallet(entry.userId);
  return prisma.$transaction((tx) => applyEntry(tx, entry, cover));
};

export const recentEntries = (userId: string, take = 20) =>
  prisma.slideshowCreditEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take });
