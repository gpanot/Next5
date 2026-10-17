import { NextResponse, type NextRequest } from 'next/server';
import { avatarVoices, pickAvatarVoice } from '../../../../../../src/server/brandCast/voices';
import { HttpError } from '../../../../../../src/server/http';
import { labRoute } from '../../../../../../src/server/labs/labAccess';
import { enforceRateLimit } from '../../../../../../src/server/rateLimit';

/** The first open records 6 samples: about 10-20 s. */
export const maxDuration = 120;

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/brand-cast/[id]/voices — "Change voice": the avatar's voice candidates with samples (made on the
 *  first open, free) and the one picked. */
export const GET = labRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  await enforceRateLimit(`brand-cast-voices:${access.userId}`, 30, 3600);
  const { id } = await ctx.params;
  return NextResponse.json(await avatarVoices(access.workspaceId, id));
});

/** POST /api/admin/brand-cast/[id]/voices — { voice }: attaches that candidate to the avatar. */
export const POST = labRoute(async (req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'The brand cast belongs to a workspace.');
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { voice?: unknown };
  return NextResponse.json(await pickAvatarVoice(access.workspaceId, id, body.voice));
});
