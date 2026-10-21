/**
 * Slideshow campaigns — client-safe types shared by the API routes and the campaign editor.
 * A campaign is a run built by hand: hook lines rotate with hook photos (one slideshow per hook line), the content and
 * CTA cards are the same in every slideshow. "Generate" renders them; posting reuses the run's posting flow.
 */

import { isHookStyleId } from '../hookStyle';
import { isSlideLook, type TextAt, type TextLook } from '../slideText';
import type { StoreBadge } from '../storeBadges';
import type { PreviewSlide } from '../../components/admin/autoSlideshow/campaigns/previewSlides';
import type { AutoSlideshowDto, HeadBox } from './autoSlideshow';

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
export const MAX_PHOTO_QUERY_CHARS = 80;

/** The line under a card's headline: hidden from the editor for now (2026-10-11), so it is neither drawn nor rendered. */
export const SHOW_CARD_BODY = false;

/** A content or CTA card: the same text in every slideshow. `photo`: index into the run's photos. `morePhotos` (content
 *  cards only): more photos that rotate with the hooks, like the hook photos (slideshow i shows photo i, looping); unset =
 *  the one photo everywhere. `textAt`: where its text was dragged to (unset = the usual spot). */
/** `badges`: the CTA's app store badges; unset = none. `badgesAt`: their row's top (share of the height), moved apart from
 *  the text; unset = HOME_BADGES_Y. */
/** `textFree`: a content card's text unlocked to move alone; unset = locked, so dragging it moves every locked content
 *  card's text with it (as in the Brand Cast editor). */
export type CampaignCard = { role: 'item' | 'cta'; title: string; body: string; photo: number | null; morePhotos?: number[]; textAt?: TextAt; textFree?: boolean; badges?: StoreBadge[]; badgesAt?: number };

/** The cards whose text moves when card `index`'s text is dragged: every locked content card when it is one, else that
 *  card alone. */
export const linkedTextCards = (cards: Pick<CampaignCard, 'role' | 'textFree'>[], index: number): number[] => {
  const locked = (c: Pick<CampaignCard, 'role' | 'textFree'>) => c.role === 'item' && !c.textFree;
  const card = cards[index];
  if (!card || !locked(card)) return [index];
  return cards.flatMap((c, i) => (locked(c) ? [i] : []));
};

/** Photos one content card rotates through, the first included. */
export const MAX_CARD_PHOTOS = 10;

/** A card's photos in rotation order: `photo` first, then `morePhotos`. Empty when it has none. */
export const cardPhotos = (card: Pick<CampaignCard, 'photo' | 'morePhotos'>): number[] => (card.photo === null ? [] : [card.photo, ...(card.morePhotos ?? [])]);

/** The card's photo in slideshow `hookIndex`: its photos loop with the hooks, like the hook photos. */
export const cardPhotoFor = (card: Pick<CampaignCard, 'photo' | 'morePhotos'>, hookIndex: number): number | null => {
  const list = cardPhotos(card);
  return list.length === 0 ? null : list[hookIndex % list.length]!;
};

/** The card with `photos` as its rotation (the first becomes `photo`); `morePhotos` stays unset with one photo. */
export const withCardPhotos = <C extends Pick<CampaignCard, 'photo' | 'morePhotos'>>(card: C, photos: number[]): C => {
  const list = photos.slice(0, MAX_CARD_PHOTOS);
  const next: C = { ...card, photo: list[0] ?? null, morePhotos: list.slice(1) };
  if (list.length <= 1) delete next.morePhotos;
  return next;
};

