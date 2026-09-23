/**
 * Campaigns — create a draft, keep its plan in step with the Template Engine, and schedule it.
 *
 * Phase 1A generates nothing and charges nothing. It books days and records what each one needs.
 * Plan: docs/business-studios/phases/phase-01-campaign-wizard.md
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { isCampaignGoal, type CampaignGoal } from '../../config/contentTemplates';
import { prisma } from '../../lib/db';
import { proposePlan, recordUsage, type PlanSlot, type Platform } from '../automation/matching';
import { HttpError } from '../http';
import { toAssetRequirementDto } from '../templates/dto';
import { listTemplates } from '../templates/repository';
import type { CampaignDto, CampaignPostDto, CampaignRow, PostRow } from './dto';

type Db = PrismaClient | Prisma.TransactionClient;

export const POST_INCLUDE = {
  template: {
    select: { name: true, slug: true, formatSlug: true, recommendedEngine: true, pillar: { select: { name: true } } },
  },
  version: {
    select: { version: true, hookPattern: true, assetRequirements: true },
  },
} satisfies Prisma.CampaignPostInclude;

export const WITH_POSTS = { posts: { include: POST_INCLUDE, orderBy: { position: 'asc' } } } satisfies Prisma.CampaignInclude;

const isoDate = (date: Date): string => date.toISOString().slice(0, 10);

/** Goal, Message, Plan, Cadence, Footage, Generate, Review, Book. */
export const WIZARD_STEPS = 8;

export const toPostDto = (row: PostRow): CampaignPostDto => {
  const assetRequirements = row.version.assetRequirements.map((a) =>
    toAssetRequirementDto(a as Parameters<typeof toAssetRequirementDto>[0]),
  );
  return {
    id: row.id,
    dayIndex: row.dayIndex,
    slotOfDay: row.slotOfDay,
    date: isoDate(row.scheduledFor),
    purpose: row.purpose,
    source: row.source,
    skipped: row.skipped,
    widened: row.widened,
    caption: row.caption,
    templateId: row.templateId,
    templateName: row.template.name,
    templateSlug: row.template.slug,
    versionId: row.versionId,
    version: row.version.version,
    pillarName: row.template.pillar.name,
    formatSlug: row.template.formatSlug,
    hookPattern: row.version.hookPattern,
    recommendedEngine: row.template.recommendedEngine,
    assetRequirements,
    requiredUploads: assetRequirements.filter((a) => a.required && a.fulfilment === 'upload'),
  };
};

export const toCampaignDto = (row: CampaignRow): CampaignDto => {
  const posts = row.posts.map(toPostDto);
  const live = posts.filter((p) => !p.skipped);
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    goal: row.goal,
    productId: row.productId,
    listingId: row.listingId,
    channels: row.channels,
    campaignSubject: row.campaignSubject,
    campaignMessage: row.campaignMessage,
    useBrandSubject: row.useBrandSubject,
    useBrandMessage: row.useBrandMessage,
    promo: row.promo,
    notes: row.notes,
    postsPerDay: row.postsPerDay,
    weeks: row.weeks,
    startDate: isoDate(row.startDate),
    assetMethod: row.assetMethod,
    assetUrl: row.assetUrl,
    status: row.status,
    step: row.step,
    scheduledAt: row.scheduledAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    posts,
    postCount: live.length,
    slotCount: live.length * Math.max(1, row.channels.length),
  };
};

const load = async (db: Db, workspaceId: string, campaignId: string): Promise<CampaignRow> => {
  const row = await db.campaign.findFirst({ where: { id: campaignId, workspaceId }, include: WITH_POSTS });
  if (!row) throw new HttpError(404, 'not_found', 'Campaign not found.');
  return row as CampaignRow;
};

export const getCampaign = async (workspaceId: string, campaignId: string, db: Db = prisma): Promise<CampaignDto> =>
  toCampaignDto(await load(db, workspaceId, campaignId));

