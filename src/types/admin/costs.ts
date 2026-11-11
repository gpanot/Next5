/** One kind of paid call on one day: same route, provider and model. */
export type CostLineDto = { feature: string | null; provider: string; model: string; calls: number; usdMicros: number };

/** One day of a user's API spending, in the admin's time zone. `day` is "2026-10-16". */
export type CostDayDto = { day: string; usdMicros: number; calls: number; lines: CostLineDto[] };

export type UserCostsDto = { days: CostDayDto[] };
