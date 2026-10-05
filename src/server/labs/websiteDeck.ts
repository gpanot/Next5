// server-only — never import from a 'use client' file.
//
// Website deck generator: from a Campaign Studio profile (no questions, no TikTok research),
// one brief per IDC, 6 cards per brief, interleaved (spec 5, 10.2).
//
// Per brief:
//   1. writeMeat          1 LLM call (+ retries): levers, 5 story lines, CTA, checked against the site
//   2. generateHooks      1 LLM call: 18 hooks → 6 (Result-first only with real proof)
//      (1–2 run in parallel across briefs)
//   3. directWebsiteMedia semantic search over the described library, IDC-led queries; story shots
//      must match the audience's industry (sequential across briefs: no clip twice in a deck)
//   4. generateShotImages AI images for story shots the library can't cover (parallel), saved to
//      the library with categories so the next deck reuses them
// Then music, interleave, persist.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { contentWords } from '../slideshow/core/copyGuards';
import { buildBriefCards, interleave, persistCards, type DeckItem, type StoryMedia, type StoryTexts } from '../slideshow/core/deckAssembly';
import { generateHooks } from '../slideshow/core/hooks';
import { clipKey, type LibraryTrack } from '../slideshow/core/library';
import { matchTracks } from '../autoSlideshow/music';
import { blitzBrowserUrl } from '../admin/blitzStore';
import { websiteEngine, type WebsiteBrief, type WebsiteSource } from '../slideshow/engines/website/engine';
import { applyGenerated, directWebsiteMedia, type WebsiteMedia } from '../slideshow/engines/website/media';
import { categoriesForAudience } from '../slideshow/core/audienceCategories';
import { generateShotImages } from '../slideshow/core/generatedAssets';
import type { StudioProfileData } from '../studio/types';
import type { HookArchetype } from '../slideshow/core/types';

/** Card tint per brief, so audiences are easy to tell apart in the deck. */
const BRIEF_HUES = [210, 28, 150, 280, 350];

/** The run's profile, as the engine source. */
export async function loadWebsiteSource(runId: string): Promise<WebsiteSource> {
  const run = await prisma.studioRun.findUnique({ where: { id: runId }, include: { brandProfile: true } });
  if (!run) throw new HttpError(404, 'run_not_found', 'Campaign Studio run not found.');
  const profile = run.brandProfile.data as StudioProfileData;
  if (!profile?.positioning?.promoting?.value) {
    throw new HttpError(409, 'profile_incomplete', 'Confirm the brand profile first (Profile step).');
  }
  return { profile, sourceUrl: run.brandProfile.sourceUrl, workspaceId: run.workspaceId };
}

type BriefStory = {
  brief: WebsiteBrief;
  story: StoryTexts;
  hooks: Array<{ archetype: HookArchetype; text: string }>;
  /** Audience industries: story shots must come from these (asset categories). */
  categories: string[];
};

/** LLM half of a brief: story + hooks + audience industries. Runs in parallel across briefs. */
async function writeBrief(brief: WebsiteBrief): Promise<BriefStory> {
  const [{ levers, meat, cta }, categories] = await Promise.all([
    websiteEngine.writeMeat(brief),
    categoriesForAudience(brief.idc),
  ]);
  const story: StoryTexts = { ...meat, cta };
  console.log(`[WebsiteDeck:${brief.idc}] industries=${categories.join(',') || '-'} story: ${Object.values(story).join(' | ')}`);
  const baseRules = websiteEngine.hookRules(brief);
  const { kept: hooks } = await generateHooks({
    briefId: brief.id,
    audience: brief.idc,
    pain: story.pain,
    dreamOutcome: levers.dreamOutcome,
    proofLine: brief.proofPoints[0]?.claim ?? null,
    lensLine: brief.idcEvidence ? `Site says: "${brief.idcEvidence}"` : undefined,
    rules: { ...baseRules, specifics: [...(baseRules.specifics ?? []), ...contentWords(levers.namedMechanism), ...contentWords(story.pain)] },
    levers,
  });
  return { brief, story, hooks, categories };
}

function proofNote(brief: WebsiteBrief): string {
  if (brief.proofPoints.length) return `Proof quoted from the profile: "${brief.proofPoints[0]!.evidence}".`;
  return brief.productPhotos.length
    ? 'No proof in the profile, so the Proof shot shows your own product photo doing the job (no numbers).'
    : 'No proof on the site, so the Proof shot shows the product doing the job (no numbers).';
}

function cardsFor(b: BriefStory, index: number, storyMedia: StoryMedia, media: WebsiteMedia, tracks: LibraryTrack[]): DeckItem[] {
  const { brief } = b;
  return buildBriefCards({
    engine: 'website',
    lensId: brief.idc.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    lensLabel: brief.idc.replace(/^\w/, (c) => c.toUpperCase()),
    audienceLabel: brief.idc,
    hue: BRIEF_HUES[index % BRIEF_HUES.length]!,
    story: b.story,
    storyMedia,
    storyPerCard: media.perCard,
    hooks: b.hooks,
    hookMedia: media.hooks,
    tracks,
    proofNote: proofNote(brief),
  });
}

