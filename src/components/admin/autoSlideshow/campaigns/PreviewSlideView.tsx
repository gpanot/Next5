'use client';

import type { TextAt } from '../../../../types/slideText';
import { placeText } from '../../../../server/autoSlideshow/textPlacement';
import { HOME_BADGES_Y } from '../../../../types/storeBadges';
import { MovableText } from '../slideText/MovableText';
import { SlideTextLayer } from '../slideText/SlideTextLayer';
import { StoreBadgeRow } from '../slideText/StoreBadgeRow';
import type { PreviewSlide } from './previewSlides';

type Props = {
  slide: PreviewSlide;
  /** Draft slides only: the text can be dragged up and down (it stays centered), and `onMoveText` gets where it was dropped. */
  movable?: boolean;
  onMoveText?: (at: TextAt) => void;
  /** The CTA's badge row was dragged (up and down, apart from the text): its top is now at `y`. */
  onMoveBadges?: (y: number) => void;
  /** A photo for this slide is being made or copied in: a pulse and a spinner until it lands. */
  loading?: boolean;
  /** No dashed outline around movable text until it is dragged (the editor's big preview). */
  quiet?: boolean;
};

/** Over a slide whose photo is on its way: the frame pulses, a spinner turns, the text stays readable on top. */
function PhotoLoading({ hasPhoto }: { hasPhoto: boolean }) {
  return (
    <div role="status" aria-label="Making the photo" className={`absolute inset-0 flex flex-col items-center justify-end gap-[2cqw] pb-[10%] ${hasPhoto ? 'bg-black/40' : ''}`}>
      <span aria-hidden className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/[0.06] via-white/[0.12] to-white/[0.04]" />
      <span aria-hidden className="relative h-[9cqw] max-h-8 min-h-4 w-[9cqw] max-w-8 min-w-4 animate-spin rounded-full border-2 border-white/25 border-t-emerald-400" />
      <span className="relative text-[length:4cqw] font-medium text-white/70">Making photo…</span>
    </div>
  );
}

/** One 9:16 slide filling its frame: the rendered image, or the photo with the draft text on it (and the CTA's store
 *  badges, on their own), each centered at the height it was moved to. */
export function PreviewSlideView({ slide, movable = false, onMoveText, onMoveBadges, loading = false, quiet = false }: Props) {
  if (slide.kind === 'rendered') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />;
  }
  return (
    <div className="relative h-full w-full bg-zinc-800 [container-type:inline-size]">
      {slide.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : loading ? null : (
        <span className="absolute inset-x-0 bottom-[8%] text-center text-[length:3.5cqw] text-white/40">No photo yet</span>
      )}
      {loading && <PhotoLoading hasPhoto={Boolean(slide.photoUrl)} />}
      <div className="absolute inset-0 bg-black/[0.08]" />
      <SlideTextLayer
        role={slide.role}
        title={slide.title}
        body={slide.body}
        look={slide.look}
        placeholder={slide.role === 'hook' ? 'Your hook line' : 'Your headline'}
        at={{ x: 0.5, y: slide.textAt?.y ?? placeText(slide, slide.heads).y }}
        movable={movable}
        verticalOnly
        quiet={quiet}
        onMove={onMoveText}
      />
      {slide.badges?.length ? (
        <MovableText at={{ x: 0.5, y: slide.badgesAt ?? HOME_BADGES_Y }} side={0} movable={movable} verticalOnly quiet={quiet} onMove={(at) => onMoveBadges?.(at.y)}>
          <StoreBadgeRow badges={slide.badges} />
        </MovableText>
      ) : null}
    </div>
  );
}
