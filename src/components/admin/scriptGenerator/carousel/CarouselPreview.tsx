'use client';

import { useRef, useState, type DragEvent } from 'react';
import type { CarouselSlide, GeneratedCarousel } from '../../../../types/admin/carousel';
import { eyebrowClass, secondaryBtn } from '../ui';
import type { SlidePhotos, SlotKey } from './useSlidePhotos';

const textShadow = { textShadow: '0 1px 3px rgba(0,0,0,.85), 0 0 12px rgba(0,0,0,.45)' };

const cameraIcon = (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </svg>
);

const isSplit = (s: CarouselSlide) => !!(s.bottomText || s.bottomPhoto);

/** The photo slots in slide order: one per slide, plus the bottom half on split slides. */
export const slotsOf = (slides: CarouselSlide[]): SlotKey[] => slides.flatMap((s, i) => (isSplit(s) ? [`${i}`, `${i}b`] : [`${i}`]));

type HalfProps = { slot: SlotKey; text?: string; photoHint?: string; photos: SlidePhotos };

/** One photo spot with its line of text. Empty: a dashed drop zone that says which photo goes here. */
function PhotoSpot({ slot, text, photoHint, photos }: HalfProps) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const photo = photos.photos[slot];
  const url = photo?.url;
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const file = e.dataTransfer.files[0];
    if (file) photos.put(slot, file);
  };
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
      className={`group relative flex-1 overflow-hidden ${url ? 'bg-black' : `border-2 border-dashed bg-app-sunken ${over ? 'border-amber-500' : 'border-app-line'}`}`}
    >
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) photos.put(slot, f); e.target.value = ''; }} />
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local object URL or a signed R2 link, not an optimizable asset
        <img src={url} alt={photoHint ?? ''} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <button type="button" onClick={() => input.current?.click()} disabled={!photos.ready} className="absolute inset-0 flex flex-col disabled:cursor-wait px-3 py-3 text-center text-app-muted transition hover:text-app-ink">
          <span className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 overflow-hidden">
            {cameraIcon}
            <span className="text-[11px] font-semibold">Add photo</span>
            {photoHint && <span className="line-clamp-3 text-[10px] leading-snug" title={photoHint}>{photoHint}</span>}
          </span>
          {text && <span className="mt-2 block border-t border-app-line pt-2 text-[13px] leading-snug font-semibold text-app-ink">{text}</span>}
        </button>
      )}
      {url && text && (
        <p className="pointer-events-none absolute inset-x-3 bottom-[12%] text-center text-[13px] leading-snug font-semibold text-white" style={textShadow}>
          {text}
        </p>
      )}
      {photo?.state === 'saving' && <span className="pointer-events-none absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Saving…</span>}
      {photo?.state === 'failed' && (
        <button type="button" onClick={() => photos.retry(slot)} className="absolute bottom-2 left-2 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">Not saved · Retry</button>
      )}
      {url && (
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
          <button type="button" onClick={() => input.current?.click()} className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">Replace</button>
          <button type="button" onClick={() => photos.remove(slot)} className="rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white">Remove</button>
        </div>
      )}
    </div>
  );
}

function SlideCard({ slide, index, total, photos }: { slide: CarouselSlide; index: number; total: number; photos: SlidePhotos }) {
  const split = isSplit(slide);
  return (
    <li className="w-52 shrink-0 snap-start space-y-1.5">
      <div className="relative flex aspect-[9/16] flex-col overflow-hidden rounded-xl shadow-sm">
        <PhotoSpot slot={`${index}`} text={slide.text} photoHint={slide.photo} photos={photos} />
        {split && <PhotoSpot slot={`${index}b`} text={slide.bottomText} photoHint={slide.bottomPhoto} photos={photos} />}
        <span className="pointer-events-none absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white">{index + 1}/{total}</span>
      </div>
      <p className="truncate text-[11px] text-app-muted">{slide.label}</p>
    </li>
  );
}

/** The carousel as it will look: 9:16 slides in a swipeable row. Photos come from this computer and are saved with the script. */
export function CarouselPreview({ carousel, photos }: { carousel: GeneratedCarousel; photos: SlidePhotos }) {
  const input = useRef<HTMLInputElement>(null);
  const slots = slotsOf(carousel.slides);
  const filled = slots.filter((s) => photos.photos[s]).length;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => { photos.fill(Array.from(e.target.files ?? []), slots); e.target.value = ''; }} />
        <button type="button" onClick={() => input.current?.click()} disabled={!photos.ready || filled === slots.length} className={secondaryBtn}>Add photos in order</button>
        {filled > 0 && <button type="button" onClick={photos.clear} className="text-sm font-medium text-app-muted transition hover:text-app-ink">Remove all</button>}
        <p className={eyebrowClass}>{filled} of {slots.length} photos</p>
      </div>
      <p className="text-xs text-app-muted">{photos.ready ? 'Pick several photos at once to fill the empty slides in order, or drop a photo on any slide. Photos are saved with the script.' : 'Saving the script first. Photos can be added once it is saved.'}</p>
      <ol className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
        {carousel.slides.map((s, i) => <SlideCard key={i} slide={s} index={i} total={carousel.slides.length} photos={photos} />)}
      </ol>
    </div>
  );
}
