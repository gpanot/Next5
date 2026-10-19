/**
 * Auto Slideshow — client-safe types shared by the API routes and the admin UI.
 * A website URL in, 1-20 TikTok photo slideshows out, each built on a proven model from the Slideshow Knowledge Center.
 * Pipeline: 1 profile → 2 Hormozi levers → 3 plan (pick models + topics + photo set) → 4 write slides → 5 photos → 6 render.
 */

import type { ConnectionDto, SocialProviderDto } from '../business/integrations';
import type { BrandProfile } from './companyIntel';
import type { ContentGoal } from './contentGoals';
import type { HookStyleId } from '../hookStyle';
import type { TextAt, TextLook } from '../slideText';
import type { StoreBadge } from '../storeBadges';
import type { BrandLever, StepCost } from './metaAds';
import type { BankCombo } from './slideshowBank';
import type { SlideRole } from './slideshowKnowledge';

export const AUTO_STEPS = [1, 2, 3, 4, 5, 6] as const;
export type AutoStep = (typeof AUTO_STEPS)[number];

export const AUTO_STEP_LABELS: Record<AutoStep, string> = {
  1: 'Scan',
  2: 'Proof',
  3: 'Models',
  4: 'Write',
  5: 'Photos',
  6: 'Render',
};

/** 'HELD': a Prospect Pack's run waiting after step 3 for the admin to approve its Brand Cast faces. */
export type AutoRunStatus = `STEP_${AutoStep}_RUNNING` | 'HELD' | 'COMPLETED' | 'FAILED';

export const MIN_SLIDESHOWS = 1;
export const MAX_SLIDESHOWS = 20;
export const DEFAULT_SLIDESHOWS = 5;

export const isSlideshowCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= MIN_SLIDESHOWS && (v as number) <= MAX_SLIDESHOWS;

/** One planned slideshow. Bank picks (`bank` set) name the Slideshow Bank parts; older picks name a proven model. */
export type SlideshowPick = {
  /** Null on bank picks. */
  modelId: string | null;
  modelName: string;
  hookPattern: string;
  /** The value topic, e.g. "putting mistakes beginners make". */
  topic: string;
  /** What the slideshow is for; missing on plans made before goals. */
  goal?: ContentGoal;
  /** The Slideshow Bank meat, hook and CTA this slideshow uses. */
  bank?: BankCombo;
};

/** Step 3 checkpoint. */
export type AutoPlan = {
  picks: SlideshowPick[];
  /** Mood photo descriptions shared by the run (older runs). Bank runs leave it empty: every slide has its own photo. */
  photoPrompts: string[];
  /** True when no approved model fit and drafts were used. */
  usedDrafts: boolean;
  /** The Slideshow Bank the picks come from; true `bankBuilt` when this run built it. */
  bankId?: string;
  bankBuilt?: boolean;
  /** Combos the next "Get more" makes as they are (kept calendar ideas), instead of picking. Step 3 drops them once used. */
  requested?: BankCombo[];
  /** The brand face the last "Get more" asked for (Brand Cast campaign picker); missing: the faces take turns. */
  castId?: string;
  /** "Get more" batches asked for while the run was busy, oldest first. Each starts once the batch before it is done
   *  (./server/autoSlideshow/more.ts); the run's `count` already includes them, so they show as "still being made". */
  queued?: QueuedMore[];
};

export type QueuedMore = { count: number; castId?: string };

/** Step 5 checkpoint: one generated photo per prompt (null when that image failed). */
/** `hook`: made for one slideshow's first slide (older runs). `slide`: made for one slide, named by `owner`
 *  ("slideshowId:slideIndex"), so two slideshows on the same bank meat get different images. Other photos are the run's
 *  shared pool. `deleted`: the owner removed this photo from Settings; a re-run keeps it removed instead of making it again. */
/** `refs`: storage keys of the reference images it is made from (brand cast member first, then the product), `refNote`
 *  what they are; `brandPhotoKey`: a brand photo used as it is instead of a generated one (photo plan, since 2026-10-10). */
