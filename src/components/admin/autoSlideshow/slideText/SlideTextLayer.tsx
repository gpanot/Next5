'use client';

import type { TextAt } from '../../../../types/slideText';
import { MovableText } from './MovableText';
import { BODY_GAP, SlideBodyView, SlideTitleView, TEXT_SIDE_PCT, type SlideTextProps } from './SlideTextView';

type Props = SlideTextProps & {
  at: TextAt;
  movable: boolean;
  verticalOnly?: boolean;
  hidden?: boolean;
  /** No dashed outline until dragged (MovableText). */
  quiet?: boolean;
  onMove?: (at: TextAt) => void;
  onDragging?: (dragging: boolean) => void;
};

/**
 * A slide's headline and the line under it as one block, as the render draws it, dragged together. Each keeps its own
 * text style. The frame is the nearest positioned parent.
 */
export function SlideTextLayer({ at, movable, verticalOnly, hidden, quiet, onMove, onDragging, ...text }: Props) {
  return (
    <MovableText at={at} side={TEXT_SIDE_PCT} movable={movable} verticalOnly={verticalOnly} hidden={hidden} quiet={quiet} onMove={onMove} onDragging={onDragging}>
      <div className="flex flex-col items-center" style={{ gap: `${BODY_GAP * 100}cqw` }}>
        <SlideTitleView role={text.role} title={text.title} look={text.look} box={text.box} placeholder={text.placeholder} />
        {text.body && <SlideBodyView text={text.body} look={text.bodyLook} />}
      </div>
    </MovableText>
  );
}
