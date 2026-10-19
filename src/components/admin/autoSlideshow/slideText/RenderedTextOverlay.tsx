'use client';

import { useState } from 'react';
import type { AutoSlideDto } from '../../../../types/admin/autoSlideshow';
import { HOME_TEXT_AT, type TextAt } from '../../../../types/slideText';
import type { LiveEdit } from '../useLiveEdits';
import { SlideTextLayer } from './SlideTextLayer';
import type { SlideTextProps } from './SlideTextView';

type Props = {
  slide: AutoSlideDto;
  /** The slide's photo without text; null while the photo list loads (the rendered slide shows under the text then). */
  photoUrl: string | null;
  box?: SlideTextProps['box'];
  /** Edits shown before the new image is in (dropped text, new styles); null when the image is up to date. */
  live: LiveEdit | null;
  /** The slide being edited: its text can be dragged. */
  movable: boolean;
  /** No dashed outline until dragged (the editor's big preview). */
  quiet?: boolean;
  onMove: (at: TextAt) => void;
};

/**
 * Over a rendered slide (its text already in the image): an invisible copy of the headline and the line under it, in
 * place, dragged together up and down only (it stays centered, as in the Hooks Volume editor). While dragged, and while a drop or a new text style renders, the plain photo covers the image
 * and the copy shows, as the campaign editor draws it: nothing waits.
 */
export function RenderedTextOverlay({ slide, photoUrl, box, live, movable, quiet, onMove }: Props) {
  const [dragging, setDragging] = useState(false);
  const shown = dragging || live !== null;
  const look = slide.look ?? 'default';
  // Slides of no known role render like content slides.
  const role = slide.role === 'hook' || slide.role === 'cta' ? slide.role : 'item';
  return (
    <div className="absolute inset-0 [container-type:inline-size]">
      {shown && photoUrl && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} />
          <div className="absolute inset-0 bg-black/[0.08]" />
        </>
      )}
      <SlideTextLayer
        role={role}
        title={slide.title}
        body={slide.body}
        look={look}
        bodyLook={slide.bodyLook}
        box={box}
        at={live?.textAt ?? slide.placedAt ?? slide.textAt ?? HOME_TEXT_AT}
        movable={movable}
        verticalOnly
        hidden={!shown}
        quiet={quiet}
        onMove={onMove}
        onDragging={setDragging}
      />
    </div>
  );
}
