'use client';

import { CheckSquare, Heart } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FORMATS, isFormatId } from '../../../config/formats';
import { useBatchPolling } from '../../../hooks/useBatchPolling';
import { useToast } from '../../../hooks/useToast';
import type { BatchItemDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { ErrorState } from '../../ui/ErrorState';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { SkeletonGrid, SkeletonText } from '../../ui/Skeleton';
import { ToastContainer } from '../../ui/Toast';
import { useWorkspace } from '../shell/WorkspaceProvider';
import { BatchHeader } from './BatchHeader';
import { CompareLightbox } from './CompareLightbox';
import { PostingTips } from './PostingTips';
import { ShopCompareGrid } from './ShopCompareGrid';
import { CaptionPanel } from './CaptionPanel';
import { RedoDialog } from './RedoDialog';
import { ResultTile } from './ResultTile';
import { useBatchActions } from './useBatchActions';

export const BatchView = ({ batchId }: { batchId: string }) => {
  const { batch, error, loading, refresh, patchItem } = useBatchPolling(batchId);
  const { me, product } = useWorkspace();
  const { toasts, toast, dismiss } = useToast();
  const actions = useBatchActions(batch, patchItem, refresh, toast);
  const [format, setFormat] = useState<string | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [redoTarget, setRedoTarget] = useState<BatchItemDto | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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
          onRedo={setRedoTarget}
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
              onRedo={() => setRedoTarget(item)}
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
        <CompareLightbox originalUrl={openProduct?.frontUrl ?? null} generatedUrl={open.url} title={openProduct?.name ?? batch.name} onClose={() => setOpenIndex(null)} />
      )}
      {open?.url && !isShop && (
        <ImageLightbox
          src={open.url}
          alt={`${batch.name} — photo`}
          onClose={() => setOpenIndex(null)}
          onPrev={openable.length > 1 ? () => setOpenIndex((i) => (i === null ? 0 : (i - 1 + openable.length) % openable.length)) : undefined}
          onNext={openable.length > 1 ? () => setOpenIndex((i) => (i === null ? 0 : (i + 1) % openable.length)) : undefined}
          overlay={product === 'brand' && batch.kind !== 'trial' ? (
            <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(92vw,420px)] -translate-x-1/2">
              <CaptionPanel key={open.id} itemId={open.id} initial={open.caption} allowed={Boolean(me?.plan?.captions)} onCopied={() => toast('Caption copied')} />
            </div>
          ) : undefined}
        />
      )}
      {redoTarget && product && (
        <RedoDialog item={redoTarget} product={product} highRes={batch.highRes} onClose={() => setRedoTarget(null)} onConfirm={async (reason, note) => { await actions.redo(redoTarget, reason, note); setRedoTarget(null); }} />
      )}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
};
