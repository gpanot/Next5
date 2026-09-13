import { useEffect, useRef } from 'react';

/**
 * Pushes a browser-history entry when `isActive` becomes true, so the device
 * back-button (or browser back gesture) triggers `onBack` instead of leaving
 * the site. Cleans up the orphaned history entry when the UI is dismissed
 * without using the back button (e.g. the user taps a close/X button).
 *
 * React Strict Mode double-invokes effects (mount → cleanup → mount). We
 * guard against the spurious back() call by tagging each pushState with a
 * unique token and only acting in cleanup when that exact token is still
 * the "current" one — meaning no re-mount has replaced it.
 */
export function useHistoryBack(isActive: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  // The token of the history entry that is currently "owned" by this hook.
  // Stored in a ref so it survives across Strict Mode re-mounts.
  const activeTokenRef = useRef<number>(0);

  useEffect(() => {
    if (!isActive) {
      activeTokenRef.current = 0;
      return;
    }

    // Mint a new token for this particular push
    const token = Date.now() + Math.random();
    console.log('[useHistoryBack] pushing history state, token:', token);
    window.history.pushState({ _next5Back: token }, '');
    activeTokenRef.current = token;

    const handler = (e: PopStateEvent) => {
      console.log('[useHistoryBack] popstate fired', { state: e.state, activeToken: activeTokenRef.current });
      if (e.state?._next5Back !== activeTokenRef.current) return;
      console.log('[useHistoryBack] calling onBack() from popstate');
      activeTokenRef.current = 0;
      onBackRef.current();
    };

    window.addEventListener('popstate', handler);
    return () => {
      window.removeEventListener('popstate', handler);
      console.log('[useHistoryBack] cleanup — my token:', token, '| activeToken:', activeTokenRef.current);
      // Only neutralise if our specific push is still the active one.
      // In Strict Mode, the re-mount runs synchronously and overwrites
      // activeTokenRef with its own new token before this cleanup fires
      // its setTimeout — so the token check will fail and back() is skipped.
      if (activeTokenRef.current !== token) {
        console.log('[useHistoryBack] skipping cleanup — token superseded by re-mount');
        return;
      }
      // Deferred so Strict Mode's synchronous re-mount can overwrite the token
      // before we read it.
      //
      // We use replaceState instead of history.back() here: calling back() in
      // cleanup fires a popstate event that parent useHistoryBack instances
      // (e.g. a booking modal sitting below a lightbox) would interpret as the
      // user pressing the browser back button and incorrectly close themselves.
      // replaceState neutralises our pushed state without triggering popstate,
      // so the parent stays open when a child overlay is dismissed via its
      // close / X button.
      setTimeout(() => {
        console.log('[useHistoryBack] setTimeout — my token:', token, '| activeToken:', activeTokenRef.current);
        if (activeTokenRef.current === token) {
          console.log('[useHistoryBack] neutralising history entry via replaceState — genuine UI dismissal');
          activeTokenRef.current = 0;
          window.history.replaceState(null, '');
        } else {
          console.log('[useHistoryBack] skipping cleanup — token superseded');
        }
      }, 0);
    };
  }, [isActive]);
}