export type AutoPhoto = {
  prompt: string;
  imageKey: string | null;
  error: string | null;
  kind?: 'hook' | 'slide';
  owner?: string;
  /** Slideshow whose "New" photo button made this one, so its picker keeps it as an alternative. */
  altFor?: string;
  deleted?: true;
  heads?: HeadBox[];
  gen?: PhotoGen;
  refs?: string[];
  refNote?: string;
  brandPhotoKey?: string;
};

/** How a photo was made, kept so it can be made again for a test. `prompt` above is only the scene; `sentPrompt` is the
 *  full text the model got (scene + brand look + style). Missing on photos made before 2026-10-02. */
/** `refs`: how many reference images went with the prompt. */
export type PhotoGen = { sentPrompt: string; model: string; ratio: string; highRes: boolean; taskId: string; styleVersion: string; createdAt: string; refs?: number };

/** One human head in a photo, as shares (0-1) of its width and height. Step 6 keeps the slide text off these. */
export type HeadBox = { top: number; left: number; bottom: number; right: number };

export type AutoSlide = {
  role: SlideRole;
  title: string;
  body: string;
  /** Index into the run's photo set. */
  photoIndex: number;
  /** Scene made as this slide's own photo in step 5 (every slide on bank runs; the hook slide only on older runs). */
  photoPrompt?: string;
  /** Photo plan (step 4, since 2026-10-10): reference images for this slide's photo (storage keys), what they are, a
   *  brand photo used as it is, and the brand cast member it shows. */
  photoRefs?: string[];
  photoRefNote?: string;
  brandPhotoKey?: string;
  castId?: string;
  /** Hook and CTA slides: their look, picked in the editor (types/hookStyle.ts). Unset = default. */
  look?: TextLook;
  /** Where the text was moved to by hand (the editors' drag); unset = its usual spot, off the photo's heads. */
  textAt?: TextAt;
  /** Content slides: true when the text was unlocked to move alone. Unset = locked, so dragging it moves the text of
   *  every locked content slide up or down with it. */
  textFree?: boolean;
  /** The line under the headline's own look, picked apart from the headline's (`look`). Unset = plain white text. */
  bodyLook?: TextLook;
  /** CTA slides made from a campaign: the app store badges, in a centered row apart from the text. Unset = none. */
  badges?: StoreBadge[];
  /** The badge row's top, as a share of the height; unset = HOME_BADGES_Y. */
  badgesAt?: number;
  /** Where the last render put the text, so the editor drags it from there. Unset on slides rendered before 2026-10-12. */
  placedAt?: TextAt;
  /** Rendered 1080x1920 JPEG (1080x1350 before 2026-10-10), once step 6 ran. */
  imageKey: string | null;
};

/** One photo of the run's set, for the editor's picker (url null when that photo failed). `showId`: the slideshow it
 *  was made for (its slide photo or a "New" one); null for the run's shared pool. */
export type AutoPhotoDto = { index: number; prompt: string; url: string | null; showId: string | null };

export type AutoSlideshowStatus = 'written' | 'rendering' | 'ready' | 'failed';

export type AutoSlideDto = AutoSlide & { imageUrl: string | null };

/** True for content slides (every slide but the hook and CTA). */
export const isContentSlide = (slide: Pick<AutoSlide, 'role'>) => slide.role !== 'hook' && slide.role !== 'cta';

/** The slides whose text moves when slide `index`'s text is dragged: every locked content slide when it is one, else
 *  that slide alone. */
export const linkedTextSlides = (slides: Pick<AutoSlide, 'role' | 'textFree'>[], index: number): number[] => {
  const locked = (s: Pick<AutoSlide, 'role' | 'textFree'>) => isContentSlide(s) && !s.textFree;
  const slide = slides[index];
  if (!slide || !locked(slide)) return [index];
  return slides.flatMap((s, i) => (locked(s) ? [i] : []));
};

