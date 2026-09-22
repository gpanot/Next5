'use client';

import { AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../../hooks/useApi';
import { ApiError, apiFetch } from '../../../../lib/apiClient';
import type { SetTemplateDto } from '../../../../types/business/catalog';
import type { InfluencerDto } from '../../../../types/business/influencers';
import { AppButton } from '../../../ui/AppButton';
import { ErrorState } from '../../../ui/ErrorState';
import { Sheet } from '../../../ui/Sheet';
import { SkeletonCard } from '../../../ui/Skeleton';
import { useWorkspace } from '../../shell/WorkspaceProvider';
import { StylePager } from '../steps/StylePager';

type Props = { influencer: InfluencerDto; preselectedTemplateId?: string; onClose: () => void; onAdded: () => void };

/** Pick more styles for an influencer: one new photo of the same face per style, one credit each. */
export const AddStyleSheet = ({ influencer, preselectedTemplateId, onClose, onAdded }: Props) => {
  const { me, refresh } = useWorkspace();
  const templatesApi = useApi<{ templates: SetTemplateDto[] }>('/api/app/templates?product=brand');
  const [selected, setSelected] = useState<string[]>(preselectedTemplateId ? [preselectedTemplateId] : []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const balance = me?.balance?.total ?? 0;
  const total = selected.length;
  const short = total > balance;
  const toggle = (id: string) => setSelected((list) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/app/influencers/${influencer.id}/styles`, { method: 'POST', json: { product: 'brand', templateIds: selected } });
      refresh();
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add these styles. Try again.');
      setBusy(false);
    }
  };

  const isRestyle = Boolean(preselectedTemplateId);
  return (
    <Sheet open onClose={onClose} title={isRestyle ? `Restyle for ${influencer.name}` : `Add styles for ${influencer.name}`} side="bottom" className="sm:left-1/2 sm:right-auto sm:w-full sm:max-w-xl sm:-translate-x-1/2">
      <div className="flex flex-col gap-4 overflow-y-auto px-5 py-4">
        <p className="text-[13px] text-app-muted">{isRestyle ? 'Make a new version of this style. Toggle others to add more at the same time.' : 'One new photo of the same face in each style. Swipe to see more.'}</p>
        {templatesApi.error && <ErrorState message={templatesApi.error} onRetry={templatesApi.refresh} />}
        {!templatesApi.data && !templatesApi.error && <SkeletonCard />}
        {templatesApi.data && (
          <StylePager templates={templatesApi.data.templates} selected={selected} onToggle={toggle} madeIds={influencer.styleIds} />
        )}
        {(error || short) && (
          <div role="alert" className="flex items-start gap-2 rounded-xl bg-app-danger/10 p-3 text-[13px] text-app-danger">
            <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error ?? `You need ${total} credits and have ${balance}. Top up or pick fewer styles.`}</span>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-app-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <span className="text-[13px] text-app-muted">{total} photo{total === 1 ? '' : 's'} · {total} credit{total === 1 ? '' : 's'}</span>
        <AppButton size="lg" loading={busy} disabled={total === 0 || short} onClick={() => void submit()}>Make photos</AppButton>
      </div>
    </Sheet>
  );
};
