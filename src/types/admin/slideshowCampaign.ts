/**
 * Slideshow campaigns — client-safe types shared by the API routes and the campaign editor.
 * A campaign is a run built by hand: hook lines rotate with hook photos (one slideshow per hook line), the content and
 * CTA cards are the same in every slideshow. "Generate" renders them; posting reuses the run's posting flow.
 */

import type { HookStyleId } from '../hookStyle';
import type { AutoSlideshowDto } from './autoSlideshow';

/** Slides a new campaign starts with: 1 hook, 5 content, 1 CTA. */
export const CAMPAIGN_START_SLIDES = 7;
export const MAX_CAMPAIGN_HOOKS = 10;
export const MAX_CAMPAIGN_HOOK_PHOTOS = 10;
export const MIN_CAMPAIGN_CONTENT = 1;
export const MAX_CAMPAIGN_CONTENT = 10;
export const MAX_HOOK_CHARS = 120;
export const MAX_CARD_TITLE_CHARS = 120;
export const MAX_CARD_BODY_CHARS = 220;

/** A content or CTA card: the same text and photo in every slideshow. `photo`: index into the run's photos. */
export type CampaignCard = { role: 'item' | 'cta'; title: string; body: string; photo: number | null };

/** The editor's state, stored on the run. `hookPhotos`: indexes into the run's photos, in rotation order. */
export type CampaignDraft = {
  hooks: string[];
  hookPhotos: number[];
  /** Content cards, then the CTA card last. */
  cards: CampaignCard[];
  look: HookStyleId;
};

export const emptyCampaignDraft = (): CampaignDraft => ({
  hooks: [],
  hookPhotos: [],
  cards: [
    ...Array.from({ length: CAMPAIGN_START_SLIDES - 2 }, (): CampaignCard => ({ role: 'item', title: '', body: '', photo: null })),
    { role: 'cta', title: '', body: '', photo: null },
  ],
  look: 'default',
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

/** Which slide the import is for: the hook (adds to the rotation) or one card (replaces its photo). */
export type CampaignPhotoTarget = { slot: 'hook' } | { slot: 'card'; card: number };

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
