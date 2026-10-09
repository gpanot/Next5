'use client';

import Link from 'next/link';

const STEPS = ['Keep an idea. We post it for you.', 'Wait 2 days. TikTok counts the views.', 'See what works here, and do more of it.'];

/** Three bars growing: the page's empty picture, drawn by hand. */
function BarsIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden className="text-app-accent">
      <rect x="6" y="22" width="7" height="12" rx="2" fill="currentColor" opacity="0.35" />
      <rect x="16.5" y="15" width="7" height="19" rx="2" fill="currentColor" opacity="0.6" />
      <rect x="27" y="6" width="7" height="28" rx="2" fill="currentColor" />
    </svg>
  );
}

/** No post yet at all: what will show here and how to get there, instead of a page of zeros. */
export function NoPostsYet({ workspaceId }: { workspaceId: string }) {
  return (
    <section className="rounded-xl border border-app-line bg-app-panel p-5 shadow-sm md:p-8">
      <div className="flex flex-col items-center text-center">
        <BarsIcon />
        <h2 className="mt-3 text-lg font-semibold text-app-ink">Your numbers show up here</h2>
        <p className="mt-1 max-w-sm text-sm text-app-muted">Views, likes and your best posts, 2 days after each post.</p>
      </div>
      <ol className="mx-auto mt-5 max-w-sm space-y-2.5">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm text-app-ink">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-sunken text-xs font-semibold text-app-muted tabular-nums">{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <Link href={`/slideshow/${workspaceId}/ideas`} className="mx-auto mt-6 flex min-h-12 w-full max-w-sm items-center justify-center rounded-full bg-app-cta px-5 text-sm font-semibold text-app-cta-ink shadow-sm transition hover:bg-app-cta/90 active:scale-95">
        Pick my first post
      </Link>
    </section>
  );
}

/** Posts exist, but none for this platform and period. */
export function NoPostsHere() {
  return (
    <div className="rounded-xl border border-dashed border-app-line p-6 text-center">
      <p className="text-base font-semibold text-app-ink">No posts here</p>
      <p className="mt-1 text-sm text-app-muted">Try another platform or period.</p>
    </div>
  );
}
