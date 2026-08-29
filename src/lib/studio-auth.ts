/**
 * Custom JWT-based magic-link auth for the Next5 Studio portal.
 *
 * Flow:
 *  1. POST /api/auth/studio/magic  — creates short-lived magic token, sends email via Resend
 *  2. User clicks link → /studio?token=<magic_token>
 *  3. Page POSTs to /api/auth/studio/verify — verifies magic token, returns session token
 *  4. Session token stored in localStorage as "studio_token"
 *  5. All authenticated API calls send: Authorization: Bearer <studio_token>
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

/** 15 minutes — short-lived, one-use magic link */
const MAGIC_LINK_TTL_S = 15 * 60;

/** 30 days — long-lived session */
const SESSION_TTL_S = 30 * 24 * 60 * 60;

export type MagicPayload = { email: string; type: 'magic' };
export type SessionPayload = { userId: string; email: string; type: 'session' };

export function signMagicToken(email: string): string {
  return jwt.sign({ email, type: 'magic' } satisfies MagicPayload, JWT_SECRET, {
    expiresIn: MAGIC_LINK_TTL_S,
  });
}

export function verifyMagicToken(token: string): MagicPayload {
  const payload = jwt.verify(token, JWT_SECRET) as MagicPayload;
  if (payload.type !== 'magic') throw new Error('Not a magic token');
  return payload;
}

export function signSessionToken(userId: string, email: string): string {
  return jwt.sign({ userId, email, type: 'session' } satisfies SessionPayload, JWT_SECRET, {
    expiresIn: SESSION_TTL_S,
  });
}

export function verifySessionToken(token: string): SessionPayload {
  const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
  if (payload.type !== 'session') throw new Error('Not a session token');
  return payload;
}