/** The editor's state, stored on the run. `hookPhotos`: indexes into the run's photos, in rotation order. */
export type CampaignDraft = {
  hooks: string[];
  hookPhotos: number[];
  /** Content cards, then the CTA card last. */
  cards: CampaignCard[];
  /** The text style of each kind of slide: the hook, every content slide (one style for all), the CTA. */
  looks: CampaignLooks;
  /** Where the hook text was dragged to, on every hook photo; unset = the usual spot. */
  hookTextAt?: TextAt;
  /** The post caption every slideshow of the campaign gets (hashtags written in it). */
  caption: string;
  /** Stock photo search for the hook photos ("woman cooking dinner"), written with the hooks: the Hook photos picker
   *  opens on it, and its "Choose for me" picks from its results. */
  hookPhotoQuery?: string;
  /** Background music every slideshow of the campaign gets (an Assets Library track); unset = none. */
  audioAssetId?: string;
};

/** Which kind of slide a text style applies to. */
export type CampaignLookRole = 'hook' | 'content' | 'cta';
export type CampaignLooks = Record<CampaignLookRole, TextLook>;

/** The looks of a stored draft. Drafts saved before 2026-10-11 had one `look` for the hook and the CTA. */
export const looksOf = (d: { looks?: unknown; look?: unknown }): CampaignLooks => {
  const raw = (d.looks ?? {}) as Record<string, unknown>;
  const legacy = isHookStyleId(d.look) ? d.look : 'default';
  const pick = (v: unknown, fallback: TextLook): TextLook => (isHookStyleId(v) || isSlideLook(v) ? v : fallback);
  return { hook: pick(raw.hook, legacy), content: pick(raw.content, 'default'), cta: pick(raw.cta, legacy) };
};

/** The look a slide of this role is drawn in. */
export const lookOfRole = (looks: CampaignLooks, role: 'hook' | 'item' | 'cta'): TextLook => looks[role === 'item' ? 'content' : role];

/** The line under a card's headline as it is drawn: none while the field is hidden. */
export const shownBody = (card: Pick<CampaignCard, 'body'>): string => (SHOW_CARD_BODY ? card.body : '');

/** What the rendered slides depend on (the caption is not drawn): equal keys mean the made slideshows are current. */
const withoutLock = (c: CampaignCard): CampaignCard => {
  const rest = { ...c };
  delete rest.textFree;
  return rest;
};

export const renderKeyOf = (d: CampaignDraft): string =>
  // The text lock changes nothing on the slides: it is left out, so toggling it does not ask for a new render.
  JSON.stringify({ hooks: d.hooks, hookPhotos: d.hookPhotos, cards: d.cards.map(withoutLock), looks: d.looks, ...(d.hookTextAt ? { hookTextAt: d.hookTextAt } : {}) });

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

/** An Unsplash photographer: their name and profile link (with Unsplash's UTM tags). */
export type CampaignCredit = { name: string; url: string };

/** Where "on Unsplash" links in every photo credit, with the UTM tags Unsplash asks for. */
export const UNSPLASH_HOME_URL = 'https://unsplash.com/?utm_source=next5&utm_medium=referral';

/** `url`: small thumb for strips and pickers; `fullUrl`: the photo itself, for the preview. Unsplash photos show from
 *  Unsplash's own URLs (hotlinked, as its API rules ask); our copy is only for the render. `heads`: the faces found in it
 *  (unset until detection ran), so the editor puts the text where the render will, off them. */
export type CampaignPhotoDto = { index: number; url: string | null; fullUrl: string | null; source: CampaignPhotoSource; credit: CampaignCredit | null; heads?: HeadBox[] };

/** What to import into the campaign: a photo the workspace already has, a shared library photo, or an Unsplash photo. */
export type CampaignPhotoRef =
  | { source: 'generated'; runId: string; index: number }
  | { source: 'brand'; id: string }
  | { source: 'shared'; id: string }
  | { source: 'unsplash'; id: string }
  | { source: 'app_shot'; id: string };

/** Which slide the import is for: the hook (adds to the rotation), one card or several cards (replaces their photo), or
 *  one content card's rotation (adds to it). */
