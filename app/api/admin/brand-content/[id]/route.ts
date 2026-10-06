import { NextResponse, type NextRequest } from 'next/server';
import { archiveBrandPhoto } from '../../../../../src/server/brandContent/brandPhotos';
import { HttpError } from '../../../../../src/server/http';
import { labRoute } from '../../../../../src/server/labs/labAccess';

type Ctx = { params: Promise<{ id: string }> };

/** DELETE /api/admin/brand-content/[id] — removes one photo from Your Brand Content. */
export const DELETE = labRoute(async (_req: NextRequest, ctx: Ctx, access) => {
  if (access.admin) throw new HttpError(400, 'user_only', 'Brand content belongs to a workspace.');
  const { id } = await ctx.params;
  await archiveBrandPhoto(access.workspaceId, id);
  return NextResponse.json({ ok: true });
});
