'use client';

import { useSyncExternalStore } from 'react';
import { allRenders, subscribeRenders } from './videoRenders';

const NONE: never[] = [];

/** Floating note while videos render with the slideshow closed: they still download when ready. */
export function VideoRendersNote() {
  const renders = useSyncExternalStore(subscribeRenders, allRenders, () => NONE);
  const count = renders.filter((r) => r.rendering).length;
  if (count === 0) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-[calc(var(--bottom-nav-h,0px)+max(1rem,env(safe-area-inset-bottom)))] z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-zinc-900 px-4 py-3 text-sm text-white shadow-sm dark:bg-white dark:text-zinc-900">
      <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-900/30 dark:border-t-zinc-900" aria-hidden />
      <span>Making {count === 1 ? 'your video' : `${count} videos`}. It downloads by itself when ready.</span>
    </div>
  );
}
