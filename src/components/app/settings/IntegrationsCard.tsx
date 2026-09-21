'use client';

import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { ProductLineDto } from '../../../types/business/me';
import type { IntegrationsDto, SocialProviderDto } from '../../../types/business/integrations';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';
import { PlatformIcon } from '../../marketing/offer/PlatformMarks';

const PROVIDERS: { id: SocialProviderDto; label: string; note: string }[] = [
  { id: 'instagram', label: 'Instagram', note: 'Needs an Instagram Business or Creator account. Log in to Instagram in this browser first.' },
  { id: 'tiktok', label: 'TikTok', note: 'Log in to TikTok in this browser before you connect. The account signed in is the one we connect.' },
];

const LABEL: Record<SocialProviderDto, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

/** Settings > Integrations: connect Instagram and TikTok, then post from the calendar with one tap. */
export const IntegrationsCard = ({ product }: { product: ProductLineDto }) => {
  const params = useSearchParams();
  const { data, loading, refresh } = useApi<IntegrationsDto>(`/api/app/integrations?product=${product}`);
  const [busy, setBusy] = useState<SocialProviderDto | null>(null);
  const [error, setError] = useState<string | null>(params.get('integration_error'));
  const justConnected = params.get('connected');

  const connect = async (provider: SocialProviderDto) => {
    setBusy(provider);
    setError(null);
    try {
      const res = await apiFetch<{ url: string }>(`/api/app/integrations/${provider}`, { method: 'POST', json: { product } });
      window.location.href = res.url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start the connection.');
      setBusy(null);
    }
  };

  const remove = async (provider: SocialProviderDto) => {
    setBusy(provider);
    setError(null);
    try {
      await apiFetch(`/api/app/integrations/${provider}?product=${product}`, { method: 'DELETE' });
      refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not disconnect.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card id="integrations">
      <CardBody className="flex flex-col gap-4">
        <div>
          <p className="text-[16px] font-semibold text-app-ink">Integrations</p>
          <p className="text-[13px] text-app-muted">Connect your accounts to post from your calendar in one tap.</p>
        </div>
        {justConnected === 'instagram' || justConnected === 'tiktok' ? (
          <p className="flex items-center gap-2 rounded-xl bg-app-success/10 px-3 py-2 text-[13px] text-app-success"><CheckCircle2 aria-hidden className="h-4 w-4" /> {LABEL[justConnected]} is connected.</p>
        ) : null}
        {error && <p className="flex items-center gap-2 rounded-xl bg-app-danger/10 px-3 py-2 text-[13px] text-app-danger" role="alert"><AlertTriangle aria-hidden className="h-4 w-4 shrink-0" /> {error}</p>}
        <ul className="flex flex-col gap-3">
          {PROVIDERS.map(({ id, label, note }) => {
            const conn = data?.connections.find((c) => c.provider === id) ?? null;
            const available = data?.available.includes(id) ?? false;
            return (
              <li key={id} className="flex flex-col gap-3 rounded-2xl border border-app-line p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-sunken text-app-ink"><PlatformIcon id={id} className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-app-ink">{label}</p>
                    <p className="truncate text-[13px] text-app-muted">
                      {loading ? 'Checking…' : conn ? `Connected${conn.username ? ` as ${conn.username.startsWith('@') ? conn.username : `@${conn.username}`}` : ''}` : available ? 'Not connected' : 'Coming soon'}
                    </p>
                  </div>
                  {conn ? (
                    <AppButton size="sm" variant="secondary" loading={busy === id} onClick={() => void remove(id)}>Disconnect</AppButton>
                  ) : (
                    <AppButton size="sm" loading={busy === id} disabled={!available || loading} onClick={() => void connect(id)}>Connect</AppButton>
                  )}
                </div>
                {!conn && available && <p className="rounded-xl bg-app-sunken px-3 py-2 text-[12px] text-app-muted">{note}</p>}
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
};
