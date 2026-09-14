import { NextResponse } from 'next/server';
import { authedRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { parseProfileInput, setupWorkspace } from '../../../../../src/server/onboarding/account';

/** POST /api/app/onboarding/workspace — a signed-in user (e.g. back from a magic link) creates this product's workspace. Idempotent. */
export const POST = authedRoute(async (req, session) => {
  await setupWorkspace(session.userId, parseProfileInput(await readJsonObject(req)));
  return NextResponse.json({ ok: true }, { status: 201 });
});
