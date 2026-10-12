'use client';

import { HOME_TEXT_AT, type TextAt } from '../../../../types/slideText';
import { SlideTextLayer } from '../slideText/SlideTextLayer';
import type { PreviewSlide } from './previewSlides';

type Props = {
  slide: PreviewSlide;
  /** Draft slides only: the text can be dragged, and `onMoveText` gets where it was dropped. */
  movable?: boolean;
  onMoveText?: (at: TextAt) => void;
};

/** One 9:16 slide filling its frame: the rendered image, or the photo with the draft text on it, where it was moved to. */
export function PreviewSlideView({ slide, movable = false, onMoveText }: Props) {
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
        at={slide.textAt ?? HOME_TEXT_AT}
        movable={movable}
        onMove={onMoveText}
      />
    </div>
  );
}
