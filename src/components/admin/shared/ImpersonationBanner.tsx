'use client';

import { useSyncExternalStore } from 'react';
import { impersonatedEmail, isImpersonating, setImpersonationToken } from '../../../lib/impersonation';

const noSubscribe = () => () => undefined;
/** The impersonated email ('' when unknown); null when this tab is not an admin's "Open as user" tab. */
const snapshot = (): string | null => (isImpersonating() ? (impersonatedEmail() ?? '') : null);

/** Pinned reminder in a tab an admin opened with "Open as user": every action here is done as that user. */
export function ImpersonationBanner() {
  // Null in the server HTML: sessionStorage only exists in the browser.
  const email = useSyncExternalStore(noSubscribe, snapshot, () => null);
  if (email === null) return null;

  const exit = () => {
    setImpersonationToken(null);
    window.close();
  };

  return (
    <div role="status" className="fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[60] flex justify-center px-4">
      <div className="flex max-w-full items-center gap-3 rounded-full bg-amber-500 py-1.5 pr-1.5 pl-4 text-sm font-semibold text-amber-950 shadow-lg dark:bg-amber-400">
        <span className="truncate">Admin view as {email || 'user'}</span>
        <button type="button" onClick={exit} className="min-h-9 shrink-0 rounded-full bg-amber-950 px-4 text-xs font-semibold text-amber-50 transition hover:bg-amber-900 active:scale-95">
          Exit
        </button>
      </div>
    </div>
  );
}
