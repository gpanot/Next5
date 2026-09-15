// server-only — never import from a 'use client' file.
// Weekly/biweekly drops (Shop Growth, Scale, Agency): pick products that need photos and email a drop to review.

import type { DropSchedule, Workspace } from '@prisma/client';
import { isFormatId } from '../../config/formats';
import { isPackId } from '../../config/shots';
import { prisma } from '../../lib/db';
import { sendOnce } from '../email/send';
import { dropReadyEmail } from '../email/templates';
import { getActivePlan } from '../generation/createBatch';
import { HttpError } from '../http';

const DAY = 86_400_000;

/** Query string for the create page so a drop opens with its products, look, shots and sizes. */
export const dropCreateQuery = (s: Pick<DropSchedule, 'setId' | 'packId' | 'formats'>, productIds: string[]): string =>
  new URLSearchParams({ products: productIds.join(','), pack: s.packId, formats: s.formats.join(','), ...(s.setId ? { set: s.setId } : {}) }).toString();
const RUN_HOUR_UTC = 1;

export type DropInput = { active: boolean; cadence: 'weekly' | 'biweekly'; weekday: number; productsPerDrop: number; setId: string | null; packId: string; formats: string[] };

/** Next run: the given weekday at 01:00 UTC, strictly after `from` (pure). */
export const nextRunAfter = (from: Date, weekday: number): Date => {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), RUN_HOUR_UTC));
  let add = (weekday - d.getUTCDay() + 7) % 7;
  if (add === 0 && d <= from) add = 7;
  return new Date(d.getTime() + add * DAY);
};

export const parseDropInput = (body: Record<string, unknown>): DropInput => {
  const cadence = body.cadence === 'biweekly' ? 'biweekly' : 'weekly';
  const weekday = Number(body.weekday);
  const productsPerDrop = Number(body.productsPerDrop);
  const formats = (Array.isArray(body.formats) ? body.formats : []).map(String).filter(isFormatId);
  const packId = String(body.packId ?? 'listing');
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) throw new HttpError(400, 'invalid_weekday', 'Pick a day of the week.');
  if (![5, 10, 20, 40].includes(productsPerDrop)) throw new HttpError(400, 'invalid_count', 'Pick 5, 10, 20 or 40 products per drop.');
  if (!isPackId(packId)) throw new HttpError(400, 'invalid_pack', 'Pick a shot pack.');
  if (formats.length === 0) throw new HttpError(400, 'invalid_formats', 'Pick at least one size.');
  return { active: body.active !== false, cadence, weekday, productsPerDrop, setId: body.setId ? String(body.setId) : null, packId, formats };
};

/** Products that need photos: new since the last drop first, then best sellers. Only products whose photo is ready. */
export const pickDropProducts = async (workspaceId: string, count: number, since: Date | null) => {
  const candidates = await prisma.product.findMany({
    where: { workspaceId, archivedAt: null, frontR2Key: { notIn: ['', 'pending'] }, items: { none: { status: { in: ['ready', 'queued', 'submitting', 'generating'] } } } },
    select: { id: true, name: true, soldCount: true, importedAt: true, createdAt: true },
  });
  const isNew = (p: (typeof candidates)[number]) => (since ? (p.importedAt ?? p.createdAt) > since : false);
  return candidates
    .sort((a, b) => Number(isNew(b)) - Number(isNew(a)) || (b.soldCount ?? -1) - (a.soldCount ?? -1) || b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, count);
};

export const getDropSchedule = async (ws: Workspace) => {
  const schedule = await prisma.dropSchedule.findUnique({ where: { workspaceId: ws.id } });
  const plan = await getActivePlan(ws.id);
  const suggested = schedule?.lastProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: schedule.lastProductIds }, workspaceId: ws.id, archivedAt: null, items: { none: { status: 'ready' } } }, select: { id: true } })
    : [];
  return { schedule, allowed: Boolean(plan?.drops), pendingProductIds: suggested.map((p) => p.id) };
};

export const saveDropSchedule = async (ws: Workspace, input: DropInput, now = new Date()): Promise<DropSchedule> => {
  if (ws.product !== 'shop') throw new HttpError(400, 'wrong_product', 'Drops are part of Shop Studio.');
  const plan = await getActivePlan(ws.id, now);
  if (!plan?.drops) throw new HttpError(403, 'plan_required', 'Weekly drops are included in Growth.');
  if (input.setId && !(await prisma.studioSet.findFirst({ where: { id: input.setId, workspaceId: ws.id } }))) throw new HttpError(400, 'invalid_set', 'Pick one of your shop looks.');
  const data = { ...input, nextRunAt: input.active ? nextRunAfter(now, input.weekday) : null };
  return prisma.dropSchedule.upsert({ where: { workspaceId: ws.id }, update: data, create: { workspaceId: ws.id, ...data } });
};

/** Daily cron: for each due schedule, pick products and email the drop to review. Idempotent per run date. */
export const runDueDrops = async (now = new Date(), limit = 50): Promise<number> => {
  const due = await prisma.dropSchedule.findMany({ where: { active: true, nextRunAt: { lte: now } }, include: { workspace: true }, take: limit });
  let sent = 0;
  for (const s of due) {
    const plan = await getActivePlan(s.workspaceId, now);
    const next = new Date(nextRunAfter(now, s.weekday).getTime() + (s.cadence === 'biweekly' ? 7 * DAY : 0));
    if (!plan?.drops) {
      await prisma.dropSchedule.update({ where: { id: s.id }, data: { nextRunAt: next } });
      continue;
    }
    const products = await pickDropProducts(s.workspaceId, s.productsPerDrop, s.lastRunAt);
    await prisma.dropSchedule.update({ where: { id: s.id }, data: { lastRunAt: now, nextRunAt: next, lastProductIds: products.map((p) => p.id) } });
    if (products.length === 0) continue;
    const ok = await sendOnce({
      userId: s.workspace.ownerUserId, workspaceId: s.workspaceId, template: 'drop_ready', dedupeKey: `drop:${s.workspaceId}:${now.toISOString().slice(0, 10)}`,
      content: dropReadyEmail(products.length, products.map((p) => p.name), dropCreateQuery(s, products.map((p) => p.id))),
    });
    if (ok) sent += 1;
  }
  return sent;
};
