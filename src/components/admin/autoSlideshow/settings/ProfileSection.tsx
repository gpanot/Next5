'use client';

import { useRouter } from 'next/navigation';
import { sessionTokenStore } from '../../../../lib/localStore';
import { lastWorkspaceStore, SLIDESHOW_HOME } from '../workspace/WorkspaceContext';
import type { SlideshowMeDto } from '../../../../types/admin/autoSlideshow';

/** Who is signed in, and the log out button. */
export function ProfileSection({ me, onClose }: { me: SlideshowMeDto; onClose: () => void }) {
  const name = me.displayName || me.email.split('@')[0] || me.email;
  const router = useRouter();
  /** Ends only the user session (an admin token in this browser is left alone), back to the public home. */
  const logout = () => {
    onClose();
    router.push(SLIDESHOW_HOME);
    sessionTokenStore.set(null);
    lastWorkspaceStore.set(null);
  };
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">{name.charAt(0).toUpperCase()}</span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-ink dark:text-zinc-100">{name}</p>
          <p className="truncate text-sm text-muted">{me.email}</p>
          <p className="truncate text-xs text-muted">Workspace: {me.workspace.name}</p>
        </div>
      </div>
      <button onClick={logout} className="min-h-11 w-full rounded-full border border-line px-5 text-sm font-semibold text-ink transition hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900">
        Log out
      </button>
    </section>
  );
}
