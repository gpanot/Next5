'use client';

import { useState } from 'react';
import { Heart, Download, RefreshCw, MoreHorizontal, Loader2, AlertTriangle } from 'lucide-react';

export type ImageTileStatus = 'queued' | 'generating' | 'ready' | 'failed';

type ImageTileProps = {
  src?: string;
  alt: string;
  status?: ImageTileStatus;
  isFavourite?: boolean;
  onFavourite?: () => void;
  onDownload?: () => void;
  onRedo?: () => void;
  onMore?: () => void;
  className?: string;
};

const STATUS_OVERLAY: Partial<Record<ImageTileStatus, React.ReactNode>> = {
  queued:     <Loader2 className="h-6 w-6 animate-spin text-white/80" />,
  generating: <Loader2 className="h-6 w-6 animate-spin text-white/80" />,
  failed:     <AlertTriangle className="h-6 w-6 text-white/80" />,
};

const STATUS_LABEL: Partial<Record<ImageTileStatus, string>> = {
  queued:     'Queued',
  generating: 'Generating…',
  failed:     'Failed',
};

export const ImageTile = ({
  src,
  alt,
  status = 'ready',
  isFavourite = false,
  onFavourite,
  onDownload,
  onRedo,
  onMore,
  className = '',
}: ImageTileProps) => {
  const [hovered, setHovered] = useState(false);
  const showOverlay = status !== 'ready' || hovered;

  return (
    <div
      className={['group relative aspect-[3/4] overflow-hidden rounded-xl bg-app-sunken', className].join(' ')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {src && status === 'ready' && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      )}

      {/* Status / hover overlay */}
      {showOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40">
          {STATUS_OVERLAY[status]}
          {STATUS_LABEL[status] && (
            <span className="text-[11px] text-white/80">{STATUS_LABEL[status]}</span>
          )}

          {/* Actions (only on ready + hover) */}
          {status === 'ready' && hovered && (
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {onFavourite && (
                <ActionBtn aria-label={isFavourite ? 'Unfavourite' : 'Favourite'} onClick={onFavourite}>
                  <Heart className={['h-4 w-4', isFavourite ? 'fill-current text-red-400' : ''].join(' ')} />
                </ActionBtn>
              )}
              {onDownload && (
                <ActionBtn aria-label="Download" onClick={onDownload}>
                  <Download className="h-4 w-4" />
                </ActionBtn>
              )}
              {onRedo && (
                <ActionBtn aria-label="Redo" onClick={onRedo}>
                  <RefreshCw className="h-4 w-4" />
                </ActionBtn>
              )}
              {onMore && (
                <ActionBtn aria-label="More options" onClick={onMore}>
                  <MoreHorizontal className="h-4 w-4" />
                </ActionBtn>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

type ActionBtnProps = { children: React.ReactNode; onClick: () => void } & React.AriaAttributes;
const ActionBtn = ({ children, onClick, ...aria }: ActionBtnProps) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 text-white transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none"
    {...aria}
  >
    {children}
  </button>
);
