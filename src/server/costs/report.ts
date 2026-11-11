// server-only — never import from a 'use client' file.
// Reads the API cost ledger for Admin → Users: a total per user, and one user's spending day by day.

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { CostDayDto, UserCostsDto } from '../../types/admin/costs';

/** How far back the day-by-day view goes. */
const REPORT_DAYS = 90;

/** All-time spend per user id, plus the spend tied to no user (admin, cron, system work) under `null`. */
export const costTotalsByUser = async (): Promise<Map<string | null, number>> => {
  const rows = await prisma.apiCostEvent.groupBy({ by: ['userId'], _sum: { costUsdMicros: true } });
  return new Map(rows.map((r) => [r.userId, r._sum.costUsdMicros ?? 0]));
};

/** Falls back to UTC when the browser sends a zone Postgres may not know. */
const safeZone = (tz: string | null): string => (tz && /^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(tz) ? tz : 'UTC');

type Row = { day: string; feature: string | null; provider: string; model: string; calls: number; usd_micros: number };

/** One user's spending (userId null = not tied to a user), newest day first, each day split by route, provider and model. */
export const userCostsByDay = async (userId: string | null, tz: string | null): Promise<UserCostsDto> => {
  const zone = safeZone(tz);
  const since = new Date(Date.now() - REPORT_DAYS * 24 * 60 * 60 * 1000);
  const who = userId === null ? Prisma.sql`user_id IS NULL` : Prisma.sql`user_id = ${userId}`;
  const rows = await prisma.$queryRaw<Row[]>(Prisma.sql`
    SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day,
           feature, provider, model, count(*)::int AS calls, sum(cost_usd_micros)::int AS usd_micros
    FROM api_cost_events
    WHERE ${who} AND created_at >= ${since}
    GROUP BY 1, 2, 3, 4
    ORDER BY 1 DESC, 6 DESC`);

  const days = new Map<string, CostDayDto>();
  for (const r of rows) {
    let day = days.get(r.day);
    if (!day) days.set(r.day, (day = { day: r.day, usdMicros: 0, calls: 0, lines: [] }));
    day.usdMicros += r.usd_micros;
    day.calls += r.calls;
    day.lines.push({ feature: r.feature, provider: r.provider, model: r.model, calls: r.calls, usdMicros: r.usd_micros });
  }
  return { days: [...days.values()] };
};
