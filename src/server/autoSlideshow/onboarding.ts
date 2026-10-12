// server-only — never import from a 'use client' file.
// Slideshow workspace onboarding answers (src/types/admin/onboarding.ts). Stats only: generation never reads them.

import type { OnboardingProfile } from '@prisma/client';
import { prisma } from '../../lib/db';
import {
  isGoalKey, isMonthlySpend, isPainKey, isPostingMode, DEFAULT_POSTING_MODE, LAST_COUNTED_STEP, ONBOARDING_LAST_STEP, OTHER_TEXT_MAX,
  FIRST_COUNTED_STEP, type GoalKey, type MonthlySpend, type OnboardingProfileDto, type PainKey,
} from '../../types/admin/onboarding';
import { HttpError } from '../http';
import { requireSlideshowWorkspace } from './workspaces';

const toDto = (row: OnboardingProfile): OnboardingProfileDto => ({
  goals: row.goals.filter(isGoalKey),
  goalsOther: row.goalsOther,
  pains: row.pains.filter(isPainKey),
  painsOther: row.painsOther,
  postingMode: isPostingMode(row.postingMode) ? row.postingMode : DEFAULT_POSTING_MODE,
  monthlySpend: isMonthlySpend(row.monthlySpend) ? row.monthlySpend : null,
  lastStep: row.lastStep,
  skippedSteps: row.skippedSteps,
  completedAt: row.completedAt?.toISOString() ?? null,
});

/** True while the workspace's first (and only) pipeline run is still building: the moment the flow is for. */
const firstRunBuilding = async (workspaceId: string): Promise<boolean> => {
  const runs = await prisma.autoSlideshowRun.findMany({ where: { workspaceId, kind: 'auto', ideaForRunId: null }, select: { status: true }, take: 2 });
  return runs.length === 1 && runs[0]!.status !== 'COMPLETED' && runs[0]!.status !== 'FAILED';
};

/**
 * The workspace's answers. The row is made the first time the flow opens on the first run, so a reload or a later
 * visit resumes it. Null: this workspace does not get the flow (older workspaces, later runs).
 */
export const getOnboarding = async (userId: string, workspaceId: string): Promise<OnboardingProfileDto | null> => {
  await requireSlideshowWorkspace(userId, workspaceId);
  const row = await prisma.onboardingProfile.findUnique({ where: { workspaceId } });
  if (row) return toDto(row);
  if (!(await firstRunBuilding(workspaceId))) return null;
  return toDto(await prisma.onboardingProfile.upsert({ where: { workspaceId }, create: { workspaceId }, update: {} }));
};

const bad = (field: string) => new HttpError(400, 'invalid_onboarding', `Invalid ${field}.`);

const keyList = <K extends string>(v: unknown, isKey: (x: unknown) => x is K, field: string): K[] => {
  if (!Array.isArray(v) || !v.every(isKey)) throw bad(field);
  return [...new Set(v)];
};

/** Whitespace-only text is saved as null. */
const otherText = (v: unknown, field: string): string | null => {
  if (v === null) return null;
  if (typeof v !== 'string' || v.length > OTHER_TEXT_MAX * 2) throw bad(field);
  const text = v.trim().slice(0, OTHER_TEXT_MAX);
  return text || null;
};

const stepIn = (v: unknown, min: number, max: number, field: string): number => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw bad(field);
  return v;
};

type ProfileData = {
  goals?: GoalKey[]; goalsOther?: string | null; pains?: PainKey[]; painsOther?: string | null;
  postingMode?: string; monthlySpend?: MonthlySpend | null; lastStep?: number;
};

/** Checks a PATCH body; unknown option keys are rejected, unknown fields ignored. */
const parsePatch = (body: Record<string, unknown>): { data: ProfileData; skippedStep: number | null } => {
  const data: ProfileData = {};
  if ('goals' in body) data.goals = keyList(body.goals, isGoalKey, 'goals');
  if ('goalsOther' in body) data.goalsOther = otherText(body.goalsOther, 'goalsOther');
  if ('pains' in body) data.pains = keyList(body.pains, isPainKey, 'pains');
  if ('painsOther' in body) data.painsOther = otherText(body.painsOther, 'painsOther');
  if ('postingMode' in body) {
    if (!isPostingMode(body.postingMode)) throw bad('postingMode');
    data.postingMode = body.postingMode;
  }
  if ('monthlySpend' in body) {
    if (body.monthlySpend !== null && !isMonthlySpend(body.monthlySpend)) throw bad('monthlySpend');
    data.monthlySpend = body.monthlySpend;
  }
  if ('lastStep' in body) data.lastStep = stepIn(body.lastStep, 0, ONBOARDING_LAST_STEP, 'lastStep');
  const skippedStep = 'skippedStep' in body ? stepIn(body.skippedStep, FIRST_COUNTED_STEP, LAST_COUNTED_STEP, 'skippedStep') : null;
  return { data, skippedStep };
};

const requireRow = async (userId: string, workspaceId: string): Promise<OnboardingProfile> => {
  await requireSlideshowWorkspace(userId, workspaceId);
  const row = await prisma.onboardingProfile.findUnique({ where: { workspaceId } });
  if (!row) throw new HttpError(404, 'onboarding_not_found', 'No onboarding for this workspace.');
  return row;
};

const withSkipped = (current: number[], add: number[]): number[] => [...new Set([...current, ...add])].sort((a, b) => a - b);

/** Saves one Continue or Skip. A finished flow stays finished. */
export const patchOnboarding = async (userId: string, workspaceId: string, body: Record<string, unknown>): Promise<OnboardingProfileDto> => {
  const row = await requireRow(userId, workspaceId);
  const { data, skippedStep } = parsePatch(body);
  const skippedSteps = skippedStep === null ? undefined : withSkipped(row.skippedSteps, [skippedStep]);
  return toDto(await prisma.onboardingProfile.update({ where: { workspaceId }, data: { ...data, ...(skippedSteps ? { skippedSteps } : {}) } }));
};

/** Ends the flow. Idempotent: the first completion time is kept. `skippedSteps`: steps passed over by "Jump to my calendar". */
export const completeOnboarding = async (userId: string, workspaceId: string, body: Record<string, unknown>): Promise<OnboardingProfileDto> => {
  const row = await requireRow(userId, workspaceId);
  if (row.completedAt) return toDto(row);
  const raw = Array.isArray(body.skippedSteps) ? body.skippedSteps : [];
  const skipped = raw.map((s) => stepIn(s, FIRST_COUNTED_STEP, LAST_COUNTED_STEP, 'skippedSteps'));
  const lastStep = 'lastStep' in body ? stepIn(body.lastStep, 0, ONBOARDING_LAST_STEP, 'lastStep') : ONBOARDING_LAST_STEP;
  return toDto(await prisma.onboardingProfile.update({ where: { workspaceId }, data: { completedAt: new Date(), lastStep, skippedSteps: withSkipped(row.skippedSteps, skipped) } }));
};