/** `replace`: the hook photo (position in the rotation) the pick takes the place of; without it, picks join the rotation. */
export type CampaignPhotoTarget = { slot: 'hook'; replace?: number } | { slot: 'card'; card: number } | { slot: 'cards'; cards: number[] } | { slot: 'cardRotation'; card: number };

/** True when the import is for card `card`. */
export const targetsCard = (target: CampaignPhotoTarget, card: number): boolean =>
  (target.slot === 'card' && target.card === card) || (target.slot === 'cards' && target.cards.includes(card));

/** At most this many post thumbs come with each campaign in the list. */
export const CAMPAIGN_ROW_THUMBS = 6;

export type CampaignSummaryDto = {
  id: string;
  name: string;
  hookCount: number;
  slideshowCount: number;
  scheduledCount: number;
  coverUrl: string | null;
  /** The first hook drawn over a cover that is a bare photo (no slideshow made yet); null when the cover is a made
   *  slide (the hook is already on it) or there is no hook. */
  coverHook: { title: string; look: TextLook; textAt?: TextAt } | null;
  /** False while the campaign still has the default name: lists then show its first hook instead. */
  named: boolean;
  firstHook: string | null;
  /** One small thumb per post (hook), first CAMPAIGN_ROW_THUMBS of them: the made slide, else the hook photo, else null. */
  postThumbs: (string | null)[];
  /** When each of those posts goes out (or went out) on the calendar, same order as postThumbs; null when not scheduled. */
  postDates: (string | null)[];
  /** The first slideshow, played on its card: its slides (made, else drawn from the draft) and its music; null while
   *  there is no photo. */
  /** `fullSlides`: the same slides at full size, for the card's expanded playback (`slides` are thumbs). */
  preview: { slides: PreviewSlide[]; fullSlides: PreviewSlide[]; audio: { url: string; startAt: number } | null } | null;
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
  /** Posts put on the Calendar, waiting for approval there (times still to come). */
  plan: CampaignPlanItem[];
  /** Content "Auto" photos the server is making (or made) in the background, not yet put on their cards. */
  photoJobs: CampaignPhotoJobDto[];
  createdAt: string;
};

/**
 * A Content "Auto" photo made on the server, for content cards `cards`. Running until `photo` (its campaign photo
 * index) lands or it fails; the editor then puts it on the cards and clears the job.
 */
export type CampaignPhotoJobDto = { key: string; cards: number[]; status: 'running' | 'done' | 'failed'; photo: number | null; error: string | null };

/** How a background photo is got: made or found (AI or stock), or a matched library photo copied in. */
export type CampaignPhotoJobSource = { auto: AutoPhotoRequest } | { ref: CampaignPhotoRef };

/** One background photo the editor asks for. */
export type CampaignPhotoJobRequest = { key: string; cards: number[] } & CampaignPhotoJobSource;

/** A campaign post on the Calendar, waiting for approval there: slideshow `position` (hook i) at `at` (ISO). */
export type CampaignPlanItem = { position: number; at: string };

/** A campaign post not on the Calendar yet (not planned, not scheduled): the day panel's Slideshows deck offers it for
 *  a day. `position` is its hook, as the plan wants it. `made`: false while only the draft exists (the deck makes the
 *  campaign first, free); `slides` are then the draft drawn in the browser. */
export type CampaignWaitingDto = { campaignId: string; position: number; made: boolean; slides: PreviewSlide[]; audio: { url: string; startAt: number } | null };

/** The workspace's campaign posts for the Calendar: slideshows planned there (`planned`: id → ISO time) or scheduled.
 *  `campaignOf`: slideshow id → its campaign, so a tap opens the campaign. `waiting`: made ones not on it yet. */
export type CampaignCalendarDto = { slideshows: AutoSlideshowDto[]; planned: Record<string, string>; campaignOf: Record<string, string>; waiting: CampaignWaitingDto[] };

/** One photo of a picker tab (generated, brand, shared, Unsplash), with what importing it needs. */
export type PhotoOptionDto = { key: string; thumbUrl: string; ref: CampaignPhotoRef; label: string; credit: CampaignCredit | null };

