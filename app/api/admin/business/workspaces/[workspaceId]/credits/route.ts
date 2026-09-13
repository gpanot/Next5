import { prisma } from '../../../../../../../src/lib/db';
import { adminRoute, audit, json } from '../../../../../../../src/server/admin/route';
import { grant } from '../../../../../../../src/server/credits/ledger';
import { withSerializable } from '../../../../../../../src/server/db/transaction';
import { HttpError } from '../../../../../../../src/server/http';

type Ctx = RouteContext<'/api/admin/business/workspaces/[workspaceId]/credits'>;

/** POST { amount, note, expiresInDays? } — grants bonus photos (positive only in v1). */
export const POST = adminRoute<Ctx>(async (req, ctx) => {
  const { workspaceId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { amount?: number; note?: string; expiresInDays?: number };
  const amount = Math.floor(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000) throw new HttpError(400, 'invalid_amount', 'Amount must be between 1 and 1000.');
  if (!body.note?.trim()) throw new HttpError(400, 'note_required', 'Add a reason.');
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId } });
  if (!ws) throw new HttpError(404, 'workspace_not_found', 'Workspace not found.');
  const refId = `admin-${Date.now()}`;
  const expiresAt = body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86_400_000) : null;
  await withSerializable((tx) => grant(tx, { workspaceId, bucket: 'bonus', amount, reason: 'admin_adjust', refType: 'admin', refId, expiresAt, note: body.note?.slice(0, 200) }));
  await audit('grant_credits', 'workspace', workspaceId, { amount, note: body.note, expiresAt: expiresAt?.toISOString() ?? null });
  return json({ granted: amount });
});
