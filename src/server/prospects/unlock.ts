// server-only — never import from a 'use client' file.
// A claimed Prospect Pack's previews (days after the free ones) made in full once the person who claimed it pays for the
// first time: a top up, an auto recharge, or a payment made before they claimed. The Blitz preview ideas are rendered
// (free renders: a video is charged when it is scheduled, like any idea) and the cover-only Brand Cast slideshows get
// their other slides (charged when ready, like any slideshow). Once per pack: unlocked_at is the lock.

import type { Prisma, ProspectPack } from '@prisma/client';
import { waitUntil } from '@vercel/functions';
import { prisma } from '../../lib/db';
import { handOff, runAutoPipeline } from '../autoSlideshow/pipeline';
import { workspaceHasPaid } from '../slideshowCredits/paid';
import { keptIdeas, renderBlitz } from './blitz';
import { blitzOf } from './store';

const json = (value: unknown) => value as Prisma.InputJsonValue;

/** Renders the Blitz preview ideas for `userId` and stores the renders on the pack. */
const unlockBlitz = async (pack: ProspectPack, userId: string): Promise<void> => {
  const previews = blitzOf(pack).filter((b) => b.preview && !b.error);
  if (previews.length === 0) return;
  const ideas = await keptIdeas(pack.workspaceId, previews.map((b) => b.ideaId));
  const rendered = new Map((await renderBlitz(userId, pack.workspaceId, pack.name, ideas)).map((r) => [r.ideaId, r]));
  await prisma.prospectPack.update({ where: { id: pack.id }, data: { blitz: json(blitzOf(pack).map((b) => rendered.get(b.ideaId) ?? b)) } });
};

/** Lifts the cover-only rule on the Brand Cast run and makes the rest of those slideshows (steps 5-6 again). */
const unlockCast = async (pack: ProspectPack): Promise<void> => {
  if (!pack.brandRunId) return;
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: pack.brandRunId }, select: { id: true, status: true, coverOnlyPositions: true } });
  if (!run || run.coverOnlyPositions.length === 0) return;
  await prisma.autoSlideshowRun.update({ where: { id: run.id }, data: { coverOnlyPositions: [] } });
  // A run still going makes them in full itself now; a run with no cover written has nothing to finish.
  if (run.status !== 'COMPLETED' && run.status !== 'FAILED') return;
  const covers = await prisma.autoSlideshow.count({ where: { runId: run.id, status: 'written', position: { in: run.coverOnlyPositions } } });
  if (covers === 0) return;
  if (!(await handOff(run.id))) await runAutoPipeline(run.id, 5);
};

const unlockPack = async (pack: ProspectPack, userId: string): Promise<void> => {
  const locked = await prisma.prospectPack.updateMany({ where: { id: pack.id, unlockedAt: null }, data: { unlockedAt: new Date() } });
  if (locked.count === 0) return;
  await Promise.all([unlockBlitz(pack, userId), unlockCast(pack)]);
};

/** Makes the previews of every pack `userId` claimed and has not unlocked yet. Never throws. */
export const unlockPacks = async (userId: string): Promise<void> => {
  const packs = await prisma.prospectPack.findMany({ where: { claimedByUserId: userId, status: 'claimed', unlockedAt: null } });
  for (const pack of packs) {
    await unlockPack(pack, userId).catch((err: unknown) => console.error(`[prospects] unlock ${pack.id} failed:`, err instanceof Error ? err.message : err));
  }
};

/** After a payment: unlocks in the background (the payment's own work is done). */
export const unlockAfterPayment = (userId: string): void => waitUntil(unlockPacks(userId).catch(() => undefined));

/** After a claim: unlocks right away when the person has already paid. */
export const unlockIfPaid = async (userId: string, workspaceId: string): Promise<void> => {
  if (await workspaceHasPaid(workspaceId)) unlockAfterPayment(userId);
};
