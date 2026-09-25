/**
 * Adds proof points (testimonials, metrics, client counts — verbatim, grounded) to existing
 * Campaign Studio profiles, for the website slideshow engine's Proof shot.
 *
 *   npx tsx --env-file=.env.local scripts/backfill-proof-points.ts            # every run missing them
 *   npx tsx --env-file=.env.local scripts/backfill-proof-points.ts <runId>    # one run
 *
 * Re-crawls the site (extractProfile, ~$0.01–0.02 per site) but keeps every existing field,
 * including manual edits: only market.proofPoints is taken from the fresh extraction.
 * Writes a new profile version and points the run at it, like the Profile step's re-extract.
 */
import { prisma } from '../src/lib/db';
import { extractProfile } from '../src/server/studio/profileExtractor';
import type { StudioProfileData } from '../src/server/studio/types';

async function main() {
  const only = process.argv[2];
  const runs = await prisma.studioRun.findMany({
    where: only ? { id: only } : undefined,
    include: { brandProfile: true },
    orderBy: { createdAt: 'desc' },
  });
  const fresh = new Map<string, StudioProfileData['market']['proofPoints']>();

  for (const run of runs) {
    const data = run.brandProfile.data as StudioProfileData;
    if (!only && data.market?.proofPoints) { console.log(`skip ${run.id}: already has proof points`); continue; }
    const url = run.brandProfile.sourceUrl;
    if (!fresh.has(url)) {
      const result = await extractProfile({ sourceUrl: url });
      fresh.set(url, result.data.market.proofPoints);
    }
    const proofPoints = fresh.get(url);
    const merged: StudioProfileData = { ...data, market: { ...data.market, ...(proofPoints ? { proofPoints } : {}) } };
    const profile = await prisma.studioBrandProfile.create({
      data: {
        sourceUrl: url,
        workspaceId: run.workspaceId,
        version: run.brandProfile.version + 1,
        data: merged as object,
        crawl: run.brandProfile.crawl as object,
      },
    });
    await prisma.studioRun.update({ where: { id: run.id }, data: { brandProfileId: profile.id } });
    const found = proofPoints?.value ?? [];
    console.log(`${run.id} ${url}: ${found.length} proof point(s)${found.map((p) => `\n   - ${p.claim}  ← "${p.evidence}"`).join('')}`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); }).finally(() => prisma.$disconnect());
