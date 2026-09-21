/** Client-safe DTOs for /api/app/integrations. */

export type SocialProviderDto = 'instagram' | 'tiktok';

export type ConnectionDto = { provider: SocialProviderDto; username: string | null; avatarUrl: string | null; connectedAt: string };

export type IntegrationsDto = {
  connections: ConnectionDto[];
  /** Platforms whose developer keys are set on our side. The others show "Coming soon". */
  available: SocialProviderDto[];
};
