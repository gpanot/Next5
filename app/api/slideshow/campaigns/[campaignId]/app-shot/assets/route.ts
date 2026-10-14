/**
 * POST /api/slideshow/campaigns/[campaignId]/app-shot/assets — multipart `file` and `kind` ("screen": the app
 *      screenshot, "scene": a background photo) → { asset } (its id and thumb), kept for the App shot builder.
 */
import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../../../src/server/autoSlideshow/access';
import { addAppAsset } from '../../../../../../../src/server/autoSlideshow/campaign/appShot/store';
import { loadCampaign } from '../../../../../../../src/server/autoSlideshow/campaign/store';
import { slideshowRoute } from '../../../../../../../src/server/autoSlideshow/route';
import { HttpError } from '../../../../../../../src/server/http';
import { enforceRateLimit } from '../../../../../../../src/server/rateLimit';
import { readForm } from '../../../../../../../src/server/storage/images';

export const maxDuration = 60;

type Ctx = { params: Promise<{ campaignId: string }> };

export const POST = slideshowRoute(async (req, ctx: Ctx, access) => {
  const { campaignId } = await ctx.params;
  const user = requireUser(access);
  const run = await loadCampaign(user, campaignId);
  await enforceRateLimit(`campaign-app-asset:${user.userId}`, 100, 3600);
  const form = await readForm(req);
  const file = form.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'file_required', 'Upload a picture.');
  const kind = form.get('kind') === 'scene' ? 'app_scene' : 'app_screen';
  return NextResponse.json({ asset: await addAppAsset(run.workspaceId!, kind, file) }, { status: 201 });
});
