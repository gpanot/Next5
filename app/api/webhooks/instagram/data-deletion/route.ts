import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { appBaseUrl } from '../../../../../src/server/social/links';
import { forgetInstagramUser, readSignedRequest } from '../../../../../src/server/social/instagramSignedRequest';

const STATUS_PATH = '/api/webhooks/instagram/data-deletion';

/**
 * Meta calls this when a user asks for their data to be deleted. We delete it right away, so the answer is final:
 * a status link and a confirmation code (Meta shows both to the user).
 */
export async function POST(req: Request): Promise<Response> {
  const request = await readSignedRequest(req);
  if (!request) return NextResponse.json({ error: 'invalid_signed_request' }, { status: 400 });
  const removed = await forgetInstagramUser(request.userId);
  const code = randomUUID();
  console.info('[instagram:data-deletion]', { userId: request.userId, removed, code });
  return NextResponse.json({ url: `${appBaseUrl()}${STATUS_PATH}?code=${code}`, confirmation_code: code });
}

/** The status link: deletion happens during the request, so every code is already done. */
export async function GET(req: Request): Promise<Response> {
  const code = new URL(req.url).searchParams.get('code') ?? '';
  return NextResponse.json({ confirmation_code: code, status: 'deleted', detail: 'Your Instagram connection, token and profile details were deleted from Next5.' });
}
