// server-only — more photos or clips for one shot of a Blitz idea, when the deck's swap ran out of its runner-ups.

import type { DeckItem } from '../slideshow/core/deckAssembly';
import { clipKey } from '../slideshow/core/library';
import { hookRule, libraryOption, searchShots, type LibraryRule, type MediaOption } from '../slideshow/core/media';
import type { ShotRole } from '../slideshow/core/types';
import { STORY_RULES } from '../slideshow/engines/website/media';

/** How many the library adds at once: the next swaps are then instant. */
const MORE = 6;

const ruleOf = (card: DeckItem, role: ShotRole): LibraryRule => {
  if (role === 'hook') return hookRule(card.archetype);
  return STORY_RULES[role === 'old_way' ? 'oldWay' : role];
};

/**
 * Library media for shot `index` of the same kind (photo or clip), matching its line, that the card does not hold yet
 * (on any step, or among this shot's alternatives). The rule's slot ranks them; its minimum is dropped, since photos
 * rarely score high on a slot and a swap only needs something that fits the line.
 */
export async function moreOptions(card: DeckItem, index: number, workspaceId: string): Promise<MediaOption[]> {
  const shot = card.shots[index];
  if (!shot) return [];
  const held = new Set(card.shots.flatMap((s) => [s.assetKey, ...s.alternatives.map((a) => a.assetKey)]).filter((k): k is string => Boolean(k)).map(clipKey));
  const rule = ruleOf(card, shot.role);
  const [ranked = []] = await searchShots({ targetEnergy: 0.5, niche: null, workspaceId }, [
    { rule: { ...rule, minSlot: 0 }, text: shot.text, limit: MORE + held.size, media: shot.mediaKind },
  ]);
  const fresh = ranked.filter((a) => !held.has(clipKey(a.r2Key))).slice(0, MORE);
  return Promise.all(fresh.map(libraryOption));
}