/** A background track from the Assets Library; `url` plays in the browser. */
/** `durationSec`: full track length, measured when the track was described; null when not described yet. */
export type AutoTrackDto = { assetId: string; name: string; url: string; startAt: number; durationSec?: number | null };

export type AutoSlideshowDto = {
  id: string;
  position: number;
  modelId: string | null;
  modelName: string;
  hookPattern: string;
  topic: string;
  /** Null on slideshows made before goals. */
  goal: ContentGoal | null;
  slides: AutoSlideDto[];
  caption: string;
  hashtags: string[];
  /** Background music for the preview and ZIP (TikTok's photo API adds its own sound). */
  audio: AutoTrackDto | null;
  /** Track Jev matched to this slideshow at generation; null on older slideshows or when Jev was unavailable. */
  recommendedAudioId: string | null;
  /** This slideshow's TikTok post, once one was scheduled or sent. */
  /** The post shown on the calendar: the first live one (TikTok first), else the latest. */
  post: AutoPostDto | null;
  /** Every platform this slideshow was approved for. */
  posts: AutoPostDto[];
  /** Where it waits on the Calendar for approval (ISO); null: the Calendar places it in the next free slot. */
  plannedAt: string | null;
  status: AutoSlideshowStatus;
  error: string | null;
};

export type AutoRunDto = {
  id: string;
  url: string;
  count: number;
  /** Workspace whose TikTok account posts; null until picked. */
  workspaceId: string | null;
  status: AutoRunStatus;
  failedStep: AutoStep | null;
  error: string | null;
  profile: BrandProfile | null;
  levers: BrandLever[] | null;
  plan: AutoPlan | null;
  photos: AutoPhoto[] | null;
  stepTimings: Partial<Record<AutoStep, number>>;
  stepCosts: Partial<Record<AutoStep, StepCost>>;
  slideshows: AutoSlideshowDto[];
  createdAt: string;
  /** Start of the latest work on the run (a "Get more" batch restarts it). */
  startedAt: string;
  finishedAt: string | null;
};

export type AutoRunSummary = {
  id: string;
  url: string;
  brandName: string | null;
  count: number;
  readyCount: number;
  status: AutoRunStatus;
  createdAt: string;
};

// ── Phase 4: posting (TikTok, Instagram) ────────────────────────────────────

export type PostPlatform = 'tiktok' | 'instagram' | 'youtube';
export const POST_PLATFORMS: readonly PostPlatform[] = ['tiktok', 'instagram', 'youtube'];
export const PLATFORM_LABELS: Record<PostPlatform, string> = { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube Shorts' };
export const isPostPlatform = (v: unknown): v is PostPlatform => v === 'tiktok' || v === 'instagram' || v === 'youtube';

/** Who can see a YouTube Short. Until Google audits the app, YouTube keeps every upload private whatever is picked. */
export type YouTubePrivacyChoice = 'private' | 'unlisted' | 'public';
export const YOUTUBE_PRIVACY_LABELS: Record<YouTubePrivacyChoice, string> = { private: 'Only me', unlisted: 'Anyone with the link', public: 'Public' };

export type AutoPostStatus = 'scheduled' | 'sending' | 'processing' | 'posted' | 'failed' | 'canceled';

/** A post's latest numbers; a field is missing when the platform does not give it. */
export type PostStats = { views?: number; likes?: number; comments?: number; shares?: number; saves?: number; reach?: number };

export type AutoPostDto = {
  id: string;
  slideshowId: string;
  platform: PostPlatform;
  status: AutoPostStatus;
  scheduledAt: string;
  privacyLevel: string;
  postUrl: string | null;
  error: string | null;
  attempts: number;
  postedAt: string | null;
  stats: PostStats | null;
  statsAt: string | null;
};

/** The accounts a run can post to: its workspace's TikTok and Instagram, and which platforms are set up on our side. */
export type RunAccountsDto = {
  workspaceId: string | null;
  accounts: Partial<Record<PostPlatform, { username: string | null; avatarUrl: string | null }>>;
  configured: Record<PostPlatform, boolean>;
};

/** A workspace with a TikTok account connected (connected by its owner in the app's Settings). */
export type TikTokWorkspaceDto = { workspaceId: string; workspaceName: string; username: string | null; avatarUrl: string | null };

/** A workspace in the admin's TikTok accounts list; `connectedAt` null when it has no TikTok account. */
export type TikTokAccountDto = {
  workspaceId: string;
  workspaceName: string;
  product: string;
  ownerEmail: string;
  username: string | null;
  avatarUrl: string | null;
  connectedAt: string | null;
};

/** What TikTok says about the creator right now; shown to the approver before posting (TikTok UX rule). */
/** `canDraft`: the account granted video.upload, so posts can go to its TikTok drafts (inbox) instead of the profile. */
export type CreatorInfoDto = { nickname: string; username: string; avatarUrl: string | null; privacyOptions: string[]; commentDisabled: boolean; duetDisabled: boolean; stitchDisabled: boolean; canDraft: boolean };

/** Stored as a TikTok post's privacy when it goes to the creator's drafts: they pick privacy and post it in the app. */
export const TIKTOK_DRAFT = 'DRAFT';

/** TikTok's wording when disclosure is on and no box is ticked: Post stays disabled until one is. */
export const DISCLOSE_MISSING = 'You need to indicate if your content promotes yourself, a third party, or both.';
export const BRANDED_PRIVATE = 'Branded content visibility cannot be set to private.';

export const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
  DRAFT: 'Sent to drafts',
};

