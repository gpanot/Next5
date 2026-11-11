// A three-way merge of an idea's card (labs/ideaFinish.ts): the finishing step works on a copy read before its slow
// calls (images, caption fits, camera moves), then lays only what it changed onto the card as it is now. A voiceover
// line, hook, caption or photo the user saved meanwhile stays.

import type { DeckItem } from '../slideshow/core/deckAssembly';

type Fields = Record<string, unknown>;

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** `now` with every field `mine` added, changed or removed since `base`. */
function mergeFields<T extends object>(base: T, mine: T, now: T): T {
  const b = base as Fields;
  const m = mine as Fields;
  const out: Fields = { ...(now as Fields) };
  for (const key of new Set([...Object.keys(b), ...Object.keys(m)])) {
    if (same(b[key], m[key])) continue;
    if (key in m) out[key] = m[key];
    else delete out[key];
  }
  return out as T;
}

/** The card as it is now (`now`), with what the finishing step changed from `base` to `mine`, shot by shot. */
export function mergeCard(base: DeckItem, mine: DeckItem, now: DeckItem): DeckItem {
  const { shots: baseShots, ...baseRest } = base;
  const { shots: myShots, ...myRest } = mine;
  const { shots: nowShots, ...nowRest } = now;
  const shots = nowShots.map((shot, i) => (baseShots[i] && myShots[i] ? mergeFields(baseShots[i]!, myShots[i]!, shot) : shot));
  return { ...mergeFields(baseRest, myRest, nowRest), shots } as DeckItem;
}
