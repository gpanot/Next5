import { clientIp, enforceRateLimit } from '../../../../src/server/rateLimit';
import { json, oauthErrorResponse, preflight } from '../../../../src/server/mcp/oauthHttp';
import { OAuthError, registerClient } from '../../../../src/server/mcp/oauthStore';

/** POST /api/oauth/register — RFC 7591 Dynamic Client Registration (Claude registers itself when a user connects). */
export async function POST(req: Request) {
  try {
    await enforceRateLimit(`mcp-register:${clientIp(req)}`, 30, 3600).catch(() => {
      throw new OAuthError(429, 'slow_down', 'Too many registrations. Try again later.');
    });
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') throw new OAuthError(400, 'invalid_client_metadata', 'Send the client metadata as JSON.');
    return json(await registerClient(body), 201);
  } catch (err) {
    return oauthErrorResponse(err);
  }
}
export const OPTIONS = preflight;
