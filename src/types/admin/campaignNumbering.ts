/**
 * Numbered content slides ("1. …", "2. …") as a plain text edit, no AI: the Content tab's Numbered switch adds or
 * removes the numbers, and they follow when a slide is added or deleted. When the hook promises n things and there are
 * n - 1 content slides, the CTA is the nth and gets the last number.
 */

import { hookNumber, MAX_CARD_TITLE_CHARS, type CampaignCard, type CampaignDraft } from './slideshowCampaign';

/** "3. ", "3) " or "Step 3: " in front of a headline (not "3.5 million…"). */
const NUMBER_PREFIX = /^\s*(?:\d+[.)](?!\d)|step\s+\d+\s*[:.-])\s*/i;

export const stripNumber = (title: string): string => title.replace(NUMBER_PREFIX, '');

/** True when every written content headline starts with a number. */
export const isNumbered = (cards: CampaignCard[]): boolean => {
  const written = cards.filter((c) => c.role === 'item' && c.title.trim());
  return written.length > 0 && written.every((c) => NUMBER_PREFIX.test(c.title));
};

/** True when the CTA closes the hook's count: "6 ways…" with 5 content slides makes the CTA the 6th. */
const ctaIsLast = (draft: Pick<CampaignDraft, 'hooks' | 'cards'>): boolean => {
  const n = draft.hooks[0] ? hookNumber(draft.hooks[0]) : null;
  return n !== null && draft.cards.filter((c) => c.role === 'item').length === n - 1;
};

const withNumber = (n: number, title: string) => `${n}. ${title}`.slice(0, MAX_CARD_TITLE_CHARS);

/** The cards with their numbers added (in order) or removed. Empty headlines get "n. " so the person types after it. */
export const numberCards = (draft: Pick<CampaignDraft, 'hooks' | 'cards'>, on: boolean): CampaignCard[] => {
  const ctaToo = on && ctaIsLast(draft);
  let n = 0;
  return draft.cards.map((c) => {
    const bare = stripNumber(c.title);
    if (c.role === 'item') {
      n += 1;
      return { ...c, title: on ? withNumber(n, bare) : bare };
    }
    return { ...c, title: ctaToo && bare ? withNumber(n + 1, bare) : bare };
  });
};
