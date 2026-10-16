// server-only — never import from a 'use client' file.
// Meta's deauthorize and data deletion callbacks post a `signed_request`: "<signature>.<payload>", both base64url,
// signature = HMAC-SHA256(payload part, app secret). Docs: developers.facebook.com/docs/games/gamesonfacebook/login#parsingsr

import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../lib/db';

export type SignedRequest = { userId: string; issuedAt: number | null };

/** The Instagram user the request is about, or null when the signature does not match our app secret. */
export const parseSignedRequest = (signedRequest: string, secret: string): SignedRequest | null => {
  const [sigPart, payloadPart] = signedRequest.split('.');
  if (!sigPart || !payloadPart || !secret) return null;
  const given = Buffer.from(sigPart, 'base64url');
  const expected = createHmac('sha256', secret).update(payloadPart).digest();
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64url').toString('utf8')) as { algorithm?: unknown; user_id?: unknown; issued_at?: unknown };
    if (String(payload.algorithm ?? '').toUpperCase() !== 'HMAC-SHA256' || payload.user_id === undefined) return null;
    return { userId: String(payload.user_id), issuedAt: typeof payload.issued_at === 'number' ? payload.issued_at : null };
  } catch {
    return null;
  }
};

/** Reads the form body Meta posts and verifies it with INSTAGRAM_APP_SECRET. */
export const readSignedRequest = async (req: Request): Promise<SignedRequest | null> => {
  const form = await req.formData().catch(() => null);
  const value = form?.get('signed_request');
  return typeof value === 'string' ? parseSignedRequest(value, process.env.INSTAGRAM_APP_SECRET ?? '') : null;
};

/** Removes every Instagram connection (token, username, avatar) for that Instagram user. Returns how many. */
export const forgetInstagramUser = async (userId: string): Promise<number> => {
  const { count } = await prisma.socialConnection.deleteMany({ where: { provider: 'instagram', externalId: userId } });
  return count;
};
