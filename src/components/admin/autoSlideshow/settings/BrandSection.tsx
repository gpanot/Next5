'use client';

import Link from 'next/link';

/** Settings › Brand: the brand is set once, so it lives here instead of the menu. Opens the Brand page. */
export function BrandSection({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h3 className="font-heading text-lg font-normal text-ink dark:text-zinc-100">Your brand</h3>
        <p className="text-sm text-muted">Your logo, colors, voice and what your business sells. Every new idea uses it.</p>
      </div>
      <Link href={`/slideshow/${workspaceId}/brand`} onClick={onClose} className="flex min-h-12 items-center justify-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">
        Edit my brand
      </Link>
    </div>
  );
}