export type PhotoTab = 'search' | 'generated' | 'brand' | 'shared';

/** A file the App shot builder keeps (an app screenshot or a background), with its thumb. */
export type AppShotAssetDto = { id: string; url: string };

/** The App shot's background: a scene uploaded or generated, an Unsplash pick, or null (the top stock photo for the text). */
export type AppShotBackground = { source: 'scene'; id: string } | { source: 'unsplash'; id: string } | null;

/** What the App shot builder sends: the pose, the app screenshot, the scene text and the background. */
export type AppShotRequest = { pose: string; screenId: string; scene: string; background: AppShotBackground };

/** Hook line i opens slideshow i; photo i goes with it, and photos loop when there are fewer photos than hooks. */
export const hookPhotoFor = (draft: Pick<CampaignDraft, 'hookPhotos'>, hookIndex: number): number | null =>
  draft.hookPhotos.length === 0 ? null : draft.hookPhotos[hookIndex % draft.hookPhotos.length]!;

/** What still blocks Generate, in the order a person fixes it; empty when the draft is ready. */
/** What Auto writes on an empty CTA when the hook promises a number ("6 ways…": the CTA is the 6th), for the person to
 *  replace. Schedule waits until it is replaced. */
export const CTA_PREFILL = 'Edit your CTA here';

/** The CTA text "Generate the entire slideshows" puts on an empty CTA card. */
export type CampaignCtaText = { title: string; body: string };
export const isCtaPrefill = (title: string): boolean => /^\s*(?:\d+[.)]\s*)?edit your cta here\s*$/i.test(title);

export const campaignProblems = (draft: CampaignDraft): string[] => {
  const problems: string[] = [];
  if (draft.hooks.length === 0) problems.push('Add at least one hook.');
  if (draft.hookPhotos.length === 0) problems.push('Add at least one hook photo.');
  draft.cards.forEach((c, i) => {
    const name = c.role === 'cta' ? 'The CTA card' : `Content card ${i + 1}`;
    if (c.photo === null) problems.push(`${name} needs a photo.`);
    if (!c.title.trim()) problems.push(`${name} needs a headline.`);
    else if (c.role === 'cta' && isCtaPrefill(c.title)) problems.push('Write your CTA: it still says "Edit your CTA here".');
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

/**
 * The content slide count the first hook fixes: one less than its number, the CTA being the last one ("6 ways…" → 5
 * content slides, then the CTA as the 6th). Null lets the writer decide.
 */
/** Auto's price: 1 credit per post, and each hook is one post (whatever the slide count). At least 1 before any hook. */
export const autoCreditCost = (hooks: string[]): number => Math.max(1, hooks.length);

export const autoSlideCount = (hooks: string[]): number | null => {
  const n = hooks[0] ? hookNumber(hooks[0]) : null;
  return n !== null && n - 1 >= 2 && n - 1 <= AUTO_MAX_SLIDES ? n - 1 : null;
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
  /** The CTA card's own AI photo scene (the product in use, ctaPhoto.ts), when the CTA text was sent; else it takes the cover. */
  ctaScene?: string | null;
};

/** One photo for the auto content: an AI photo of a scene (matching the color and light of campaign photo `tonePhoto`,
 *  the first hook photo, when set; `cta`: the CTA photo, made with the Brand Cast face and the product as references),
 *  or the `nth` stock result of a search. */
export type AutoPhotoRequest = { source: 'ai'; scene: string; tonePhoto?: number; cta?: boolean } | { source: 'stock'; query: string; nth: number };

/** The number a hook line promises ("5 ways to…"), or null. */
export const hookNumber = (hook: string): number | null => {
  const n = Number(hook.match(/\d+/)?.[0]);
  return Number.isInteger(n) && n >= MIN_CAMPAIGN_CONTENT && n <= MAX_CAMPAIGN_CONTENT ? n : null;
};
