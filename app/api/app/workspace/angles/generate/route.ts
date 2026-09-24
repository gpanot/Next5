import { NextResponse, after } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { generateAnglesForWorkspace } from '../../../../../../src/server/ai/anglesExtractor';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';
import { prisma } from '../../../../../../src/lib/db';
import type { ProductLineDto } from '../../../../../../src/types/business/me';

const isProduct = (v: unknown): v is ProductLineDto => v === 'brand' || v === 'shop';

/**
 * POST /api/app/workspace/angles/generate
 * { product: "brand" }
 * Kicks off a background angle re-extraction from the workspace's websiteUrl.
 * Returns immediately with { started: true }; caller polls GET /api/app/workspace/angles.
 */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (!isProduct(body.product)) throw new HttpError(400, 'invalid_product', 'Unknown product.');

  const ws = await requireWorkspace(session.userId, body.product);
  if (!ws.websiteUrl) throw new HttpError(422, 'no_website_url', 'Set your website URL first.');

  // Mark 'pending' SYNCHRONOUSLY before responding so the polling loop sees it
  // on its very first call and continues until extraction finishes.
  // (after() runs after the response; without this the first poll sees the old genState
  //  and stops immediately — a race that empties the brand page.)
  await prisma.workspace.update({ where: { id: ws.id }, data: { anglesGenState: 'pending' } });

  // after() keeps the Vercel Lambda alive until extraction completes.
  // generateAnglesForWorkspace skips re-setting 'pending' since we already did it.
  after(() => generateAnglesForWorkspace(ws.id));

  return NextResponse.json({ started: true });
});
