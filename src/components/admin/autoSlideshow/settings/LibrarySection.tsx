'use client';

import Link from 'next/link';

/** Settings › Library (phones only; wide screens use the sidebar): keeps the phone menu short. Opens the Library page. */
export function LibrarySection({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-normal text-ink dark:text-zinc-100">Library</h3>
        <p className="text-sm text-muted">Every Blitz video and slideshow you made, in one place.</p>
      </div>
      <Link href={`/slideshow/${workspaceId}/content`} onClick={onClose} className="flex min-h-12 items-center justify-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">
        Open Library
      </Link>
    </div>
  );
}
