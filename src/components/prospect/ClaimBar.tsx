'use client';

/** Pinned to the bottom on phones: the one action of the page. Opens the sign-in that takes the posts. */
export function ClaimBar({ claimHref, claimed }: { claimHref: string; claimed: boolean }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-app-line bg-app-panel/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-xl flex-col gap-1">
        {claimed ? (
          <p className="text-center text-[14px] font-semibold text-app-ink">These posts were taken. Log in to see them.</p>
        ) : (
          <>
            <a href={claimHref} className="flex min-h-12 items-center justify-center rounded-xl bg-app-ink text-[16px] font-semibold text-app-bg shadow-sm transition active:scale-[0.98]">
              Get my posts
            </a>
            <p className="text-center text-[12px] text-app-muted">Free to sign up. You approve every post before it goes out.</p>
          </>
        )}
      </div>
    </div>
  );
}
