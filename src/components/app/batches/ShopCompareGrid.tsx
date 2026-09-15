'use client';

import { Download, Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import { SHOTS, type ShotId } from '../../../config/shots';
import type { BatchDetailDto, BatchItemDto, BatchProductDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { ResultTile } from './ResultTile';

type ShopCompareGridProps = {
  batch: BatchDetailDto;
  items: BatchItemDto[];
  selecting: boolean;
  selected: ReadonlySet<string>;
  downloading: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (item: BatchItemDto) => void;
  onFavorite: (item: BatchItemDto) => void;
  onDownload: (item: BatchItemDto, index: number) => void;
  onRedo: (item: BatchItemDto) => void;
  /** Opens the Post Kit for the product's whole photo series. */
  onPostKit: (product: BatchProductDto) => void;
  /** Rendered at the bottom of each product's row (e.g. "Create more photos"). */
  productFooter?: (product: BatchProductDto) => ReactNode;
  onZipProduct: (productId: string, name: string) => void;
};

const SHOT_ORDER = Object.keys(SHOTS);
const shotRank = (shot: string | null) => (shot ? SHOT_ORDER.indexOf(shot) : 99);

const shotLabel = (shot: string | null) => (shot && shot in SHOTS ? SHOTS[shot as ShotId].label : 'Photo');

/** One row per product: the original photo pinned left, generated shots scroll horizontally. */
export const ShopCompareGrid = ({ batch, items, selecting, selected, downloading, onToggleSelect, onOpen, onFavorite, onDownload, onRedo, onPostKit, productFooter, onZipProduct }: ShopCompareGridProps) => (
  <div className="flex flex-col gap-4">
    {batch.products.map((product) => {
      const shots = items.filter((i) => i.productId === product.id).sort((a, b) => shotRank(a.shot) - shotRank(b.shot));
      if (shots.length === 0) return null;
      return (
        <section key={product.id} className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-3 sm:p-4">
          <header className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-semibold text-app-ink">{product.name}</h3>
              <p className="text-[12px] text-app-muted">{[product.colorName, product.sku && `SKU ${product.sku}`].filter(Boolean).join(' · ') || 'Compare each photo with your product'}</p>
            </div>
            <div className="flex gap-2">
              {shots.some((s) => s.status === 'ready') && (
                <AppButton size="sm" variant={product.postKit ? 'secondary' : 'primary'} iconLeft={<Sparkles className={`h-3.5 w-3.5 ${product.postKit ? 'fill-current text-app-accent' : ''}`} />} onClick={() => onPostKit(product)}>
                  {product.postKit ? 'Post Kit' : 'Write Post Kit'}
                </AppButton>
              )}
              <AppButton size="sm" variant="secondary" iconLeft={<Download className="h-3.5 w-3.5" />} loading={downloading} onClick={() => onZipProduct(product.id, product.name)}>Zip</AppButton>
            </div>
          </header>
          <div className="flex gap-3 overflow-x-auto pb-1 [scroll-snap-type:x_mandatory]">
            <figure className="flex w-32 shrink-0 flex-col gap-1.5 sm:w-40 [scroll-snap-align:start]">
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-app-sunken ring-2 ring-app-line">
                {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
                {product.frontUrl && <img src={product.frontUrl} alt={`${product.name} — your product photo`} className="h-full w-full object-cover" />}
              </div>
              <figcaption className="label-caps text-center text-[9px] font-medium text-app-muted">Your product</figcaption>
            </figure>
            {shots.map((item, index) => (
              <div key={item.id} className="flex w-36 shrink-0 flex-col gap-1 sm:w-44 [scroll-snap-align:start]">
                <ResultTile
                  item={item}
                  alt={`${product.name} — ${shotLabel(item.shot)}`}
                  selecting={selecting}
                  selected={selected.has(item.id)}
                  onToggleSelect={() => onToggleSelect(item.id)}
                  onOpen={() => onOpen(item)}
                  onFavorite={() => onFavorite(item)}
                  onDownload={() => onDownload(item, index)}
                  onRedo={() => onRedo(item)}
                />
                <span className="text-center text-[11px] text-app-muted">{shotLabel(item.shot)}</span>
              </div>
            ))}
          </div>
          {productFooter?.(product)}
        </section>
      );
    })}
  </div>
);
