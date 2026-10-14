// server-only — never import from a 'use client' file.

import { verifySessionToken } from '../../lib/studio-auth';
import { HttpError } from '../http';

/** `impersonated`: an admin's "Open as user" session; what they do is free for the user. */
export type Session = { userId: string; email: string; impersonated: boolean };

/** Reads `Authorization: Bearer <studio_token>` and verifies it. Throws 401 otherwise. */
export const requireSession = (req: Request): Session => {
  const header = req.headers.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) throw new HttpError(401, 'unauthorized', 'Sign in to continue.');

  try {
    const payload = verifySessionToken(token);
    return { userId: payload.userId, email: payload.email, impersonated: payload.impersonated === true };
  } catch {
    throw new HttpError(401, 'session_expired', 'Your session has expired. Sign in again.');
  }
};
