// server-only — never import from a 'use client' file.
// "New prospect": a placeholder owner (until the prospect claims the pack), their slideshow workspace for the site, and
// the workspace's first run, held after step 3 so the admin checks the Brand Cast faces first (pipeline.ts holdForCast).
// The run's step 1 also starts the first Blitz ideas (labs/firstIdeas.ts), all videos (idea_slideshow_pct 0).

import { randomBytes } from 'node:crypto';
import { prisma } from '../../lib/db';
import { PROSPECT_CAST } from '../../types/admin/prospects';
import { runAutoPipeline } from '../autoSlideshow/pipeline';
import { createSlideshowWorkspace } from '../autoSlideshow/workspaces';

/** A placeholder address nobody can sign in with (.invalid never resolves). */
const placeholderEmail = (): string => `prospect-${randomBytes(6).toString('hex')}@prospects.next5.invalid`;

/** Creates the pack and returns its id and the run job to start after the response. */
export const createProspect = async (input: { websiteUrl?: unknown; name?: unknown; tzOffsetMin?: unknown }): Promise<{ id: string; work: () => Promise<void> }> => {
  const owner = await prisma.user.create({ data: { email: placeholderEmail(), displayName: 'Prospect', stockImagesOnly: true } });
  const ws = await createSlideshowWorkspace(owner.id, { websiteUrl: input.websiteUrl, name: input.name }).catch(async (err: unknown) => {
    await prisma.user.delete({ where: { id: owner.id } }).catch(() => undefined);
    throw err;
  });
  const tz = typeof input.tzOffsetMin === 'number' && Number.isInteger(input.tzOffsetMin) && Math.abs(input.tzOffsetMin) <= 14 * 60 ? input.tzOffsetMin : null;
  await prisma.workspace.update({ where: { id: ws.id }, data: { ideaSlideshowPct: 0, ideaTzOffsetMin: tz } });
  const run = await prisma.autoSlideshowRun.create({ data: { url: ws.websiteUrl!, count: PROSPECT_CAST, workspaceId: ws.id, holdBeforeStep4: true } });
  const pack = await prisma.prospectPack.create({
    data: { workspaceId: ws.id, ownerUserId: owner.id, websiteUrl: ws.websiteUrl!, name: ws.name, shareToken: randomBytes(18).toString('base64url'), brandRunId: run.id },
  });
  return { id: pack.id, work: () => runAutoPipeline(run.id, 1) };
};
