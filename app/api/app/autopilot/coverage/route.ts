import { NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { OFF_CALENDAR } from '../../../../../src/server/calendar/calendar';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

const DAY = 86_400_000;
const HORIZON = 30;
const WEEK = 7;

/**
 * GET — how much of her next 30 days holds a post (any source), and how many of the next 7 are empty
 * (docs/business-studios/15-realtor-autopilot-plan.md §3.1, Phase E).
 */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const today = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
  const rows = await prisma.postSlot.findMany({
    where: { workspaceId: ws.id, scheduledFor: { gte: today, lt: new Date(today.getTime() + HORIZON * DAY) }, status: { notIn: OFF_CALENDAR } },
    select: { scheduledFor: true },
  });
  const dates = new Set(rows.map((r) => r.scheduledFor.toISOString().slice(0, 10)));
  const week = Array.from({ length: WEEK }, (_, i) => new Date(today.getTime() + i * DAY).toISOString().slice(0, 10));
  return NextResponse.json({ planned: dates.size, days: HORIZON, emptyThisWeek: week.filter((d) => !dates.has(d)).length });
});
