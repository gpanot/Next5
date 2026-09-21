// server-only — never import from a 'use client' file.
// Instagram API with Instagram Login (Business and Creator accounts): single image posts.
// Docs: developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login

import { form, providerFetch, secondsFromNow } from './http';
import type { ProviderClient, ProviderTokens } from './types';

const GRAPH = 'https://graph.instagram.com/v23.0';
const SCOPES = ['instagram_business_basic', 'instagram_business_content_publish'];

const appId = (): string => process.env.INSTAGRAM_APP_ID ?? '';
const appSecret = (): string => process.env.INSTAGRAM_APP_SECRET ?? '';

/** Long-lived tokens last 60 days and are refreshed in place (no separate refresh token). */
const longLived = (body: Record<string, unknown>) => ({
  accessToken: String(body.access_token ?? ''),
  refreshToken: null,
  expiresAt: secondsFromNow(body.expires_in),
  refreshExpiresAt: null,
  scopes: SCOPES,
});

export const instagram: ProviderClient = {
  configured: () => Boolean(appId() && appSecret()),

  authorizeUrl: (state, redirectUri) => {
    const params = new URLSearchParams({ client_id: appId(), redirect_uri: redirectUri, response_type: 'code', scope: SCOPES.join(','), state });
    return `https://www.instagram.com/oauth/authorize?${params.toString()}`;
  },

  exchangeCode: async (code, redirectUri): Promise<ProviderTokens> => {
    const short = await providerFetch('instagram', 'https://api.instagram.com/oauth/access_token', form({ client_id: appId(), client_secret: appSecret(), grant_type: 'authorization_code', redirect_uri: redirectUri, code }));
    // Newer responses wrap the token in `data: [...]`.
    const first = (Array.isArray(short.data) ? short.data[0] : short) as Record<string, unknown>;
    const params = new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: appSecret(), access_token: String(first.access_token ?? '') });
    const tokens = longLived(await providerFetch('instagram', `https://graph.instagram.com/access_token?${params.toString()}`));
    const me = await providerFetch('instagram', `${GRAPH}/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(tokens.accessToken)}`);
    return {
      ...tokens,
      externalId: String(me.user_id ?? first.user_id ?? ''),
      username: typeof me.username === 'string' ? me.username : null,
      avatarUrl: typeof me.profile_picture_url === 'string' ? me.profile_picture_url : null,
    };
  },

  refresh: async ({ accessToken }) => {
    const params = new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: accessToken });
    return longLived(await providerFetch('instagram', `https://graph.instagram.com/refresh_access_token?${params.toString()}`));
  },

  publishPhoto: async ({ accessToken, externalId, imageUrl, caption }) => {
    const container = await providerFetch('instagram', `${GRAPH}/${externalId}/media`, form({ image_url: imageUrl, caption: caption.slice(0, 2200), access_token: accessToken }));
    const published = await providerFetch('instagram', `${GRAPH}/${externalId}/media_publish`, form({ creation_id: String(container.id ?? ''), access_token: accessToken }));
    const mediaId = String(published.id ?? '');
    const media = await providerFetch('instagram', `${GRAPH}/${mediaId}?fields=permalink&access_token=${encodeURIComponent(accessToken)}`).catch(() => ({}) as Record<string, unknown>);
    return { externalId: mediaId, postUrl: typeof media.permalink === 'string' ? media.permalink : null };
  },
};
