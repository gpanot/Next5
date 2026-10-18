// server-only — never import from a 'use client' file.
// HTTP shapes for the Claude connector's OAuth endpoints: CORS (MCP Inspector and other browser clients), OAuth error
// bodies, and the discovery documents.

import { NextResponse } from 'next/server';
import { SCOPE } from './oauthCore';
import { OAuthError, mcpResource, publicOrigin } from './oauthStore';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID',
  'Access-Control-Expose-Headers': 'Mcp-Session-Id, WWW-Authenticate',
};

export const preflight = () => new NextResponse(null, { status: 204, headers: CORS_HEADERS });

export const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { ...CORS_HEADERS, 'Cache-Control': 'no-store', ...headers } });

/** RFC 6749 5.2 error body; anything unexpected is a 500 server_error (and logged). */
export const oauthErrorResponse = (err: unknown) => {
  if (err instanceof OAuthError) return json({ error: err.code, error_description: err.message }, err.status);
  console.error('[mcp-oauth] unexpected error:', err);
  return json({ error: 'server_error', error_description: 'Something went wrong. Try again.' }, 500);
};

/** RFC 9728 protected resource metadata for /api/mcp. */
export const protectedResourceMetadata = (req: Request) => ({
  resource: mcpResource(req),
  authorization_servers: [publicOrigin(req)],
  scopes_supported: [SCOPE],
  bearer_methods_supported: ['header'],
  resource_name: 'Next5',
  resource_documentation: `${publicOrigin(req)}/`,
});

/** RFC 8414 authorization server metadata: DCR and Client ID Metadata Documents, public clients with S256 PKCE. */
export const authorizationServerMetadata = (req: Request) => {
  const origin = publicOrigin(req);
  return {
    issuer: origin,
    authorization_endpoint: `${origin}/oauth/authorize`,
    token_endpoint: `${origin}/api/oauth/token`,
    registration_endpoint: `${origin}/api/oauth/register`,
    revocation_endpoint: `${origin}/api/oauth/revoke`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    client_id_metadata_document_supported: true,
    revocation_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [SCOPE],
  };
};

/** The 401 that starts Claude's sign-in: points at the protected resource metadata. */
export const unauthorized = (req: Request) =>
  json(
    { error: 'invalid_token', error_description: 'Connect Next5 to continue.' },
    401,
    { 'WWW-Authenticate': `Bearer resource_metadata="${publicOrigin(req)}/.well-known/oauth-protected-resource/api/mcp", scope="${SCOPE}"` },
  );

/** Form-urlencoded (the standard) or JSON body as plain strings. */
export const readParams = async (req: Request): Promise<Record<string, string>> => {
  const type = req.headers.get('content-type') ?? '';
  if (type.includes('application/json')) {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    return Object.fromEntries(Object.entries(body ?? {}).filter((e): e is [string, string] => typeof e[1] === 'string'));
  }
  const text = await req.text();
  return Object.fromEntries(new URLSearchParams(text));
};
