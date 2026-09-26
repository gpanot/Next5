'use client';

/** Product photo grid: add (tap or drop), progress, remove, and what the AI saw in each photo. */

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { MAX_PRODUCT_PHOTOS } from '../../../../lib/manualProfile';
import { PHOTO_ACCEPT, type PhotoItem } from './useProductPhotos';

type Props = {
  photos: PhotoItem[];
  onAddFiles: (files: File[]) => void;
  onRemove: (key: string) => void;
};

function PhotoTile({ photo, onRemove }: { photo: PhotoItem; onRemove: () => void }) {
  const uploading = !photo.assetId && !photo.error;
  return (
    <figure className="flex flex-col gap-1.5">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-surface-alt dark:bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.previewUrl} alt={photo.description ?? photo.name} className="h-full w-full object-cover" />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-[12px] font-semibold text-white">
            {Math.round(photo.progress * 100)}%
          </div>
        )}
        {photo.error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-600/80 p-2 text-center text-[11px] text-white">
            {photo.error}
          </div>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove photo"
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {photo.description && (
        <figcaption className="line-clamp-3 text-[11px] leading-snug text-muted">{photo.description}</figcaption>
      )}
    </figure>
  );
}

export function ProductPhotosField({ photos, onAddFiles, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const full = photos.length >= MAX_PRODUCT_PHOTOS;
  const uploading = photos.some((p) => !p.assetId && !p.error);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] leading-relaxed text-muted">
        Real photos of the product, the work, the shop or happy customers. The AI reads each photo and
        puts the best one behind the product shots. Max {MAX_PRODUCT_PHOTOS}.
      </p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((p) => <PhotoTile key={p.key} photo={p} onRemove={() => onRemove(p.key)} />)}
        {!full && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              onAddFiles(Array.from(e.dataTransfer.files));
            }}
            className={[
              'flex aspect-square flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed text-[12px] font-medium transition-colors',
              dragging
                ? 'border-ink bg-surface-alt text-ink dark:bg-white/10'
                : 'border-line text-muted hover:border-ink hover:text-ink dark:border-white/15',
            ].join(' ')}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            Add photos
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={PHOTO_ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          onAddFiles(Array.from(e.target.files ?? []));
          e.target.value = '';
        }}
      />
    </div>
  );
}
