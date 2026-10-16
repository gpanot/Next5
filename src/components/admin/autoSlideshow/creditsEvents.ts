'use client';

/** Fired after something spends or refunds credits, so the Credits page re-reads the balance at once. */
export const CREDITS_CHANGED = 'next5:credits-changed';

export const announceCreditsChanged = () => {
  window.dispatchEvent(new Event(CREDITS_CHANGED));
};

/** The server's "not enough credits" line ends with this; the app swaps it for an Add credits button. */
export const CREDITS_HINT = ' Add credits in Settings → Credits.';
