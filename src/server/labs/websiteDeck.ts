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
import { searchMusic, type LibraryTrack } from '../slideshow/core/library';
import { websiteEngine, type WebsiteBrief, type WebsiteSource } from '../slideshow/engines/website/engine';
import { TONE_ENERGY, applyGenerated, directWebsiteMedia, type WebsiteMedia } from '../slideshow/engines/website/media';
import { categoriesForAudience } from '../slideshow/core/audienceCategories';
import { generateShotImages } from '../slideshow/core/generatedAssets';
import type { ShotMedia } from '../slideshow/core/media';
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

function cardsFor(b: BriefStory, index: number, storyMedia: StoryMedia, hookMedia: ShotMedia[], tracks: LibraryTrack[]): DeckItem[] {
  const { brief } = b;
  return buildBriefCards({
    engine: 'website',
    lensId: brief.idc.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    lensLabel: brief.idc.replace(/^\w/, (c) => c.toUpperCase()),
    audienceLabel: brief.idc,
    hue: BRIEF_HUES[index % BRIEF_HUES.length]!,
    story: b.story,
    storyMedia,
    hooks: b.hooks,
    hookMedia,
    tracks,
    proofNote: brief.proofPoints.length
      ? `Proof quoted from the site: "${brief.proofPoints[0]!.evidence}".`
      : 'No proof on the site, so the Proof shot shows the product doing the job (no numbers).',
  });
}

/** Generates the whole deck for a Campaign Studio run. A brief that fails is skipped, not fatal. */
export async function generateWebsiteDeck(runId: string): Promise<DeckItem[]> {
  const source = await loadWebsiteSource(runId);
  const briefs = websiteEngine.briefs(source);
  const tone = briefs[0]?.tone ?? 'casual';
  const tracks = await searchMusic(TONE_ENERGY[tone] ?? 0.5).catch((): LibraryTrack[] => []);

  const settled = await Promise.allSettled(briefs.map(writeBrief));
  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[WebsiteDeck] brief "${briefs[i]!.idc}" failed:`, r.reason);
  });
  const written = settled.flatMap((r) => (r.status === 'fulfilled' && r.value.hooks.length > 0 ? [r.value] : []));
  if (written.length === 0 && settled[0]?.status === 'rejected') throw settled[0].reason;

  // Library search: sequential, one used-clip set, so no clip appears twice in the deck.
  const used = new Set<string>();
  const media: WebsiteMedia[] = [];
  for (const b of written) {
    media.push(await directWebsiteMedia({
      idc: b.brief.idc, categories: b.categories, tone: b.brief.tone, story: b.story, hooks: b.hooks,
      workspaceId: source.workspaceId, used,
    }));
  }

  // AI images for the story shots the library could not cover, all audiences in parallel.
  // Each image is saved to the library (categories, description, embedding) for the next deck.
  const generated = await Promise.all(written.map((b, i) =>
    generateShotImages(b.brief.idc, b.categories, media[i]!.needs, source.workspaceId)));

  const decks = await Promise.all(written.map(async (b, i) =>
    cardsFor(b, i, await applyGenerated(media[i]!, b.brief.idc, generated[i]!), media[i]!.hooks, tracks)));
  return persistCards(interleave(decks), { workspaceId: source.workspaceId });
}
