/**
 * Slideshow campaigns — client-safe types shared by the API routes and the campaign editor.
 * A campaign is a run built by hand: hook lines rotate with hook photos (one slideshow per hook line), the content and
 * CTA cards are the same in every slideshow. "Generate" renders them; posting reuses the run's posting flow.
 */

import { isHookStyleId, type HookStyleId } from '../hookStyle';
import type { AutoSlideshowDto } from './autoSlideshow';

/** Slides a new campaign starts with: 1 hook, 5 content, 1 CTA. */
export const CAMPAIGN_START_SLIDES = 7;
export const MAX_CAMPAIGN_HOOKS = 10;
export const MAX_CAMPAIGN_HOOK_PHOTOS = 10;
export const MIN_CAMPAIGN_CONTENT = 1;
export const MAX_CAMPAIGN_CONTENT = 15;
export const MAX_HOOK_CHARS = 120;
export const MAX_CARD_TITLE_CHARS = 120;
export const MAX_CARD_BODY_CHARS = 220;
export const MAX_CAPTION_CHARS = 2_000;

/** The line under a card's headline: hidden from the editor for now (2026-10-11), so it is neither drawn nor rendered. */
export const SHOW_CARD_BODY = false;

/** A content or CTA card: the same text and photo in every slideshow. `photo`: index into the run's photos. */
export type CampaignCard = { role: 'item' | 'cta'; title: string; body: string; photo: number | null };

/** The editor's state, stored on the run. `hookPhotos`: indexes into the run's photos, in rotation order. */
export type CampaignDraft = {
  hooks: string[];
  hookPhotos: number[];
  /** Content cards, then the CTA card last. */
  cards: CampaignCard[];
  /** The text style of each kind of slide: the hook, every content slide (one style for all), the CTA. */
  looks: CampaignLooks;
  /** The post caption every slideshow of the campaign gets (hashtags written in it). */
  caption: string;
};

/** Which kind of slide a text style applies to. */
export type CampaignLookRole = 'hook' | 'content' | 'cta';
export type CampaignLooks = Record<CampaignLookRole, HookStyleId>;

/** The looks of a stored draft. Drafts saved before 2026-10-11 had one `look` for the hook and the CTA. */
export const looksOf = (d: { looks?: unknown; look?: unknown }): CampaignLooks => {
  const raw = (d.looks ?? {}) as Record<string, unknown>;
  const legacy = isHookStyleId(d.look) ? d.look : 'default';
  const pick = (v: unknown, fallback: HookStyleId) => (isHookStyleId(v) ? v : fallback);
  return { hook: pick(raw.hook, legacy), content: pick(raw.content, 'default'), cta: pick(raw.cta, legacy) };
};

/** The look a slide of this role is drawn in. */
export const lookOfRole = (looks: CampaignLooks, role: 'hook' | 'item' | 'cta'): HookStyleId => looks[role === 'item' ? 'content' : role];

/** The line under a card's headline as it is drawn: none while the field is hidden. */
export const shownBody = (card: Pick<CampaignCard, 'body'>): string => (SHOW_CARD_BODY ? card.body : '');

/** What the rendered slides depend on (the caption is not drawn): equal keys mean the made slideshows are current. */
export const renderKeyOf = (d: CampaignDraft): string => JSON.stringify({ hooks: d.hooks, hookPhotos: d.hookPhotos, cards: d.cards, looks: d.looks });

export const emptyCampaignDraft = (): CampaignDraft => ({
  hooks: [],
  hookPhotos: [],
  cards: [
    ...Array.from({ length: CAMPAIGN_START_SLIDES - 2 }, (): CampaignCard => ({ role: 'item', title: '', body: '', photo: null })),
    { role: 'cta', title: '', body: '', photo: null },
  ],
  looks: { hook: 'default', content: 'default', cta: 'default' },
  caption: '',
});

/** Where an attached photo came from. Unsplash photos keep their credit (Unsplash's attribution rule). */
export type CampaignPhotoSource = 'generated' | 'brand' | 'shared' | 'unsplash';

export type CampaignCredit = { name: string; url: string };

/** `url`: small thumb for strips and pickers; `fullUrl`: the photo itself, for the preview. */
export type CampaignPhotoDto = { index: number; url: string | null; fullUrl: string | null; source: CampaignPhotoSource; credit: CampaignCredit | null };

/** What to import into the campaign: a photo the workspace already has, a shared library photo, or an Unsplash photo. */
export type CampaignPhotoRef =
  | { source: 'generated'; runId: string; index: number }
  | { source: 'brand'; id: string }
  | { source: 'shared'; id: string }
  | { source: 'unsplash'; id: string };

/** Which slide the import is for: the hook (adds to the rotation), one card or several cards (replaces their photo). */
export type CampaignPhotoTarget = { slot: 'hook' } | { slot: 'card'; card: number } | { slot: 'cards'; cards: number[] };

