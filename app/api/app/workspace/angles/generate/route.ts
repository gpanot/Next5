import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../../src/server/api';
import { HttpError, readJsonObject } from '../../../../../../src/server/http';
import { generateAnglesForWorkspace } from '../../../../../../src/server/ai/anglesExtractor';
import { requireWorkspace } from '../../../../../../src/server/workspaces/workspaces';
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

  // Fire-and-forget — don't await so the client gets an instant response.
  void generateAnglesForWorkspace(ws.id);

  return NextResponse.json({ started: true });
});
