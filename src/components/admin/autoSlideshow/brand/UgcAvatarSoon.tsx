import { UserRound } from 'lucide-react';

/** The Brand page's UGC avatar slot: the face that will talk in the brand's videos. Not built yet. */
export function UgcAvatarSoon() {
  return (
    <section aria-labelledby="ugc-avatar-title" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="ugc-avatar-title" className="text-sm font-bold text-app-ink">UGC avatar</h2>
        <span className="rounded-full bg-app-sunken px-2.5 py-0.5 text-xs font-semibold text-app-muted">Coming soon</span>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-app-line p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-app-sunken text-app-muted">
          <UserRound aria-hidden className="h-6 w-6" />
        </span>
        <p className="text-sm text-app-muted">A face for your videos. Pick a person who talks about your product, so your posts feel real.</p>
      </div>
    </section>
  );
}
