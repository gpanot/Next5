'use client';

import { track } from '../../../lib/analytics';
import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useApi } from '../../../hooks/useApi';
import { useBatchPolling } from '../../../hooks/useBatchPolling';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import type { BatchItemDto, BatchSummaryDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { ImageTile } from '../../ui/ImageTile';
import { SkeletonText } from '../../ui/Skeleton';
import { StepCard } from './StepCard';
import type { StepProps } from './types';

const STAGES = ['Studying your photos', 'Setting up your look', 'Directing your photos'] as const;

const Progress = ({ ready, total }: { ready: number; total: number }) => {
  const stage = Math.min(STAGES.length - 1, Math.floor(((ready + 0.5) / Math.max(total, 1)) * STAGES.length));
  return (
    <ol className="flex flex-col gap-2" aria-live="polite">
      {STAGES.map((label, i) => (
        <li key={label} className={`flex items-center gap-2 text-[14px] ${i <= stage ? 'text-app-ink' : 'text-app-muted'}`}>
          <span className={`h-2 w-2 rounded-full ${i < stage ? 'bg-app-success' : i === stage ? 'animate-pulse bg-app-accent' : 'bg-app-line'}`} aria-hidden />
          {label}
        </li>
      ))}
      <li className="text-[13px] text-app-muted">{ready} of {total} photos ready</li>
    </ol>
  );
};

const TrialResults = ({ batchId, product }: { batchId: string; product: 'brand' | 'shop' }) => {
  const { batch, patchItem } = useBatchPolling(batchId);
  if (!batch) return <SkeletonText lines={3} />;
  const redo = async (item: BatchItemDto) => {
    patchItem(item.id, { status: 'queued', url: item.url });
    await apiFetch(`/api/app/batches/${batchId}/items/${item.id}/redo`, { method: 'POST', json: { reason: product === 'shop' ? 'product_mismatch' : 'not_like_me' } }).catch(() => undefined);
  };
  const active = batch.status === 'queued' || batch.status === 'generating';
  return (
    <div className="flex flex-col gap-5">
      {active && <Progress ready={batch.progress.ready} total={batch.progress.total} />}
      <div className="grid grid-cols-3 gap-3">
        {batch.items.map((item) => (
          <ImageTile
            key={item.id}
            src={item.url ?? undefined}
            alt="Your free photo"
            status={item.status === 'submitting' ? 'generating' : item.status}
            onRedo={item.status === 'ready' && item.freeRedosLeft > 0 ? () => void redo(item) : undefined}
          />
        ))}
      </div>
      {batch.status === 'failed' && <p role="alert" className="text-[14px] text-app-danger">Something went wrong on our side. Your credits were returned — try again.</p>}
    </div>
  );
};

export const TrialStep = ({ product, me, advance }: StepProps) => {
  const batches = useApi<{ batches: BatchSummaryDto[] }>(`/api/app/batches?product=${product}&limit=10`);
  const [startedId, setStartedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trial = batches.data?.batches.find((b) => b.kind === 'trial');
  const batchId = startedId ?? trial?.id ?? null;
  const canRetry = trial?.status === 'failed';

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{ batch: BatchSummaryDto }>('/api/app/onboarding/trial', { method: 'POST', json: { product } });
      setStartedId(res.batch.id);
      track('trial_generated', { product });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start your photos.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <StepCard
      title={batchId ? 'Your free photos' : 'Create your 3 free photos'}
      sub={product === 'brand' ? 'Three photos from this month’s theme, in your set.' : 'Your product, worn, in your shop look — listing format.'}
      footer={batchId && !canRetry ? <AppButton size="lg" onClick={() => advance(5)}>Continue</AppButton> : undefined}
    >
      {batches.loading ? <SkeletonText lines={2} /> : batchId && !canRetry ? (
        <TrialResults batchId={batchId} product={product} />
      ) : (
        <div className="flex flex-col items-start gap-4">
          <Sparkles aria-hidden className="h-8 w-8 text-app-accent" />
          <p className="text-[15px] text-app-muted">It takes about a minute. You can redo any photo for free.</p>
          <AppButton size="lg" loading={busy} onClick={start} disabled={Boolean(me.workspace?.trialUsed) && !canRetry}>{canRetry ? 'Try again' : 'Create my free photos'}</AppButton>
        </div>
      )}
      {error && <p role="alert" className="text-[14px] text-app-danger">{error}</p>}
    </StepCard>
  );
};
