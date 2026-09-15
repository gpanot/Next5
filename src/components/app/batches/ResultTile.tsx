'use client';

import { AlertTriangle, Check, Download, Heart, Loader2, Maximize2, RefreshCw } from 'lucide-react';
import { FORMATS, isFormatId } from '../../../config/formats';
import { failedPhotoText } from '../../../lib/generationErrors';
import type { BatchItemDto } from '../../../types/business/batches';
import { ScoreBadge } from '../postKit/ScoreBadge';

type ResultTileProps = {
  item: BatchItemDto;
  alt: string;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onFavorite: () => void;
  onDownload: () => void;
  onRedo: () => void;
};

const IconButton = ({ label, onClick, children, active = false }: { label: string; onClick: () => void; children: React.ReactNode; active?: boolean }) => (
  <button type="button" aria-label={label} onClick={onClick} className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent ${active ? 'text-app-danger' : 'text-app-muted hover:bg-app-sunken hover:text-app-ink'}`}>
    {children}
  </button>
);

/** A generated photo with always-visible actions (works without hover on phones). */
export const ResultTile = ({ item, alt, selecting, selected, onToggleSelect, onOpen, onFavorite, onDownload, onRedo }: ResultTileProps) => {
  const aspect = isFormatId(item.format) ? FORMATS[item.format].cssAspect : '3 / 4';
  const busy = item.status === 'queued' || item.status === 'submitting' || item.status === 'generating';
  const ready = item.status === 'ready' && item.url;

  return (
    <figure className={`flex flex-col overflow-hidden rounded-2xl border bg-app-panel transition-colors duration-200 ${selected ? 'border-app-accent ring-1 ring-app-accent' : 'border-app-line'}`}>
      <button type="button" onClick={selecting ? onToggleSelect : onOpen} disabled={!ready && !selecting} aria-label={selecting ? `Select ${alt}` : `Open ${alt}`} className="relative w-full overflow-hidden bg-app-sunken" style={{ aspectRatio: aspect }}>
        {item.url && (
          // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
          <img src={item.url} alt={alt} loading="lazy" className={`h-full w-full object-cover ${busy ? 'opacity-40' : ''}`} />
        )}
        {busy && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[12px] text-app-muted">
            <Loader2 aria-hidden className="h-6 w-6 animate-spin text-app-accent" />
            {item.status === 'queued' ? 'Queued' : 'Creating…'}
          </span>
        )}
        {item.status === 'failed' && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-[12px] text-app-muted">
            <AlertTriangle aria-hidden className="h-6 w-6 text-app-warning" />
            <span role="alert">{failedPhotoText(item.errorMessage, item.canRetry)}</span>
            <span className="text-[11px]">No credit used.</span>
          </span>
        )}
        {selecting && (
          <span className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 ${selected ? 'border-app-accent bg-app-accent text-app-accent-ink' : 'border-white bg-black/30'}`}>
            {selected && <Check aria-hidden className="h-4 w-4" />}
          </span>
        )}
        {ready && !selecting && item.score !== null && <ScoreBadge score={item.score} className="absolute left-2 top-2" />}
        {ready && !selecting && <Maximize2 aria-hidden className="absolute right-2 top-2 h-4 w-4 text-white opacity-80 drop-shadow" />}
      </button>
      {!selecting && (
        <figcaption className="flex items-center justify-between px-1.5 py-1">
          <IconButton label={item.favorite ? 'Remove from favourites' : 'Add to favourites'} onClick={onFavorite} active={item.favorite}>
            <Heart aria-hidden className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
          </IconButton>
          <div className="flex">
            {(ready || item.canRetry) && <IconButton label="Redo" onClick={onRedo}><RefreshCw aria-hidden className="h-4 w-4" /></IconButton>}
            {ready && <IconButton label="Download" onClick={onDownload}><Download aria-hidden className="h-4 w-4" /></IconButton>}
          </div>
        </figcaption>
      )}
    </figure>
  );
};
