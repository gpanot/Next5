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
// Then music, interleave, caption Auto Fit on every shot (captionFit.tsx), persist.
// Steps 1–2 can also come ready-made from the workspace's Blitz Script Bank (blitzBank.ts): deckFromScripts runs 3–4.

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
import { fitDeckCaptions } from '../slideshow/core/captionFit';
import type { StudioProfileData } from '../studio/types';
import type { HookArchetype, ProofPoint, Tone } from '../slideshow/core/types';
import { FORMAT_DEFS, type Stage, type StoryFormat } from './blitzFormats';

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

/** One audience's script: its story, CTA and hooks, ready for footage. Written now or taken from the Blitz Script Bank. */
export type BriefScript = {
  idc: string;
  /** Audience industries: story shots must come from these (asset categories). */
  categories: string[];
  tone: Tone;
  proofNote: string;
  story: StoryTexts;
  hooks: Array<{ archetype: HookArchetype; text: string }>;
  /** The audience's place in the deck (card tint). */
  slot: number;
  /** Bank story this script comes from; saved on each card so the bank knows what was used. */
  storyId?: string;
  /** The story's other hooks (bank scripts make one card): offered as the card's other first lines. */
  otherHooks?: Array<{ archetype: HookArchetype; text: string }>;
  /** Campaign stage and story format of a bank story (blitzFormats.ts). */
  stage?: Stage;
  format?: StoryFormat;
};

/** Share of a numbered hook's words that must come from one proof quote: the hook may restate proof, never add to it. */
const PROOF_HOOK_OVERLAP = 0.6;

/** False for a hook with a number that says more than a proof quote does ("500,000 users plan meals before dinner"). */
export function hookClaimIsProven(text: string, proof: ProofPoint[]): boolean {
  if (!/\d/.test(text)) return true;
  const words = [...contentWords(text)].filter((w) => !/\d/.test(w));
  if (words.length === 0) return true;
  return proof.some((p) => {
    const quoted = contentWords(`${p.claim} ${p.evidence}`);
    return words.filter((w) => quoted.has(w)).length / words.length >= PROOF_HOOK_OVERLAP;
  });
}

/** LLM half of a brief: story + hooks + audience industries. Runs in parallel across briefs. */
export async function writeBrief(brief: WebsiteBrief, slot: number): Promise<BriefScript> {
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
  const proven = hooks.filter((h) => hookClaimIsProven(h.text, brief.proofPoints));
  if (proven.length < hooks.length) console.log(`[WebsiteDeck:${brief.idc}] dropped ${hooks.length - proven.length} hook(s) claiming more than the proof`);
  return { idc: brief.idc, categories, tone: brief.tone, proofNote: proofNote(brief), story, hooks: proven, slot };
}

function proofNote(brief: WebsiteBrief): string {
  if (brief.proofPoints.length) return `Proof quoted from the profile: "${brief.proofPoints[0]!.evidence}".`;
  return brief.productPhotos.length
    ? 'No proof in the profile, so the Proof shot shows your own product photo doing the job (no numbers).'
    : 'No proof on the site, so the Proof shot shows the product doing the job (no numbers).';
}

function cardsFor(b: BriefScript, storyMedia: StoryMedia, media: WebsiteMedia, tracks: LibraryTrack[]): DeckItem[] {
  const cards = buildBriefCards({
    engine: 'website',
    lensId: b.idc.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    lensLabel: b.idc.replace(/^\w/, (c) => c.toUpperCase()),
    audienceLabel: b.idc,
    hue: BRIEF_HUES[b.slot % BRIEF_HUES.length]!,
    story: b.story,
    storyMedia,
    storyPerCard: media.perCard,
    hooks: b.hooks,
    hookMedia: media.hooks,
    tracks,
    proofNote: b.proofNote,
  });
  if (!b.storyId) return cards;
  const labels = b.format ? FORMAT_DEFS[b.format].labels : null;
  return cards.map((c, i) => ({
    ...c,
    whyPanel: labels ? { ...c.whyPanel, storyLines: c.whyPanel.storyLines.map((l, n) => ({ ...l, label: Object.values(labels)[n] ?? l.label })) } : c.whyPanel,
    script: {
      storyId: b.storyId!,
      archetype: b.hooks[i]!.archetype,
      ...(b.otherHooks ? { otherHooks: b.otherHooks } : {}),
      ...(b.stage ? { stage: b.stage } : {}),
      ...(b.format ? { format: b.format } : {}),
    },
  }));
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
async function cardTracks(written: BriefScript[], workspaceId: string | null): Promise<LibraryTrack[][]> {
  const shows = written.flatMap((b) => b.hooks.map((h) => ({
    goal: null,
    audience: b.idc,
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

/**
 * Generates the whole deck for a Campaign Studio run. A brief that fails is skipped, not fatal.
 * `contentDeck`: a Content-page batch, saved so its cards come back on the next visit (workspaceDeck.ts).
 */
export async function generateWebsiteDeck(runId: string, opts: { contentDeck?: boolean } = {}): Promise<DeckItem[]> {
  const source = await loadWebsiteSource(runId);
  const briefs = websiteEngine.briefs(source);

  const settled = await Promise.allSettled(briefs.map((brief, i) => writeBrief(brief, i)));
  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.error(`[WebsiteDeck] brief "${briefs[i]!.idc}" failed:`, r.reason);
  });
  const written = settled.flatMap((r) => (r.status === 'fulfilled' && r.value.hooks.length > 0 ? [r.value] : []));
  if (written.length === 0 && settled[0]?.status === 'rejected') throw settled[0].reason;
  return deckFromScripts(source, written, opts.contentDeck ? runId : undefined);
}

/**
 * Footage half of a deck: music, library search, AI images for the shots the library lacks, caption Auto Fit, saved.
 * `deckRunId`: a Content-page batch of that run (workspaceDeck.ts).
 */
export async function deckFromScripts(source: WebsiteSource, written: BriefScript[], deckRunId?: string): Promise<DeckItem[]> {
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
      idc: b.idc, categories: b.categories, tone: b.tone, story: b.story, hooks: b.hooks,
      workspaceId: source.workspaceId, used, recent, products: source.profile.products?.value,
      beatIntents: b.format ? FORMAT_DEFS[b.format].intents : undefined,
    }));
  }

  // AI images for the story shots the library could not cover, all audiences in parallel.
  // Each image is saved to the library (categories, description, embedding) for the next deck.
  const generated = await Promise.all(written.map((b, i) =>
    generateShotImages(b.idc, b.categories, media[i]!.needs, source.workspaceId)));

  const tracks = await music;
  const decks = await Promise.all(written.map(async (b, i) =>
    cardsFor(b, await applyGenerated(media[i]!, b.idc, generated[i]!), media[i]!, tracks[i]!)));
  // Quality first: every shot's caption is placed by the vision Auto Fit on its real frame (~$0.006 per unique shot),
  // so no card shows its caption over a face. A shot that cannot be fitted keeps its text-safe-zone position.
  const fitted = await fitDeckCaptions(interleave(decks));
  return persistCards(fitted, { workspaceId: source.workspaceId, deckRunId });
}
