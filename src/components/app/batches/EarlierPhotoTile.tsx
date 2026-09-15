'use client';

import { Download, Maximize2 } from 'lucide-react';
import { FORMATS, isFormatId } from '../../../config/formats';
import type { ProductPhotoDto } from '../../../types/business/batches';
import { ScoreBadge } from '../postKit/ScoreBadge';

type EarlierPhotoTileProps = { photo: ProductPhotoDto; alt: string; onOpen: () => void; onDownload: () => void };

/** A photo of the same product from another batch, so the row shows the whole listing. Open it there to redo it. */
export const EarlierPhotoTile = ({ photo, alt, onOpen, onDownload }: EarlierPhotoTileProps) => (
  <figure className="flex flex-col overflow-hidden rounded-2xl border border-app-line bg-app-panel">
    <button type="button" onClick={onOpen} aria-label={`Open ${alt}`} className="relative w-full overflow-hidden bg-app-sunken" style={{ aspectRatio: isFormatId(photo.format) ? FORMATS[photo.format].cssAspect : '1 / 1' }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed storage URL */}
      {photo.url && <img src={photo.url} alt={alt} loading="lazy" className="h-full w-full object-cover" />}
      {photo.score !== null && <ScoreBadge score={photo.score} className="absolute left-2 top-2" />}
      <Maximize2 aria-hidden className="absolute right-2 top-2 h-4 w-4 text-white opacity-80 drop-shadow" />
    </button>
    <figcaption className="flex items-center justify-between px-2 py-1">
      <span className="text-[11px] font-medium text-app-muted">Earlier</span>
      <button type="button" aria-label="Download" title="Download" onClick={onDownload} className="flex h-8 w-8 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink"><Download aria-hidden className="h-4 w-4" /></button>
    </figcaption>
  </figure>
);
