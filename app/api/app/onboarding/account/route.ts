import { NextResponse } from 'next/server';
import { businessRoute } from '../../../../../src/server/api';
import { readJsonObject } from '../../../../../src/server/http';
import { parseAccountInput, startAccount } from '../../../../../src/server/onboarding/account';

/** POST /api/app/onboarding/account — step 1 of the wizard (no session needed). */
export const POST = businessRoute(async (req) => {
  const input = parseAccountInput(await readJsonObject(req));
  return NextResponse.json(await startAccount(input), { status: 201 });
});
