/** One kind of generation on one day: the route that started it, how many paid calls, and what they cost us. */
export type ActivityLineDto = { label: string; calls: number; usdMicros: number };

/** One day, in the viewer's time zone. `day` is "2026-11-12". credits = photos/credits the user spent that day (refunds netted). */
export type ActivityDayDto = { day: string; usdMicros: number; credits: number; lines: ActivityLineDto[] };

export type ActivityTotalsDto = { usdMicros: number; credits: number };

/** Dev-only billing Activity tab. OpenAI calls are left out on purpose (not a real cost for us). */
export type ActivityDto = {
  days: ActivityDayDto[];
  today: ActivityTotalsDto;
  week: ActivityTotalsDto;
  month: ActivityTotalsDto;
};
