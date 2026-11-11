import { NextResponse, type NextRequest } from 'next/server';
import { draftPersona } from '../../../../../src/server/brandCast/cast';
import { HttpError } from '../../../../../src/server/http';
import { labRoute } from '../../../../../src/server/labs/labAccess';
import { enforceRateLimit } from '../../../../../src/server/rateLimit';

export const maxDuration = 60;

/** POST /api/admin/brand-cast/draft — the person "Surprise me" would make, as text to edit ("Create avatar" › "Use your
 *  own prompt"). Nothing is saved. */
export const POST = labRoute(async (_req: NextRequest, _ctx: unknown, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  await enforceRateLimit(`brand-cast-draft:${access.userId}`, 30, 3600);
  return NextResponse.json({ prompt: await draftPersona(access.workspaceId) });
});
