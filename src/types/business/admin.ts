/** Client-safe admin DTOs. */

export type BusinessMetrics = {
  from: string;
  signups: { brand: number; shop: number };
  onboardingCompleted: number;
  trials: number;
  paidPayments: number;
  revenueUsdCents: number;
  revenueVnd: number;
  activePlans: Record<string, number>;
  batches: number;
  itemsReady: number;
  itemsFailed: number;
  redoRate: number;
  redoReasons: Record<string, number>;
  providerCostUsd: number;
  trialToPaid: number;
  shopAccuracy: { photos: number; firstTry: number; rate: number | null; byCategory: { category: string; photos: number; rate: number }[]; passesGate: boolean };
};