/** How far back a workspace's cards and posts count as "shown lately". */
const RECENT_DAYS = 45;

/** Files (clipKey) in the workspace's recent deck cards and calendar videos. */
async function recentClips(workspaceId: string | null | undefined): Promise<Set<string>> {
  if (!workspaceId) return new Set();
  const since = new Date(Date.now() - RECENT_DAYS * 86_400_000);
  const rows = await prisma.$queryRaw<Array<{ key: string }>>`
    SELECT s->>'assetKey' AS key FROM slideshow_variants v, jsonb_array_elements(v.plan->'shots') s
    WHERE v.workspace_id = ${workspaceId} AND v.engine = 'website' AND v.created_at >= ${since} AND s->>'assetKey' IS NOT NULL
    UNION
    SELECT s->>'backgroundKey' FROM blitz_scheduled_posts p, jsonb_array_elements(p.render_body->'slides') s
    WHERE p.workspace_id = ${workspaceId} AND p.created_at >= ${since} AND s->>'backgroundKey' IS NOT NULL`;
  return new Set(rows.map((r) => clipKey(r.key)));
}

/**
 * One track per card, in card order (per brief, one per hook), from the same picker as slideshows: Jev fit for the
 * card's hook and story, fewer points for what the workspace used lately, no repeat in the deck while the library has
 * enough. A failure leaves the cards without music (picked in the editor).
 */
async function cardTracks(written: BriefStory[], workspaceId: string | null): Promise<LibraryTrack[][]> {
  const shows = written.flatMap((b) => b.hooks.map((h) => ({
    goal: null,
    audience: b.brief.idc,
    slides: [h.text, ...Object.values(b.story)].map((title) => ({ title, body: '' })),
  })));
  const picks = await matchTracks(shows, null, workspaceId).catch((err: unknown) => {
    console.error('[WebsiteDeck] music pick failed:', err instanceof Error ? err.message : err);
    return [];
  });
  const tracks = await Promise.all(picks.map(async (p): Promise<LibraryTrack> => ({ assetId: p.assetId, r2Key: p.r2Key, url: await blitzBrowserUrl(p.r2Key), name: p.name, startAt: p.startAt })));
  let next = 0;
  return written.map((b) => b.hooks.map(() => tracks[next++]).filter((t): t is LibraryTrack => Boolean(t)));
}

/** Generates the whole deck for a Campaign Studio run. A brief that fails is skipped, not fatal. */
export async function generateWebsiteDeck(runId: string): Promise<DeckItem[]> {
  const source = await loadWebsiteSource(runId);
  const briefs = websiteEngine.briefs(source);

  const settled = await Promise.allSettled(briefs.map(writeBrief));
  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[WebsiteDeck] brief "${briefs[i]!.idc}" failed:`, r.reason);
  });
  const written = settled.flatMap((r) => (r.status === 'fulfilled' && r.value.hooks.length > 0 ? [r.value] : []));
  if (written.length === 0 && settled[0]?.status === 'rejected') throw settled[0].reason;

  // Music in parallel with the footage: one track per card, picked like a slideshow's (shared matchTracks).
  const music = cardTracks(written, source.workspaceId).catch((): LibraryTrack[][] => written.map(() => []));

  // Library search: sequential, one used-file set, so no clip appears twice in the deck; files the workspace showed
  // lately go last, so a new batch does not repeat the last one.
  const used = new Set<string>();
  const recent = await recentClips(source.workspaceId).catch((err: unknown) => {
    console.warn('[WebsiteDeck] recent clips unreadable:', err instanceof Error ? err.message : err);
    return new Set<string>();
  });
  const media: WebsiteMedia[] = [];
  for (const b of written) {
    media.push(await directWebsiteMedia({
      idc: b.brief.idc, categories: b.categories, tone: b.brief.tone, story: b.story, hooks: b.hooks,
      workspaceId: source.workspaceId, used, recent, products: source.profile.products?.value,
    }));
  }

  // AI images for the story shots the library could not cover, all audiences in parallel.
  // Each image is saved to the library (categories, description, embedding) for the next deck.
  const generated = await Promise.all(written.map((b, i) =>
    generateShotImages(b.brief.idc, b.categories, media[i]!.needs, source.workspaceId)));

  const tracks = await music;
  const decks = await Promise.all(written.map(async (b, i) =>
    cardsFor(b, i, await applyGenerated(media[i]!, b.brief.idc, generated[i]!), media[i]!, tracks[i]!)));
  return persistCards(interleave(decks), { workspaceId: source.workspaceId });
}
