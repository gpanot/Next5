/**
 * Turning an approved plan into calendar days.
 *
 * One `CampaignPost` becomes one `PostSlot` per channel: posting can succeed on Instagram and fail
 * on TikTok, and `SocialPost` records the result per slot, so each channel needs its own row.
 */
import type { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../../lib/db';
import { recordUsage } from '../automation/matching';
import { HttpError } from '../http';
import { getOrCreateSchedule } from '../calendar/calendar';
import { toCampaignDto, WITH_POSTS, type CampaignPatch } from './campaigns';
import type { CampaignDto, CampaignRow } from './dto';

type Db = PrismaClient | Prisma.TransactionClient;

export type AssetGap = {
  postId: string;
  date: string;
  templateName: string;
  /** Only what she must supply herself. `generate` and `library` kinds never block. */
  missing: { kind: string; label: string }[];
};

/**
 * What still has to come from her before this campaign can be scheduled.
 *
 * Phase 1A has no per-day asset inventory, so a required upload counts as unmet unless the
 * campaign carries a blanket asset method. This is deliberately conservative: it is better to
 * ask for footage she already has than to schedule a day she cannot fill.
 */
export const assetGaps = (campaign: CampaignDto): AssetGap[] => {
  if (campaign.assetMethod && campaign.assetMethod !== 'none') return [];
  return campaign.posts
    .filter((p) => !p.skipped && p.requiredUploads.length > 0)
    .map((p) => ({
      postId: p.id,
      date: p.date,
      templateName: p.templateName,
      missing: p.requiredUploads.map((a) => ({ kind: a.kind, label: a.label })),
    }));
};

const slotRows = (campaign: CampaignDto, workspaceId: string, scheduleId: string): Prisma.PostSlotCreateManyInput[] =>
  campaign.posts
    .filter((p) => !p.skipped)
    .flatMap((post) =>
      campaign.channels.map((platform) => ({
        workspaceId,
        scheduleId,
        campaignPostId: post.id,
        scheduledFor: new Date(`${post.date}T00:00:00.000Z`),
        slotOfDay: post.slotOfDay,
        platform,
        status: 'planned',
        source: 'campaign',
        captionOverride: post.caption,
      })),
    );

/**
 * Books the campaign. Writes one slot per post per channel, records what the Template Engine
 * proposed so the next campaign rotates away from it, and marks the campaign scheduled.
 *
 * `recordUsage` runs here and nowhere else: recording at preview time would make "regenerate"
 * rotate away from its own suggestions.
 */
export const scheduleCampaign = async (
  workspaceId: string,
  campaignId: string,
  db: Db = prisma,
): Promise<CampaignDto> => {
  const row = (await db.campaign.findFirst({
    where: { id: campaignId, workspaceId },
    include: WITH_POSTS,
  })) as CampaignRow | null;
  if (!row) throw new HttpError(404, 'not_found', 'Campaign not found.');
  if (row.status === 'scheduled') throw new HttpError(409, 'already_scheduled', 'This campaign is already scheduled.');

  const campaign = toCampaignDto(row);
  if (campaign.postCount === 0) throw new HttpError(400, 'empty_plan', 'This campaign has no posts to schedule.');

  const workspace = await db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const schedule = await getOrCreateSchedule(workspace);

  await db.postSlot.createMany({ data: slotRows(campaign, workspaceId, schedule.id) });
  await recordUsage(
    workspaceId,
    campaign.posts
      .filter((p) => !p.skipped)
      .map((p) => ({ templateId: p.templateId, versionId: p.versionId, purpose: p.purpose, date: p.date })),
    campaignId,
    db as PrismaClient,
  );
  await db.campaign.update({
    where: { id: campaignId },
    data: { status: 'scheduled', scheduledAt: new Date(), step: 6 },
  });

  return toCampaignDto(
    (await db.campaign.findUniqueOrThrow({ where: { id: campaignId }, include: WITH_POSTS })) as CampaignRow,
  );
};

/** Unbooks a scheduled campaign: deletes its calendar slots and returns it to draft. */
export const unscheduleCampaign = async (workspaceId: string, campaignId: string, db: Db = prisma): Promise<void> => {
  const campaign = await db.campaign.findFirst({ where: { id: campaignId, workspaceId }, select: { id: true } });
  if (!campaign) throw new HttpError(404, 'not_found', 'Campaign not found.');

  const posted = await db.postSlot.count({ where: { campaignPost: { campaignId }, status: 'posted' } });
  if (posted > 0) throw new HttpError(409, 'already_posted', 'Some of this campaign is already posted.');

  await db.postSlot.deleteMany({ where: { campaignPost: { campaignId } } });
  await db.campaign.update({ where: { id: campaignId }, data: { status: 'draft', scheduledAt: null } });
};

export type { CampaignPatch };
