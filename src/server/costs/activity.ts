// server-only — never import from a 'use client' file.
// Billing → Activity (dev only): what one user generated per day, the credits it took from them, and what it cost us
// in provider calls. OpenAI rows are skipped: that spend is not real for us (2026-11-12).

import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/db';
import type { ActivityDayDto, ActivityDto, ActivityTotalsDto } from '../../types/business/activity';

const DAYS = 30;
const SKIPPED_PROVIDERS = ['openai'];
/** Ledger rows that take credits from the user (refunds give them back). */
const SPEND_REASONS = ['batch_reserve', 'redo_charge', 'item_refund'];

/** Browsers may send old names Postgres does not know (Asia/Saigon): map them, then check, else UTC. */
const ALIASES: Record<string, string> = { 'Asia/Saigon': 'Asia/Ho_Chi_Minh', 'Asia/Calcutta': 'Asia/Kolkata', 'Asia/Katmandu': 'Asia/Kathmandu' };
const safeZone = async (tz: string | null): Promise<string> => {
  const zone = tz ? (ALIASES[tz] ?? tz) : null;
  if (!zone || !/^[A-Za-z_]+(\/[A-Za-z_+-]+)*$/.test(zone)) return 'UTC';
  const known = await prisma.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT 1 AS n FROM pg_timezone_names WHERE name = ${zone} LIMIT 1`);
  return known.length ? zone : 'UTC';
};

/** Readable names for the routes that start paid work. Others fall back to their path. */
const KNOWN: [RegExp, string][] = [
  [/\/listings\/:id\/videos/, 'Listing video'],
  [/\/listings\/:id\/photos|\/listing-photos/, 'Listing photos'],
  [/\/listings/, 'Listing import'],
  [/\/campaigns\/:id\/generate/, 'Campaign generation'],
  [/\/campaigns/, 'Campaigns'],
  [/\/blitz/, 'Blitz'],
  [/\/slideshow|\/auto-slideshow/, 'Auto Slideshow'],
  [/\/onboarding/, 'Onboarding'],
  [/\/influencers|\/cast/, 'Brand Cast'],
];

export const activityLabel = (feature: string | null): string => {
  if (!feature) return 'Background work';
  const path = feature.replace(/^[A-Z]+ /, '');
  const hit = KNOWN.find(([re]) => re.test(path));
  if (hit) return hit[1];
  const parts = path.replace(/^\/api\/(app\/)?/, '').split('/').filter((s) => s && s !== ':id');
  const name = parts.join(' › ').replace(/-/g, ' ');
  return name ? name[0].toUpperCase() + name.slice(1) : path;
};

type CostRow = { day: string; feature: string | null; calls: number; usd_micros: number };
type CreditRow = { day: string; credits: number };

const costRows = (userId: string, zone: string, since: Date) =>
  prisma.$queryRaw<CostRow[]>(Prisma.sql`
    SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day,
           feature, count(*)::int AS calls, sum(cost_usd_micros)::int AS usd_micros
    FROM api_cost_events
    WHERE user_id = ${userId} AND created_at >= ${since} AND provider <> ALL(${SKIPPED_PROVIDERS})
    GROUP BY 1, 2`);

const creditRows = (workspaceId: string, zone: string, since: Date) =>
  prisma.$queryRaw<CreditRow[]>(Prisma.sql`
    SELECT to_char((created_at AT TIME ZONE 'UTC') AT TIME ZONE ${zone}, 'YYYY-MM-DD') AS day, (-sum(delta))::int AS credits
    FROM credit_ledger
    WHERE workspace_id = ${workspaceId} AND created_at >= ${since} AND reason::text = ANY(${SPEND_REASONS})
    GROUP BY 1`);

const dayOf = (date: Date, zone: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: zone }).format(date);

const sumSince = (days: ActivityDayDto[], from: string): ActivityTotalsDto =>
  days.filter((d) => d.day >= from).reduce((t, d) => ({ usdMicros: t.usdMicros + d.usdMicros, credits: t.credits + d.credits }), { usdMicros: 0, credits: 0 });

/** Last 30 days, newest first; each day split by generation kind, most expensive first. */
export const userActivity = async (userId: string, workspaceId: string, tz: string | null): Promise<ActivityDto> => {
  const zone = await safeZone(tz);
  const since = new Date(Date.now() - DAYS * 864e5);
  const [costs, credits] = await Promise.all([costRows(userId, zone, since), creditRows(workspaceId, zone, since)]);

  const byDay = new Map<string, ActivityDayDto>();
  const get = (day: string) => byDay.get(day) ?? byDay.set(day, { day, usdMicros: 0, credits: 0, lines: [] }).get(day)!;
  for (const r of costs) {
    const d = get(r.day);
    d.usdMicros += r.usd_micros;
    const label = activityLabel(r.feature);
    const line = d.lines.find((l) => l.label === label);
    if (line) {
      line.calls += r.calls;
      line.usdMicros += r.usd_micros;
    } else d.lines.push({ label, calls: r.calls, usdMicros: r.usd_micros });
  }
  for (const r of credits) get(r.day).credits += r.credits;

  const days = [...byDay.values()].sort((a, b) => b.day.localeCompare(a.day));
  for (const d of days) d.lines.sort((a, b) => b.usdMicros - a.usdMicros);
  const now = Date.now();
  return {
    days,
    today: sumSince(days, dayOf(new Date(now), zone)),
    week: sumSince(days, dayOf(new Date(now - 6 * 864e5), zone)),
    month: sumSince(days, dayOf(new Date(now - (DAYS - 1) * 864e5), zone)),
  };
};
