/**
 * Auto Slideshow — client-safe types shared by the API routes and the admin UI.
 * A website URL in, 1-20 TikTok photo slideshows out, each built on a proven model from the Slideshow Knowledge Center.
 * Pipeline: 1 profile → 2 Hormozi levers → 3 plan (pick models + topics + photo set) → 4 write slides → 5 photos → 6 render.
 */

import type { ConnectionDto, SocialProviderDto } from '../business/integrations';
import type { BrandProfile } from './companyIntel';
import type { BrandLever, StepCost } from './metaAds';
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

export type AutoRunStatus = `STEP_${AutoStep}_RUNNING` | 'COMPLETED' | 'FAILED';

export const MIN_SLIDESHOWS = 1;
export const MAX_SLIDESHOWS = 20;
export const DEFAULT_SLIDESHOWS = 5;

export const isSlideshowCount = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= MIN_SLIDESHOWS && (v as number) <= MAX_SLIDESHOWS;

/** One planned slideshow: which proven model, which of its hooks, and what it teaches. */
export type SlideshowPick = {
  modelId: string;
  modelName: string;
  hookPattern: string;
  /** The value topic, e.g. "putting mistakes beginners make". */
  topic: string;
};

/** Step 3 checkpoint. */
export type AutoPlan = {
  picks: SlideshowPick[];
  /** Mood photo descriptions shared by the run; each slideshow uses them in its own order. */
  photoPrompts: string[];
  /** True when no approved model fit and drafts were used. */
  usedDrafts: boolean;
};

/** Step 5 checkpoint: one generated photo per prompt (null when that image failed). */
/** `hook`: made for one slideshow's first slide. Other photos are the run's shared pool for the remaining slides. */
/** `deleted`: the owner removed this photo from Settings; a re-run keeps it removed instead of making it again. */
export type AutoPhoto = { prompt: string; imageKey: string | null; error: string | null; kind?: 'hook'; deleted?: true };

export type AutoSlide = {
  role: SlideRole;
  title: string;
  body: string;
  /** Index into the run's photo set. */
  photoIndex: number;
  /** Hook slide only: scene that fits the hook, made as its own photo in step 5. */
  photoPrompt?: string;
  /** Rendered 1080x1350 JPEG, once step 6 ran. */
  imageKey: string | null;
};

/** One photo of the run's set, for the editor's picker (url null when that photo failed). */
export type AutoPhotoDto = { index: number; prompt: string; url: string | null };

export type AutoSlideshowStatus = 'written' | 'rendering' | 'ready' | 'failed';

export type AutoSlideDto = AutoSlide & { imageUrl: string | null };

/** A background track from the Assets Library; `url` plays in the browser. */
export type AutoTrackDto = { assetId: string; name: string; url: string; startAt: number };

export type AutoSlideshowDto = {
  id: string;
  position: number;
  modelId: string | null;
  modelName: string;
  hookPattern: string;
  topic: string;
  slides: AutoSlideDto[];
  caption: string;
  hashtags: string[];
  /** Background music for the preview and ZIP (TikTok's photo API adds its own sound). */
  audio: AutoTrackDto | null;
  /** This slideshow's TikTok post, once one was scheduled or sent. */
  /** The post shown on the calendar: the first live one (TikTok first), else the latest. */
  post: AutoPostDto | null;
  /** Every platform this slideshow was approved for. */
  posts: AutoPostDto[];
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

export type PostPlatform = 'tiktok' | 'instagram';
export const POST_PLATFORMS: readonly PostPlatform[] = ['tiktok', 'instagram'];
export const PLATFORM_LABELS: Record<PostPlatform, string> = { tiktok: 'TikTok', instagram: 'Instagram' };
export const isPostPlatform = (v: unknown): v is PostPlatform => v === 'tiktok' || v === 'instagram';

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
export type CreatorInfoDto = { nickname: string; username: string; avatarUrl: string | null; privacyOptions: string[]; commentDisabled: boolean };

export const PRIVACY_LABELS: Record<string, string> = {
  PUBLIC_TO_EVERYONE: 'Everyone',
  MUTUAL_FOLLOW_FRIENDS: 'Friends',
  FOLLOWER_OF_CREATOR: 'Followers',
  SELF_ONLY: 'Only me',
};

export const isTerminalAutoStatus = (s: AutoRunStatus) => s === 'COMPLETED' || s === 'FAILED';

export const currentAutoStep = (s: AutoRunStatus): number => (s === 'COMPLETED' ? 7 : s === 'FAILED' ? 0 : Number(s.charAt(5)));

/** One of a user's Auto Slideshow workspaces (one per website). */
export type SlideshowWorkspaceDto = { id: string; name: string; websiteUrl: string | null; tiktokUsername: string | null; instagramUsername: string | null; createdAt: string };

/** The signed-in user behind /slideshow: profile, the current workspace and the accounts connected to it. */
export type SlideshowMeDto = {
  email: string;
  displayName: string | null;
  workspace: SlideshowWorkspaceDto;
  connections: ConnectionDto[];
  /** Platforms whose developer keys are set on our side. */
  available: SocialProviderDto[];
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
