// server-only — never import from a 'use client' file.
// The Claude connector's OAuth server: clients (Dynamic Client Registration or Client ID Metadata Documents), consent codes, and access/refresh tokens.
// Endpoints: app/api/oauth/*; discovery: /.well-known/* (rewritten in next.config.ts). Secrets are stored hashed.

import { prisma } from '../../lib/db';
import { HttpError } from '../http';
import { requireSlideshowWorkspace } from '../autoSlideshow/workspaces';
import { fetchClientMetadata, isMetadataDocumentUrl } from './clientMetadata';
import {
  ACCESS_TTL_S, CODE_TTL_S, OAuthError, REFRESH_TTL_S, SCOPE, hashSecret, isAllowedRedirectUri, isS256Challenge, mintClientId, mintSecret, redirectMatches, verifyPkce,
} from './oauthCore';

export { OAuthError };

/** The public origin Claude reaches us on (MCP_PUBLIC_ORIGIN overrides, e.g. behind a proxy). */
export const publicOrigin = (req: Request): string => (process.env.MCP_PUBLIC_ORIGIN ?? new URL(req.url).origin).replace(/\/$/, '');
export const mcpResource = (req: Request): string => `${publicOrigin(req)}/api/mcp`;

const MAX_REDIRECTS = 10;

/** RFC 7591: Claude registers itself; we keep its name and redirect URIs. Public client (PKCE, no secret). */
export async function registerClient(body: Record<string, unknown>) {
  const uris = Array.isArray(body.redirect_uris) ? body.redirect_uris.filter((u): u is string => typeof u === 'string') : [];
  if (uris.length === 0 || uris.length > MAX_REDIRECTS) throw new OAuthError(400, 'invalid_redirect_uri', 'redirect_uris is required.');
  const bad = uris.find((u) => !isAllowedRedirectUri(u));
  if (bad) throw new OAuthError(400, 'invalid_redirect_uri', `Redirect URI not allowed: ${bad}`);
  const name = typeof body.client_name === 'string' ? body.client_name.trim().slice(0, 100) || null : null;
  const client = await prisma.mcpOauthClient.create({ data: { id: mintClientId(), clientName: name, redirectUris: uris } });
  return {
    client_id: client.id,
    client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
    client_name: client.clientName ?? undefined,
    redirect_uris: client.redirectUris,
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    scope: SCOPE,
  };
}

export type AuthorizeRequest = {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  responseType: string;
  scope?: string;
  resource?: string;
};

/** A client from its id: registered (DCR), or a Client ID Metadata Document URL read now and kept (CIMD). */
async function findClient(clientId: string, redirectUri: string) {
  const known = await prisma.mcpOauthClient.findUnique({ where: { id: clientId } });
  // A known metadata-document client is read again only when its redirect URI is new (the document changed).
  if ((known && redirectMatches(redirectUri, known.redirectUris)) || !isMetadataDocumentUrl(clientId)) return known;
  const doc = await fetchClientMetadata(clientId);
  return prisma.mcpOauthClient.upsert({
    where: { id: clientId },
    create: { id: clientId, clientName: doc.clientName, redirectUris: doc.redirectUris },
    update: { clientName: doc.clientName, redirectUris: doc.redirectUris },
  });
}

/** Checks an /authorize request before anything is shown. Returns the client's display name. */
export async function checkAuthorize(r: AuthorizeRequest): Promise<{ clientName: string }> {
  const client = await findClient(r.clientId, r.redirectUri);
  if (!client) throw new OAuthError(400, 'invalid_client', 'Unknown client. Remove the connector in Claude and add it again.');
  if (!redirectMatches(r.redirectUri, client.redirectUris)) throw new OAuthError(400, 'invalid_request', 'This redirect address is not registered for the client.');
  if (r.responseType !== 'code') throw new OAuthError(400, 'unsupported_response_type', 'Only response_type=code is supported.');
  if (r.codeChallengeMethod !== 'S256' || !isS256Challenge(r.codeChallenge)) throw new OAuthError(400, 'invalid_request', 'PKCE with S256 is required.');
  return { clientName: client.clientName ?? 'Claude' };
}

/** The user said yes on the consent screen: a one-time code for this client, user and workspace. */
export async function issueCode(userId: string, workspaceId: string, r: AuthorizeRequest): Promise<string> {
  await checkAuthorize(r);
  await requireSlideshowWorkspace(userId, workspaceId);
  const code = mintSecret('n5ac');
  await prisma.mcpOauthCode.create({
    data: {
      codeHash: hashSecret(code), clientId: r.clientId, userId, workspaceId, redirectUri: r.redirectUri, codeChallenge: r.codeChallenge,
      scope: SCOPE, resource: r.resource ?? null, expiresAt: new Date(Date.now() + CODE_TTL_S * 1000),
    },
  });
  return code;
}

