// Pure OAuth helpers for the Claude connector (no database): token minting, hashing, PKCE, redirect URI rules.
// Unit-tested in tests/server/mcp/oauthCore.test.ts.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const SCOPE = 'next5';

/** OAuth errors are JSON `{ error, error_description }` (RFC 6749 5.2), not the app's usual error body. */
export class OAuthError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
  }
}

export const ACCESS_TTL_S = 60 * 60;
export const REFRESH_TTL_S = 90 * 24 * 60 * 60;
export const CODE_TTL_S = 10 * 60;

/** `n5at_…` access, `n5rt_…` refresh, `n5ac_…` code: 32 random bytes, base64url. The prefix makes leaks easy to spot. */
export const mintSecret = (prefix: 'n5at' | 'n5rt' | 'n5ac'): string => `${prefix}_${randomBytes(32).toString('base64url')}`;

/** A public client id (not a secret). */
export const mintClientId = (): string => `n5c_${randomBytes(16).toString('hex')}`;

/** What is stored for a secret: its SHA-256, hex. */
export const hashSecret = (secret: string): string => createHash('sha256').update(secret).digest('hex');

const safeEqual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** RFC 7636 S256: BASE64URL(SHA256(verifier)) equals the challenge. Verifiers are 43-128 unreserved characters. */
export const verifyPkce = (verifier: string, challenge: string): boolean => {
  if (!/^[A-Za-z0-9\-._~]{43,128}$/.test(verifier)) return false;
  return safeEqual(createHash('sha256').update(verifier).digest('base64url'), challenge);
};

/** A challenge Claude may send: base64url of a SHA-256 (43 characters). */
export const isS256Challenge = (challenge: string): boolean => /^[A-Za-z0-9_-]{43}$/.test(challenge);

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** A redirect URI a client may register: https anywhere, or http on a loopback host (Claude Code's local callback). */
export const isAllowedRedirectUri = (uri: string): boolean => {
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === 'https:') return true;
  return url.protocol === 'http:' && LOOPBACK.has(url.hostname);
};

/**
 * The redirect URI sent to /authorize matches one the client registered: exactly, or for a loopback URI with the port
 * ignored (RFC 8252 7.3; Claude Code picks a new port each session).
 */
export const redirectMatches = (sent: string, registered: readonly string[]): boolean => {
  if (registered.includes(sent)) return true;
  let url: URL;
  try {
    url = new URL(sent);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' || !LOOPBACK.has(url.hostname)) return false;
  return registered.some((r) => {
    try {
      const reg = new URL(r);
      return reg.protocol === 'http:' && LOOPBACK.has(reg.hostname) && reg.hostname === url.hostname && reg.pathname === url.pathname;
    } catch {
      return false;
    }
  });
};

/** The redirect back to the client with `params` (code + state, or error + state). */
export const redirectWith = (redirectUri: string, params: Record<string, string | undefined>): string => {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) url.searchParams.set(k, v);
  return url.toString();
};
