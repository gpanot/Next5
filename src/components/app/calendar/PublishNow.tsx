'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { SlotDto } from '../../../types/business/calendar';
import type { IntegrationsDto, SocialProviderDto } from '../../../types/business/integrations';
import { AppButton } from '../../ui/AppButton';
import { PlatformIcon } from '../../marketing/offer/PlatformMarks';
import { AppLink as Link } from '../shell/AppLink';

const LABEL: Record<SocialProviderDto, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

type Props = { slot: SlotDto; onChanged: (slot: SlotDto) => void; onToast: (message: string) => void };

/** "Post to Instagram / TikTok" for connected accounts, with one confirm tap: this goes out publicly. */
export const PublishNow = ({ slot, onChanged, onToast }: Props) => {
  const { data } = useApi<IntegrationsDto>('/api/app/integrations?product=brand');
  const [confirming, setConfirming] = useState<SocialProviderDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!data || !slot.photo) return null;

  if (data.connections.length === 0) {
    return data.available.length > 0 ? (
      <p className="text-center text-[13px] text-app-muted">
        Post in one tap: <Link href="/app/settings#integrations" className="font-medium text-app-ink underline">connect Instagram or TikTok</Link>
      </p>
    ) : null;
  }

  const publish = async (provider: SocialProviderDto) => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ slot: SlotDto }>(`/api/app/calendar/slots/${slot.id}/publish`, { method: 'POST', json: { provider } });
      onChanged(res.slot);
      track('post_published', { provider });
      onToast(provider === 'tiktok' ? 'Sent to TikTok. It shows up on your profile in a minute.' : 'Posted to Instagram');
      setConfirming(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const conn = confirming ? data.connections.find((c) => c.provider === confirming) : null;

  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <div className="flex flex-col gap-2 rounded-2xl border border-app-line p-3">
          <p className="text-[14px] text-app-ink">
            Post this photo and caption to {LABEL[confirming]}{conn?.username ? ` (${conn.username.startsWith('@') ? conn.username : `@${conn.username}`})` : ''} now?
          </p>
          <div className="flex gap-2">
            <AppButton fullWidth loading={busy} onClick={() => void publish(confirming)} iconLeft={<Send aria-hidden className="h-4 w-4" />}>Post now</AppButton>
            <AppButton fullWidth variant="secondary" disabled={busy} onClick={() => setConfirming(null)}>Cancel</AppButton>
          </div>
        </div>
      ) : (
        data.connections.map((c) => (
          <AppButton key={c.provider} size="lg" fullWidth onClick={() => setConfirming(c.provider)} iconLeft={<PlatformIcon id={c.provider} className="h-4 w-4" />}>
            Post to {LABEL[c.provider]}
          </AppButton>
        ))
      )}
      {error && <p className="text-[13px] text-app-danger" role="alert">{error}</p>}
    </div>
  );
};
