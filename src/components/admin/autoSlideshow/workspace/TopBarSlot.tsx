'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type SlotState = { slot: HTMLElement | null; setSlot: (el: HTMLElement | null) => void };

const TopBarSlotContext = createContext<SlotState | null>(null);

/**
 * Lets a page put content in the workspace top bar (the run's step progress and elapsed time) instead of a second bar
 * below it. The top bar renders the slot; the page portals into it. Outside the provider (the admin page) there is no
 * slot, and the page keeps its own bar.
 */
export function TopBarSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  return <TopBarSlotContext.Provider value={{ slot, setSlot }}>{children}</TopBarSlotContext.Provider>;
}

/** Ref callback for the top bar's slot element, or null outside the provider. */
export const useTopBarSlotRef = () => useContext(TopBarSlotContext)?.setSlot ?? null;

/** True when a top bar slot exists, so the page skips its own bar. */
export const useHasTopBarSlot = () => useContext(TopBarSlotContext) !== null;

/** Renders `children` inside the top bar slot once it is mounted. */
export function TopBarPortal({ children }: { children: ReactNode }) {
  const slot = useContext(TopBarSlotContext)?.slot ?? null;
  return slot ? createPortal(children, slot) : null;
}
