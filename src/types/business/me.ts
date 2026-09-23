/** Client-safe DTO for GET /api/app/me. */

export type ProductLineDto = 'brand' | 'shop';

export type BannerDto =
  | { type: 'payment_underpaid'; paymentId: string }
  | { type: 'plan_ended'; endedAt: string }
  | { type: 'renewal_due'; endsAt: string; daysLeft: number }
  | { type: 'low_credits'; remaining: number }
  | { type: 'trial_no_plan' };

export type SubscriptionDto = {
  id: string;
  planId: string;
  planName: string;
  termMonths: number;
  status: 'pending' | 'active' | 'expired' | 'cancelled';
  startsAt: string | null;
  endsAt: string | null;
  nextGrantAt: string | null;
  monthlyCredits: number;
};

export type WorkspaceAngleDto = {
  id: string;
  label: string;
  /** 0-100; all angles in the workspace should sum to ~100 */
  weight: number;
  position: number;
  /** "ai" = extracted from website | "user" = manually added */
  source: string;
};

export type WorkspaceDto = {
  id: string;
  product: ProductLineDto;
  name: string;
  industry: string | null;
  handle: string | null;
  brandColors: string[];
  visibleAiTag: boolean;
  defaultFormats: string[];
  onboardingStep: number;
  onboardingCompleted: boolean;
  trialUsed: boolean;
  hasIdentity: boolean;
  /** True when the workspace has at least one active influencer with a base portrait. */
  hasInfluencers: boolean;
  setCount: number;
  // Brand intelligence
  websiteUrl: string | null;
  /** "never" | "rarely" | "sometimes" | "often" | "always" */
  mentionFrequency: string;
  /** null = all | "men" | "women" */
  genderFilter: string | null;
  /** "idle" | "pending" | "done" | "failed" */
  anglesGenState: string;
  angles: WorkspaceAngleDto[];
  // Business profile — what the Template Engine matches on (Phase 0B)
  /** "b2c" | "b2b" | "both" — null until answered at signup. */
  audienceType: string | null;
  /** One line: what the business or product is. */
  promoting: string | null;
  /** One line: the core value proposition. */
  offer: string | null;
};

export type MeDto = {
  /** `consents`: consent types accepted at the current version. */
  user: { id: string; email: string; displayName: string | null; consents: string[] };
  workspaces: { id: string; product: ProductLineDto; name: string }[];
  workspace: WorkspaceDto | null;
  subscription: SubscriptionDto | null;
  queuedRenewal: SubscriptionDto | null;
  plan: { id: string; name: string; highRes: boolean; postKit: boolean; allStudioModels: boolean } | null;
  balance: { total: number; trial: number; plan: number; topup: number; bonus: number; nextExpiry: { at: string; credits: number } | null };
  banners: BannerDto[];
  hasConsumerBookings: boolean;
};
