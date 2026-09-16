import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../src/server/api';
import { createListing, listListings, toListingDto } from '../../../../src/server/listings/listings';
import { readJsonObject } from '../../../../src/server/http';
import { requireWorkspace } from '../../../../src/server/workspaces/workspaces';

const list = async (workspaceId: string) =>
  NextResponse.json({ listings: await Promise.all((await listListings(workspaceId)).map(toListingDto)) });

/** GET /api/app/listings — her properties and their rooms. */
export const GET = authedRoute(async (_req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  return list(ws.id);
});

/** POST { label, attest, visibleAiTag } — she confirms she represents the property. */
export const POST = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  await createListing(ws, {
    label: String(body.label ?? ''),
    attest: body.attest === true,
    visibleAiTag: body.visibleAiTag === true,
  });
  return list(ws.id);
});
