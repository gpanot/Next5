'use client';

import { AlertTriangle, ExternalLink, Loader2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ApiError, apiFetch } from '../../../lib/apiClient';
import { formatShortDate } from '../../../lib/dates';
import type { ShopConnectionDto } from '../../../types/business/shop';
import { AppButton } from '../../ui/AppButton';
import { Card, CardBody } from '../../ui/Card';

type Props = { connection: ShopConnectionDto; onChange: (c: ShopConnectionDto) => void; onReconnect: () => void };

const compact = (n: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const StoreHeader = ({ connection: c, onChange, onReconnect }: Props) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sync = async () => {
    setBusy(true);
    setError(null);
    try {
      const { connection } = await apiFetch<{ connection: ShopConnectionDto }>('/api/app/shop/connection/sync', { method: 'POST' });
      onChange(connection);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sync now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- TikTok CDN logo */}
          {c.shopLogoUrl ? <img src={c.shopLogoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-1 ring-app-line" /> : <span className="h-12 w-12 shrink-0 rounded-full bg-app-accent-soft" aria-hidden />}
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-[17px] font-semibold text-app-ink">
              {c.shopName ?? (c.source === 'export' ? 'Imported from Seller Center' : 'Your TikTok Shop')}
              {c.shopUrl && <a href={c.shopUrl} target="_blank" rel="noreferrer" aria-label="Open store on TikTok" className="text-app-muted hover:text-app-ink"><ExternalLink className="h-4 w-4" /></a>}
            </p>
            <p className="text-[13px] text-app-muted">
              {c.status === 'syncing' ? <span className="inline-flex items-center gap-1.5"><Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" /> Importing your products… usually under a minute</span>
                : `${c.productCount} products${c.totalSold != null ? ` · ${compact(c.totalSold)} sold` : ''}${c.lastSyncedAt ? ` · synced ${formatShortDate(c.lastSyncedAt)}` : ''}`}
            </p>
            {c.demoData && <p className="text-[12px] text-app-warning">Demo data: the scraper is off in this environment.</p>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {c.source === 'scrape' && <AppButton variant="secondary" size="sm" iconLeft={<RefreshCw className="h-3.5 w-3.5" />} loading={busy} disabled={c.status === 'syncing'} onClick={sync}>Sync now</AppButton>}
          <AppButton variant="ghost" size="sm" onClick={onReconnect}>Change store</AppButton>
        </div>
      </CardBody>
      {(c.status === 'failed' || error) && (
        <p role="alert" className="flex items-center gap-2 border-t border-app-line px-5 py-3 text-[13px] text-app-danger"><AlertTriangle aria-hidden className="h-4 w-4" />{error ?? c.error}</p>
      )}
    </Card>
  );
};
