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

/** `returnTo: 'admin'` when an admin connected the account from Auto Slideshow → TikTok accounts. */
type StatePayload = { workspaceId: string; product: ProductLine; provider: SocialProvider; returnTo?: 'admin'; type: 'social_state' };

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
 * Where TikTok and Instagram download our photos: MEDIA_PUBLIC_URL, else the app URL. Set MEDIA_PUBLIC_URL to the
 * production domain when posting from a local server (production reads the same database and storage, and signs with
 * the same secret), because the platforms cannot reach localhost and only pull from the verified domain.
 */
export const mediaBaseUrl = (): string => (process.env.MEDIA_PUBLIC_URL ?? appBaseUrl()).replace(/\/$/, '');

/** True when the platforms can reach our photo links: https on a public host. */
export const mediaIsPublic = (): boolean => /^https:\/\/(?!localhost|127\.|0\.0\.0\.0)/.test(mediaBaseUrl());

/**
 * Public JPEG link for one photo, on our own domain, valid for 24 hours. TikTok only pulls photos from a
 * URL prefix verified in its developer portal (verify `${APP_URL}/api/media/`), and Instagram needs JPEG.
 */
export const mediaUrlFor = (itemId: string, ttlSec = 24 * 60 * 60): string => {
  const body = `${itemId}.${Math.floor(Date.now() / 1000) + ttlSec}`;
  return `${mediaBaseUrl()}/api/media/${Buffer.from(body).toString('base64url')}.${sign(body)}.jpg`;
};

/**
 * Public JPEG link for one Auto Slideshow slide, same signed scheme as `mediaUrlFor`. The id carries no dot, because
 * the signed body is "<id>.<expiry>".
 */
export const slideMediaUrl = (slideshowId: string, index: number, ttlSec = 3 * 24 * 60 * 60): string => mediaUrlFor(`slide-${slideshowId}-${index}`, ttlSec);

/** The slideshow and slide a media id points to, or null for a batch item id. */
export const parseSlideMediaId = (id: string): { slideshowId: string; index: number } | null => {
  const m = id.match(/^slide-([a-z0-9]+)-(\d+)$/);
  return m ? { slideshowId: m[1]!, index: Number(m[2]) } : null;
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
