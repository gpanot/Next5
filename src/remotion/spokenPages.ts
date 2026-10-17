/**
 * How a narrated slide's spoken line is shown (2026-10-17): a few words at a time (a page), TikTok-caption style, each
 * word appearing as it is said. Shared by the render (SpokenCaption.tsx) and the deck card preview (SpokenDeckCaption.tsx).
 */

import type { SpokenWord } from './types';

/** Most words on screen at once. */
const PAGE_WORDS = 6;
/** A page may end early after a comma or full stop once it holds this many words. */
const MIN_PAGE_WORDS = 3;
/** Words appear this much before the voice reaches them: text that trails the voice reads as late. */
export const SPOKEN_LEAD_S = 0.08;

/** The line cut into pages: at most PAGE_WORDS words, ending at punctuation when it can. */
export const spokenPages = (words: SpokenWord[]): SpokenWord[][] => {
  const pages: SpokenWord[][] = [];
  let page: SpokenWord[] = [];
  words.forEach((w, i) => {
    page.push(w);
    const left = words.length - i - 1;
    const pause = /[,.!?;:]$/.test(w.word) && page.length >= MIN_PAGE_WORDS && left >= MIN_PAGE_WORDS - 1;
    if (page.length >= PAGE_WORDS || pause) {
      pages.push(page);
      page = [];
    }
  });
  if (page.length) {
    // A last page of one or two words joins the page before it when that still fits.
    const last = pages.at(-1);
    if (last && page.length < MIN_PAGE_WORDS && last.length + page.length <= PAGE_WORDS + 1) last.push(...page);
    else pages.push(page);
  }
  return pages;
};

/** The page on screen `seconds` into the slide: the last one whose first word has started (the first page until then). */
export const spokenPageAt = (pages: SpokenWord[][], seconds: number): number =>
  pages.reduce((at, page, i) => (seconds >= page[0]!.startS - SPOKEN_LEAD_S ? i : at), 0);