export const listCampaigns = async (workspaceId: string, db: Db = prisma): Promise<CampaignDto[]> => {
  const rows = await db.campaign.findMany({
    where: { workspaceId, status: { not: 'archived' } },
    include: WITH_POSTS,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  return (rows as CampaignRow[]).map(toCampaignDto);
};

const asPlatforms = (channels: readonly string[]): Platform[] =>
  channels.filter((c): c is Platform => c === 'tiktok' || c === 'instagram');

/** A campaign's plan is only editable while it is a draft — a scheduled week is a commitment. */
const requireDraft = (row: { status: string }): void => {
  if (row.status !== 'draft') throw new HttpError(409, 'not_draft', 'This campaign is already scheduled.');
};

export type DraftInput = {
  goal: CampaignGoal;
  channels: string[];
  startDate: string;
  productId?: string | null;
  listingId?: string | null;
};

export const createDraft = async (workspaceId: string, input: DraftInput, db: Db = prisma): Promise<CampaignDto> => {
  if (!isCampaignGoal(input.goal)) throw new HttpError(400, 'invalid_goal', 'Pick a goal.');
  const channels = asPlatforms(input.channels);
  if (channels.length === 0) throw new HttpError(400, 'no_channels', 'Pick at least one channel.');

  const created = await db.campaign.create({
    data: {
      workspaceId,
      goal: input.goal,
      channels,
      startDate: new Date(`${input.startDate}T00:00:00.000Z`),
      productId: input.productId ?? null,
      listingId: input.listingId ?? null,
    },
    include: WITH_POSTS,
  });
  return toCampaignDto(created as CampaignRow);
};

export type CampaignPatch = Partial<{
  channels: string[];
  campaignSubject: string | null;
  campaignMessage: string | null;
  useBrandSubject: boolean;
  useBrandMessage: boolean;
  promo: string | null;
  notes: string | null;
  postsPerDay: number;
  weeks: number;
  startDate: string;
  assetMethod: string | null;
  assetUrl: string | null;
  productId: string | null;
  listingId: string | null;
  goal: CampaignGoal;
  step: number;
}>;

/** Cadence and goal decide what the plan should be, so changing them invalidates it. */
const INVALIDATES_PLAN: (keyof CampaignPatch)[] = ['goal', 'channels', 'postsPerDay', 'weeks', 'startDate'];

export const updateDraft = async (
  workspaceId: string,
  campaignId: string,
  patch: CampaignPatch,
  db: Db = prisma,
): Promise<CampaignDto> => {
  const existing = await load(db, workspaceId, campaignId);
  requireDraft(existing);

  const data: Prisma.CampaignUpdateInput = {};
  if (patch.goal) data.goal = patch.goal;
  if (patch.channels) {
    const channels = asPlatforms(patch.channels);
    if (channels.length === 0) throw new HttpError(400, 'no_channels', 'Pick at least one channel.');
    data.channels = channels;
  }
  if (patch.postsPerDay) data.postsPerDay = Math.min(3, Math.max(1, patch.postsPerDay));
  if (patch.weeks) data.weeks = Math.min(4, Math.max(1, patch.weeks));
  if (patch.startDate) data.startDate = new Date(`${patch.startDate}T00:00:00.000Z`);
  if (patch.step) data.step = Math.min(WIZARD_STEPS, Math.max(1, patch.step));
  for (const key of ['campaignSubject', 'campaignMessage', 'promo', 'notes', 'assetMethod', 'assetUrl'] as const) {
    if (patch[key] !== undefined) data[key] = patch[key];
  }
  for (const key of ['useBrandSubject', 'useBrandMessage'] as const) {
    if (patch[key] !== undefined) data[key] = patch[key];
  }
  if (patch.productId !== undefined) data.product = patch.productId ? { connect: { id: patch.productId } } : { disconnect: true };
  if (patch.listingId !== undefined) data.listing = patch.listingId ? { connect: { id: patch.listingId } } : { disconnect: true };

  await db.campaign.update({ where: { id: campaignId }, data });

  const invalidated = INVALIDATES_PLAN.some((key) => patch[key] !== undefined);
  if (invalidated && existing.posts.length > 0) await buildPlan(workspaceId, campaignId, db);

  return getCampaign(workspaceId, campaignId, db);
};

const toPostData = (campaignId: string, slot: PlanSlot, position: number): Prisma.CampaignPostCreateManyInput => ({
  campaignId,
  dayIndex: slot.dayIndex,
  slotOfDay: slot.slotOfDay,
  scheduledFor: new Date(`${slot.date}T00:00:00.000Z`),
  templateId: slot.templateId,
  versionId: slot.versionId,
  purpose: slot.purpose,
  widened: slot.widened,
  position,
});

/**
 * Asks the Template Engine for this campaign's week and replaces the plan with it.
 * Manual swaps are discarded — the caller confirms that before calling.
 */
export const buildPlan = async (workspaceId: string, campaignId: string, db: Db = prisma): Promise<CampaignDto> => {
  const campaign = await load(db, workspaceId, campaignId);
  requireDraft(campaign);

  const plan = await proposePlan(
    {
      workspaceId,
      goal: campaign.goal,
      channels: asPlatforms(campaign.channels),
      weeks: Math.min(4, Math.max(1, campaign.weeks)) as 1 | 2 | 3 | 4,
      postsPerDay: Math.min(3, Math.max(1, campaign.postsPerDay)) as 1 | 2 | 3,
      startDate: isoDate(campaign.startDate),
    },
    db as PrismaClient,
  );

  await db.campaignPost.deleteMany({ where: { campaignId } });
  await db.campaignPost.createMany({ data: plan.map((slot, i) => toPostData(campaignId, slot, i)) });

  return getCampaign(workspaceId, campaignId, db);
};

/**
 * The templates that may replace this day's. Same purpose slot, same channels, same audience —
 * never a free pillar × format cross, because only real templates exist.
 */
export const swapCandidates = async (workspaceId: string, campaignId: string, postId: string, db: Db = prisma) => {
  const campaign = await load(db, workspaceId, campaignId);
  const post = campaign.posts.find((p) => p.id === postId);
  if (!post) throw new HttpError(404, 'not_found', 'Post not found.');

  const workspace = await db.workspace.findUnique({ where: { id: workspaceId }, select: { audienceType: true } });
  const channels = asPlatforms(campaign.channels);
  const used = new Set(campaign.posts.filter((p) => p.id !== postId).map((p) => p.templateId));

  const templates = await listTemplates({ workspaceId, status: 'active' }, db as PrismaClient);
  return templates.filter(
    (t) =>
      !used.has(t.id) &&
      t.platforms.some((p) => channels.includes(p as Platform)) &&
      (t.audience === 'both' || !workspace?.audienceType || workspace.audienceType === 'both' || t.audience === workspace.audienceType) &&
      (t.primaryPurpose === post.purpose || t.purposes.includes(post.purpose)),
  );
};

export const swapTemplate = async (
  workspaceId: string,
  campaignId: string,
  postId: string,
  templateId: string,
  db: Db = prisma,
): Promise<CampaignDto> => {
  const campaign = await load(db, workspaceId, campaignId);
  requireDraft(campaign);

  const candidates = await swapCandidates(workspaceId, campaignId, postId, db);
  const chosen = candidates.find((t) => t.id === templateId);
  if (!chosen) throw new HttpError(400, 'invalid_template', 'That template does not fit this day.');

  await db.campaignPost.update({
    where: { id: postId },
    data: { templateId: chosen.id, versionId: chosen.versionId, widened: false },
  });
  return getCampaign(workspaceId, campaignId, db);
};

export const setPostFlags = async (
  workspaceId: string,
  campaignId: string,
  postId: string,
  flags: { skipped?: boolean; source?: 'real' | 'mix' | 'generated'; caption?: string | null },
  db: Db = prisma,
): Promise<CampaignDto> => {
  const campaign = await load(db, workspaceId, campaignId);
  requireDraft(campaign);
  if (!campaign.posts.some((p) => p.id === postId)) throw new HttpError(404, 'not_found', 'Post not found.');

  await db.campaignPost.update({ where: { id: postId }, data: flags });
  return getCampaign(workspaceId, campaignId, db);
};

export const archiveCampaign = async (workspaceId: string, campaignId: string, db: Db = prisma): Promise<void> => {
  await load(db, workspaceId, campaignId);
  await db.campaign.update({ where: { id: campaignId }, data: { status: 'archived' } });
};

export { recordUsage };
