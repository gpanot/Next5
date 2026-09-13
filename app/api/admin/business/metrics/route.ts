import { adminRoute, json } from '../../../../../src/server/admin/route';
import { businessMetrics } from '../../../../../src/server/admin/metrics';

export const GET = adminRoute(async (req) => {
  const days = Math.min(365, Math.max(1, Number(req.nextUrl.searchParams.get('days') ?? 30)));
  return json({ metrics: await businessMetrics(days) });
});