export const isTerminalAutoStatus = (s: AutoRunStatus) => s === 'COMPLETED' || s === 'FAILED';

export const currentAutoStep = (s: AutoRunStatus): number => (s === 'COMPLETED' ? 7 : s === 'FAILED' ? 0 : s === 'HELD' ? 4 : Number(s.charAt(5)));

/** Most live workspaces one user can have. */
export const MAX_WORKSPACES = 10;

/** One of a user's Auto Slideshow workspaces (one per website). */
/** Slideshows of a workspace, as on the calendar: ready to post, scheduled (or on their way), posted. */
export type WorkspacePostCounts = { ready: number; scheduled: number; posted: number };

export type SlideshowWorkspaceDto = { id: string; name: string; websiteUrl: string | null; tiktokUsername: string | null; instagramUsername: string | null; createdAt: string; counts: WorkspacePostCounts };

/** A deleted workspace the user can still restore, until `purgeAt`. */
/** `purgeAt`: when it is deleted for good; `deletingForever`: "Delete forever" was tapped, so that is within 2 minutes. */
export type DeletedWorkspaceDto = { id: string; name: string; websiteUrl: string | null; deletedAt: string; purgeAt: string; deletingForever: boolean };

/** The signed-in user behind /slideshow: profile, the current workspace and the accounts connected to it. */
export type SlideshowMeDto = {
  email: string;
  displayName: string | null;
  workspace: SlideshowWorkspaceDto;
  connections: ConnectionDto[];
  /** Platforms whose developer keys are set on our side. */
  available: SocialProviderDto[];
  /** Settings → Profile: the 8 am email about today's posts waiting for approval. */
  approvalEmailEnabled: boolean;
  /** Testing switch: Ideas-page Blitz cards get stock photos even when paid. Null when this user may not see it. */
  stockImagesOnly: boolean | null;
  /** Testing switch: Blitz cards always get AI images, even before any payment. Null when this user may not see it. */
  aiImagesOnly: boolean | null;
  /** Testing switch: Hooks Volume's "Generate the entire slideshows" uses stock photos even when paid. Null when this user may not see it. */
  hooksVolumeStockOnly: boolean | null;
};

/** One generated photo of a user's runs, as listed in Settings → Photos. */
export type AssetDto = {
  runId: string;
  index: number;
  brandName: string | null;
  prompt: string;
  url: string | null;
  /** The photo was never made (generation failed). A photo that fails to load in the browser is also treated as broken. */
  failed: boolean;
  /** How many slides were made from it. */
  usedBy: number;
  createdAt: string;
};
