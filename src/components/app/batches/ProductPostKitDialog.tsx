'use client';

import type { BatchProductDto, PostKitDto } from '../../../types/business/batches';
import { Dialog } from '../../ui/Dialog';
import { PostKitBody } from '../postKit/PostKitBody';

type ProductPostKitDialogProps = {
  product: BatchProductDto;
  /** Every photo of the listing (this batch and earlier ones). */
  photoUrls: string[];
  allowed: boolean;
  onClose: () => void;
  onGenerated: (kit: PostKitDto) => void;
  onCopied: (what: string) => void;
};

/** One Post Kit for a whole listing: the product's photo series, written together. */
export const ProductPostKitDialog = ({ product, photoUrls, allowed, onClose, onGenerated, onCopied }: ProductPostKitDialogProps) => {
  return (
    <Dialog open onClose={onClose} title="Listing Post Kit" description={product.name} className="max-h-[90vh] overflow-y-auto">
      <div className="flex flex-col gap-4">
        {photoUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photoUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img key={url} src={url} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
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
