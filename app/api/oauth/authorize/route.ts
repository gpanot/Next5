import { NextResponse } from 'next/server';
import { requireSession } from '../../../../src/server/auth/session';
import { HttpError, readJsonObject, toErrorResponse } from '../../../../src/server/http';
import { listSlideshowWorkspaces } from '../../../../src/server/autoSlideshow/workspaces';
import { redirectWith } from '../../../../src/server/mcp/oauthCore';
import { asHttpError, checkAuthorize, issueCode, type AuthorizeRequest } from '../../../../src/server/mcp/oauthStore';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

/** The /authorize query (or the consent POST body) as an AuthorizeRequest. */
const requestOf = (get: (k: string) => unknown): AuthorizeRequest => ({
  clientId: str(get('client_id')),
  redirectUri: str(get('redirect_uri')),
  codeChallenge: str(get('code_challenge')),
  codeChallengeMethod: str(get('code_challenge_method')),
  responseType: str(get('response_type')),
  scope: str(get('scope')) || undefined,
  resource: str(get('resource')) || undefined,
});

/**
 * GET /api/oauth/authorize?<the /oauth/authorize query> — for the consent page (signed in with the Next5 session):
 * which app asks, and the user's workspaces to pick from. A bad request is an error here, never a redirect.
 */
export async function GET(req: Request) {
  try {
    const session = requireSession(req);
    const q = new URL(req.url).searchParams;
    const { clientName } = await checkAuthorize(requestOf((k) => q.get(k))).catch((err: unknown) => {
      throw asHttpError(err);
    });
    const workspaces = await listSlideshowWorkspaces(session.userId);
    return NextResponse.json({
      clientName,
      email: session.email,
      redirectHost: new URL(str(q.get('redirect_uri'))).host,
      workspaces: workspaces.map((w) => ({ id: w.id, name: w.name, websiteUrl: w.websiteUrl })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}

/**
 * POST /api/oauth/authorize — { ...the /authorize query, state, workspaceId, approve } from the consent page.
 * Returns { redirectTo }: back to Claude with a code, or with error=access_denied when the user said no.
 */
export async function POST(req: Request) {
  try {
    const session = requireSession(req);
    if (session.impersonated) throw new HttpError(403, 'impersonated', 'Connect Claude from your own sign-in, not an "Open as user" tab.');
    const body = await readJsonObject(req);
    const r = requestOf((k) => body[k]);
    const state = str(body.state) || undefined;
    await checkAuthorize(r).catch((err: unknown) => {
      throw asHttpError(err);
    });
    if (body.approve !== true) return NextResponse.json({ redirectTo: redirectWith(r.redirectUri, { error: 'access_denied', state }) });
    const code = await issueCode(session.userId, str(body.workspaceId), r).catch((err: unknown) => {
      throw asHttpError(err);
    });
    return NextResponse.json({ redirectTo: redirectWith(r.redirectUri, { code, state }) });
  } catch (err) {
    return toErrorResponse(err);
  }
}
