/** POST /api/admin/script-generator/drafts/[id]/photos (multipart: slot, file) — saves one slide photo to R2 and the script.
 *  DELETE ?slot=3b — removes the photo of that slot. */
import type { NextRequest } from 'next/server';
import { adminRoute, json } from '../../../../../../../src/server/admin/route';
import { HttpError } from '../../../../../../../src/server/http';
import { setPhoto, uploadPhoto } from '../../../../../../../src/server/scriptGenerator/drafts';

type Ctx = { params: Promise<{ id: string }> };

export const POST = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!(file instanceof File)) throw new HttpError(400, 'bad_request', 'No photo sent.');
  await uploadPhoto((await ctx.params).id, String(form?.get('slot') ?? ''), file);
  return json({ ok: true });
});

export const DELETE = adminRoute(async (req: NextRequest, ctx: Ctx) => {
  await setPhoto((await ctx.params).id, new URL(req.url).searchParams.get('slot') ?? '', null);
  return json({ ok: true });
});
