import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { HttpError } from '../../../../../src/server/http';
import { addStudio, parseProfileInput, setupWorkspace } from '../../../../../src/server/onboarding/account';
import { isProductLine } from '../../../../../src/server/workspaces/workspaces';

/**
 * POST /api/app/onboarding/workspace — a signed-in user creates this product's workspace. Idempotent.
 * { product, fromExisting: true } reuses the profile of the studio they already have; otherwise the body is the profile form.
 */
export const POST = authedRoute(async (req, session) => {
  const body = await readJsonObject(req);
  if (body.fromExisting === true) {
    if (!isProductLine(body.product)) throw new HttpError(400, 'invalid_product', 'Choose Brand Studio or Shop Studio.');
    await addStudio(session.userId, body.product);
  } else {
    await setupWorkspace(session.userId, parseProfileInput(body));
  }
  return NextResponse.json({ ok: true }, { status: 201 });
});
