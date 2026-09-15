'use client';

import { Sparkles } from 'lucide-react';
import type { BatchItemDto, BatchProductDto } from '../../../types/business/batches';
import { AppButton } from '../../ui/AppButton';
import { ScoreCard } from '../postKit/ScoreCard';

/** Under a Shop photo in the compare view: its score, and the Post Kit for the whole listing. */
export const ShopPhotoPanel = ({ item, product, onOpenPostKit }: { item: BatchItemDto; product: BatchProductDto | null; onOpenPostKit: () => void }) => (
  <div className="flex max-h-[46vh] flex-col gap-4 overflow-y-auto rounded-2xl bg-app-panel p-4 text-app-ink shadow-lg">
    {item.score !== null && <ScoreCard score={item.score} details={item.scoreDetails} />}
    {product && (
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-app-muted">{product.postKit ? 'Your listing Post Kit is ready.' : 'One hook, caption, description and hashtags for all photos of this product.'}</p>
        <AppButton size="sm" iconLeft={<Sparkles className="h-3.5 w-3.5" />} onClick={onOpenPostKit}>{product.postKit ? 'See Post Kit' : 'Post Kit'}</AppButton>
      </div>
    )}
  </div>
);
