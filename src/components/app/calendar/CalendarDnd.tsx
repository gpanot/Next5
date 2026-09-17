'use client';

import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { SlotDto } from '../../../types/business/calendar';

/**
 * Drag a post to another day. Built for a thumb first: a photo lifts after a short hold, so a quick
 * swipe still scrolls the page or the row, and the page scrolls on its own near the edges while she
 * carries it. With a mouse, it lifts after a small move.
 */

type DragState = {
  activeId: string | null;
  /** True for a moment after a drop — the tap that ends a drag must not also open the post. */
  justDropped: () => boolean;
};

const DragStateContext = createContext<DragState>({ activeId: null, justDropped: () => false });
export const useCalendarDrag = (): DragState => useContext(DragStateContext);

const HOLD_MS = 250;
const TAP_AFTER_DROP_MS = 350;

type ProviderProps = { children: ReactNode; onMove: (slot: SlotDto, date: string) => void };

export const CalendarDnd = ({ children, onMove }: ProviderProps) => {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: HOLD_MS, tolerance: 8 } }),
  );
  const [active, setActive] = useState<SlotDto | null>(null);
  const droppedAt = useRef(0);

  const onDragStart = (event: DragStartEvent) => {
    setActive((event.active.data.current?.slot as SlotDto | undefined) ?? null);
    // A small buzz where phones support it, so she feels the photo lift.
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(12);
  };

  const onDragEnd = (event: DragEndEvent) => {
    droppedAt.current = Date.now();
    const slot = event.active.data.current?.slot as SlotDto | undefined;
    const date = event.over?.data.current?.date as string | undefined;
    setActive(null);
    if (slot && date && date !== slot.scheduledFor) onMove(slot, date);
  };

  const state: DragState = { activeId: active?.id ?? null, justDropped: () => Date.now() - droppedAt.current < TAP_AFTER_DROP_MS };

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActive(null)}>
      <DragStateContext.Provider value={state}>{children}</DragStateContext.Provider>
      <DragOverlay dropAnimation={null}>
        {active?.photo?.url ? (
          <div className="aspect-[4/5] w-20 rotate-2 scale-110 overflow-hidden rounded-xl shadow-2xl ring-2 ring-app-accent">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={active.photo.url} alt="" draggable={false} className="h-full w-full object-cover" />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

/** A photo she can pick up. Posted ones stay put: they happened on their day. */
export const useDraggableSlot = (slot: SlotDto) =>
  useDraggable({ id: slot.id, data: { slot }, disabled: slot.status === 'posted' });

/** A day that takes a dropped photo. Past days don't. */
export const useDroppableDay = (date: string, disabled: boolean, where: 'row' | 'month') =>
  useDroppable({ id: `${where}:${date}`, data: { date }, disabled });

/** Stops iOS and Android from opening the "save image" menu or selecting text on a long press. */
export const NO_LONG_PRESS_MENU = 'select-none [-webkit-touch-callout:none] [touch-action:manipulation]';
