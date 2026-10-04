'use client';

import { DndContext, DragOverlay, MouseSensor, TouchSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import { CoverMedia } from '../../../labs/addToCalendar/CoverMedia';

/**
 * Drag a post to another day: a ready slideshow, a Blitz video not started yet, or a kept idea. Thumb first: it lifts
 * after a short hold, so a swipe still scrolls the page; with a mouse it lifts after a small move. Scheduled
 * slideshows and posted ones stay put.
 */

/** What is being dragged: `show` a ready slideshow, `blitz` a calendar video, `idea` a kept idea. */
export type DragKind = 'show' | 'blitz' | 'idea';
export type Dragged = { kind: DragKind; id: string; cover: string | null; coverIsVideo?: boolean };
type DragState = { activeId: string | null; justDropped: () => boolean };

const DragStateContext = createContext<DragState>({ activeId: null, justDropped: () => false });
export const useSlideshowDrag = (): DragState => useContext(DragStateContext);

const HOLD_MS = 250;
const TAP_AFTER_DROP_MS = 350;

export function SlideshowDnd({ children, onMove }: { children: ReactNode; onMove: (dragged: Dragged, dayKey: string) => void }) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: HOLD_MS, tolerance: 8 } }),
  );
  const [active, setActive] = useState<Dragged | null>(null);
  const droppedAt = useRef(0);

  const onDragStart = (event: DragStartEvent) => {
    setActive((event.active.data.current as Dragged | undefined) ?? null);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
  };
  const onDragEnd = (event: DragEndEvent) => {
    droppedAt.current = Date.now();
    const dragged = event.active.data.current as Dragged | undefined;
    const day = event.over?.data.current?.day as string | undefined;
    setActive(null);
    if (dragged && day) onMove(dragged, day);
  };
  const state: DragState = { activeId: active?.id ?? null, justDropped: () => Date.now() - droppedAt.current < TAP_AFTER_DROP_MS };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <DragStateContext.Provider value={state}>{children}</DragStateContext.Provider>
      <DragOverlay dropAnimation={null}>
        {active ? (
          <div className="aspect-[4/5] w-16 scale-110 rotate-2 overflow-hidden rounded-xl bg-zinc-200 shadow-2xl ring-2 ring-blue-600 dark:bg-zinc-700">
            {active.cover && <CoverMedia src={active.cover} video={active.coverIsVideo ?? false} />}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/** A post that can be picked up; `where` keeps ids unique (the same post shows on desktop and phone views). */
export const useDraggablePost = (where: string, kind: DragKind, id: string | undefined, cover: string | null, enabled: boolean, coverIsVideo = false) =>
  useDraggable({ id: `${where}:${kind}:${id ?? 'none'}`, data: { kind, id, cover, coverIsVideo }, disabled: !enabled || !id });

/** A day that takes a dropped slideshow. Past days don't. */
export const useDroppableDay = (where: string, key: string, disabled: boolean) => useDroppable({ id: `${where}:${key}`, data: { day: key }, disabled });

/** No "save image" menu or text selection on a long press. */
export const NO_LONG_PRESS_MENU = 'select-none [-webkit-touch-callout:none]';
