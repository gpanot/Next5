'use client';

import type { ShortBeatDto } from '../../../types/admin/shorts';
import { ImageLightbox } from '../../ui/ImageLightbox';
import { DownloadIcon } from '../../ui/Icons';

type Props = { beats: ShortBeatDto[]; index: number; onIndex: (i: number) => void; onClose: () => void };

/** The shots' photos full size: ‹ › and arrow keys move between shots, with a download button and the shot's line. */
export function PhotoLightbox({ beats, index, onIndex, onClose }: Props) {
  const withPhoto = beats.map((b, i) => ({ b, i })).filter(({ b }) => b.imageUrl);
  const pos = withPhoto.findIndex(({ i }) => i === index);
  const current = withPhoto[pos];
  if (!current?.b.imageUrl) return null;
  const step = (d: number) => onIndex(withPhoto[(pos + d + withPhoto.length) % withPhoto.length].i);
  const many = withPhoto.length > 1;
  const beat = current.b;
  return (
    <ImageLightbox
      src={beat.imageUrl ?? ''}
      alt={`Photo of shot ${beat.idx + 1}`}
      onClose={onClose}
      onPrev={many ? () => step(-1) : undefined}
      onNext={many ? () => step(1) : undefined}
      overlay={
        <>
          <div className="absolute top-4 left-4 z-10 rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-sm">
            Shot {beat.idx + 1} · {pos + 1}/{withPhoto.length}
          </div>
          {beat.imageDownloadUrl && (
            <a
              href={beat.imageDownloadUrl}
              download
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              aria-label="Download photo"
              className="absolute top-4 right-16 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
            >
              <DownloadIcon className="h-5 w-5" />
            </a>
          )}
          <p className="absolute inset-x-4 bottom-4 z-10 mx-auto max-w-xl rounded-xl bg-black/60 px-4 py-3 text-center text-sm text-white backdrop-blur-sm">
            “{beat.text}”
          </p>
        </>
      }
    />
  );
}
