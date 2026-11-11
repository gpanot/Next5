// Shared by the Admin › Kallaway › Hooks route and page. The 6 hook power words from Kallaway's "6 words" video.

/** The 4 core parts every hook needs, then the 2 optional ones. */
export const HOOK_PARTS = ['subject', 'action', 'objective', 'contrast', 'proof', 'time'] as const;
export type HookPart = (typeof HOOK_PARTS)[number];
export const CORE_PARTS: readonly HookPart[] = ['subject', 'action', 'objective', 'contrast'];

/** Exact words from the hook for each part. Empty string when the part is absent (or only implied). */
export type HookParts = Record<HookPart, string>;

/** Each variant puts a different subject in the seat, so the 3 tests differ on one clear knob. */
export const HOOK_SUBJECTS = ['viewer', 'creator', 'named'] as const;
export type HookSubject = (typeof HOOK_SUBJECTS)[number];

export type HookVariant = {
  subjectType: HookSubject;
  /** Spoken line, 0 to 3 seconds. */
  spoken: string;
  /** Bold on-screen text for the first frame, taken from the hook. */
  onScreen: string;
  /** Alternative on-screen text that names who it is for and the topic, so it reads alone with sound off. */
  onScreenAudience: string;
  parts: HookParts;
  /** Base state the viewer believes today, and the new reality the hook opens. */
  baseState: string;
  newReality: string;
  why: string;
};

export type OriginalHookAnalysis = { hook: string; parts: HookParts; verdict: string };

export type KallawayHooksResult = { original: OriginalHookAnalysis; variants: HookVariant[] };
