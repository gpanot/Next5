'use client';

import { useState } from 'react';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import type { SocialProviderDto } from '../../../../types/business/integrations';
import { AppButton } from '../../../ui/AppButton';

const PROVIDERS: readonly { id: SocialProviderDto; label: string }[] = [
  { id: 'instagram', label: 'Connect Instagram' },
  { id: 'tiktok', label: 'Connect TikTok' },
];

/** Step 4: sends her to the network to connect; she comes back to the app after. */
export const ConnectSocial = ({ available }: { available: readonly SocialProviderDto[] | null }) => {
  const [busy, setBusy] = useState<SocialProviderDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async (provider: SocialProviderDto) => {
    setBusy(provider);
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>(`/api/app/integrations/${provider}`, { method: 'POST', json: { product: 'brand' } });
      window.location.assign(res.url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the connection.');
      setBusy(null);
    }
  };

  const none = available !== null && available.length === 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {PROVIDERS.map((p, i) => (
          <AppButton
            key={p.id}
            variant={i === 0 ? 'primary' : 'secondary'}
            loading={busy === p.id}
            disabled={busy !== null || (available !== null && !available.includes(p.id))}
            onClick={() => void connect(p.id)}
          >
            {p.label}
          </AppButton>
        ))}
      </div>
      {none && <p className="text-[12px] text-app-muted">Connecting is not open yet. You can still post by hand from the calendar.</p>}
      {error && <p role="alert" className="text-[12px] text-app-danger">{error}</p>}
    </div>
  );
};
