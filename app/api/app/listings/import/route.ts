import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { toListingDto } from '../../../../../src/server/listings/listings';
import { startZillowImport } from '../../../../../src/server/listings/zillowImport';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';
import { requireWorkspace } from '../../../../../src/server/workspaces/workspaces';

/** POST { url, attest } — add a property from its Zillow link. Its photos arrive when the import finishes (poll GET …/[id]/import). */
export const POST = authedRoute(async (req, session) => {
  const ws = await requireWorkspace(session.userId, 'brand');
  const body = await readJsonObject(req);
  await enforceRateLimit(`zillow-import:${ws.id}`, 20, 86400);
  const listing = await startZillowImport(ws, String(body.url ?? ''), body.attest === true);
  return NextResponse.json({ listing: await toListingDto(listing) }, { status: 201 });
});
