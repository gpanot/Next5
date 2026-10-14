'use client';

import { HOME_TEXT_AT, type TextAt } from '../../../../types/slideText';
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
};

/** One 9:16 slide filling its frame: the rendered image, or the photo with the draft text on it (and the CTA's store
 *  badges, on their own), each centered at the height it was moved to. */
export function PreviewSlideView({ slide, movable = false, onMoveText, onMoveBadges }: Props) {
  if (slide.kind === 'rendered') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />;
  }
  return (
    <div className="relative h-full w-full bg-zinc-800 [container-type:inline-size]">
      {slide.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      ) : (
        <span className="absolute inset-x-0 bottom-[8%] text-center text-[length:3.5cqw] text-white/40">No photo yet</span>
      )}
      <div className="absolute inset-0 bg-black/[0.08]" />
      <SlideTextLayer
        role={slide.role}
        title={slide.title}
        body={slide.body}
        look={slide.look}
        placeholder={slide.role === 'hook' ? 'Your hook line' : 'Your headline'}
        at={{ x: 0.5, y: (slide.textAt ?? HOME_TEXT_AT).y }}
        movable={movable}
        verticalOnly
        onMove={onMoveText}
      />
      {slide.badges?.length ? (
        <MovableText at={{ x: 0.5, y: slide.badgesAt ?? HOME_BADGES_Y }} side={0} movable={movable} verticalOnly onMove={(at) => onMoveBadges?.(at.y)}>
          <StoreBadgeRow badges={slide.badges} />
        </MovableText>
      ) : null}
    </div>
  );
}
