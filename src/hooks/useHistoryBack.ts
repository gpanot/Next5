import { useEffect, useRef } from 'react';

/**
 * Pushes a browser-history entry when `isActive` becomes true, so the device
 * back-button (or browser back gesture) triggers `onBack` instead of leaving
 * the site. Cleans up the orphaned history entry when the UI is dismissed
 * without using the back button (e.g. the user taps a close/X button).
 *
 * Safe to mount on both modals and inline panels (e.g. mobile detail panes).
 */
export function useHistoryBack(isActive: boolean, onBack: () => void): void {
  // Keep the callback in a ref so the effect doesn't need to re-run if the
  // caller inlines an arrow function.
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // Tracks whether *we* pushed the current history entry so the cleanup can
  // decide whether to pop it.
  const pushed = useRef(false);

  useEffect(() => {
    if (!isActive) {
      pushed.current = false;
      return;
    }

    window.history.pushState({ _next5Back: true }, '');
    pushed.current = true;

    const handler = () => {
      // Browser back was pressed — mark as consumed so cleanup doesn't also pop.
      pushed.current = false;
      onBackRef.current();
    };

    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      // Dismissed via UI (not back button) — pop the orphaned history entry so
      // the user's next back-press goes to the previous page, not a dead state.
      if (pushed.current) {
        pushed.current = false;
        window.history.back();
      }
    };
  }, [isActive]);
}
