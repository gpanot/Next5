import { NextResponse } from 'next/server';
import { prisma } from '../../../../../../src/lib/db';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError } from '../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';
import { toConnectionDto } from '../../../../../../src/server/shopImport/dto';
import { syncStore } from '../../../../../../src/server/shopImport/service';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';

/** POST — sync the store now (prices, sold counts, new and removed products). */
export const POST = authedRoute(async (_req, session) => {
  await enforceRateLimit(`shop-sync:${session.userId}`, 4, 3600);
  const ws = await requireWorkspace(session.userId, 'shop');
  const connection = await prisma.shopConnection.findUnique({ where: { workspaceId_platform: { workspaceId: ws.id, platform: 'tiktok_shop' } } });
  if (!connection) throw new HttpError(404, 'no_connection', 'Connect your store first.');
  return NextResponse.json({ connection: toConnectionDto(await syncStore(connection)) });
});
