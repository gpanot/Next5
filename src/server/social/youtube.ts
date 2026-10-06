// server-only — never import from a 'use client' file.
// Google OAuth 2.0 (web server flow) + YouTube Data API v3. Uploads live in youtubeUpload.ts.
// Docs: developers.google.com/youtube/v3/guides/auth/server-side-web-apps

import { HttpError } from '../http';
import { form, providerFetch, secondsFromNow } from './http';
import type { ProviderClient, ProviderTokens } from './types';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
/** upload: publish videos. readonly: read the channel's name and, later, a video's views and likes. */
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'];

const clientId = (): string => process.env.GOOGLE_CLIENT_ID ?? '';
const clientSecret = (): string => process.env.GOOGLE_CLIENT_SECRET ?? '';

const bearer = (token: string): RequestInit => ({ headers: { Authorization: `Bearer ${token}` } });

const tokensFrom = (body: Record<string, unknown>) => ({
  accessToken: String(body.access_token ?? ''),
  refreshToken: typeof body.refresh_token === 'string' ? body.refresh_token : null,
  expiresAt: secondsFromNow(body.expires_in),
  refreshExpiresAt: null,
  scopes: String(body.scope ?? '').split(' ').filter(Boolean),
});

type Channel = { id?: string; snippet?: { title?: string; customUrl?: string; thumbnails?: { default?: { url?: string } } } };

export const youtube: ProviderClient = {
  configured: () => Boolean(clientId() && clientSecret()),

  authorizeUrl: (state, redirectUri) => {
    // access_type=offline + prompt=consent: Google sends a refresh token on every connect, not only the first.
    const params = new URLSearchParams({ client_id: clientId(), redirect_uri: redirectUri, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent select_account', include_granted_scopes: 'false', state });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  exchangeCode: async (code, redirectUri): Promise<ProviderTokens> => {
    const body = await providerFetch('youtube', TOKEN_URL, form({ client_id: clientId(), client_secret: clientSecret(), code, grant_type: 'authorization_code', redirect_uri: redirectUri }));
    const tokens = tokensFrom(body);
    if (!tokens.scopes.some((s) => s.endsWith('/youtube.upload'))) throw new HttpError(400, 'scope_missing', 'YouTube upload permission was not granted. Connect again and tick every box.');
    const res = await providerFetch('youtube', `${API}/channels?part=snippet&mine=true`, bearer(tokens.accessToken));
    const channel = ((res.items as Channel[] | undefined) ?? [])[0];
    if (!channel?.id) throw new HttpError(400, 'no_channel', 'This Google account has no YouTube channel. Create one on youtube.com, then connect again.');
    return {
      ...tokens,
      externalId: channel.id,
      username: channel.snippet?.customUrl ?? channel.snippet?.title ?? null,
      avatarUrl: channel.snippet?.thumbnails?.default?.url ?? null,
    };
  },

  refresh: async ({ refreshToken }) => {
    if (!refreshToken) return null;
    // Google's refresh answer carries no new refresh token: freshAccessToken keeps the stored one.
    const body = await providerFetch('youtube', TOKEN_URL, form({ client_id: clientId(), client_secret: clientSecret(), grant_type: 'refresh_token', refresh_token: refreshToken }));
    return tokensFrom(body);
  },

  publishPhoto: async () => {
    throw new HttpError(400, 'unsupported', 'YouTube Shorts are videos. Posting a single photo is not supported.');
  },
};
