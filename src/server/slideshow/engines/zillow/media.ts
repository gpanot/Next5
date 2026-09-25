// server-only — zillow engine media direction (spec 6.3, 7.5, 9).
//
// Who plays which shot:
//   Hook        library clip chosen per archetype (talking head, reaction meme…); Result-first uses the hero photo
//   Pain        library meme / reaction clip (Hormozi b-roll rule: problem → problem visual)
//   Old way     library clip, same rule
//   Mechanism   listing photo of the named feature   ┐
//   Proof       listing photo of a room              ├ authentic media rule: the real home, never stock
//   Cost/bridge exterior listing photo              ┘
//   CTA         exterior listing photo, library "pointing / talk to me" clips as swaps
// Every library shot carries up to 4 runner-ups for one-tap swap in the editor.

import {
  AVOID_ON_PROBLEM,
  directHooks,
  hookRule,
  libraryOption,
  libraryShot,
  searchShots,
  type LibraryRule,
  type MediaOption,
  type ShotMedia,
} from '../../core/media';
import type { HookArchetype, ListingAngle } from '../../core/types';

export type { MediaOption, ShotMedia };

export type ListingPhoto = { id: string; url: string; tag: string };

// ── Rules ─────────────────────────────────────────────────────────────────────

const MEAT_RULES: Record<'pain' | 'oldWay', LibraryRule> = {
  pain: { slot: 'slot_problem', kinds: { meme: 0.15, hook: 0.05 }, minSlot: 0.5, avoidPattern: AVOID_ON_PROBLEM, intent: 'frustrated, annoyed reaction' },
  oldWay: { slot: 'slot_problem', kinds: { meme: 0.1, hook: 0.05, background: 0.05 }, minSlot: 0.4, avoidPattern: AVOID_ON_PROBLEM, intent: 'tired, resigned, making do' },
};

const CTA_ALTERNATIVES: LibraryRule = {
  slot: 'slot_cta', kinds: { hook: 0.15 }, minSlot: 0.4, avoidPattern: 'calls? to action', intent: 'pointing, talking to camera, inviting',
};

/** Energy by angle: a price cut is urgent, a feature tour is calm. */
export const ANGLE_ENERGY: Record<ListingAngle, number> = {
  price_reduction: 0.65, open_house: 0.6, just_listed: 0.6, sold: 0.55, feature_highlight: 0.45,
};

/** Listing photo tag preference for the authentic shots. */
const LISTING_TAGS: Record<'hero' | 'mechanism' | 'proof' | 'inaction' | 'fallback', string[]> = {
  hero: ['exterior'],
  mechanism: ['kitchen', 'living', 'backyard', 'bedroom', 'bathroom'],
  proof: ['living', 'kitchen', 'bedroom', 'bathroom'],
  inaction: ['exterior', 'backyard'],
  fallback: ['living', 'other'],
};

// ── Listing photos ────────────────────────────────────────────────────────────

/** Picks listing photos by tag preference, each photo once while unused ones remain. */
function photoPicker(pool: ListingPhoto[]) {
  const used = new Set<string>();
  return (tags: string[]): ListingPhoto | undefined => {
    const pick = tags.map((t) => pool.find((p) => p.tag === t && !used.has(p.id))).find(Boolean)
      ?? pool.find((p) => !used.has(p.id))
      ?? tags.map((t) => pool.find((p) => p.tag === t)).find(Boolean)
      ?? pool[0];
    if (pick) used.add(pick.id);
    return pick;
  };
}

function listingShot(photo: ListingPhoto | undefined, alternatives: MediaOption[] = []): ShotMedia {
  return {
    source: 'listing',
    mediaUrl: photo?.url ?? '',
    mediaKind: 'image',
    mediaLabel: photo ? `Listing photo · ${photo.tag}` : 'Listing photo',
    photoTag: photo?.tag ?? 'other',
    alternatives,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export type BriefMediaInput = {
  angle: ListingAngle;
  meat: { pain: string; oldWay: string; mechanism: string; proof: string; inaction: string; cta: string };
  /** Named feature, e.g. "open kitchen with quartz island" — picks the Mechanism photo. */
  namedMechanism: string;
  hooks: Array<{ archetype: HookArchetype; text: string }>;
  photos: ListingPhoto[];
  workspaceId?: string | null;
};

export type BriefMedia = {
  meat: Record<'pain' | 'oldWay' | 'mechanism' | 'proof' | 'inaction' | 'cta', ShotMedia>;
  /** Parallel to input.hooks. No two cards share a hook clip, and none reuses a meat clip. */
  hooks: ShotMedia[];
};

/** Chooses media for every shot of one brief: meat once (shared), hook per card. */
export async function directBriefMedia(input: BriefMediaInput): Promise<BriefMedia> {
  const ctx = { targetEnergy: ANGLE_ENERGY[input.angle], niche: 'niche_realtor' as const, workspaceId: input.workspaceId };
  // Real-estate-tagged clips rank first; general reactions still qualify.
  const re = { categories: ['real_estate'], categoryMode: 'boost' as const };
  const [painRanked, oldWayRanked, ctaRanked, ...hookRanked] = await searchShots(ctx, [
    { rule: MEAT_RULES.pain, text: input.meat.pain, limit: 5, ...re },
    { rule: MEAT_RULES.oldWay, text: input.meat.oldWay, limit: 8, ...re },
    { rule: CTA_ALTERNATIVES, text: input.meat.cta, limit: 4, ...re },
    ...input.hooks.map((h) => ({ rule: hookRule(h.archetype), text: h.text, limit: 12, ...re })),
  ]);

  // Pain and Old way must not show the same clip.
  const painId = painRanked![0]?.assetId;
  const pick = photoPicker(input.photos);
  const featureTag = LISTING_TAGS.mechanism.find((t) => input.namedMechanism.toLowerCase().includes(t));
  const heroPhoto = pick(LISTING_TAGS.hero);

  const meat: BriefMedia['meat'] = {
    pain: (await libraryShot(painRanked!)) ?? listingShot(pick(LISTING_TAGS.fallback)),
    oldWay: (await libraryShot(oldWayRanked!.filter((a) => a.assetId !== painId))) ?? listingShot(pick(LISTING_TAGS.fallback)),
    mechanism: listingShot(pick(featureTag ? [featureTag, ...LISTING_TAGS.mechanism] : LISTING_TAGS.mechanism)),
    proof: listingShot(pick(LISTING_TAGS.proof)),
    inaction: listingShot(pick(LISTING_TAGS.inaction)),
    cta: listingShot(heroPhoto, await Promise.all(ctaRanked!.map(libraryOption))),
  };

  const used = new Set([meat.pain.assetId, meat.oldWay.assetId].filter((id): id is string => Boolean(id)));
  const hooks = await directHooks(
    input.hooks.map((h) => h.archetype),
    hookRanked,
    used,
    (swaps) => listingShot(heroPhoto, swaps),
  );
  return { meat, hooks };
}
