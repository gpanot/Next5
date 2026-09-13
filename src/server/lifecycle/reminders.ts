// server-only — never import from a 'use client' file.

import { PLANS, isPlanId } from '../../config/plans';
import { prisma } from '../../lib/db';
import { newThemeEmail, renewalEmail, restockNudgeEmail, trialNudgeEmail } from '../email/templates';
import { sendOnce } from '../email/send';

const DAY = 24 * 60 * 60 * 1000;

const planName = (planId: string): string =>
  isPlanId(planId) ? `${PLANS[planId].product === 'brand' ? 'Brand' : 'Shop'} ${PLANS[planId].name}` : 'Your plan';

/** 7-day and 1-day renewal reminders for plans without a queued renewal. */
export const sendRenewalReminders = async (now: Date): Promise<number> => {
  const subs = await prisma.subscription.findMany({
    where: { status: 'active', endsAt: { gt: now, lte: new Date(now.getTime() + 7 * DAY) }, startsAt: { lte: now } },
    include: { workspace: { select: { ownerUserId: true } } },
  });
  let sent = 0;
  for (const sub of subs) {
    if (!sub.endsAt) continue;
    const queued = await prisma.subscription.count({ where: { workspaceId: sub.workspaceId, status: 'active', startsAt: { gte: sub.endsAt } } });
    if (queued > 0) continue;
    const daysLeft = Math.ceil((sub.endsAt.getTime() - now.getTime()) / DAY);
    const window = daysLeft <= 1 ? '1d' : '7d';
    const ok = await sendOnce({ userId: sub.workspace.ownerUserId, workspaceId: sub.workspaceId, template: `renewal_${window}`, dedupeKey: `renewal-${window}:${sub.id}`, content: renewalEmail(planName(sub.planId), sub.endsAt, daysLeft) });
    if (ok) sent += 1;
  }
  return sent;
};

/** One nudge 24 h after the free trial for workspaces that never bought a plan. */
export const sendTrialNudges = async (now: Date): Promise<number> => {
  const workspaces = await prisma.workspace.findMany({
    where: { trialUsedAt: { lte: new Date(now.getTime() - DAY), gte: new Date(now.getTime() - 14 * DAY) }, subscriptions: { none: { status: { in: ['active', 'expired', 'cancelled'] } } } },
    select: { id: true, ownerUserId: true, product: true },
  });
  let sent = 0;
  for (const ws of workspaces) {
    if (await sendOnce({ userId: ws.ownerUserId, workspaceId: ws.id, template: 'trial_nudge', dedupeKey: `trial-nudge:${ws.id}`, content: trialNudgeEmail(ws.product) })) sent += 1;
  }
  return sent;
};

const monthKey = (date: Date): string => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}`;
};

/** Brand: this month's featured theme, once per workspace per month (active plans only). */
export const sendThemeDrops = async (now: Date): Promise<number> => {
  const month = monthKey(now);
  const theme = await prisma.theme.findFirst({ where: { isActive: true, featuredMonth: month } });
  if (!theme) return 0;
  const subs = await prisma.subscription.findMany({
    where: { status: 'active', startsAt: { lte: now }, endsAt: { gt: now }, workspace: { product: 'brand' } },
    select: { workspaceId: true, workspace: { select: { ownerUserId: true } } },
  });
  let sent = 0;
  for (const sub of subs) {
    if (await sendOnce({ userId: sub.workspace.ownerUserId, workspaceId: sub.workspaceId, template: 'brand_new_theme', dedupeKey: `theme:${sub.workspaceId}:${month}`, content: newThemeEmail(theme.title, theme.id) })) sent += 1;
  }
  return sent;
};

const isoWeek = (date: Date): string => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return `${d.getUTCFullYear()}-W${Math.ceil(((d.getTime() - yearStart.getTime()) / DAY + 1) / 7)}`;
};

/** Shop: new products added this week but no batch in 7 days → one nudge per ISO week. */
export const sendRestockNudges = async (now: Date): Promise<number> => {
  const since = new Date(now.getTime() - 7 * DAY);
  const workspaces = await prisma.workspace.findMany({
    where: {
      product: 'shop',
      subscriptions: { some: { status: 'active', endsAt: { gt: now } } },
      batches: { none: { createdAt: { gte: since } } },
      products: { some: { createdAt: { gte: since }, lastUsedAt: null, archivedAt: null } },
    },
    select: { id: true, ownerUserId: true, _count: { select: { products: { where: { createdAt: { gte: since }, lastUsedAt: null, archivedAt: null } } } } },
  });
  let sent = 0;
  for (const ws of workspaces) {
    if (await sendOnce({ userId: ws.ownerUserId, workspaceId: ws.id, template: 'shop_restock_nudge', dedupeKey: `restock:${ws.id}:${isoWeek(now)}`, content: restockNudgeEmail(ws._count.products) })) sent += 1;
  }
  return sent;
};
