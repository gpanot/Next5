// server-only — never import from a 'use client' file.
// Turns one brief's story + hooks + media into deck cards (same shape for both engines),
// interleaves briefs, and saves the cards so swipes can be logged against them.

import { SHOTS } from './format';
import type { LibraryTrack } from './library';
import type { ShotMedia } from './media';
import type { HookArchetype, ShotRole } from './types';
import { createVariants } from './variants';

// ── Types (JSON-safe, sent to the client) ────────────────────────────────────

/** One shot: text, media, fixed length. Maps 1-to-1 to the card and the editor slide. */
export type DeckShot = ShotMedia & {
  role: ShotRole;
  text: string;
  textZone: 'top' | 'middle' | 'bottom';
  durationSec: number;
};

/** One card = one hook archetype on its brief's shared story + CTA. */
export type DeckItem = {
  id: string;
  /** slideshow_variants id; null when the deck could not be saved (swipes then go unlogged). */
  variantId: string | null;
  engine: 'website' | 'zillow';
  /** Brief lens: IDC name (website) or listing angle (zillow). */
  lensId: string;
  lensLabel: string;
  archetype: HookArchetype;
  hookStyle: string;
  shots: DeckShot[];
  hue: number;
  /** Track for this card, when the library has a described, rights-safe one. `url` plays in the deck. */
  audio: { assetKey: string; url: string; startAt: number; label: string } | null;
  whyPanel: {
    audience: string;
    hookStyle: string;
    hookStyleReason: string;
    storyLines: Array<{ label: string; text: string }>;
    proofNote: string;
    musicLabel: string;
  };
};

export type StoryTexts = { pain: string; oldWay: string; mechanism: string; proof: string; inaction: string; cta: string };
export type StoryMedia = Record<keyof StoryTexts, ShotMedia>;

// ── Labels ────────────────────────────────────────────────────────────────────

export const ARCHETYPE_LABELS: Record<HookArchetype, string> = {
  call_out:      'Call-out',
  contrarian:    'Myth buster',
  proof_result:  'Result first',
  fear_inaction: 'Cost of waiting',
  curiosity:     'Curiosity',
  action:        'Challenge',
};

const ARCHETYPE_WHY: Record<HookArchetype, string> = {
  call_out:      'Names the audience in the first second so the right people stop.',
  contrarian:    'Flips a belief they hold, which makes them want the reason.',
  proof_result:  'Shows the result before anything else.',
  fear_inaction: 'Shows what they are losing right now.',
  curiosity:     'Opens a question the video answers.',
  action:        'Asks them to do something, which drives shares.',
};

/** Caption band per role, used when the media gives no text-safe zone (listing photos). */
const TEXT_ZONE: Record<ShotRole, DeckShot['textZone']> = {
  hook: 'top', pain: 'bottom', old_way: 'bottom', mechanism: 'bottom', proof: 'bottom', inaction: 'bottom', cta: 'middle',
};

const STORY_ORDER: Array<[keyof StoryTexts, ShotRole, string]> = [
  ['pain', 'pain', 'Pain'],
  ['oldWay', 'old_way', 'Old way'],
  ['mechanism', 'mechanism', 'Mechanism'],
  ['proof', 'proof', 'Proof'],
  ['inaction', 'inaction', 'Cost of waiting'],
  ['cta', 'cta', 'Call to action'],
];

const shot = (role: ShotRole, text: string, media: ShotMedia, index: number): DeckShot =>
  ({ ...media, role, text, textZone: TEXT_ZONE[role], durationSec: SHOTS[index]!.durationSec });

// ── Assembly ──────────────────────────────────────────────────────────────────

export type BriefCardsInput = {
  engine: DeckItem['engine'];
  lensId: string;
  lensLabel: string;
  /** "Buyers", "Electricians"… shown in the Why panel. */
  audienceLabel: string;
  hue: number;
  story: StoryTexts;
  storyMedia: StoryMedia;
  hooks: Array<{ archetype: HookArchetype; text: string }>;
  hookMedia: ShotMedia[];
  tracks: LibraryTrack[];
  proofNote: string;
};

/** One card per hook; story, story media and CTA shared (Hormozi hook test). */
export function buildBriefCards(input: BriefCardsInput): DeckItem[] {
  const storyShots = STORY_ORDER.map(([key, role], i) => shot(role, input.story[key], input.storyMedia[key], i + 1));
  const storyLines = STORY_ORDER.slice(0, 5).map(([key, , label]) => ({ label, text: input.story[key] }));
  return input.hooks.map((hook, i) => {
    const track = input.tracks.length ? input.tracks[i % input.tracks.length]! : null;
    return {
      id:        `${input.engine}-${input.lensId}-${hook.archetype}-${i}`,
      variantId: null,
      engine:    input.engine,
      lensId:    input.lensId,
      lensLabel: input.lensLabel,
      archetype: hook.archetype,
      hookStyle: ARCHETYPE_LABELS[hook.archetype],
      shots:     [shot('hook', hook.text, input.hookMedia[i]!, 0), ...storyShots],
      hue:       input.hue,
      audio:     track ? { assetKey: track.r2Key, url: track.url, startAt: track.startAt, label: track.name } : null,
      whyPanel: {
        audience:        input.audienceLabel,
        hookStyle:       ARCHETYPE_LABELS[hook.archetype],
        hookStyleReason: ARCHETYPE_WHY[hook.archetype],
        storyLines,
        proofNote:       input.proofNote,
        musicLabel:      track ? track.name : 'No rights-safe track described yet. Pick one in the editor.',
      },
    };
  });
}

/** Round-robin across briefs so the first swipes cover every audience (spec 10.2). */
export function interleave<T>(decks: T[][]): T[] {
  const out: T[] = [];
  const longest = Math.max(0, ...decks.map((d) => d.length));
  for (let i = 0; i < longest; i++) decks.forEach((d) => { if (d[i]) out.push(d[i]!); });
  return out;
}

/** Saves the cards; ids become the variant ids. Unsaved cards keep working, unlogged. */
export async function persistCards(
  cards: DeckItem[],
  ref: { listingRunId?: string | null; workspaceId?: string | null },
): Promise<DeckItem[]> {
  const ids = await createVariants(cards.map((c) => ({
    engine: c.engine,
    lens: c.lensId,
    archetype: c.archetype,
    listingRunId: ref.listingRunId ?? null,
    workspaceId: ref.workspaceId ?? null,
    plan: { shots: c.shots, audio: c.audio, hookStyle: c.hookStyle },
  })));
  return ids ? cards.map((c, i) => ({ ...c, id: ids[i]!, variantId: ids[i]! })) : cards;
}
