/**
 * Slideshow workspace onboarding: the flow shown while a new workspace's first run builds. Answers are saved for stats
 * only; generation never reads them. Option keys are stable: never store or send the display label.
 */

export const GOAL_KEYS = ['leads', 'sales', 'trust', 'followers', 'consistency'] as const;
export type GoalKey = (typeof GOAL_KEYS)[number];

export const PAIN_KEYS = ['no_time', 'no_ideas', 'camera_shy', 'low_views', 'editing'] as const;
export type PainKey = (typeof PAIN_KEYS)[number];

export const POSTING_MODES = ['autopilot', 'approve_first', 'ideas_only'] as const;
export type PostingMode = (typeof POSTING_MODES)[number];
export const DEFAULT_POSTING_MODE: PostingMode = 'approve_first';

export const MONTHLY_SPENDS = ['none', 'under_200', 'from_200_to_1000', 'over_1000'] as const;
export type MonthlySpend = (typeof MONTHLY_SPENDS)[number];

/** Screens: 0 value prop, 1 goals, 2 difficulties, 3 hands-on, 4 live build, 5 spend, 6 ready. */
export const ONBOARDING_LAST_STEP = 6;
/** Screens with a step counter, back arrow and Skip. */
export const FIRST_COUNTED_STEP = 1;
export const LAST_COUNTED_STEP = 5;
export const OTHER_TEXT_MAX = 140;

export type OnboardingProfileDto = {
  goals: GoalKey[];
  goalsOther: string | null;
  pains: PainKey[];
  painsOther: string | null;
  postingMode: PostingMode;
  monthlySpend: MonthlySpend | null;
  lastStep: number;
  skippedSteps: number[];
  completedAt: string | null;
};

/** PATCH body: any answer, plus the step to resume on and the step just skipped. */
export type OnboardingPatch = Partial<Pick<OnboardingProfileDto, 'goals' | 'goalsOther' | 'pains' | 'painsOther' | 'postingMode' | 'monthlySpend' | 'lastStep'>> & {
  skippedStep?: number;
};

/** `profile` null: this workspace does not get the flow (not its first run, or an older workspace). */
export type OnboardingResponse = { profile: OnboardingProfileDto | null };

export const isGoalKey = (v: unknown): v is GoalKey => (GOAL_KEYS as readonly unknown[]).includes(v);
export const isPainKey = (v: unknown): v is PainKey => (PAIN_KEYS as readonly unknown[]).includes(v);
export const isPostingMode = (v: unknown): v is PostingMode => (POSTING_MODES as readonly unknown[]).includes(v);
export const isMonthlySpend = (v: unknown): v is MonthlySpend => (MONTHLY_SPENDS as readonly unknown[]).includes(v);
