// server-only — never import from a 'use client' file.
// The workspace's target client (src/types/admin/targetClient.ts): picked on the first onboarding screen, editable on the
// Brand page. A new workspace's first run (waitForTarget) stops after step 3 until it is picked, so no Brand Cast face
// and no slideshow is made for the wrong people. The pick also sets the Visual Bible's age range.

import type { Workspace } from '@prisma/client';
import { prisma } from '../../lib/db';
import {
  isTargetAge, isTargetGender, TARGET_BIBLE_AGES, type TargetAge, type TargetClientDto, type TargetGender,
} from '../../types/admin/targetClient';
import { HttpError } from '../http';
import { getVisualBible, saveVisualBible } from '../shorts/visualBible';
import { onboardingOpen } from './onboarding';
import { requireSlideshowWorkspace } from './workspaces';

export type TargetClient = { age: TargetAge; gender: TargetGender };

type TargetRow = Pick<Workspace, 'targetAge' | 'targetGender' | 'targetConfirmedAt'>;

const pickOf = (row: TargetRow): TargetClient | null =>
  isTargetAge(row.targetAge) && isTargetGender(row.targetGender) ? { age: row.targetAge, gender: row.targetGender } : null;

/** The owner's pick, for the cast writer. Null when not picked. */
export const targetOf = async (workspaceId: string): Promise<TargetClient | null> => {
  const row = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { targetAge: true, targetGender: true, targetConfirmedAt: true } });
  return row ? pickOf(row) : null;
};

/** True while the owner has not picked yet. */
const targetPending = async (workspaceId: string): Promise<boolean> =>
  (await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { targetConfirmedAt: true } }))?.targetConfirmedAt == null;

/** True when the run must not make the Brand Cast yet. */
export const castWaitsForTarget = async (runId: string): Promise<boolean> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { waitForTarget: true, workspaceId: true } });
  return Boolean(run?.waitForTarget && run.workspaceId && (await targetPending(run.workspaceId)));
};

/** Moves a waiting run on to step 4. Exactly one caller wins: the one that does runs the steps. */
const takeWaiting = async (runId: string): Promise<boolean> =>
  (await prisma.autoSlideshowRun.updateMany({ where: { id: runId, status: 'WAITING_TARGET' }, data: { status: 'STEP_4_RUNNING' } })).count === 1;

/** After step 3: stops the run (status 'WAITING_TARGET') when the owner has not picked yet. True when stopped. */
export const holdForTarget = async (runId: string): Promise<boolean> => {
  if (!(await castWaitsForTarget(runId))) return false;
  const run = await prisma.autoSlideshowRun.findUniqueOrThrow({ where: { id: runId }, select: { workspaceId: true } });
  const held = await prisma.autoSlideshowRun.updateMany({ where: { id: runId, status: 'STEP_3_RUNNING' }, data: { status: 'WAITING_TARGET' } });
  if (held.count === 0) return false;
  // The pick may have landed between the check and the hold: the run goes on here unless the pick already took it.
  if (!(await targetPending(run.workspaceId!))) return !(await takeWaiting(runId));
  return true;
};

const toDto = async (workspaceId: string, row: TargetRow): Promise<TargetClientDto> => {
  const [bible, inOnboarding] = await Promise.all([
    getVisualBible(workspaceId).catch(() => null),
    row.targetConfirmedAt ? false : onboardingOpen(workspaceId).catch(() => false),
  ]);
  const range = bible?.bible?.person_age_range?.trim() ?? '';
  return {
    age: isTargetAge(row.targetAge) ? row.targetAge : null,
    gender: isTargetGender(row.targetGender) ? row.targetGender : null,
    confirmedAt: row.targetConfirmedAt?.toISOString() ?? null,
    detectedRange: range && !/^none$/i.test(range) ? range : null,
    inOnboarding,
  };
};

export const getTargetClient = async (userId: string, workspaceId: string): Promise<TargetClientDto> =>
  toDto(workspaceId, await requireSlideshowWorkspace(userId, workspaceId));

/** Writes the pick into the Visual Bible's age range (when the brand has one; a bible made later reads it itself). */
const syncBible = async (workspaceId: string, age: TargetAge) => {
  const current = await getVisualBible(workspaceId).catch(() => null);
  if (!current?.bible || current.bible.person_age_range === TARGET_BIBLE_AGES[age]) return;
  await saveVisualBible(workspaceId, { person_age_range: TARGET_BIBLE_AGES[age] }).catch(() => undefined);
};

/**
 * Saves the pick ({ age, gender }) and releases the workspace's run waiting for it. `released`: the runs to go on from
 * step 4 (the caller starts them). The first pick time is kept.
 */
export const saveTargetClient = async (userId: string, workspaceId: string, body: Record<string, unknown>): Promise<{ target: TargetClientDto; released: string[] }> => {
  const ws = await requireSlideshowWorkspace(userId, workspaceId);
  if (!isTargetAge(body.age)) throw new HttpError(400, 'invalid_target', 'Pick an age range.');
  if (!isTargetGender(body.gender)) throw new HttpError(400, 'invalid_target', 'Pick women, men or both.');
  const row = await prisma.workspace.update({
    where: { id: ws.id },
    data: { targetAge: body.age, targetGender: body.gender, targetConfirmedAt: ws.targetConfirmedAt ?? new Date() },
    select: { targetAge: true, targetGender: true, targetConfirmedAt: true },
  });
  await syncBible(ws.id, body.age);
  const waiting = await prisma.autoSlideshowRun.findMany({ where: { workspaceId: ws.id, status: 'WAITING_TARGET' }, select: { id: true } });
  const released: string[] = [];
  for (const run of waiting) if (await takeWaiting(run.id)) released.push(run.id);
  return { target: await toDto(ws.id, row), released };
};

/** A user's new run waits for the pick when it is the workspace's first and nothing was picked yet. */
export const runWaitsForTarget = async (workspaceId: string): Promise<boolean> => {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { targetConfirmedAt: true } });
  if (!ws || ws.targetConfirmedAt) return false;
  return (await prisma.autoSlideshowRun.count({ where: { workspaceId, kind: 'auto', ideaForRunId: null } })) === 0;
};
