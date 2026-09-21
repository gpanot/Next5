// server-only — never import from a 'use client' file.

import { createHmac, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { ProductLine } from '@prisma/client';
import { HttpError } from '../http';
import type { SocialProvider } from './types';

const secret = (): string => process.env.JWT_SECRET ?? 'dev-secret-change-in-production';

export const appBaseUrl = (): string => (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Must match the redirect URI registered in the TikTok and Meta developer apps. */
export const redirectUriFor = (provider: SocialProvider): string => `${appBaseUrl()}/api/app/integrations/${provider}/callback`;

type StatePayload = { workspaceId: string; product: ProductLine; provider: SocialProvider; type: 'social_state' };

/** OAuth `state`: signed, 10 minutes. The callback has no session header, so this carries the workspace. */
export const signState = (payload: Omit<StatePayload, 'type'>): string =>
  jwt.sign({ ...payload, type: 'social_state' } satisfies StatePayload, secret(), { expiresIn: 10 * 60 });

export const verifyState = (state: string, provider: SocialProvider): StatePayload => {
  try {
    const payload = jwt.verify(state, secret()) as StatePayload;
    if (payload.type !== 'social_state' || payload.provider !== provider) throw new Error('mismatch');
    return payload;
  } catch {
    throw new HttpError(400, 'invalid_state', 'This connect link expired. Try again from Settings.');
  }
};

const sign = (body: string): string => createHmac('sha256', secret()).update(`media:${body}`).digest('base64url');

/**
 * Public JPEG link for one photo, on our own domain, valid for 24 hours. TikTok only pulls photos from a
 * URL prefix verified in its developer portal (verify `${APP_URL}/api/media/`), and Instagram needs JPEG.
 */
export const mediaUrlFor = (itemId: string, ttlSec = 24 * 60 * 60): string => {
  const body = `${itemId}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${appBaseUrl()}/api/media/${Buffer.from(body).toString('base64url')}.${sign(body)}.jpg`;
};

/** The item id a media link points to, or null when it is forged or expired. */
export const readMediaToken = (token: string): string | null => {
  const [encoded, signature] = token.replace(/\.jpg$/, '').split('.');
  if (!encoded || !signature) return null;
  const body = Buffer.from(encoded, 'base64url').toString('utf8');
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  const [itemId, exp] = body.split('.');
  return itemId && Number(exp) * 1000 > Date.now() ? itemId : null;
};
