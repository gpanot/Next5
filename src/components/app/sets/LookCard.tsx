'use client';

import { Archive, Loader2 } from 'lucide-react';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { hasManifestImage } from '../../../lib/manifest';

export type LookPhoto = { src: string; alt: string; /** Signed storage URL (her own previews) instead of a manifest image. */ remote?: boolean };

type LookCardProps = {
  title: string;
  subtitle: string;
  photos: readonly LookPhoto[];
  /** Small line under the strip, e.g. "Example photos of Sarah". */
  caption?: string;
  /** Photos of her still being made: shown first as loading tiles. */
  pending?: number;
  actions: ReactNode;
  onArchive?: () => void;
};

const Photo = ({ photo }: { photo: LookPhoto }) => (
  <li className="relative aspect-[4/5] w-[42%] shrink-0 snap-start overflow-hidden rounded-xl bg-app-sunken sm:w-[31%]">
    {photo.remote ? (
      // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
      <img src={photo.src} alt={photo.alt} loading="lazy" className="h-full w-full object-cover" />
    ) : (
      hasManifestImage(photo.src) && <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 180px, 40vw" className="object-cover" />
    )}
  </li>
);

/** One style (or shop look) as a swipeable strip of photos: what it looks like, not a description of it. */
export const LookCard = ({ title, subtitle, photos, caption, pending = 0, actions, onArchive }: LookCardProps) => (
  <article className="flex flex-col gap-3 rounded-2xl border border-app-line bg-app-panel p-3 shadow-sm sm:p-4">
    <div className="flex items-start justify-between gap-3 px-1">
      <div className="min-w-0">
        <h3 className="truncate text-[16px] font-semibold text-app-ink">{title}</h3>
        <p className="truncate text-[13px] text-app-muted">{subtitle}</p>
      </div>
      {onArchive && (
        <button type="button" onClick={onArchive} aria-label={`Archive ${title}`} title="Archive" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-muted transition-colors duration-200 hover:bg-app-sunken hover:text-app-ink">
          <Archive aria-hidden className="h-4 w-4" />
        </button>
      )}
    </div>
    <ul className="-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-2 overflow-x-auto px-3 [scrollbar-width:none] sm:-mx-4 sm:scroll-px-4 sm:px-4" aria-label={`${title} sample photos. Swipe to see more.`}>
      {Array.from({ length: pending }, (_, i) => (
        <li key={`pending-${i}`} className="flex aspect-[4/5] w-[42%] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-xl bg-app-sunken text-app-muted sm:w-[31%]">
          <Loader2 aria-hidden className="h-5 w-5 animate-spin" />
          <span className="text-[11px] font-medium">You, in this look</span>
        </li>
      ))}
      {photos.map((p) => <Photo key={p.src} photo={p} />)}
    </ul>
    {caption && <p className="px-1 text-[12px] text-app-muted">{caption}</p>}
    <div className="flex flex-wrap gap-2 px-1">{actions}</div>
  </article>
);
