// server-only. Never import from a 'use client' file.
/**
 * Brand Blueprint storage. Every query is scoped by its owner: a workspace id, or null for the admin's own blueprint
 * (Admin › Jun Yuh › My Blueprint). One active blueprint per owner, enforced here (get-or-create).
 * Writes check `version` so two open tabs never overwrite each other silently.
 */
import type { BrandBlueprint, Prisma } from '@prisma/client';
import {
  aboutSchema,
  applyDayPatch,
  defaultPlan,
  EMPTY_ABOUT,
  emptyTopics,
  planSchema,
  topicsSchema,
  type BlueprintDto,
  type BlueprintPatch,
  type PlanDay,
} from '../../lib/blueprint/schema';
import type { Script } from '../../lib/scriptGenerator/types';
import { prisma } from '../../lib/db';
import { HttpError } from '../http';

/** A workspace id, or null for the admin's own blueprint. */
export type BlueprintOwner = string | null;

const parseOr = <T>(schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } }, value: unknown, fallback: T): T => {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
};

export const toBlueprintDto = (row: BrandBlueprint): BlueprintDto => ({
  id: row.id,
  topics: parseOr(topicsSchema, row.topics, emptyTopics()),
  about: parseOr(aboutSchema, row.about, EMPTY_ABOUT),
  plan: parseOr(planSchema, row.plan, defaultPlan()),
  step: row.step,
  version: row.version,
  updatedAt: row.updatedAt.toISOString(),
});

const findActive = (workspaceId: BlueprintOwner) =>
  prisma.brandBlueprint.findFirst({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });

/** The owner's blueprint, created on first visit. A lock per owner stops two first visits making two rows. */
export const getOrCreateBlueprint = async (workspaceId: BlueprintOwner, userId: string | null): Promise<BlueprintDto> => {
  const existing = await findActive(workspaceId);
  if (existing) return toBlueprintDto(existing);
  const row = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`brand_blueprint:${workspaceId ?? 'admin'}`}))`;
    const raced = await tx.brandBlueprint.findFirst({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
    if (raced) return raced;
    return tx.brandBlueprint.create({
      data: { workspaceId, createdBy: userId, topics: emptyTopics(), about: EMPTY_ABOUT, plan: defaultPlan() as Prisma.InputJsonValue },
    });
  });
  return toBlueprintDto(row);
};

/** The blueprint or a 404. Used by the script routes, which never create one. */
export const requireBlueprint = async (workspaceId: BlueprintOwner): Promise<BlueprintDto> => {
  const row = await findActive(workspaceId);
  if (!row) throw new HttpError(404, 'blueprint_not_found', 'Open the Blueprint page first.');
  return toBlueprintDto(row);
};

const conflict = async (workspaceId: BlueprintOwner): Promise<never> => {
  const current = await requireBlueprint(workspaceId);
  throw new HttpError(409, 'version_conflict', 'This blueprint changed in another tab. We loaded the latest version.', { blueprint: current });
};

/** Writes `data` only if the stored version is still `version`. Bumps the version. */
const writeIfVersion = async (workspaceId: BlueprintOwner, id: string, version: number, data: Prisma.BrandBlueprintUpdateManyMutationInput) => {
  const { count } = await prisma.brandBlueprint.updateMany({
    where: { id, workspaceId, version },
    data: { ...data, version: { increment: 1 }, updatedAt: new Date() },
  });
  if (count === 0) await conflict(workspaceId);
  return requireBlueprint(workspaceId);
};

const mergeDays = (plan: PlanDay[], days: NonNullable<BlueprintPatch['days']>): PlanDay[] =>
  plan.map((day, i) => {
    const patch = days[String(i)];
    return patch ? applyDayPatch(day, patch) : day;
  });

export const patchBlueprint = async (workspaceId: BlueprintOwner, patch: BlueprintPatch): Promise<BlueprintDto> => {
  const current = await requireBlueprint(workspaceId);
  if (current.version !== patch.version) await conflict(workspaceId);
  if (patch.reset) {
    // Topics and the About card are kept: a reset only starts a fresh week.
    return writeIfVersion(workspaceId, current.id, patch.version, { plan: defaultPlan() as Prisma.InputJsonValue, step: 4 });
  }
  const data: Prisma.BrandBlueprintUpdateManyMutationInput = {};
  if (patch.topics) data.topics = patch.topics;
  if (patch.about) data.about = patch.about;
  if (patch.step !== undefined) data.step = patch.step;
  if (patch.days) data.plan = planSchema.parse(mergeDays(current.plan, patch.days)) as Prisma.InputJsonValue;
  return writeIfVersion(workspaceId, current.id, patch.version, data);
};

/**
 * Saves a generated script on one day. No version check from the client: generation takes up to a minute and the user
 * keeps typing meanwhile, so this re-reads and retries on a race instead of refusing.
 */
export const saveDayScript = async (workspaceId: BlueprintOwner, dayIndex: number, script: Script): Promise<BlueprintDto> => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await requireBlueprint(workspaceId);
    const plan = current.plan.map((day, i) => (i === dayIndex ? { ...day, script, checks: [false, false, false] as PlanDay['checks'] } : day));
    const { count } = await prisma.brandBlueprint.updateMany({
      where: { id: current.id, workspaceId, version: current.version },
      data: { plan: plan as Prisma.InputJsonValue, version: { increment: 1 }, updatedAt: new Date() },
    });
    if (count === 1) return requireBlueprint(workspaceId);
  }
  throw new HttpError(409, 'version_conflict', 'The blueprint kept changing while saving. Try again.');
};
