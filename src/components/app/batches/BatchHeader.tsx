'use client';

import { Download } from 'lucide-react';
import { formatShortDate } from '../../../lib/dates';
import type { BatchDetailDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';

type BatchHeaderProps = { batch: BatchDetailDto; downloading: boolean; onDownloadAll: () => void };

export const BatchHeader = ({ batch, downloading, onDownloadAll }: BatchHeaderProps) => {
  const { ready, total, failed } = batch.progress;
  const active = batch.status === 'queued' || batch.status === 'generating';
  const pct = total ? Math.round(((ready + failed) / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[20px] font-semibold text-app-ink">{batch.name}</h2>
          <p className="text-[13px] text-app-muted" aria-live="polite">
            {ready} of {total} ready{failed ? ` · ${failed} couldn’t be created (refunded)` : ''} · {formatShortDate(batch.createdAt)}{batch.highRes ? ' · High-res' : ''}
          </p>
        </div>
        <AppButton variant="secondary" iconLeft={<Download className="h-4 w-4" />} loading={downloading} disabled={ready === 0} onClick={onDownloadAll}>Download all</AppButton>
      </div>
      {active && (
        <div className="flex flex-col gap-1.5">
          <div className="h-1.5 overflow-hidden rounded-full bg-app-sunken" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-app-accent transition-all duration-500" style={{ width: `${Math.max(4, pct)}%` }} />
          </div>
          <p className="text-[12px] text-app-muted">Creating your photos. You can leave this page — we’ll keep going.</p>
        </div>
      )}
    </div>
  );
};