/** True when the import is for card `card`. */
export const targetsCard = (target: CampaignPhotoTarget, card: number): boolean =>
  (target.slot === 'card' && target.card === card) || (target.slot === 'cards' && target.cards.includes(card));

export type CampaignSummaryDto = {
  id: string;
  name: string;
  hookCount: number;
  slideshowCount: number;
  scheduledCount: number;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignDto = {
  id: string;
  workspaceId: string;
  name: string;
  draft: CampaignDraft;
  photos: CampaignPhotoDto[];
  slideshows: AutoSlideshowDto[];
  /** True when the slideshows were made from the draft as it is now (Schedule then skips rendering). */
  rendered: boolean;
  createdAt: string;
};

/** One photo of a picker tab (generated, brand, shared, Unsplash), with what importing it needs. */
export type PhotoOptionDto = { key: string; thumbUrl: string; ref: CampaignPhotoRef; label: string; credit: CampaignCredit | null };

export type PhotoTab = 'search' | 'generated' | 'brand' | 'shared';

/** Hook line i opens slideshow i; photo i goes with it, and photos loop when there are fewer photos than hooks. */
export const hookPhotoFor = (draft: Pick<CampaignDraft, 'hookPhotos'>, hookIndex: number): number | null =>
  draft.hookPhotos.length === 0 ? null : draft.hookPhotos[hookIndex % draft.hookPhotos.length]!;

/** What still blocks Generate, in the order a person fixes it; empty when the draft is ready. */
export const campaignProblems = (draft: CampaignDraft): string[] => {
  const problems: string[] = [];
  if (draft.hooks.length === 0) problems.push('Add at least one hook.');
  if (draft.hookPhotos.length === 0) problems.push('Add at least one hook photo.');
  draft.cards.forEach((c, i) => {
    const name = c.role === 'cta' ? 'The CTA card' : `Content card ${i + 1}`;
    if (c.photo === null) problems.push(`${name} needs a photo.`);
    if (!c.title.trim()) problems.push(`${name} needs a headline.`);
  });
  return problems;
};

/** Auto content: the Content tab's "Auto" settings. */
export const AUTO_FORMATS = ['numbered', 'steps', 'plain'] as const;
export const AUTO_LENGTHS = ['short', 'medium', 'long'] as const;
export const AUTO_TONES = ['plain', 'punchy', 'expert', 'warm'] as const;
export type AutoFormat = (typeof AUTO_FORMATS)[number];
export type AutoLength = (typeof AUTO_LENGTHS)[number];
export type AutoTone = (typeof AUTO_TONES)[number];
export type AutoPhotoSource = 'ai' | 'stock';
export const MAX_AUTO_PROMPT_CHARS = 1_500;

/** Words per headline for each length. */
export const AUTO_LENGTH_WORDS: Record<AutoLength, [number, number]> = { short: [5, 7], medium: [10, 12], long: [15, 20] };

/** How many content slides Auto writes: the number the hook promises, else as many as the topic needs, in this range. */
export const AUTO_MIN_SLIDES = 3;
export const AUTO_MAX_SLIDES = 15;

/** The slide count the first hook fixes ("6 ways…" → 6), when it is in Auto's range; null lets the writer decide. */
export const autoSlideCount = (hooks: string[]): number | null => {
  const n = hooks[0] ? hookNumber(hooks[0]) : null;
  return n !== null && n >= AUTO_MIN_SLIDES && n <= AUTO_MAX_SLIDES ? n : null;
};

export type AutoContentRequest = {
  prompt: string;
  format: AutoFormat;
  length: AutoLength;
  tone: AutoTone;
  research: boolean;
  /** One photo for every content slide, or one each. */
  samePhoto: boolean;
  /** AI photos, or stock photos (the workspace's brand and shared library first, then Unsplash). */
  photoSource: AutoPhotoSource;
};

/**
 * The written content slides: headlines, then per slide a photo scene (AI photos) and a stock search query. `cover*`: one
 * photo for the whole set, used when every slide shares it. `libraryRefs` (stock photos only): per slide, a brand or
 * shared library photo that matches its query, or null (then Unsplash); `coverRef` the same for the shared photo.
 */
export type AutoContentDto = {
  titles: string[];
  scenes: string[];
  queries: string[];
  coverScene: string;
  coverQuery: string;
  libraryRefs: (CampaignPhotoRef | null)[];
  coverRef: CampaignPhotoRef | null;
};

/** One photo for the auto content: an AI photo of a scene, or the `nth` stock result of a search. */
export type AutoPhotoRequest = { source: 'ai'; scene: string } | { source: 'stock'; query: string; nth: number };

/** The number a hook line promises ("5 ways to…"), or null. */
export const hookNumber = (hook: string): number | null => {
  const n = Number(hook.match(/\d+/)?.[0]);
  return Number.isInteger(n) && n >= MIN_CAMPAIGN_CONTENT && n <= MAX_CAMPAIGN_CONTENT ? n : null;
};
