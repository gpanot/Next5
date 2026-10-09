'use client';

/** Fired after something spends or refunds credits, so the Credits page re-reads the balance at once. */
export const CREDITS_CHANGED = 'next5:credits-changed';

export const announceCreditsChanged = () => {
  window.dispatchEvent(new Event(CREDITS_CHANGED));
};
