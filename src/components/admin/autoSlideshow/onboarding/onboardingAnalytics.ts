import { track, type AnalyticsEvent, type AnalyticsProps } from '../../../../lib/analytics';

type OnboardingEvent = Extract<AnalyticsEvent, `onboarding_${string}`>;

/** What every onboarding event carries. Never the free text a user typed. */
export type TrackContext = { workspaceId: string; step: number; flowStartedAt: number; buildPct: number };

export const trackOnboarding = (event: OnboardingEvent, ctx: TrackContext, extra: AnalyticsProps = {}): void =>
  track(event, { workspaceId: ctx.workspaceId, step: ctx.step, msSinceFlowStart: Date.now() - ctx.flowStartedAt, buildPct: ctx.buildPct, ...extra });
