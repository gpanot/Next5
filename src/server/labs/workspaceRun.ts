// server-only — never import from a 'use client' file.
// The Content page's Blitz deck runs on a Campaign Studio run, like the admin tab. A slideshow workspace already has a
// company profile for its website (the one Auto Slideshow extracts, same shape Blitz reads), so its run is found or
// created from that profile instead of being picked by hand.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { createMeter } from '../metaAds/cost';
import { profileForSite } from '../studio/siteProfile';

/** The workspace's run on its newest site profile; extracts the profile first when the site has none yet. */
export async function workspaceRunId(workspaceId: string): Promise<string> {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { websiteUrl: true } });
  if (!ws?.websiteUrl) throw new HttpError(409, 'no_website', 'Add your website to this workspace first.');

  const { id: brandProfileId } = await profileForSite(ws.websiteUrl, workspaceId, createMeter());
  const existing = await prisma.studioRun.findFirst({
    where: { workspaceId, brandProfileId },
    orderBy: { createdAt: 'desc' },
    select: { id: true },
  });
  if (existing) return existing.id;

  const run = await prisma.studioRun.create({
    data: { workspaceId, brandProfileId, extractStatus: 'done', createdBy: 'user' },
    select: { id: true },
  });
  return run.id;
}