type Grant = { userId: string; workspaceId: string; clientId: string; scope: string };

const tokenResponse = async (grant: Grant) => {
  const access = mintSecret('n5at');
  const refresh = mintSecret('n5rt');
  const now = Date.now();
  await prisma.mcpOauthToken.create({
    data: {
      ...grant, accessHash: hashSecret(access), refreshHash: hashSecret(refresh),
      accessExpiresAt: new Date(now + ACCESS_TTL_S * 1000), refreshExpiresAt: new Date(now + REFRESH_TTL_S * 1000),
    },
  });
  return { access_token: access, token_type: 'Bearer', expires_in: ACCESS_TTL_S, refresh_token: refresh, scope: grant.scope };
};

/** grant_type=authorization_code: the code (once, unexpired), its PKCE verifier and the same redirect URI. */
export async function exchangeCode(p: { code: string; codeVerifier: string; redirectUri: string; clientId: string }) {
  const row = await prisma.mcpOauthCode.findUnique({ where: { codeHash: hashSecret(p.code) } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) throw new OAuthError(400, 'invalid_grant', 'The sign-in code expired or was used. Connect again.');
  // One use only, even when the rest fails: a replayed code must never work.
  const claimed = await prisma.mcpOauthCode.updateMany({ where: { codeHash: row.codeHash, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) throw new OAuthError(400, 'invalid_grant', 'The sign-in code was already used.');
  if (row.clientId !== p.clientId) throw new OAuthError(400, 'invalid_grant', 'The code belongs to another client.');
  if (row.redirectUri !== p.redirectUri) throw new OAuthError(400, 'invalid_grant', 'redirect_uri does not match.');
  if (!verifyPkce(p.codeVerifier, row.codeChallenge)) throw new OAuthError(400, 'invalid_grant', 'PKCE verification failed.');
  return tokenResponse({ userId: row.userId, workspaceId: row.workspaceId, clientId: row.clientId, scope: row.scope });
}

/** grant_type=refresh_token: rotates (the old pair stops working; a reused refresh token revokes the connection). */
export async function refreshTokens(p: { refreshToken: string; clientId: string }) {
  const row = await prisma.mcpOauthToken.findUnique({ where: { refreshHash: hashSecret(p.refreshToken) } });
  if (!row || row.clientId !== p.clientId || row.refreshExpiresAt.getTime() < Date.now()) throw new OAuthError(400, 'invalid_grant', 'Sign in to Next5 again.');
  if (row.revokedAt) {
    // A rotated refresh token came back: someone else may hold it. End this user's connections for the client.
    await prisma.mcpOauthToken.updateMany({ where: { userId: row.userId, clientId: row.clientId, revokedAt: null }, data: { revokedAt: new Date() } });
    throw new OAuthError(400, 'invalid_grant', 'Sign in to Next5 again.');
  }
  const revoked = await prisma.mcpOauthToken.updateMany({ where: { id: row.id, revokedAt: null }, data: { revokedAt: new Date() } });
  if (revoked.count === 0) throw new OAuthError(400, 'invalid_grant', 'Sign in to Next5 again.');
  return tokenResponse({ userId: row.userId, workspaceId: row.workspaceId, clientId: row.clientId, scope: row.scope });
}

export type McpCaller = { userId: string; email: string; defaultWorkspaceId: string; clientId: string };

/** The caller of /api/mcp from its bearer access token; null when missing, unknown, expired or revoked. */
export async function resolveAccessToken(req: Request): Promise<McpCaller | null> {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token?.startsWith('n5at_')) return null;
  const row = await prisma.mcpOauthToken.findUnique({ where: { accessHash: hashSecret(token) } });
  if (!row || row.revokedAt || row.accessExpiresAt.getTime() < Date.now()) return null;
  const user = await prisma.user.findUnique({ where: { id: row.userId }, select: { email: true } });
  if (!user) return null;
  // At most one write a minute per token.
  if (!row.lastUsedAt || Date.now() - row.lastUsedAt.getTime() > 60_000) {
    await prisma.mcpOauthToken.update({ where: { id: row.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
  }
  return { userId: row.userId, email: user.email, defaultWorkspaceId: row.workspaceId, clientId: row.clientId };
}

/** The OAuth error as an HttpError, for routes that answer in the app's own error shape (the consent page's API). */
export const asHttpError = (err: unknown): unknown => (err instanceof OAuthError ? new HttpError(err.status, err.code, err.message) : err);

/** RFC 7009: an access or refresh token ends its connection. */
export async function revokeToken(token: string): Promise<void> {
  const hash = hashSecret(token);
  await prisma.mcpOauthToken.updateMany({ where: { OR: [{ accessHash: hash }, { refreshHash: hash }], revokedAt: null }, data: { revokedAt: new Date() } });
}
