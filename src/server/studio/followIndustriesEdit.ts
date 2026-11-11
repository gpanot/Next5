// server-only — never import from a 'use client' file.
// After a changed list of client types is saved: the Blitz Script Bank drops and adds audiences, and the site's carousel
// bank is rewritten for the new Audience, so the next posts of both kinds speak to the new clients. Runs after the
// response; a first run released by the same save re-plans from the new bank.

import { Prisma } from '@prisma/client';
import type { BrandLever } from '../../types/admin/metaAds';
import { refreshBank } from '../autoSlideshow/bank/build';
import { runAutoPipeline } from '../autoSlideshow/pipeline';
import { brandPhotoFacts, productLooks } from '../brandContent/productPhotos';
import { prisma } from '../../lib/db';
import { syncBankAudiences } from '../labs/blitzBank';
import { createMeter } from '../metaAds/cost';
import { toBrandProfile } from './brandProfileAdapter';
import type { IndustriesEdit } from './customerIndustries';

/** Rewrites the carousel bank of the site this profile's runs use. Never throws: old parts simply stay in use. */
const refreshCarousels = async ({ workspaceId, brandProfileId, data, sourceUrl }: IndustriesEdit): Promise<void> => {
  try {
    const run = await prisma.autoSlideshowRun.findFirst({
      where: { workspaceId, brandProfileId, levers: { not: Prisma.AnyNull } },
      orderBy: { createdAt: 'desc' },
      select: { url: true, levers: true },
    });
    if (!run?.levers) return;
    const looks = productLooks(await brandPhotoFacts(workspaceId));
    await refreshBank(run.url, toBrandProfile(data, sourceUrl), run.levers as unknown as BrandLever[], createMeter(), looks);
  } catch (err) {
    console.error(`[studio/industries] carousel bank not rewritten for profile ${brandProfileId}:`, err instanceof Error ? err.message : err);
  }
};

/** Never throws. `released`: first runs the same save let go; they re-plan on the new bank, then carry on. */
export const followIndustriesEdit = async (edit: IndustriesEdit, released: string[] = []): Promise<void> => {
  const blitz = syncBankAudiences(edit.brandProfileId, { profile: edit.data, sourceUrl: edit.sourceUrl, workspaceId: edit.workspaceId });
  await refreshCarousels(edit);
  await Promise.all([blitz, ...released.map((runId) => runAutoPipeline(runId, 3))]);
};
