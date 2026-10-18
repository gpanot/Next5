import { json, oauthErrorResponse, preflight, readParams } from '../../../../src/server/mcp/oauthHttp';
import { OAuthError, exchangeCode, refreshTokens } from '../../../../src/server/mcp/oauthStore';

/** POST /api/oauth/token — authorization_code (with PKCE) or refresh_token (rotated). Public clients: no secret. */
export async function POST(req: Request) {
  try {
    const p = await readParams(req);
    const clientId = p.client_id ?? '';
    if (!clientId) throw new OAuthError(401, 'invalid_client', 'client_id is required.');
    if (p.grant_type === 'authorization_code') {
      if (!p.code || !p.code_verifier || !p.redirect_uri) throw new OAuthError(400, 'invalid_request', 'code, code_verifier and redirect_uri are required.');
      return json(await exchangeCode({ code: p.code, codeVerifier: p.code_verifier, redirectUri: p.redirect_uri, clientId }));
    }
    if (p.grant_type === 'refresh_token') {
      if (!p.refresh_token) throw new OAuthError(400, 'invalid_request', 'refresh_token is required.');
      return json(await refreshTokens({ refreshToken: p.refresh_token, clientId }));
    }
    throw new OAuthError(400, 'unsupported_grant_type', 'Use authorization_code or refresh_token.');
  } catch (err) {
    return oauthErrorResponse(err);
  }
}
export const OPTIONS = preflight;
