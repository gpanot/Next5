import { adminRoute, audit, json } from '../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../src/server/http';
import { decideClaim } from '../../../../../../src/server/promise/promise';

type Ctx = RouteContext<'/api/admin/business/promise/[claimId]'>;

/** POST { decision: 'grant' | 'decline', note? } */
export const POST = adminRoute<Ctx>(async (req, ctx) => {
  const { claimId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { decision?: string; note?: string };
  if (body.decision !== 'grant' && body.decision !== 'decline') throw new HttpError(400, 'invalid_decision', 'Choose grant or decline.');
  const claim = await decideClaim(claimId, body.decision, body.note?.slice(0, 500) ?? null);
  await audit(`promise_${body.decision}`, 'promise_claim', claim.id, { note: body.note ?? null });
  return json({ status: claim.status });
});
