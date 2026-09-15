'use client';

import { CheckSquare, Download, Heart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FORMATS, isFormatId } from '../../../config/formats';
import { useBatchPolling } from '../../../hooks/useBatchPolling';
import { useToast } from '../../../hooks/useToast';
import type { BatchItemDto, ProductPhotoDto } from '../../../types/business/batches';
import { downloadPhoto } from '../../../lib/apiClient';
import { AppButton } from '../../ui/AppButton';
import { ErrorState } from '../../ui/ErrorState';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { SkeletonGrid, SkeletonText } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { useAppRouter } from '../shell/AppLink';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { BatchHeader } from './BatchHeader';
import { CompareLightbox } from './CompareLightbox';
import { PostingTips } from './PostingTips';
import { ShopCompareGrid } from './ShopCompareGrid';
import { PostKitPanel } from '../postKit/PostKitPanel';
import { PostKitDialog } from './PostKitDialog';
import { ProductMorePhotos } from './ProductMorePhotos';
import { ProductPostKitDialog } from './ProductPostKitDialog';
import { ShopPhotoPanel } from './ShopPhotoPanel';
import { RedoDialog } from './RedoDialog';
import { ResultTile } from './ResultTile';
import { useBatchActions } from './useBatchActions';

export const BatchView = ({ batchId }: { batchId: string }) => {
  const { batch, error, loading, refresh, patchItem } = useBatchPolling(batchId);
  const { me, product } = useWorkspace();
  const router = useAppRouter();
  const { toasts, toast, dismiss } = useToast();
  const actions = useBatchActions(batch, patchItem, refresh, toast);
  const [format, setFormat] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [redoTarget, setRedoTarget] = useState<BatchItemDto | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [postKitId, setPostKitId] = useState<string | null>(null);
  const [postKitProductId, setPostKitProductId] = useState<string | null>(null);
  const [earlierPhoto, setEarlierPhoto] = useState<{ photo: ProductPhotoDto; name: string } | null>(null);
  // A failed photo retries straight away on the fallback model; a ready one asks what to fix.
  const openRedo = (item: BatchItemDto) => (item.status === 'failed' ? void actions.redo(item, 'other', '') : setRedoTarget(item));

  const activeFormat = format ?? batch?.formats[0] ?? null;
  const items = useMemo(
    () => (batch?.items ?? []).filter((i) => (!activeFormat || batch?.formats.length === 1 || i.format === activeFormat) && (!favoritesOnly || i.favorite)),
    [batch, activeFormat, favoritesOnly],
  );
  const openable = items.filter((i) => i.status === 'ready' && i.url);

  if (loading && !batch) return <div className="flex flex-col gap-4"><SkeletonText lines={2} /><SkeletonGrid count={8} cols={4} /></div>;
  if (!batch) return <ErrorState message={error ?? 'Batch not found.'} onRetry={() => void refresh()} />;

  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const open = openIndex !== null ? openable[openIndex] : null;
  const isShop = batch.products.length > 0;
  const postKitAllowed = Boolean(me?.plan?.postKit) || batch.kind === 'trial';
  const postKitProduct = postKitProductId ? batch.products.find((p) => p.id === postKitProductId) ?? null : null;
  const postKitItem = postKitId ? batch.items.find((i) => i.id === postKitId && i.status === 'ready') ?? null : null;
  const openProduct = open && isShop ? batch.products.find((p) => p.id === open.productId) ?? null : null;

  return (
    <>
      <BatchHeader batch={batch} downloading={actions.downloading} onDownloadAll={() => actions.downloadZip(batch.formats.length > 1 && activeFormat ? `?format=${activeFormat}` : '', `${batch.name}.zip`)} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {batch.formats.length > 1 && activeFormat ? (
          <SegmentedControl options={batch.formats.map((f) => ({ value: f, label: isFormatId(f) ? `${FORMATS[f].ratio} ${FORMATS[f].label}` : f }))} value={activeFormat} onChange={setFormat} />
        ) : <span />}
        <div className="flex gap-2">
          <AppButton size="sm" variant={favoritesOnly ? 'primary' : 'secondary'} iconLeft={<Heart className="h-3.5 w-3.5" />} onClick={() => setFavoritesOnly((v) => !v)}>Favourites</AppButton>
          <AppButton size="sm" variant={selecting ? 'primary' : 'secondary'} iconLeft={<CheckSquare className="h-3.5 w-3.5" />} onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }}>{selecting ? 'Done' : 'Select'}</AppButton>
        </div>
      </div>
      {isShop && <PostingTips visibleAiTag={batch.visibleAiTag} />}
      {items.length === 0 ? (
        <p className="rounded-2xl border border-app-line bg-app-panel p-8 text-center text-[14px] text-app-muted">{favoritesOnly ? 'No favourites yet — tap the heart on photos you love.' : 'Nothing here yet.'}</p>
      ) : isShop ? (
        <ShopCompareGrid
          batch={batch}
          items={items}
          selecting={selecting}
          selected={selected}
          downloading={actions.downloading}
          onToggleSelect={toggle}
          onOpen={(item) => setOpenIndex(openable.findIndex((o) => o.id === item.id))}
          onFavorite={(item) => void actions.favorite(item)}
          onDownload={(item, index) => void actions.download(item, index)}
          onRedo={openRedo}
          onPostKit={(p) => setPostKitProductId(p.id)}
          onOpenEarlier={(photo, p) => setEarlierPhoto({ photo, name: p.name })}
          onDownloadEarlier={(photo, p) => void downloadPhoto(photo.batchId, photo.id, `${p.name.slice(0, 40)}-${photo.shot ?? 'photo'}.jpg`).catch(() => toast('Download failed.', 'error'))}
          productFooter={(p) => <ProductMorePhotos batch={batch} product={p} onStarted={() => void refresh()} onError={(message) => toast(message, 'error')} />}
          onZipProduct={(productId, name) => void actions.downloadZip(`?productId=${productId}${batch.formats.length > 1 && activeFormat ? `&format=${activeFormat}` : ''}`, `${name}.zip`)}
        />
      ) : (
        <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item, index) => (
            <ResultTile
              key={item.id}
              item={item}
              alt={`${batch.name} — photo ${index + 1}`}
              selecting={selecting}
              selected={selected.has(item.id)}
              onToggleSelect={() => toggle(item.id)}
              onOpen={() => setOpenIndex(openable.findIndex((o) => o.id === item.id))}
              onFavorite={() => void actions.favorite(item)}
              onDownload={() => void actions.download(item, index)}
              onRedo={() => openRedo(item)}
              onPostKit={() => setPostKitId(item.id)}
            />
          ))}
        </div>
      )}
      {selecting && selected.size > 0 && (
        <div className="sticky bottom-20 z-10 flex items-center justify-between gap-3 rounded-2xl border border-app-line bg-app-panel p-3 shadow-lg lg:bottom-4">
          <span className="text-[14px] font-medium text-app-ink">{selected.size} selected</span>
          <AppButton loading={actions.downloading} onClick={() => void actions.downloadSelected([...selected])}>Download selected</AppButton>
        </div>
      )}
      {open?.url && isShop && (
        <CompareLightbox originalUrl={openProduct?.frontUrl ?? null} generatedUrl={open.url} title={openProduct?.name ?? batch.name} onClose={() => setOpenIndex(null)} onDownload={() => void actions.download(open, openIndex ?? 0)} downloading={actions.savingPhoto} panel={<ShopPhotoPanel item={open} product={openProduct} onOpenPostKit={() => { setOpenIndex(null); setPostKitProductId(open.productId); }} />} />
      )}
      {open?.url && !isShop && (
        <ImageLightbox
          src={open.url}
          alt={`${batch.name} — photo`}
          onClose={() => setOpenIndex(null)}
          onPrev={openable.length > 1 ? () => setOpenIndex((i) => (i === null ? 0 : (i - 1 + openable.length) % openable.length)) : undefined}
          onNext={openable.length > 1 ? () => setOpenIndex((i) => (i === null ? 0 : (i + 1) % openable.length)) : undefined}
          overlay={(
            <>
              <AppButton size="sm" variant="secondary" className="pointer-events-auto absolute left-4 top-4" iconLeft={<Download className="h-3.5 w-3.5" />} loading={actions.savingPhoto} onClick={() => void actions.download(open, openIndex ?? 0)}>Download</AppButton>
              <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(92vw,440px)] -translate-x-1/2">
                <PostKitPanel key={open.id} item={open} product="brand" allowed={postKitAllowed} onGenerated={(kit) => patchItem(open.id, { postKit: kit })} onCopied={(what) => toast(`${what} copied`)} />
              </div>
            </>
          )}
        />
      )}
      {earlierPhoto?.photo.url && (
        <ImageLightbox
          src={earlierPhoto.photo.url}
          alt={`${earlierPhoto.name} — earlier photo`}
          onClose={() => setEarlierPhoto(null)}
          overlay={(
            <div className="pointer-events-auto absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              <AppButton size="sm" variant="secondary" iconLeft={<Download className="h-3.5 w-3.5" />} onClick={() => void downloadPhoto(earlierPhoto.photo.batchId, earlierPhoto.photo.id, `${earlierPhoto.name.slice(0, 40)}.jpg`).catch(() => toast('Download failed.', 'error'))}>Download</AppButton>
              <AppButton size="sm" variant="secondary" onClick={() => { setEarlierPhoto(null); router.push(`/app/batches/${earlierPhoto.photo.batchId}`); }}>Open its batch</AppButton>
            </div>
          )}
        />
      )}
      {postKitProduct && (
        <ProductPostKitDialog
          product={postKitProduct}
          photoUrls={[...batch.items.filter((i) => i.productId === postKitProduct.id && i.status === 'ready'), ...postKitProduct.otherPhotos].map((p) => p.url).filter((url): url is string => Boolean(url))}
          allowed={postKitAllowed}
          onClose={() => setPostKitProductId(null)}
          onGenerated={() => void refresh()}
          onCopied={(what) => toast(`${what} copied`)}
        />
      )}
      {postKitItem && (
        <PostKitDialog
          item={postKitItem}
          title={batch.products.find((p) => p.id === postKitItem.productId)?.name ?? batch.name}
          product={isShop ? 'shop' : 'brand'}
          allowed={postKitAllowed}
          onClose={() => setPostKitId(null)}
          onGenerated={(kit) => patchItem(postKitItem.id, { postKit: kit })}
          onCopied={(what) => toast(`${what} copied`)}
        />
      )}
      {redoTarget && product && (
        <RedoDialog item={redoTarget} product={product} highRes={batch.highRes} onClose={() => setRedoTarget(null)} onConfirm={async (reason, note) => { await actions.redo(redoTarget, reason, note); setRedoTarget(null); }} />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
