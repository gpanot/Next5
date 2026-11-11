/**
 * Slideshow Bank — client-safe types. One bank per website, built on its first Auto Slideshow run (Hormozi's matrix):
 * about 6 meats × 10 hooks each × 3 CTAs ≈ 180 slideshows. Later slideshows pick an unused combo and only make new photos
 * (fresh images from the same prompts, so TikTok never sees a repeated image) and pick music.
 */

import type { ContentGoal } from './contentGoals';

/** One meat slide: the text and the photo that shows it. */
export type BankItem = { title: string; body: string; photo: string };

/** The middle of a slideshow, in one goal's shape. Its hooks are written for it; a hook never moves to another meat. */
export type BankMeat = {
  id: string;
  goal: ContentGoal;
  topic: string;
  /** What the viewer gets, in one sentence: the promise every hook of this meat must keep. */
  promise: string;
  /** True when the slides are separate tips a hook can count ("5 tips"). */
  listicle: boolean;
  items: BankItem[];
  caption: string;
  hashtags: string[];
};

/** A hook written from a hook-library pattern (src/data/hooks.json) for one meat. */
export type BankHook = {
  id: string;
  meatId: string;
  patternId: string;
  /** Library category, e.g. 'controversial', 'relatable'. */
  category: string;
  text: string;
  photo: string;
  /** Editor score out of 15 (curiosity + clarity + fit). */
  score: number;
};

export type BankCta = { id: string; angle: string; title: string; body: string; photo: string };

/** `retired`: written for an audience the owner has since changed. Old slideshows still read it; nothing new picks it. */
type Retirable = { retired?: boolean };

export type SlideshowBankContent = { meats: (BankMeat & Retirable)[]; hooks: (BankHook & Retirable)[]; ctas: (BankCta & Retirable)[] };

/** The parts new slideshows may use. */
export const liveBank = (bank: SlideshowBankContent): SlideshowBankContent => ({
  meats: bank.meats.filter((m) => !m.retired),
  hooks: bank.hooks.filter((h) => !h.retired),
  ctas: bank.ctas.filter((c) => !c.retired),
});

/** Which bank parts one slideshow uses. */
export type BankCombo = { meatId: string; hookId: string; ctaId: string };

/** One slideshow made from the bank, for the Matrix view. `post`: its first live post's status (TikTok first), if any. */
export type BankUseDto = {
  slideshowId: string;
  runId: string;
  position: number;
  meatId: string;
  hookId: string;
  ctaId: string | null;
  status: string;
  post: 'scheduled' | 'posted' | null;
  createdAt: string;
};

/** The site's bank and the slideshows made from it (this workspace's only). `bank` is null before the first plan. */
export type BankMatrixDto = { bank: SlideshowBankContent | null; builtAt: string | null; used: BankUseDto[] };
