import { NextResponse } from 'next/server';
import { forgetInstagramUser, readSignedRequest } from '../../../../../src/server/social/instagramSignedRequest';

/** Meta calls this when a user removes Next5 from their Instagram apps: drop their connection and token. */
export async function POST(req: Request): Promise<Response> {
  const request = await readSignedRequest(req);
  if (!request) return NextResponse.json({ error: 'invalid_signed_request' }, { status: 400 });
  const removed = await forgetInstagramUser(request.userId);
  console.info('[instagram:deauthorize]', { userId: request.userId, removed });
  return NextResponse.json({ ok: true });
}
