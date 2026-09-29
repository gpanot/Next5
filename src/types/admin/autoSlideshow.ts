/**
 * Auto Slideshow — client-safe types shared by the API routes and the admin UI.
 * A website URL in, 1-20 TikTok photo slideshows out, each built on a proven model from the Slideshow Knowledge Center.
 * Pipeline: 1 profile → 2 Hormozi levers → 3 plan (pick models + topics + photo set) → 4 write slides → 5 photos → 6 render.
 */

import type { BrandProfile } from './companyIntel';
import type { BrandLever, StepCost } from './metaAds';
import type { SlideRole } from './slideshowKnowledge';

export const AUTO_STEPS = [1, 2, 3, 4, 5, 6] as const;
export type AutoStep = (typeof AUTO_STEPS)[number];

export const AUTO_STEP_LABELS: Record<AutoStep, string> = {
  1: 'Read site',
  2: 'Proof',
  3: 'Pick models',
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
export type AutoPhoto = { prompt: string; imageKey: string | null; error: string | null };

export type AutoSlide = {
  role: SlideRole;
  title: string;
  body: string;
  /** Index into the run's photo set. */
  photoIndex: number;
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
  post: AutoPostDto | null;
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

// ── Phase 4: TikTok posting ─────────────────────────────────────────────────

export type AutoPostStatus = 'scheduled' | 'sending' | 'processing' | 'posted' | 'failed' | 'canceled';

export type AutoPostDto = {
  id: string;
  slideshowId: string;
  status: AutoPostStatus;
  scheduledAt: string;
  privacyLevel: string;
  postUrl: string | null;
  error: string | null;
  attempts: number;
  postedAt: string | null;
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
