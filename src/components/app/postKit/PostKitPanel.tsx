'use client';

import type { BatchItemDto, PostKitDto } from '../../../types/business/batches';
import { PostKitBody } from './PostKitBody';
import { ScoreCard } from './ScoreCard';

type PostKitPanelProps = {
  item: BatchItemDto;
  product: 'brand' | 'shop';
  allowed: boolean;
  onCopied: (what: string) => void;
  /** Start writing as soon as the panel opens. */
  autoGenerate?: boolean;
  onGenerated?: (kit: PostKitDto) => void;
  /** `card`: floating card for the dark lightbox. `plain`: no card, for a dialog. */
  variant?: 'card' | 'plain';
};

/** Score + Post Kit for one photo (Brand posts one photo at a time). */
export const PostKitPanel = ({ item, product, allowed, onCopied, autoGenerate = false, onGenerated, variant = 'card' }: PostKitPanelProps) => (
  <div className={variant === 'card' ? 'flex max-h-[46vh] flex-col gap-4 overflow-y-auto rounded-2xl bg-app-panel p-4 text-app-ink shadow-lg' : 'flex flex-col gap-4 text-app-ink'}>
    {item.score !== null && <ScoreCard score={item.score} details={item.scoreDetails} />}
    <PostKitBody initialKit={item.postKit} endpoint={`/api/app/items/${item.id}/post-kit`} product={product} allowed={allowed} onCopied={onCopied} autoGenerate={autoGenerate} onGenerated={onGenerated} />
  </div>
);
