// server-only — never import from a 'use client' file.
// TikTok Login Kit v2 + Content Posting API (photo, direct post).
// Docs: developers.tiktok.com/doc/content-posting-api-reference-photo-post

import { form, providerFetch, secondsFromNow } from './http';
import type { ProviderClient, ProviderTokens } from './types';

const API = 'https://open.tiktokapis.com/v2';
const SCOPES = ['user.info.basic', 'video.publish'];

const clientKey = (): string => process.env.TIKTOK_CLIENT_KEY ?? '';
const clientSecret = (): string => process.env.TIKTOK_CLIENT_SECRET ?? '';

const json = (token: string, body: unknown): RequestInit => ({
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json; charset=UTF-8' },
  body: JSON.stringify(body),
});

const tokensFrom = (body: Record<string, unknown>) => ({
  accessToken: String(body.access_token ?? ''),
  refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : null,
  expiresAt: secondsFromNow(body.expires_in),
  refreshExpiresAt: secondsFromNow(body.refresh_expires_in),
  scopes: String(body.scope ?? '').split(',').filter(Boolean),
});

/**
 * Unaudited TikTok apps may only post privately (SELF_ONLY). Once the app passes TikTok's audit,
 * the creator's own options include PUBLIC_TO_EVERYONE and we use it.
 */
const pickPrivacy = (options: unknown): string => {
  const list = Array.isArray(options) ? options.map(String) : [];
  return list.includes('PUBLIC_TO_EVERYONE') ? 'PUBLIC_TO_EVERYONE' : list[0] ?? 'SELF_ONLY';
};

/** TikTok titles are capped at 90 characters. */
const clip = (text: string, max: number): string => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export const tiktok: ProviderClient = {
  configured: () => Boolean(clientKey() && clientSecret()),

  authorizeUrl: (state, redirectUri) => {
    const params = new URLSearchParams({ client_key: clientKey(), scope: SCOPES.join(','), response_type: 'code', redirect_uri: redirectUri, state });
    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  },

  exchangeCode: async (code, redirectUri): Promise<ProviderTokens> => {
    const body = await providerFetch('tiktok', `${API}/oauth/token/`, form({ client_key: clientKey(), client_secret: clientSecret(), code, grant_type: 'authorization_code', redirect_uri: redirectUri }));
    const tokens = tokensFrom(body);
    const info = await providerFetch('tiktok', `${API}/user/info/?fields=open_id,avatar_url,display_name`, { headers: { Authorization: `Bearer ${tokens.accessToken}` } });
    const user = ((info.data as { user?: Record<string, unknown> } | undefined)?.user ?? {}) as Record<string, unknown>;
    return {
      ...tokens,
      externalId: String(body.open_id ?? user.open_id ?? ''),
      username: typeof user.display_name === 'string' ? user.display_name : null,
      avatarUrl: typeof user.avatar_url === 'string' ? user.avatar_url : null,
    };
  },

  refresh: async ({ refreshToken }) => {
    if (!refreshToken) return null;
    const body = await providerFetch('tiktok', `${API}/oauth/token/`, form({ client_key: clientKey(), client_secret: clientSecret(), grant_type: 'refresh_token', refresh_token: refreshToken }));
    return tokensFrom(body);
  },

  publishPhoto: async ({ accessToken, imageUrl, title, caption }) => {
    const creator = await providerFetch('tiktok', `${API}/post/publish/creator_info/query/`, json(accessToken, {}));
    const privacy = pickPrivacy((creator.data as { privacy_level_options?: unknown } | undefined)?.privacy_level_options);
    const res = await providerFetch('tiktok', `${API}/post/publish/content/init/`, json(accessToken, {
      media_type: 'PHOTO',
      post_mode: 'DIRECT_POST',
      post_info: { title: clip(title, 90), description: clip(caption, 4000), privacy_level: privacy, disable_comment: false, auto_add_music: true },
      source_info: { source: 'PULL_FROM_URL', photo_images: [imageUrl], photo_cover_index: 0 },
      // Our photos are AI-made: TikTok asks for the AI-generated label.
      is_aigc: true,
    }));
    const publishId = String((res.data as { publish_id?: string } | undefined)?.publish_id ?? '');
    return { externalId: publishId, postUrl: null };
  },
};
