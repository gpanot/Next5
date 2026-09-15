'use client';

import type { BatchItemDto, PostKitDto } from '../../../types/business/batches';
import { Dialog } from '../../ui/Dialog';
import { PostKitPanel } from '../postKit/PostKitPanel';

type PostKitDialogProps = {
  item: BatchItemDto;
  title: string;
  product: 'brand' | 'shop';
  allowed: boolean;
  onClose: () => void;
  onGenerated: (kit: PostKitDto) => void;
  onCopied: (what: string) => void;
};

/** The Post Kit for one photo, right on the batch page: opens and starts writing straight away. */
export const PostKitDialog = ({ item, title, product, allowed, onClose, onGenerated, onCopied }: PostKitDialogProps) => (
  <Dialog open onClose={onClose} title="Post Kit" description={title} className="max-h-[90vh] overflow-y-auto">
    <div className="flex flex-col gap-4">
      {item.url && (
        // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
        <img src={item.url} alt={title} className="mx-auto h-40 w-auto rounded-xl object-cover shadow-sm" />
      )}
      <PostKitPanel key={item.id} item={item} product={product} allowed={allowed} onCopied={onCopied} onGenerated={onGenerated} autoGenerate variant="plain" />
    </div>
  </Dialog>
);
