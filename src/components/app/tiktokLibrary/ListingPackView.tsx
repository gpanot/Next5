'use client';

import { AlertTriangle, Copy, Download, ExternalLink, Tag } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useToast } from '../../../hooks/useToast';
import { track } from '../../../lib/analytics';
import { ApiError, apiFetch, downloadWithAuth } from '../../../lib/apiClient';
import type { ListingPackDto, PackStatusDto } from '../../../types/business/shop';
import { AppButton } from '../../ui/AppButton';
import { ErrorState } from '../../ui/ErrorState';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { SkeletonGrid } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { PostKitBody } from '../postKit/PostKitBody';
import { AppLink } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { PackCover } from './PackCover';
import { PackSlot } from './PackSlot';

const STATUS_OPTIONS: { value: PackStatusDto; label: string }[] = [{ value: 'draft', label: 'Draft' }, { value: 'ready', label: 'Ready to list' }, { value: 'uploaded', label: 'Uploaded' }];

/** Edit one product's TikTok Shop listing pack and download it in upload order. */
export const ListingPackView = ({ productId }: { productId: string }) => {
  const [pack, setPack] = useState<ListingPackDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toasts, toast, dismiss } = useToast();
  const { me } = useWorkspace();

  const load = useCallback(async () => {
    try {
      const r = await apiFetch<{ pack: ListingPackDto }>(`/api/app/shop/library/${productId}`);
      setPack(r.pack);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this pack.');
    }
  }, [productId]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ pack: ListingPackDto }>(`/api/app/shop/library/${productId}`)
      .then((r) => !cancelled && setPack(r.pack))
      .catch((err: unknown) => !cancelled && setError(err instanceof ApiError ? err.message : 'Could not load this pack.'));
    return () => { cancelled = true; };
  }, [productId]);

  const save = async (patch: Record<string, unknown>, done?: string) => {
    setBusy(true);
    try {
      const r = await apiFetch<{ pack: ListingPackDto }>(`/api/app/shop/library/${productId}`, { method: 'PATCH', json: patch });
      setPack(r.pack);
      if (done) toast(done);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (!pack) return <SkeletonGrid count={9} cols={3} />;

  const ids = pack.slots.map((s) => s.itemId);
  const move = (index: number, dir: -1 | 1) => {
    const next = [...ids];
    [next[index], next[index + dir]] = [next[index + dir]!, next[index]!];
    void save({ slotItemIds: next });
  };
  const hide = (itemId: string) => void save({ slotItemIds: ids.filter((id) => id !== itemId), hiddenItemIds: [...new Set([...pack.hiddenItemIds, itemId])] });
  const add = (itemId: string) => void save({ slotItemIds: [...ids, itemId], hiddenItemIds: pack.hiddenItemIds.filter((id) => id !== itemId) });
  const download = async () => {
    setBusy(true);
    try {
      const base = (pack.sku ?? pack.name).normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_-]+/g, '-').toLowerCase().slice(0, 40) || 'product';
      await downloadWithAuth(`/api/app/shop/library/${productId}/zip`, `${base}-tiktok-listing.zip`);
      track('listing_pack_downloaded', { photos: pack.slots.length });
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Download failed.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <AppLink href="/app/library" className="text-[13px] text-app-muted hover:text-app-ink">← TikTok library</AppLink>
          <h2 className="mt-1 text-[20px] font-semibold leading-snug text-app-ink">{pack.name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-3 text-[13px] text-app-muted">
            {pack.sku && <span>SKU {pack.sku}</span>}
            {pack.externalUrl && <a href={pack.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-app-accent hover:text-app-ink">Listing on TikTok <ExternalLink aria-hidden className="h-3.5 w-3.5" /></a>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl options={STATUS_OPTIONS} value={pack.status} onChange={(v) => void save({ status: v }, v === 'uploaded' ? 'Marked as uploaded' : undefined)} />
          <AppButton iconLeft={<Download className="h-4 w-4" />} loading={busy} disabled={pack.slots.length === 0} onClick={download}>Download pack</AppButton>
        </div>
      </div>

      <div className={`flex items-start gap-2 rounded-xl px-4 py-3 text-[13px] ${pack.visibleAiTag ? 'bg-app-sunken text-app-ink' : 'bg-app-danger/10 text-app-danger'}`}>
        <Tag aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
        {pack.visibleAiTag
          ? <span>These photos carry an AI label. Turn on “AI-generated” when you list them on TikTok Shop, and only list photos that match the real product.</span>
          : <span>TikTok Shop requires AI-generated listing photos to be labeled. <AppLink href="/app/settings" className="font-medium underline">Turn on the visible AI tag</AppLink> before you list these.</span>}
      </div>
      {pack.warnings.map((w) => <p key={w} className="flex items-start gap-2 text-[13px] text-app-warning"><AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{w}</p>)}

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <section aria-label="Listing photos in upload order" className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold text-app-ink">Listing photos · {pack.slots.length}/9 in upload order</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pack.slots.map((photo, i) => <PackSlot key={photo.itemId} mode="slot" photo={photo} index={i} count={pack.slots.length} busy={busy} onMove={(dir) => move(i, dir)} onRemove={() => hide(photo.itemId)} />)}
          </div>
        </section>
        <aside className="flex flex-col gap-4">
          {pack.originalUrl && (
            <figure className="flex flex-col gap-2">
              <figcaption className="text-[13px] font-medium text-app-muted">Your product photo</figcaption>
              {/* eslint-disable-next-line @next/next/no-img-element -- storage or TikTok CDN image */}
              <img src={pack.originalUrl} alt={`${pack.name} — original`} className="aspect-[3/4] w-full rounded-xl object-cover ring-1 ring-app-line" referrerPolicy="no-referrer" />
            </figure>
          )}
          <PackCover pack={pack} busy={busy} onPick={(itemId) => void save({ coverItemId: itemId })} onReload={load} onError={(message) => toast(message, 'error')} />
        </aside>
      </div>

      {pack.extra.length > 0 && (
        <section aria-label="Photos not in the pack" className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold text-app-ink">Not in the pack · {pack.extra.length}</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pack.extra.map((photo) => <PackSlot key={photo.itemId} mode="extra" photo={photo} busy={busy} full={pack.slots.length >= 9} onAdd={() => add(photo.itemId)} />)}
          </div>
        </section>
      )}

      {me?.plan?.postKit || pack.postKit ? (
        <section aria-label="Listing Post Kit" className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-4 shadow-sm">
          <p className="text-[15px] font-semibold text-app-ink">Listing Post Kit</p>
          <PostKitBody
            initialKit={pack.postKit}
            endpoint={`/api/app/shop/products/${pack.productId}/post-kit`}
            product="shop"
            subject="this listing"
            allowed={Boolean(me?.plan?.postKit) || Boolean(pack.postKit)}
            allowRewrite={Boolean(me?.plan?.postKit)}
            onGenerated={() => void load()}
            onCopied={(what) => toast(`${what} copied`)}
          />
        </section>
      ) : pack.description && (
        <section className="flex flex-col gap-2 rounded-2xl border border-app-line bg-app-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-semibold text-app-ink">Product description</p>
            <AppButton size="sm" variant="secondary" iconLeft={<Copy className="h-3.5 w-3.5" />} onClick={async () => { await navigator.clipboard.writeText(pack.description ?? ''); toast('Description copied'); }}>Copy</AppButton>
          </div>
          <p className="whitespace-pre-line text-[14px] text-app-ink">{pack.description}</p>
        </section>
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </div>
  );
};
