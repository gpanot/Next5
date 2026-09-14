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
  setCount: number;
};

export type MeDto = {
  user: { id: string; email: string; displayName: string | null };
  workspaces: { id: string; product: ProductLineDto; name: string }[];
  workspace: WorkspaceDto | null;
  subscription: SubscriptionDto | null;
  queuedRenewal: SubscriptionDto | null;
  plan: { id: string; name: string; highRes: boolean; postKit: boolean; maxSets: number; allStudioModels: boolean } | null;
  balance: { total: number; trial: number; plan: number; topup: number; bonus: number; nextExpiry: { at: string; credits: number } | null };
  banners: BannerDto[];
  hasConsumerBookings: boolean;
};
