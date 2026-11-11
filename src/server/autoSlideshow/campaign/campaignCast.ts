// server-only — never import from a 'use client' file.
// A Hooks Volume campaign's avatar: one Brand Cast member shown on all its AI photos (content slides and CTA), so the
// slides look like one story. Hook photos stay stock. Each campaign takes the member the fewest other campaigns of the
// workspace use, so the faces rotate across campaigns. Picked on the first AI photo and kept on the campaign.

import { prisma } from '../../../lib/db';
import { castLook, type CastFace } from '../ctaPhoto';
import { CAMPAIGN_KIND, castIdOf } from './store';

type Member = { id: string; look: string; image_key: string };

const readyCast = (workspaceId: string) =>
  prisma.$queryRaw<Member[]>`
    SELECT id, look, image_key FROM brand_cast_members
    WHERE workspace_id = ${workspaceId} AND archived_at IS NULL AND status = 'ready' AND image_key IS NOT NULL
    ORDER BY slot ASC`;

/** The member the fewest other campaigns show (ties: the first slot). The same answer for photos made at once. */
const leastUsed = async (workspaceId: string, runId: string, members: Member[]): Promise<Member> => {
  const others = await prisma.autoSlideshowRun.findMany({ where: { workspaceId, kind: CAMPAIGN_KIND, id: { not: runId } }, select: { campaign: true } });
  const uses = new Map<string, number>();
  for (const run of others) {
    const id = castIdOf(run);
    if (id) uses.set(id, (uses.get(id) ?? 0) + 1);
  }
  return members.reduce((best, m) => ((uses.get(m.id) ?? 0) < (uses.get(best.id) ?? 0) ? m : best));
};

/** Keeps `id` as the campaign's avatar, unless another photo stored one meanwhile; returns the one kept. */
const keepCast = async (runId: string, id: string, before: string | null): Promise<string> => {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    UPDATE public.auto_slideshow_runs
    SET campaign = jsonb_set(COALESCE(campaign, '{}'::jsonb), '{castId}', to_jsonb(${id}::text))
    WHERE id = ${runId} AND (campaign->>'castId') IS NOT DISTINCT FROM ${before}
    RETURNING id`;
  if (rows.length > 0) return id;
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { campaign: true } });
  return (run && castIdOf(run)) ?? id;
};

/** The campaign's avatar, picked now when it has none (or its member left the cast). Null when the workspace has no
 *  ready cast member: the photos then show whoever the scene asks for. */
export const campaignCast = async (runId: string): Promise<CastFace | null> => {
  const run = await prisma.autoSlideshowRun.findUnique({ where: { id: runId }, select: { workspaceId: true, campaign: true } });
  if (!run?.workspaceId) return null;
  const members = await readyCast(run.workspaceId);
  if (members.length === 0) return null;
  const stored = castIdOf(run) ?? null;
  const current = members.find((m) => m.id === stored);
  const id = current ? current.id : await keepCast(runId, (await leastUsed(run.workspaceId, runId, members)).id, stored);
  const member = members.find((m) => m.id === id) ?? members[0]!;
  return { look: castLook(member.look), key: member.image_key };
};
