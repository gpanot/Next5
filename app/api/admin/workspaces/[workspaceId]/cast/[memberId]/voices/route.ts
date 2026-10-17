/**
 * GET  /api/admin/workspaces/[workspaceId]/cast/[memberId]/voices — as the user's "Change voice" list, for the admin.
 * POST /api/admin/workspaces/[workspaceId]/cast/[memberId]/voices — { voice }: attaches that candidate to the avatar.
 */
import { adminRoute, json } from '../../../../../../../../src/server/admin/route';
import { avatarVoices, pickAvatarVoice } from '../../../../../../../../src/server/brandCast/voices';

export const maxDuration = 120;

type Ctx = RouteContext<'/api/admin/workspaces/[workspaceId]/cast/[memberId]/voices'>;

export const GET = adminRoute<Ctx>(async (_req, ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  return json(await avatarVoices(workspaceId, memberId));
});

export const POST = adminRoute<Ctx>(async (req, ctx) => {
  const { workspaceId, memberId } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { voice?: unknown };
  return json(await pickAvatarVoice(workspaceId, memberId, body.voice));
});
