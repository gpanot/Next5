/**
 * Campaign Studio — keyword resolution and item cleanup for the research step.
 *
 * Keywords are generated at extraction time and stored on the profile. Research used to read
 * them as-is, so an admin fixing the niches ("electricians", "auto mechanics") or an old
 * profile with bad keywords kept searching the old terms, and the 10-day keyword cache served
 * the same off-topic videos. Keywords now carry a signature of their inputs; when it no longer
 * matches the current profile they are regenerated and saved as a new profile version.
 */
// server-only
import { prisma } from '../../lib/db';
import { discoverKeywords, keywordInputFromProfile, keywordInputSignature } from './keywordDiscovery';
import type { StudioProfileData } from './types';

type ProfileRow = {
  id: string;
  sourceUrl: string;
  workspaceId: string | null;
  version: number;
  data: unknown;
  crawl: unknown;
};

export async function resolveResearchKeywords(runId: string, profile: ProfileRow): Promise<string[]> {
  const data = profile.data as StudioProfileData;
  const stored = data.market.keywords;

  if (stored.source === 'manual' && stored.value.length > 0) return stored.value;

  const input = keywordInputFromProfile(data);
  if (input.audienceType === 'b2b' && input.targetCustomerIndustries.length === 0) {
    throw new Error(
      'No target customer industries on this profile, so research would search the wrong audience. ' +
        'Add them in Profile → Market → IDC Niches (e.g. "auto mechanics, electricians"), or re-extract, then run research again.',
    );
  }
  const signature = keywordInputSignature(input);
  if (stored.value.length > 0 && stored.derivedFrom === signature) return stored.value;

  console.log(`[studio/research] run=${runId} keywords stale (stored=${JSON.stringify(stored.value)}), regenerating`);
  const { keywords, verified } = await discoverKeywords(input);
  if (keywords.length === 0) {
    throw new Error(
      'Could not find reliable TikTok search terms for this business. ' +
        'Type 1–3 plain niche terms in Profile → Market → Keywords (e.g. "dentist", "family dentistry"), then run research again.',
    );
  }

  const nextData: StudioProfileData = {
    ...data,
    market: {
      ...data.market,
      keywords: { value: keywords, source: 'inferred', confidence: verified ? 0.8 : 0.4, locked: false, derivedFrom: signature },
    },
  };
  const newProfile = await prisma.studioBrandProfile.create({
    data: {
      sourceUrl: profile.sourceUrl,
      workspaceId: profile.workspaceId,
      version: profile.version + 1,
      data: nextData as object,
      crawl: profile.crawl as object,
    },
  });
  await prisma.studioRun.update({ where: { id: runId }, data: { brandProfileId: newProfile.id } });
  return keywords;
}

/**
 * A re-run replaces the previous results instead of appending to them, so off-topic items
 * from an earlier keyword set do not linger. Items already used by a candidate are kept.
 */
export async function clearStaleResearchItems(runId: string): Promise<number> {
  const used = await prisma.studioCandidate.findMany({
    where: { runId, researchItemId: { not: null } },
    select: { researchItemId: true },
  });
  const keepIds = used.map((c) => c.researchItemId).filter((id): id is string => id !== null);
  const { count } = await prisma.studioResearchItem.deleteMany({
    where: { runId, ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}) },
  });
  return count;
}
