import { SplitWords } from '../../../motion/SplitWords';
import { AUDIENCE_COPY, type Audience } from './copy';
import { CheckIcon, TikTokIcon, VolumeOffIcon, VolumeOnIcon, ZillowIcon } from './icons';

function HeroDemo({ audience }: { audience: Audience }) {
  const c = AUDIENCE_COPY[audience];
  return (
    <div className="v3stage" data-intro="2" data-intro-lift="64" data-tilt-zone="">
      <div className="v3phone" data-tilt="">
        <div className="v3phone-notch" />
        <div className="v3phone-screen">

          {/* ── Background layer ── */}
          {/* Realtor: a real listing video (2784 Bell Dr, POV template) — plays after build animation */}
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            className="v3ugc-vid js-realtor-video"
            data-only="realtor"
            src="/videos/listing/bell-rate.mp4"
            poster="/videos/listing/bell-rate.jpg"
            playsInline
            muted
            loop
            preload="none"
          />

          {/* ── Realtor-only decorations (sit above video, below build overlay) ── */}
          {/* Status bar */}
          <div className="v3sbar" data-only="realtor" aria-hidden="true">
            <span>9:41</span>
            <span className="v3sbar-r">
              <svg width="16" height="10" viewBox="0 0 16 10" fill="currentColor"><rect x="0" y="6" width="3" height="4" rx=".6"/><rect x="4.3" y="4" width="3" height="6" rx=".6"/><rect x="8.6" y="2" width="3" height="8" rx=".6"/><rect x="12.9" y="0" width="3" height="10" rx=".6"/></svg>
              <svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x=".5" y=".5" width="18" height="9" rx="2.5" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="15" height="6" rx="1.5" fill="currentColor"/><rect x="19.8" y="3.3" width="1.6" height="3.4" rx=".8" fill="currentColor" opacity=".5"/></svg>
            </span>
          </div>
          {/* TikTok bottom navigation */}
          <div className="v3tknav" data-only="realtor" aria-hidden="true">
            <span className="on">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.6 2.5 11a1 1 0 0 0 .7 1.7H5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-7.3h1.8a1 1 0 0 0 .7-1.7z"/></svg>
              Home
            </span>
            <span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8M9 13h.01M15 13h.01"/></svg>
              Shop
            </span>
            <span className="v3tknav-plus"><i /></span>
            <span className="v3tknav-ib">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d="M4 5h16v11H9l-5 4z"/><path d="M8.5 10.5h.01M12 10.5h.01M15.5 10.5h.01"/></svg>
              <em>24</em>
              Inbox
            </span>
            <span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4.5 21c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5"/></svg>
              Profile
            </span>
          </div>
          {/* TikTok badge */}
          <div className="v3tktk-badge" data-only="realtor" aria-hidden="true">
            <TikTokIcon /> TikTok
          </div>
          {/* Mute/unmute toggle — top-right, realtor only, shown when video plays */}
          <button
            className="v3mute-btn js-mute-btn"
            data-only="realtor"
            aria-label="Toggle sound"
            type="button"
          >
            <span className="v3mute-off"><VolumeOffIcon /></span>
            <span className="v3mute-on"><VolumeOnIcon /></span>
          </button>

          {/* ── Overlay: listing facts ── */}
          <div className="v3video-ov">
            {/* Facts: price/beds/baths for realtor, service facts, product stats */}
            <div className="v3facts js-facts">
              {c.facts.map((fact) => <span key={fact}>{fact}</span>)}
            </div>
          </div>

          {/* ── Build animation (z-index:2, fades out on .done) ── */}
          <div className="v3build js-build" aria-live="polite">
            <h4>Making your video</h4>
            <ul className="v3steps-live">
              <li><i className="dot" /><span className="js-s0">{c.s0}</span></li>
              <li><i className="dot" /><span>Writing your hook</span></li>
              <li><i className="dot" /><span>Putting it together</span></li>
              <li><i className="dot" /><span>Your video is ready</span></li>
            </ul>
            <div className="v3thumbs js-thumbs">
              <div /><div /><div /><div /><div /><div /><div /><div />
            </div>
            {/* Progress bar — animated by JS via CSS custom property */}
            <div className="v3progress" aria-hidden="true">
              <div className="v3progress-bar js-progress-bar" />
            </div>
          </div>

        </div>
      </div>
      <div className="v3side-card v3timer">
        <b>Time you spent</b>
        <div className="big-n">0 min</div>
        <span>filming, editing, writing captions</span>
      </div>
    </div>
  );
}

export function HeroSection({ audience }: { audience: Audience }) {
  const c = AUDIENCE_COPY[audience];
  return (
    <section className="v3hero">
      <div className="v3wrap v3hero-grid">
        <div>
          <h1 data-intro-split="">
            <SplitWords className="js-h1a" text={c.h1} />
            <SplitWords className="l2" text="Zero editing." />
          </h1>
          <p className="v3lede js-sub" data-intro="3">{c.sub}</p>

          <form className="v3linkbox js-form" autoComplete="off">
            <label htmlFor="link1">Your Zillow link</label>
            <span className="v3linkfield">
              <ZillowIcon />
              <input id="link1" className="js-input" type="url" inputMode="url" enterKeyHint="go" placeholder={c.ph} />
            </span>
            <button className="v3btn v3btn-signal" type="submit">Make my free video</button>
          </form>

          <div className="v3fine" data-intro="4">
            <span><CheckIcon />Free video, no card</span>
            <span><CheckIcon />2 minutes</span>
            <span><CheckIcon />Keep it even if you never pay</span>
          </div>

          <div className="v3stars" data-intro="5">
            <span className="v3stat-pill">
              <b className="js-statnum">{c.statNum}</b>
              <span className="js-stattext"> {c.statText}</span>
            </span>
            <span className="v3src js-src">{c.src}</span>
          </div>
        </div>
        <HeroDemo audience={audience} />
      </div>
    </section>
  );
}
