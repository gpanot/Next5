// server-only — never import from a 'use client' file.

export type SocialProvider = 'instagram' | 'tiktok';

export const SOCIAL_PROVIDERS: readonly SocialProvider[] = ['instagram', 'tiktok'];

export const isSocialProvider = (value: unknown): value is SocialProvider => value === 'instagram' || value === 'tiktok';

/** What a provider hands back after the OAuth code exchange (or a refresh). */
export type ProviderTokens = {
  externalId: string;
  username: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: Date | null;
  refreshExpiresAt: Date | null;
  scopes: string[];
};

export type PublishInput = {
  accessToken: string;
  externalId: string;
  /** Public JPEG URL on our own (verified) domain. */
  imageUrl: string;
  title: string;
  caption: string;
};

export type PublishResult = { externalId: string; postUrl: string | null };

export type ProviderClient = {
  configured: () => boolean;
  authorizeUrl: (state: string, redirectUri: string) => string;
  exchangeCode: (code: string, redirectUri: string) => Promise<ProviderTokens>;
  /** Returns fresh tokens, or null when the provider's token cannot be refreshed. */
  refresh: (tokens: { accessToken: string; refreshToken: string | null }) => Promise<Omit<ProviderTokens, 'externalId' | 'username' | 'avatarUrl'> | null>;
  publishPhoto: (input: PublishInput) => Promise<PublishResult>;
};
