import { PROSPECT_FREE_DAYS } from '../../types/admin/prospects';
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

/** Who it is for and the promise. The posts sit right below, so no buttons here. */
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
        <p className="m-0 text-[13px] text-app-muted">Your first {PROSPECT_FREE_DAYS} posts are free. No card needed. Works with Instagram, TikTok and YouTube.</p>
      </div>
    </section>
  );
}
