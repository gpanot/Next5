'use client';

import type { BatchItemDto, BatchProductDto, PostKitDto } from '../../../types/business/batches';
import { Dialog } from '../../ui/Dialog';
import { PostKitBody } from '../postKit/PostKitBody';

type ProductPostKitDialogProps = {
  product: BatchProductDto;
  photos: BatchItemDto[];
  allowed: boolean;
  onClose: () => void;
  onGenerated: (kit: PostKitDto) => void;
  onCopied: (what: string) => void;
};

/** One Post Kit for a whole listing: the product's photo series, written together. */
export const ProductPostKitDialog = ({ product, photos, allowed, onClose, onGenerated, onCopied }: ProductPostKitDialogProps) => {
  const ready = photos.filter((p) => p.status === 'ready' && p.url);
  return (
    <Dialog open onClose={onClose} title="Listing Post Kit" description={product.name} className="max-h-[90vh] overflow-y-auto">
      <div className="flex flex-col gap-4">
        {ready.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {ready.map((photo) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img key={photo.id} src={photo.url ?? ''} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
            ))}
          </div>
        )}
        <p className="text-[13px] text-app-muted">One post for this listing, written from all its photos.</p>
        <PostKitBody
          key={product.id}
          initialKit={product.postKit}
          endpoint={`/api/app/shop/products/${product.id}/post-kit`}
          product="shop"
          subject="this listing"
          allowed={allowed}
          onCopied={onCopied}
          onGenerated={onGenerated}
          autoGenerate
          allowRewrite
        />
      </div>
    </Dialog>
  );
};
