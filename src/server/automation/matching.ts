/**
 * Phase 0B — the matching engine.
 *
 * Turns (workspace, goal, channels) into a dated plan of real templates, with no human picking
 * any of them. Phase 1's wizard calls this once per campaign; it holds no UI concerns and no
 * hardcoded weekly rhythm of its own, so any future surface can reuse it.
 *
 * Plan: docs/business-studios/phases/phase-0b-template-engine.md
 */
import type { AssetKind, AudienceType, ContentPurpose, PrismaClient } from '@prisma/client';
import {
  RHYTHM_DAYS,
  ROTATION_WINDOW_DAYS,
  SLOTS_BY_POSTS_PER_DAY,
  WEEKLY_RHYTHMS,
  type CampaignGoal,
} from '../../config/contentTemplates';
import { prisma } from '../../lib/db';
import type { AssetRequirementDto, TemplateDto } from '../templates/dto';
import { listTemplates } from '../templates/repository';

export type Platform = 'tiktok' | 'instagram';
export type SlotOfDay = 'morning' | 'midday' | 'evening';

export type ProposeInput = {
  workspaceId: string;
  goal: CampaignGoal;
  channels: readonly Platform[];
  weeks?: 1 | 2 | 3 | 4;
  postsPerDay?: 1 | 2 | 3;
  /** ISO date (YYYY-MM-DD). Day 1 of the plan. */
  startDate: string;
  /**
   * Asset kinds this business cannot supply. Templates that require one are skipped.
   * Empty by default — Phase 0B has no asset inventory to read, so callers that know pass it in.
   */
  unavailableAssets?: readonly AssetKind[];
};

export type PlanSlot = {
  /** 0-based day offset from the start date. */
  dayIndex: number;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  slotOfDay: SlotOfDay;
  purpose: ContentPurpose;
  /**
   * Every channel this piece goes to. One campaign post is the same content on each channel, so
   * this is the campaign's channel list, not one channel per day. Phase 1 writes one PostSlot row
   * per channel, because posting can succeed on one and fail on the other.
   */
  platforms: Platform[];
  templateId: string;
  templateSlug: string;
  templateName: string;
  versionId: string;
  version: number;
  pillarName: string;
  hookPattern: string;
  assetRequirements: AssetRequirementDto[];
  requiredUploads: AssetRequirementDto[];
  /** True when no template matched the slot's purpose and the filters had to be relaxed. */
  widened: boolean;
};

type Db = Pick<PrismaClient, 'contentTemplate' | 'templateUsage' | 'workspace'>;

const MS_PER_DAY = 86_400_000;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

const addDays = (iso: string, days: number): string => isoDate(new Date(Date.parse(`${iso}T00:00:00.000Z`) + days * MS_PER_DAY));

const audienceMatches = (template: TemplateDto, audience: AudienceType | null): boolean =>
  template.audience === 'both' || audience === null || audience === 'both' || template.audience === audience;

const servesPurpose = (template: TemplateDto, purpose: ContentPurpose): boolean =>
  template.primaryPurpose === purpose || template.purposes.includes(purpose);

const needsMissingAsset = (template: TemplateDto, unavailable: readonly AssetKind[]): boolean =>
  template.assetRequirements.some((a) => a.required && unavailable.includes(a.kind));

/**
 * Ranking, best first. Deliberately total and deterministic: the same input must always produce
 * the same plan, or "regenerate" would churn for no reason.
 */
const rank = (a: TemplateDto, b: TemplateDto, purpose: ContentPurpose, recent: ReadonlySet<string>): number => {
  const score = (t: TemplateDto): number =>
    (t.workspaceId ? 0 : 1) + (t.primaryPurpose === purpose ? 0 : 2) + (recent.has(t.id) ? 4 : 0);
  const diff = score(a) - score(b);
  return diff !== 0 ? diff : a.slug.localeCompare(b.slug);
};

type Pool = {
  templates: readonly TemplateDto[];
  audience: AudienceType | null;
  unavailable: readonly AssetKind[];
  recent: ReadonlySet<string>;
};

/**
 * Picks one template for a slot.
 *
 * Filters relax in a fixed order rather than ever returning an empty slot. Variety is given up
 * last: a week that bends one day's purpose reads better than a week that runs the same idea
 * three times, which is what a `sell` rhythm asking for three conversion slots produces when a
 * business has only one conversion template. Anything relaxed is flagged `widened`.
 */
