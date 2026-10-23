import { hostOf, initials } from './postLabels';

/** The top bar: the logo and how long the preview is held. */
export function LeadNav({ heldUntil, ended, claimed, onLogoClick }: { heldUntil: string; ended: boolean; claimed: boolean; onLogoClick?: () => void }) {
  const held = new Date(heldUntil).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return (
    <nav className="mx-auto flex h-16 max-w-[1180px] items-center justify-between px-5">
      <span onClick={onLogoClick} className="select-none font-display text-[20px] font-[800] tracking-[0.14em] text-app-ink">NEXT5</span>
      <span className="rounded-full border border-app-line px-3 py-1.5 text-[13px] text-app-muted">
        {claimed ? 'Claimed' : ended ? 'Preview ended' : <>Held until <strong className="font-semibold text-app-ink">{held}</strong></>}
      </span>
    </nav>
  );
}

const button = 'inline-flex min-h-[50px] items-center justify-center rounded-full px-6 text-[16px] font-semibold no-underline transition active:scale-[0.98]';

/** Who it is for, the promise, and the two ways on. */
export function LeadHero({ name, websiteUrl, videos, slideshows }: { name: string; websiteUrl: string; videos: number; slideshows: number }) {
  const total = videos + slideshows;
  return (
    <section className="pb-2 pt-7">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="mb-5 flex items-center gap-3">
          <div aria-hidden className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-app-accent font-display text-[16px] font-[800] text-white">{initials(name)}</div>
          <p className="m-0 leading-tight">
            <span className="font-semibold text-app-ink">{name}</span>
            <br />
            <span className="text-[14px] text-app-muted">{hostOf(websiteUrl)}</span>
          </p>
        </div>
        <h1 className="m-0 mb-4 max-w-[14ch] font-display text-[clamp(2.4rem,8.4vw,4.6rem)] font-[800] leading-[0.98] tracking-[-0.035em] text-app-ink">
          Your next {total} days of posts are ready.
        </h1>
        <p className="m-0 mb-6 max-w-[44ch] text-[18px] text-app-muted">
          {videos} short videos and {slideshows} photo slideshows for {name}, with captions written and a day to post each one.
        </p>
        <div className="flex flex-wrap gap-2.5">
          <a href="#claim" className={`${button} bg-app-ink text-app-bg`}>Get my posts</a>
          <a href="#week" className={`${button} border-[1.5px] border-app-ink text-app-ink`}>See the posts</a>
        </div>
        <p className="mb-0 mt-3 text-[13px] text-app-muted">No card needed. Works with TikTok and Instagram.</p>
      </div>
    </section>
  );
}
