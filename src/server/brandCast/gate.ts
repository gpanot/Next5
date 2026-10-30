// server-only — never import from a 'use client' file.
// The brand avatar gate of a new workspace's onboarding. The owner validates the face before any slideshow is made:
// the first run parks itself before step 4 (status 'WAITING_AVATAR'), the first candidate's photo is made, and the
// owner keeps it or makes up to AVATAR_CHOICES candidates with the "Create avatar" dialog and picks one. The pick
// deletes the candidates not kept and releases the run, which then writes the brand avatar's first slideshow.

import { prisma } from '../../lib/db';
import type { StepCost } from '../../types/admin/metaAds';
import { createMeter, type CostMeter } from '../metaAds/cost';
import { HttpError } from '../http';
import { requireSlideshowWorkspace } from '../autoSlideshow/workspaces';
import { dropFiles } from './archive';
import { prepareCast } from './cast';

/** True while the owner has not picked their brand avatar yet. */
export const avatarPending = async (workspaceId: string): Promise<boolean> =>
  (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { avatarConfirmedAt: true } }))?.avatarConfirmedAt == null;

/** True when this run must not make its Brand Cast yet: its owner has not validated the avatar (holdForAvatar does it). */
export const castWaitsForAvatar = async (runId: string): Promise<boolean> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { waitForTarget: true, workspaceId: true } });
  return Boolean(run?.waitForTarget && run.workspaceId && (await avatarPending(run.workspaceId)));
};

/**
 * Moves a parked run on to step 4. Exactly one caller wins: the one that does runs the steps. `startedAt` is set to
 * now: the slideshow's work begins here, so the "Making your slideshow" countdown measures the wait the owner really
 * has, not the minutes they spent picking their avatar.
 */
const takeWaiting = async (runId: string): Promise<boolean> =>
  (await prisma.autoSlideshowRun.updateMany({ where: { id: runId, status: 'WAITING_AVATAR' }, data: { status: 'STEP_4_RUNNING', startedAt: new Date() } })).count === 1;

/** The warm-up's cast photo is paid by the run, so the gate's one is too: it goes on step 4, where step 4 puts it. */
const chargeStep4 = async (runId: string, cost: StepCost): Promise<void> => {
  if (cost.usdMicros === 0) return;
  const costs = (await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { stepCosts: true } })).stepCosts as Record<string, StepCost>;
  const step4 = costs['4'] ?? { usdMicros: 0, items: [] };
  const merged = { usdMicros: step4.usdMicros + cost.usdMicros, items: [...step4.items, ...cost.items] };
  await prisma.autoSlideshowRun.update({ where: { id: runId }, data: { stepCosts: { ...costs, 4: merged } as object } });
};

/**
 * Before step 4 of a new workspace's first run: parks the run (status 'WAITING_AVATAR') until the owner picks their
 * brand avatar, and makes the first candidate's photo so the onboarding screen has one to show. True when parked.
 * The run is parked before the photo is made: a killed invocation then leaves a run the owner can still finish from
 * the screen, not one marked failed.
 */
export const holdForAvatar = async (runId: string): Promise<boolean> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { waitForTarget: true, workspaceId: true } });
  if (!run?.waitForTarget || !run.workspaceId || !(await avatarPending(run.workspaceId))) return false;
  const parked = await prisma.autoSlideshowRun.updateMany({
    where: { id: runId, status: { in: ['STEP_3_RUNNING', 'STEP_4_RUNNING'] } },
    data: { status: 'WAITING_AVATAR' },
  });
  if (parked.count === 0) return false;
  const meter: CostMeter = createMeter();
  await prepareCast(run.workspaceId, meter);
  await chargeStep4(runId, meter.summary()).catch(() => undefined);
  // The pick may have landed while the photo was made: the run goes on here unless the pick already took it.
  if (!(await avatarPending(run.workspaceId))) return !(await takeWaiting(runId));
  return true;
};

/** The candidates the owner chooses from: the active cast while the gate is open (at most AVATAR_CHOICES). */
const candidates = (workspaceId: string) =>
  prisma.brandCastMember.findMany({ where: { workspaceId, archivedAt: null }, orderBy: { slot: 'asc' } });

/**
 * The owner's pick: keeps `memberId`, deletes the other candidates with their photos, and releases the run waiting for
 * it. `released`: the runs to go on from step 4 (the caller starts them). A pick already made is kept.
 */
export const confirmAvatar = async (userId: string, workspaceId: string, memberId: string): Promise<{ released: string[] }> => {
  const ws = await requireSlideshowWorkspace(userId, workspaceId);
  const rows = await candidates(ws.id);
  const kept = rows.find((m) => m.id === memberId);
  if (!kept) throw new HttpError(404, 'not_found', 'This avatar is not one of yours.');
  if (kept.status !== 'ready' || !kept.imageKey) throw new HttpError(409, 'not_ready', 'This avatar’s photo is not ready yet.');
  const dropped = rows.filter((m) => m.id !== kept.id);
  if (dropped.length > 0) {
    await prisma.brandCastMember.deleteMany({ where: { id: { in: dropped.map((m) => m.id) } } });
    await dropFiles(dropped);
  }
  await prisma.workspace.update({ where: { id: ws.id }, data: { avatarConfirmedAt: ws.avatarConfirmedAt ?? new Date() } });
  const waiting = await prisma.autoSlideshowRun.findMany({ where: { workspaceId: ws.id, status: 'WAITING_AVATAR' }, select: { id: true } });
  const released: string[] = [];
  for (const run of waiting) if (await takeWaiting(run.id)) released.push(run.id);
  return { released };
};