const pickForSlot = (
  pool: Pool,
  purpose: ContentPurpose,
  channels: readonly Platform[],
  usedInPlan: ReadonlySet<string>,
): { template: TemplateDto; widened: boolean } | null => {
  const base = pool.templates.filter(
    (t) =>
      t.status === 'active' &&
      t.platforms.some((p) => channels.includes(p as Platform)) &&
      !needsMissingAsset(t, pool.unavailable),
  );

  const fits = base.filter((t) => audienceMatches(t, pool.audience));
  const tiers: { list: TemplateDto[]; widened: boolean }[] = [
    // The slot's purpose, not yet used this plan — what we want every time.
    { list: fits.filter((t) => servesPurpose(t, purpose) && !usedInPlan.has(t.id)), widened: false },
    // Still fresh, but serving a different purpose.
    { list: fits.filter((t) => !usedInPlan.has(t.id)), widened: true },
    // Out of fresh templates: repeat, but at least keep the purpose right.
    { list: fits.filter((t) => servesPurpose(t, purpose)), widened: true },
    { list: fits, widened: true },
    { list: base, widened: true },
  ];

  for (const tier of tiers) {
    if (tier.list.length === 0) continue;
    const best = tier.list.slice().sort((a, b) => rank(a, b, purpose, pool.recent))[0]!;
    return { template: best, widened: tier.widened };
  }
  return null;
};

/** Templates this workspace was already given inside the rotation window. */
const recentlyUsed = async (db: Db, workspaceId: string, startDate: string): Promise<Set<string>> => {
  const since = new Date(Date.parse(`${startDate}T00:00:00.000Z`) - ROTATION_WINDOW_DAYS * MS_PER_DAY);
  const rows = await db.templateUsage.findMany({
    where: { workspaceId, plannedFor: { gte: since } },
    select: { templateId: true },
  });
  return new Set(rows.map((r) => r.templateId));
};

const toSlot = (
  pick: { template: TemplateDto; widened: boolean },
  meta: { dayIndex: number; date: string; slotOfDay: SlotOfDay; purpose: ContentPurpose; platforms: Platform[] },
): PlanSlot => ({
  ...meta,
  templateId: pick.template.id,
  templateSlug: pick.template.slug,
  templateName: pick.template.name,
  versionId: pick.template.versionId,
  version: pick.template.version,
  pillarName: pick.template.pillarName,
  hookPattern: pick.template.hookPattern,
  assetRequirements: pick.template.assetRequirements,
  requiredUploads: pick.template.requiredUploads,
  widened: pick.widened,
});

/**
 * The 7-slot-per-week plan. Nothing is written — recording what was proposed is
 * `recordUsage`'s job, so a caller can preview a plan without burning the rotation.
 */
export const proposePlan = async (input: ProposeInput, db: Db = prisma): Promise<PlanSlot[]> => {
  const channels = input.channels.length > 0 ? input.channels : (['tiktok'] as const);
  const weeks = input.weeks ?? 1;
  const postsPerDay = input.postsPerDay ?? 1;

  const workspace = await db.workspace.findUnique({
    where: { id: input.workspaceId },
    select: { audienceType: true },
  });

  const pool: Pool = {
    templates: await listTemplates({ workspaceId: input.workspaceId, status: 'active' }, db),
    audience: workspace?.audienceType ?? null,
    unavailable: input.unavailableAssets ?? [],
    recent: await recentlyUsed(db, input.workspaceId, input.startDate),
  };

  const rhythm = WEEKLY_RHYTHMS[input.goal];
  const slotsOfDay = SLOTS_BY_POSTS_PER_DAY[postsPerDay];
  const usedInPlan = new Set<string>();
  const plan: PlanSlot[] = [];

  for (let dayIndex = 0; dayIndex < weeks * RHYTHM_DAYS; dayIndex += 1) {
    const purpose = rhythm[dayIndex % RHYTHM_DAYS]!;
    const date = addDays(input.startDate, dayIndex);

    for (const slotOfDay of slotsOfDay) {
      const pick = pickForSlot(pool, purpose, channels, usedInPlan);
      if (!pick) continue;
      usedInPlan.add(pick.template.id);
      // The piece goes to every channel the template supports, not one channel per day.
      const platforms = channels.filter((c) => pick.template.platforms.includes(c));
      plan.push({ ...toSlot(pick, { dayIndex, date, slotOfDay, purpose, platforms }) });
    }
  }

  return plan;
};

/**
 * Writes what was proposed, so the next campaign rotates away from it. Phase 1 calls this when a
 * plan is accepted — never at preview time, or regenerating would poison its own rotation.
 */
/** Only the fields a usage row needs, so a caller can pass a trimmed plan. */
export type UsageEntry = Pick<PlanSlot, 'templateId' | 'versionId' | 'purpose' | 'date'>;

export const recordUsage = async (
  workspaceId: string,
  plan: readonly UsageEntry[],
  campaignId: string | null = null,
  db: Db = prisma,
): Promise<number> => {
  if (plan.length === 0) return 0;
  const result = await db.templateUsage.createMany({
    data: plan.map((slot) => ({
      workspaceId,
      templateId: slot.templateId,
      versionId: slot.versionId,
      purpose: slot.purpose,
      plannedFor: new Date(`${slot.date}T00:00:00.000Z`),
      campaignId,
    })),
  });
  return result.count;
};
