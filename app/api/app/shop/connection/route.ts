import { after, NextResponse } from 'next/server';
import { prisma } from '../../../../../src/lib/db';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { toConnectionDto } from '../../../../../src/server/shopImport/dto';
import { connectStore, downloadPendingImages, refreshConnection } from '../../../../../src/server/shopImport/service';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

export const maxDuration = 60;

/** GET — the store connection; finishes a completed import (poll fallback for the Apify webhook). */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'shop');
  const existing = await prisma.shopConnection.findUnique({ where: { workspaceId_platform: { workspaceId: ws.id, platform: 'tiktok_shop' } } });
  const connection = existing ? await refreshConnection(existing) : null;
  if (existing?.status === 'syncing' && connection?.status === 'ready') after(() => downloadPendingImages(ws.id, 60).then(() => undefined));
  return NextResponse.json({ connection: toConnectionDto(connection) });
});

/** POST { url, attest } — connect a TikTok Shop store and start importing its catalog. */
export const POST = authedRoute(async (req, session) => {
  await enforceRateLimit(`shop-connect:${session.userId}`, 6, 3600);
  const body = await readJsonObject(req);
  const ws = await requireWorkspace(session.userId, 'shop');
  const connection = await connectStore(ws, String(body.url ?? ''), body.attest === true);
  return NextResponse.json({ connection: toConnectionDto(connection) }, { status: 201 });
});
