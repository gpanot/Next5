// server-only — never import from a 'use client' file.
// "Generate calendar", after the admin's review on the user calendar: the free days' videos render from their cards as
// edited, a video whose card changed since its render is made again, then the days are read from the calendar and the
// link opens. A video that cannot be made sends the pack back to 'review' with the reason. The steps run on the admin
// tab's advance calls (advance.ts). "Back to review" reopens a ready pack, and puts older packs on the calendar too.

import { createHash } from 'node:crypto';
import type { Prisma, ProspectPack } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { ProspectBlitz, ProspectDay } from '../../types/admin/prospects';
import { HttpError } from '../http';
import { keptIdeas, renderBlitz } from './blitz';
import { daysFromCalendar, putOnCalendar } from './calendarPlan';
import { rebaseDays } from './days';
import { blitzOf, loadPack } from './store';

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Renders being queued this long ago died with their process: they are queued again. */
const QUEUING_STALE_MS = 10 * 60 * 1000;

const cardHash = (card: unknown): string => createHash('sha1').update(JSON.stringify(card)).digest('hex');

/** The current card hash of each of these ideas still kept on the calendar. */
const hashesOnCalendar = async (workspaceId: string, picked: ProspectBlitz[]): Promise<Map<string, string>> => {
  const rows = await prisma.slideshowVariant.findMany({ where: { id: { in: picked.map((b) => b.ideaId) }, status: 'kept', plannedAt: { not: null } }, select: { id: true } });
  const ideas = await keptIdeas(workspaceId, rows.map((r) => r.id));
  return new Map(ideas.map((i) => [i.id, cardHash(i.card)]));
};

/** The tap: the pack starts generating; each advance call then does the next part. */
export const startGenerating = async (id: string): Promise<void> => {
  const pack = await loadPack(id);
  if (pack.status !== 'review') throw new HttpError(409, 'not_review', 'This prospect is not waiting for a review.');
  const blitz = blitzOf(pack).map((b) => ({ ...b, error: undefined, retry: undefined }));
  const won = await prisma.prospectPack.updateMany({ where: { id, status: 'review' }, data: { status: 'generating', error: null, blitz: json(blitz) } });
  if (won.count === 0) throw new HttpError(409, 'not_review', 'This prospect is not waiting for a review.');
};

/** Queues the renders of `todo`, one by one. The row's updatedAt is the lock. */
const queueRenders = async (pack: ProspectPack, todo: string[], hashes: Map<string, string>): Promise<void> => {
  const started = blitzOf(pack).map((b) => (todo.includes(b.ideaId) ? { ...b, rendering: true } : b));
  const locked = await prisma.prospectPack.updateMany({ where: { id: pack.id, updatedAt: pack.updatedAt }, data: { blitz: json(started) } });
  if (locked.count === 0) return;
  const ideas = await keptIdeas(pack.workspaceId, todo);
  const rendered = new Map((await renderBlitz(pack.ownerUserId, pack.workspaceId, pack.name, ideas)).map((r) => [r.ideaId, r]));
  const merged = started.map((b): ProspectBlitz => {
    if (!todo.includes(b.ideaId)) return b;
    const r = rendered.get(b.ideaId);
    return r?.projectId ? { ideaId: b.ideaId, projectId: r.projectId, cardHash: hashes.get(b.ideaId)! } : { ideaId: b.ideaId, projectId: null, held: true, error: r?.error ?? 'Idea not found.' };
  });
  await prisma.prospectPack.update({ where: { id: pack.id }, data: { blitz: json(merged) } });
};

/** Every render has ended: the days are read from the calendar and the link opens, or the pack goes back to review. */
const settle = async (pack: ProspectPack, onCalendar: ProspectBlitz[]): Promise<void> => {
  const ids = onCalendar.flatMap((b) => (b.projectId ? [b.projectId] : []));
  const rows = ids.length ? await prisma.blitzProject.findMany({ where: { id: { in: ids } }, select: { id: true, renderStatus: true, renderError: true } }) : [];
  if (rows.some((r) => r.renderStatus !== 'COMPLETED' && r.renderStatus !== 'FAILED')) return;
  const failed = new Map(rows.filter((r) => r.renderStatus === 'FAILED').map((r) => [r.id, r.renderError ?? 'The render failed.']));
  const blitz = blitzOf(pack).map((b): ProspectBlitz => {
    const reason = b.projectId ? failed.get(b.projectId) : undefined;
    return reason ? { ideaId: b.ideaId, projectId: null, held: true, error: reason } : b;
  });
  const bad = blitz.filter((b) => onCalendar.some((c) => c.ideaId === b.ideaId) && b.error);
  if (bad.length > 0) {
    const error = `${bad.length} ${bad.length === 1 ? 'video' : 'videos'} could not be made (${bad[0]!.error}). Tap Generate calendar to try again.`.slice(0, 1_000);
    await prisma.prospectPack.update({ where: { id: pack.id }, data: { status: 'review', error, blitz: json(blitz) } });
    return;
  }
  const days = await daysFromCalendar(pack);
  await prisma.prospectPack.updateMany({ where: { id: pack.id, status: 'generating' }, data: { status: 'ready', days: json(days) } });
};

/** One step of a generating pack: queue what must render, else wait for the renders, then finish. */
export const stepGenerating = async (pack: ProspectPack): Promise<void> => {
  const picked = blitzOf(pack);
  if (picked.some((b) => b.rendering) && Date.now() - pack.updatedAt.getTime() < QUEUING_STALE_MS) return;
  const hashes = await hashesOnCalendar(pack.workspaceId, picked);
  const onCalendar = picked.filter((b) => !b.preview && hashes.has(b.ideaId));
  const todo = onCalendar.filter((b) => !b.error && (!b.projectId || b.rendering || b.cardHash !== hashes.get(b.ideaId))).map((b) => b.ideaId);
  if (todo.length > 0) return queueRenders(pack, todo, hashes);
  return settle(pack, onCalendar);
};

/** "Back to review": the link closes until the next Generate calendar. The videos made so far count as made from their
 *  cards as they are now, so only a later edit renders again. */
export const reopenReview = async (id: string): Promise<void> => {
  const pack = await loadPack(id);
  if (pack.status !== 'ready') throw new HttpError(409, 'not_ready', 'Only a pack ready to send can go back to review.');
  const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: pack.workspaceId }, select: { ideaTzOffsetMin: true } });
  const days = rebaseDays((pack.days as unknown as ProspectDay[] | null) ?? [], new Date(), ws.ideaTzOffsetMin);
  await putOnCalendar(pack, days);
  const hashes = await hashesOnCalendar(pack.workspaceId, blitzOf(pack));
  const blitz = blitzOf(pack).map((b) => (b.projectId && !b.cardHash && hashes.has(b.ideaId) ? { ...b, cardHash: hashes.get(b.ideaId)! } : b));
  await prisma.prospectPack.updateMany({ where: { id, status: 'ready' }, data: { status: 'review', days: json(days), blitz: json(blitz), error: null } });
};
